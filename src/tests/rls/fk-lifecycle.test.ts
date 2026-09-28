// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
  allowed,
  cast,
  denied,
  eventRow,
  expenseRow,
  groupRow,
  noRows,
  seed,
  settlementRow,
  sql,
  truth,
  uuid,
  type Actor,
} from './fixtures';

/**
 * Plan B2d migration B (ADR 0013): `group_id` / `event_id` are foreign keys
 * with ON DELETE SET NULL, so deleting a group or an event ungroups or
 * unlinks its rows cleanly: no friendship check, no dangling id, and rows the
 * deleting user cannot even see are handled too (FK actions bypass RLS).
 *
 * Red/green for this file is verified by the CI "RLS & contract" job (and
 * locally against `supabase start`).
 */
let A: Actor, B: Actor, C: Actor;
let done: () => Promise<void>;

beforeAll(async () => {
  const c = await cast();
  ({ A, B, C } = c);
  done = c.cleanup;
});
afterAll(() => done());

const FKS = [
  ['expenses', 'expenses_group_id_fkey', 'expense_groups'],
  ['events', 'events_group_id_fkey', 'expense_groups'],
  ['settlements', 'settlements_group_id_fkey', 'expense_groups'],
  ['expenses', 'expenses_event_id_fkey', 'events'],
  ['settlements', 'settlements_event_id_fkey', 'events'],
] as const;

describe('foreign keys (catalog)', () => {
  it.each(FKS)('%s has %s → %s(id), ON DELETE SET NULL, validated', (table, name, target) => {
    expect(
      sql(`select conrelid::regclass || '|' || confrelid::regclass || '|' || confdeltype::text || '|' || convalidated::text
             from pg_constraint where contype = 'f' and conname = '${name}' and connamespace = 'public'::regnamespace`),
    ).toEqual([`${table}|${target}|n|true`]);
  });
});

describe('a dangling reference cannot be written', () => {
  it('an expense pointing at a group or an event that does not exist is rejected (23503)', async () => {
    const { error: g } = await admin.from('expenses').insert(expenseRow(A, [C], { group_id: uuid() }));
    expect(g?.code).toBe('23503');
    const { error: e } = await admin.from('expenses').insert(expenseRow(A, [C], { event_id: uuid() }));
    expect(e?.code).toBe('23503');
  });
});

describe('deleting a group (admin) ungroups everything that pointed at it', () => {
  it('sets group_id to null on its expenses, events and settlements, and changes nothing else', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const e = await seed('expenses', expenseRow(A, [C], { group_id: g.id }));
    const ev = await seed('events', eventRow(A, [C], { group_id: g.id }));
    const s = await seed('settlements', settlementRow(A, A, C, { group_id: g.id }));

    allowed(await A.db.from('expense_groups').delete().eq('id', g.id));

    expect(await truth('expense_groups', g.id as string)).toBeNull();
    for (const [table, row] of [['expenses', e], ['events', ev], ['settlements', s]] as const) {
      const after = (await truth(table, row.id as string))!;
      expect(after.group_id, table).toBeNull();
      expect(after.member_ids, table).toEqual(row.member_ids);
    }
  });

  it('needs no friendship: an expense naming someone the admin is not friends with is ungrouped too', async () => {
    // B is not A's friend (the old B12 preflight refused this deletion).
    const g = await seed('expense_groups', groupRow(A, [C]));
    const e = await seed('expenses', expenseRow(A, [B], { group_id: g.id }));
    allowed(await A.db.from('expense_groups').delete().eq('id', g.id));
    expect(await truth('expenses', e.id as string)).toMatchObject({ group_id: null, member_ids: e.member_ids });
  });

  it('also ungroups rows the deleting admin cannot see (no dangling group_id, ADR 0002 B12 item 4)', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const hidden = await seed('expenses', expenseRow(C, [], { group_id: g.id })); // member_ids = [C] only
    allowed(await A.db.from('expense_groups').delete().eq('id', g.id));
    expect((await truth('expenses', hidden.id as string))!.group_id).toBeNull();
  });

  it('a non-admin member, a non-member and a failed delete change nothing', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const e = await seed('expenses', expenseRow(A, [C], { group_id: g.id }));
    noRows(await C.db.from('expense_groups').delete().eq('id', g.id).select('id'));
    noRows(await B.db.from('expense_groups').delete().eq('id', g.id).select('id'));
    expect(await truth('expense_groups', g.id as string)).not.toBeNull();
    expect((await truth('expenses', e.id as string))!.group_id).toBe(g.id);
  });
});

describe('deleting an event (its creator) unlinks its rows', () => {
  it('sets expenses.event_id and settlements.event_id to null', async () => {
    const ev = await seed('events', eventRow(A, [C]));
    const e = await seed('expenses', expenseRow(A, [C], { event_id: ev.id }));
    const s = await seed('settlements', settlementRow(A, A, C, { event_id: ev.id }));

    allowed(await A.db.from('events').delete().eq('id', ev.id));

    expect(await truth('events', ev.id as string)).toBeNull();
    expect((await truth('expenses', e.id as string))!.event_id).toBeNull();
    expect((await truth('settlements', s.id as string))!.event_id).toBeNull();
  });

  it('another member cannot delete the event, and nothing is unlinked', async () => {
    const ev = await seed('events', eventRow(A, [C]));
    const e = await seed('expenses', expenseRow(A, [C], { event_id: ev.id }));
    noRows(await C.db.from('events').delete().eq('id', ev.id).select('id'));
    expect((await truth('expenses', e.id as string))!.event_id).toBe(ev.id);
  });

  it('the foreign key stays out of the way of an ordinary edit that changes nothing else', async () => {
    const ev = await seed('events', eventRow(A, [C]));
    const e = await seed('expenses', expenseRow(A, [C], { event_id: ev.id }));
    allowed(await A.db.from('expenses').update({ description: 'Still linked' }).eq('id', e.id));
    denied(await A.db.from('expenses').update({ event_id: uuid() }).eq('id', e.id));
  });
});
