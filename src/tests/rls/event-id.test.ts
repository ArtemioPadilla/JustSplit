// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { allowed, cast, eventRow, expenseRow, seed, settlementRow, sql, truth, type Actor } from './fixtures';

/**
 * Plan B2d migration A (ADR 0013): `expenses.event_id` and
 * `settlements.event_id` are real columns, not `extra` overflow keys, so RLS,
 * foreign keys and indexes can see them.
 *
 * Red/green for this file is verified by the CI "RLS & contract" job (and
 * locally against `supabase start`).
 */
let A: Actor, B: Actor, C: Actor;
let done: () => Promise<void>;

const MIGRATION = resolve(__dirname, '../../../db/migrations/20260928000010_event_id_column.sql');

/** The idempotent backfill statements, fenced by markers in the migration file. */
function backfillSql(): string {
  const text = readFileSync(MIGRATION, 'utf8');
  const m = text.match(/-- backfill:begin\n([\s\S]*?)-- backfill:end/);
  if (!m) throw new Error('backfill markers not found in the event_id migration');
  return m[1]!;
}

beforeAll(async () => {
  const c = await cast();
  ({ A, B, C } = c);
  done = c.cleanup;
});
afterAll(() => done());

describe('event_id columns (catalog)', () => {
  it.each(['expenses', 'settlements'])('%s.event_id is a nullable text column with a plain btree index', (table) => {
    expect(
      sql(`select data_type || '|' || is_nullable from information_schema.columns
            where table_schema = 'public' and table_name = '${table}' and column_name = 'event_id'`),
    ).toEqual(['text|YES']);
    expect(
      sql(`select indexname from pg_indexes
            where schemaname = 'public' and tablename = '${table}' and indexdef ~ '\\(event_id\\)'`),
    ).toEqual([`${table}_event_id_idx`]);
  });

  it('the old expression indexes on extra->>eventId are gone (the column index replaces them)', () => {
    expect(
      sql(`select indexname from pg_indexes
            where schemaname = 'public' and tablename in ('expenses', 'settlements') and indexdef ~ 'extra'`),
    ).toEqual([]);
  });
});

describe('event_id through the API', () => {
  it('a member writes an expense with event_id; the canonical eventId query is an equality on the column', async () => {
    const ev = await seed('events', eventRow(A, [C]));
    const e = expenseRow(A, [C], { event_id: ev.id });
    allowed(await A.db.from('expenses').insert(e));

    const hit = await C.db.from('expenses').select('id, event_id, extra').eq('event_id', ev.id);
    expect(hit.error).toBeNull();
    expect(hit.data).toEqual([{ id: e.id, event_id: ev.id, extra: {} }]);
    expect((await B.db.from('expenses').select('id').eq('event_id', ev.id)).data).toEqual([]);
  });

  it('batch_write takes event_id as a column and keeps overflow keys in extra separately', async () => {
    const ev = await seed('events', eventRow(A, [C]));
    const { id, ...data } = expenseRow(A, [C], { event_id: ev.id, extra: { conceptId: 'k1' } });
    const { error } = await A.db.rpc('batch_write', { ops: [{ type: 'set', collection: 'expenses', id, data, merge: false }] });
    expect(error).toBeNull();
    const row = (await truth('expenses', id))!;
    expect(row.event_id).toBe(ev.id);
    expect(row.extra).toEqual({ conceptId: 'k1' });
  });

  it('a partial update can unlink an expense by writing event_id null', async () => {
    const ev = await seed('events', eventRow(A, [C]));
    const e = await seed('expenses', expenseRow(A, [C], { event_id: ev.id }));
    const { error } = await A.db.rpc('batch_write', {
      ops: [{ type: 'update', collection: 'expenses', id: e.id, data: { event_id: null } }],
    });
    expect(error).toBeNull();
    expect((await truth('expenses', e.id as string))!.event_id).toBeNull();
  });

  it('settlements carry event_id as a column too (B14 reads ?event=)', async () => {
    const ev = await seed('events', eventRow(A, [C]));
    const s = settlementRow(A, A, C, { event_id: ev.id, extra: { expenseIds: ['e1'] } });
    allowed(await A.db.from('settlements').insert(s));
    const hit = await C.db.from('settlements').select('id, event_id, extra').eq('event_id', ev.id);
    expect(hit.data).toEqual([{ id: s.id, event_id: ev.id, extra: { expenseIds: ['e1'] } }]);
  });
});

describe('event_id backfill from extra->>eventId (staging data written before this migration)', () => {
  it.each([
    ['expenses', (ev: string) => expenseRow(A, [C], { extra: { eventId: ev, keep: 1 } })],
    ['settlements', (ev: string) => settlementRow(A, A, C, { extra: { eventId: ev, keep: 1 } })],
  ])('%s: moves the key into the column, leaves the other overflow keys, and is idempotent', async (table, make) => {
    const ev = await seed('events', eventRow(A, [C]));
    const row = await seed(table as string, make(ev.id as string));
    expect((await truth(table as string, row.id as string))!.event_id).toBeNull();

    sql(backfillSql());
    const after = (await truth(table as string, row.id as string))!;
    expect(after.event_id).toBe(ev.id);
    expect(after.extra).toEqual({ keep: 1 });

    sql(backfillSql());
    expect(await truth(table as string, row.id as string)).toEqual(after);
  });
});
