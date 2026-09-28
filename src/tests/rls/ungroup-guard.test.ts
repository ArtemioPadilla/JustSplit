// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { allowed, cast, createActor, denied, eventRow, expenseRow, groupRow, seed, truth, type Actor } from './fixtures';

/**
 * Plan B2d review (ADR 0013): pulling a row OUT of a group or an event is as
 * privileged as pointing it at one. Visibility follows `group_id`/`event_id`, so
 * silently nulling the link removes the row from every member's feed and
 * changes their balances. `guard_expenses` / `guard_events` therefore require
 * the actor to be a member of the group or event the row is leaving, for a
 * direct write. The `ON DELETE SET NULL` referential action (a nested trigger,
 * `pg_trigger_depth() > 1`) is exempt: it must keep working for rows the
 * deleting admin cannot see (fk-lifecycle.test.ts).
 *
 * Cast: A (admin/creator), B (stranger), C (A's friend), D (a non-friend).
 *
 * Red/green for this file is verified by the CI "RLS & contract" job (and
 * locally against `supabase start`).
 */
let A: Actor, C: Actor, D: Actor;
let done: () => Promise<void>;

beforeAll(async () => {
  const c = await cast();
  ({ A, C } = c);
  done = c.cleanup;
  D = await createActor('D');
});
afterAll(() => done());

const link = async (id: unknown) => {
  const row = (await truth('expenses', id as string))!;
  return [row.group_id, row.event_id];
};

describe('expenses · leaving a group', () => {
  it('a current group member named on the row can ungroup it', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const e = await seed('expenses', expenseRow(A, [C], { group_id: g.id }));
    allowed(await C.db.from('expenses').update({ group_id: null }).eq('id', e.id));
    expect((await link(e.id))[0]).toBeNull();
  });

  it('a removed member who is still named on the row cannot ungroup it', async () => {
    const g = await seed('expense_groups', groupRow(A, [C, D]));
    const e = await seed('expenses', expenseRow(A, [D], { group_id: g.id }));
    allowed(await A.db.from('expense_groups').update({ member_ids: [A.id, C.id] }).eq('id', g.id));
    denied(await D.db.from('expenses').update({ group_id: null }).eq('id', e.id), '42501');
    expect((await link(e.id))[0]).toBe(g.id);
  });

  it('an event-only viewer of a group expense cannot ungroup it', async () => {
    const g = await seed('expense_groups', groupRow(A, []));
    const ev = await seed('events', eventRow(A, [D]));
    const e = await seed('expenses', expenseRow(A, [], { group_id: g.id, event_id: ev.id }));
    denied(await D.db.from('expenses').update({ group_id: null }).eq('id', e.id), '42501');
    expect((await link(e.id))[0]).toBe(g.id);
  });

  it('moving a row from one group straight to another is leaving the first: it needs membership of both', async () => {
    const first = await seed('expense_groups', groupRow(A, [D]));
    const second = await seed('expense_groups', groupRow(D, []));
    const e = await seed('expenses', expenseRow(A, [D], { group_id: first.id, paid_by: D.id, splits: [{ userId: D.id, amount: 100 }] }));
    allowed(await A.db.from('expense_groups').update({ member_ids: [A.id] }).eq('id', first.id));
    // D left `first` but is a member of `second` and is named on the row (and pays it, so the row stays consistent).
    denied(await D.db.from('expenses').update({ group_id: second.id, member_ids: [D.id] }).eq('id', e.id), '42501');
    expect((await link(e.id))[0]).toBe(first.id);
  });
});

describe('expenses · leaving an event', () => {
  it('an event member named on the row can unlink it', async () => {
    const ev = await seed('events', eventRow(A, [C]));
    const e = await seed('expenses', expenseRow(A, [C], { event_id: ev.id }));
    allowed(await A.db.from('expenses').update({ event_id: null }).eq('id', e.id));
    expect((await link(e.id))[1]).toBeNull();
  });

  it('someone who is not a member of the event cannot unlink it, even if they are named on the row', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const ev = await seed('events', eventRow(A, []));
    const e = await seed('expenses', expenseRow(A, [C], { group_id: g.id, event_id: ev.id }));
    denied(await C.db.from('expenses').update({ event_id: null }).eq('id', e.id), '42501');
    expect((await link(e.id))[1]).toBe(ev.id);
  });
});

describe('events · leaving a group', () => {
  it('a current group member who is on the event can detach it; a removed member cannot', async () => {
    const g = await seed('expense_groups', groupRow(A, [C, D]));
    const stays = await seed('events', eventRow(A, [C, D], { group_id: g.id }));
    const guarded = await seed('events', eventRow(A, [C, D], { group_id: g.id }));
    allowed(await A.db.from('expense_groups').update({ member_ids: [A.id, C.id] }).eq('id', g.id));

    denied(await D.db.from('events').update({ group_id: null }).eq('id', guarded.id), '42501');
    expect((await truth('events', guarded.id as string))!.group_id).toBe(g.id);
    allowed(await C.db.from('events').update({ group_id: null }).eq('id', stays.id));
    expect((await truth('events', stays.id as string))!.group_id).toBeNull();
  });
});

describe('the cascade is exempt', () => {
  it('deleting a group still ungroups a row whose only viewer is not in the group any more', async () => {
    const g = await seed('expense_groups', groupRow(A, []));
    const e = await seed('expenses', expenseRow(D, [], { group_id: g.id })); // D is not in the group
    allowed(await A.db.from('expense_groups').delete().eq('id', g.id));
    expect((await link(e.id))[0]).toBeNull();
  });
});
