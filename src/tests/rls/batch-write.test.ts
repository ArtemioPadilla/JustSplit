// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cast, expenseRow, groupRow, seed, sql, truth, uuid, type Actor } from './fixtures';

/** Plan B2 step 8: relational batch_write under RLS (storage-adapter-contract §3). */
let A: Actor, B: Actor, C: Actor;
let anonDb: Awaited<ReturnType<typeof cast>>['anon'];
let done: () => Promise<void>;

beforeAll(async () => {
  const c = await cast();
  ({ A, B, C } = c);
  anonDb = c.anon;
  done = c.cleanup;
});
afterAll(() => done());


function setOp(collection: string, row: Record<string, unknown>, merge = false) {
  const { id, ...data } = row;
  return { type: 'set', collection, id, data, merge };
}

describe('batch_write', () => {
  it('anon cannot call it', async () => {
    const { error } = await anonDb.rpc('batch_write', { ops: [] });
    expect(error?.code).toBe('42501');
  });

  it('applies a batch of set operations and returns the count', async () => {
    const g = groupRow(A, [C]);
    const e = expenseRow(A, [C], { group_id: g.id });
    const { data, error } = await A.db.rpc('batch_write', {
      ops: [setOp('expense_groups', g), setOp('expenses', e)],
    });
    expect(error).toBeNull();
    expect(data).toBe(2);
    expect(await truth('expenses', e.id as string)).not.toBeNull();
  });

  it('an unmapped collection raises and applies nothing (not even earlier ops)', async () => {
    const e = expenseRow(A, [C]);
    for (const collection of ['schema_migrations', 'profiles', 'documents', 'auth.users']) {
      const { error } = await A.db.rpc('batch_write', {
        ops: [setOp('expenses', e), { type: 'set', collection, id: 'x', data: {} }],
      });
      expect(error, collection).not.toBeNull();
      expect(await truth('expenses', e.id as string)).toBeNull();
    }
    expect(sql(`select count(*) from public.schema_migrations where version = 'x'`)).toEqual(['0']);
  });

  it('a batch containing one RLS-denied operation writes nothing (atomic)', async () => {
    const ok = expenseRow(A, [C]);
    const bad = expenseRow(A, [B]); // B is not A's friend: membership mirror denies it
    const { error } = await A.db.rpc('batch_write', { ops: [setOp('expenses', ok), setOp('expenses', bad)] });
    expect(error?.code).toBe('42501');
    expect(await truth('expenses', ok.id as string)).toBeNull();
  });

  it('an unknown column raises (adapter translation bug), writing nothing', async () => {
    const e = expenseRow(A, [C], { eventId: 'e1' });
    const { error } = await A.db.rpc('batch_write', { ops: [setOp('expenses', e)] });
    expect(error?.code).toBe('42703');
    expect(await truth('expenses', e.id as string)).toBeNull();
  });

  it('a partial update leaves untouched columns and unknown overflow keys intact', async () => {
    const e = await seed('expenses', expenseRow(A, [C], { notes: 'keep', extra: { legacyKey: 'ev1', futureKey: 1 } }));
    const { error } = await C.db.rpc('batch_write', {
      ops: [{ type: 'update', collection: 'expenses', id: e.id, data: { description: 'Updated', extra: { conceptId: 'c1' } } }],
    });
    expect(error).toBeNull();
    const row = (await truth('expenses', e.id as string))!;
    expect(row.description).toBe('Updated');
    expect(row.notes).toBe('keep');
    expect(Number(row.amount)).toBe(100);
    expect(row.extra).toEqual({ legacyKey: 'ev1', futureKey: 1, conceptId: 'c1' });
  });

  it('update of a missing or invisible row raises', async () => {
    const hidden = await seed('expenses', expenseRow(A, [C]));
    for (const id of [uuid(), hidden.id]) {
      const { error } = await B.db.rpc('batch_write', {
        ops: [{ type: 'update', collection: 'expenses', id, data: { description: 'x' } }],
      });
      expect(error).not.toBeNull();
    }
    expect((await truth('expenses', hidden.id as string))!.description).toBe('Tacos');
  });

  it('set with merge updates only the provided columns and merges extra', async () => {
    const e = await seed('expenses', expenseRow(A, [C], { notes: 'keep', extra: { a: 1 } }));
    const { error } = await A.db.rpc('batch_write', {
      ops: [{ type: 'set', collection: 'expenses', id: e.id, merge: true, data: { description: 'Merged', extra: { b: 2 } } }],
    });
    expect(error).toBeNull();
    const row = (await truth('expenses', e.id as string))!;
    expect(row).toMatchObject({ description: 'Merged', notes: 'keep', extra: { a: 1, b: 2 } });
  });

  it('set without merge replaces the row (omitted columns fall back to defaults)', async () => {
    const e = await seed('expenses', expenseRow(A, [C], { notes: 'gone', extra: { a: 1 } }));
    const replacement = expenseRow(A, [C], { id: e.id, description: 'Replaced' });
    const { error } = await A.db.rpc('batch_write', { ops: [setOp('expenses', replacement)] });
    expect(error).toBeNull();
    const row = (await truth('expenses', e.id as string))!;
    expect(row).toMatchObject({ description: 'Replaced', notes: null, extra: {} });
    expect(row.created_at).toBe(e.created_at);
  });

  it('a member who is not the creator may replace a row with set (update path, not an upsert)', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    const replacement = expenseRow(A, [C], { id: e.id, description: 'Replaced by C' });
    const { error } = await C.db.rpc('batch_write', { ops: [setOp('expenses', replacement)] });
    expect(error).toBeNull();
    expect((await truth('expenses', e.id as string))!.description).toBe('Replaced by C');
  });

  it('set on a row the caller cannot see does not overwrite it', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    const hijack = expenseRow(B, [], { id: e.id, description: 'hijack' });
    const { error } = await B.db.rpc('batch_write', { ops: [setOp('expenses', hijack, true)] });
    expect(error).not.toBeNull();
    expect((await truth('expenses', e.id as string))!.description).toBe('Tacos');
  });

  it('delete removes a visible row and ignores an invisible one', async () => {
    const mine = await seed('expenses', expenseRow(A, [C]));
    const { error } = await A.db.rpc('batch_write', {
      ops: [{ type: 'delete', collection: 'expenses', id: mine.id }],
    });
    expect(error).toBeNull();
    expect(await truth('expenses', mine.id as string)).toBeNull();

    const theirs = await seed('expenses', expenseRow(A, [C]));
    await B.db.rpc('batch_write', { ops: [{ type: 'delete', collection: 'expenses', id: theirs.id }] });
    expect(await truth('expenses', theirs.id as string)).not.toBeNull();
  });

  it('guard triggers apply inside a batch', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const { error } = await C.db.rpc('batch_write', {
      ops: [{ type: 'update', collection: 'expense_groups', id: g.id, data: { admin_ids: [A.id, C.id] } }],
    });
    expect(error?.code).toBe('42501');
  });
});
