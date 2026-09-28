import { describe, expect, it, vi } from 'vitest';
import { createMemoryAdapter } from './memory-adapter';

/**
 * Plan B5a: `createMemoryAdapter` is the in-memory `StorageAdapter` used by
 * the repo/hook tests and as the always-on half of the contract suite
 * (`storage-adapter-contract.test.ts`). Unlike the hub's own
 * `MockStorageAdapter` (documented in `storage-adapter-contract.md` §3 as
 * NOT atomic), this one implements `batchWrite` atomicity — the contract
 * suite pins that.
 */
describe('createMemoryAdapter (plan B5a)', () => {
  it('throws on an unmapped collection for every method', async () => {
    const adapter = createMemoryAdapter();
    await expect(adapter.getDocument('not_a_collection', 'x')).rejects.toThrow(/not_a_collection/);
    await expect(adapter.setDocument('not_a_collection', 'x', {})).rejects.toThrow(/not_a_collection/);
    await expect(adapter.updateDocument('not_a_collection', 'x', {})).rejects.toThrow(/not_a_collection/);
    await expect(adapter.deleteDocument('not_a_collection', 'x')).rejects.toThrow(/not_a_collection/);
    await expect(adapter.query('not_a_collection', [])).rejects.toThrow(/not_a_collection/);
    const batchResult = await adapter.batchWrite([{ type: 'set', collection: 'not_a_collection', id: 'x', data: {} }]);
    expect(batchResult.success).toBe(false);
    expect(batchResult.errors?.[0]?.error).toMatch(/not_a_collection/);
    expect(() => adapter.subscribeToQuery('not_a_collection', [], () => {})).toThrow(/not_a_collection/);
  });

  it('getDocument returns null for a missing doc, and injects id on hit', async () => {
    const adapter = createMemoryAdapter();
    expect(await adapter.getDocument('expenses', 'missing')).toBeNull();
    await adapter.setDocument('expenses', 'e1', { description: 'Tacos', memberIds: ['a'] });
    expect(await adapter.getDocument('expenses', 'e1')).toEqual({ id: 'e1', description: 'Tacos', memberIds: ['a'] });
  });

  it('deleteDocument is idempotent (deleting an absent doc does not throw)', async () => {
    const adapter = createMemoryAdapter();
    await expect(adapter.deleteDocument('expenses', 'nope')).resolves.toEqual({ id: 'nope', success: true });
  });

  it('updateDocument merges a partial patch and leaves other fields intact (D9 overflow-merge invariant)', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setDocument('expenses', 'e1', { description: 'Tacos', eventId: 'trip-1', settledAt: null });
    await adapter.updateDocument('expenses', 'e1', { settledAt: '2026-09-28T00:00:00.000Z' });
    const doc = await adapter.getDocument<Record<string, unknown>>('expenses', 'e1');
    expect(doc).toMatchObject({ description: 'Tacos', eventId: 'trip-1', settledAt: '2026-09-28T00:00:00.000Z' });
  });

  it('query supports ==, in and array-contains, and throws on array-contains-any', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setDocument('expenses', 'e1', { groupId: 'g1', memberIds: ['a', 'b'] });
    await adapter.setDocument('expenses', 'e2', { groupId: 'g2', memberIds: ['b'] });

    const byGroup = await adapter.query('expenses', [{ field: 'groupId', operator: '==', value: 'g1' }]);
    expect(byGroup.data).toEqual([{ id: 'e1', groupId: 'g1', memberIds: ['a', 'b'] }]);

    const byIn = await adapter.query<{ id: string }>('expenses', [{ field: 'groupId', operator: 'in', value: ['g1', 'g2'] }]);
    expect(byIn.data.map((d) => d.id).sort()).toEqual(['e1', 'e2']);

    const byMember = await adapter.query<{ id: string }>('expenses', [
      { field: 'memberIds', operator: 'array-contains', value: 'a' },
    ]);
    expect(byMember.data.map((d) => d.id)).toEqual(['e1']);

    await expect(
      adapter.query('expenses', [{ field: 'memberIds', operator: 'array-contains-any', value: ['a'] }]),
    ).rejects.toThrow(/array-contains-any/);
  });

  it('batchWrite is atomic: one failing op rolls back every op in the batch', async () => {
    const adapter = createMemoryAdapter();
    const result = await adapter.batchWrite([
      { type: 'set', collection: 'expenses', id: 'e1', data: { description: 'A' } },
      { type: 'set', collection: 'not_a_collection', id: 'e2', data: { description: 'B' } },
    ]);
    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
    expect(await adapter.getDocument('expenses', 'e1')).toBeNull();
  });

  it('batchWrite applies every op when the whole batch is valid', async () => {
    const adapter = createMemoryAdapter();
    const result = await adapter.batchWrite([
      { type: 'set', collection: 'expenses', id: 'e1', data: { description: 'A' } },
      { type: 'set', collection: 'expenses', id: 'e2', data: { description: 'B' } },
    ]);
    expect(result).toEqual({ success: true, count: 2 });
    expect(await adapter.getDocument('expenses', 'e1')).toEqual({ id: 'e1', description: 'A' });
  });

  it('subscribeToQuery is fetch-then-listen: the callback fires once immediately with the current match set', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setDocument('expenses', 'e1', { groupId: 'g1' });
    const cb = vi.fn();
    const unsubscribe = adapter.subscribeToQuery('expenses', [{ field: 'groupId', operator: '==', value: 'g1' }], cb);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith([{ id: 'e1', groupId: 'g1' }]);
    unsubscribe();
  });

  it('subscribeToQuery re-emits on a write to the collection, and stops after unsubscribe', async () => {
    const adapter = createMemoryAdapter();
    const cb = vi.fn();
    const unsubscribe = adapter.subscribeToQuery('expenses', [{ field: 'groupId', operator: '==', value: 'g1' }], cb);
    expect(cb).toHaveBeenCalledTimes(1);

    await adapter.setDocument('expenses', 'e1', { groupId: 'g1' });
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith([{ id: 'e1', groupId: 'g1' }]);

    unsubscribe();
    await adapter.setDocument('expenses', 'e2', { groupId: 'g1' });
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('serverTimestamp() resolves to an ISO string once read back', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setDocument('expenses', 'e1', { createdAt: adapter.serverTimestamp() });
    const doc = await adapter.getDocument<{ createdAt: string }>('expenses', 'e1');
    expect(doc?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('generateId returns a fresh id per call', () => {
    const adapter = createMemoryAdapter();
    const a = adapter.generateId('expenses');
    const b = adapter.generateId('expenses');
    expect(a).not.toEqual(b);
  });

  describe('foreign keys ON DELETE SET NULL (ADR 0013: mirrors migration B, so the contract suites do not lie)', () => {
    it('deleting a group sets groupId to null on its expenses, events and settlements, and leaves other rows alone', async () => {
      const adapter = createMemoryAdapter();
      await adapter.setDocument('expense_groups', 'g1', { name: 'Trip' });
      await adapter.setDocument('expenses', 'e1', { groupId: 'g1', description: 'A' });
      await adapter.setDocument('expenses', 'e2', { groupId: 'g2', description: 'B' });
      await adapter.setDocument('events', 'ev1', { groupId: 'g1', name: 'Dinner' });
      await adapter.setDocument('settlements', 's1', { groupId: 'g1', amount: 5 });

      await adapter.deleteDocument('expense_groups', 'g1');

      expect(await adapter.getDocument('expenses', 'e1')).toEqual({ id: 'e1', groupId: null, description: 'A' });
      expect(await adapter.getDocument('expenses', 'e2')).toEqual({ id: 'e2', groupId: 'g2', description: 'B' });
      expect(await adapter.getDocument('events', 'ev1')).toEqual({ id: 'ev1', groupId: null, name: 'Dinner' });
      expect(await adapter.getDocument('settlements', 's1')).toEqual({ id: 's1', groupId: null, amount: 5 });
    });

    it('deleting an event sets eventId to null on its expenses and settlements', async () => {
      const adapter = createMemoryAdapter();
      await adapter.setDocument('events', 'ev1', { name: 'Dinner' });
      await adapter.setDocument('expenses', 'e1', { eventId: 'ev1' });
      await adapter.setDocument('settlements', 's1', { eventId: 'ev1' });
      await adapter.setDocument('expenses', 'e2', { eventId: 'ev2' });

      await adapter.deleteDocument('events', 'ev1');

      expect(await adapter.getDocument('expenses', 'e1')).toEqual({ id: 'e1', eventId: null });
      expect(await adapter.getDocument('settlements', 's1')).toEqual({ id: 's1', eventId: null });
      expect(await adapter.getDocument('expenses', 'e2')).toEqual({ id: 'e2', eventId: 'ev2' });
    });

    it('a batchWrite delete does the same, atomically with the rest of the batch, and notifies the touched collections', async () => {
      const adapter = createMemoryAdapter();
      await adapter.setDocument('expense_groups', 'g1', { name: 'Trip' });
      await adapter.setDocument('expenses', 'e1', { groupId: 'g1' });
      const cb = vi.fn();
      const unsubscribe = adapter.subscribeToQuery('expenses', [], cb);
      cb.mockClear();

      const result = await adapter.batchWrite([{ type: 'delete', collection: 'expense_groups', id: 'g1' }]);

      expect(result.success).toBe(true);
      expect(await adapter.getDocument('expenses', 'e1')).toEqual({ id: 'e1', groupId: null });
      expect(cb).toHaveBeenCalledWith([{ id: 'e1', groupId: null }]);
      unsubscribe();
    });
  });

  describe('viewer visibility (ADR 0013: emulates the select policies, so hooks and contract suites do not lie)', () => {
    async function seeded(viewerRef: { uid: string | null }) {
      const adapter = createMemoryAdapter(undefined, { viewer: () => viewerRef.uid });
      // The seed writes go through the same adapter, so the viewer must be able to
      // write; reads are what is filtered.
      await adapter.setDocument('expense_groups', 'g1', { name: 'Trip', memberIds: ['u1', 'u3'], adminIds: ['u1'] });
      await adapter.setDocument('events', 'ev1', { name: 'Dinner', memberIds: ['u1', 'u4'] });
      await adapter.setDocument('expenses', 'own', { description: 'own', memberIds: ['u1', 'u2'] });
      await adapter.setDocument('expenses', 'grp', { description: 'grp', memberIds: ['u1'], groupId: 'g1' });
      await adapter.setDocument('expenses', 'evt', { description: 'evt', memberIds: ['u1'], eventId: 'ev1' });
      await adapter.setDocument('expenses', 'priv', { description: 'priv', memberIds: ['u1'] });
      await adapter.setDocument('settlements', 'sgrp', { memberIds: ['u1', 'u2'], groupId: 'g1' });
      await adapter.setDocument('friendships', 'f1', { users: ['u1', 'u2'], status: 'accepted' });
      return adapter;
    }
    const ids = async (adapter: ReturnType<typeof createMemoryAdapter>, collection: string) =>
      (await adapter.query<{ id: string }>(collection, [])).data.map((d) => d.id).sort();

    it('without a viewer option nothing is filtered (the legacy behaviour every repo test relies on)', async () => {
      const adapter = createMemoryAdapter();
      await adapter.setDocument('expenses', 'a', { memberIds: ['u1'] });
      expect(await ids(adapter, 'expenses')).toEqual(['a']);
    });

    it('a row is visible to its memberIds, to members of its group and to members of its event', async () => {
      const viewer = { uid: 'u1' as string | null };
      const adapter = await seeded(viewer);
      expect(await ids(adapter, 'expenses')).toEqual(['evt', 'grp', 'own', 'priv']);

      viewer.uid = 'u2';
      expect(await ids(adapter, 'expenses')).toEqual(['own']);
      viewer.uid = 'u3'; // group member, in no memberIds
      expect(await ids(adapter, 'expenses')).toEqual(['grp']);
      expect(await ids(adapter, 'settlements')).toEqual(['sgrp']);
      viewer.uid = 'u4'; // event member
      expect(await ids(adapter, 'expenses')).toEqual(['evt']);
      viewer.uid = 'u9'; // stranger
      expect(await ids(adapter, 'expenses')).toEqual([]);
    });

    it('groups, events and friendships stay member-only (their membership IS memberIds/users)', async () => {
      const viewer = { uid: 'u3' as string | null };
      const adapter = await seeded(viewer);
      expect(await ids(adapter, 'expense_groups')).toEqual(['g1']);
      expect(await ids(adapter, 'events')).toEqual([]);
      expect(await ids(adapter, 'friendships')).toEqual([]);
    });

    it('signed out (viewer returns null) sees nothing, and the viewer is re-read on every call', async () => {
      const viewer = { uid: 'u1' as string | null };
      const adapter = await seeded(viewer);
      expect((await ids(adapter, 'expenses')).length).toBe(4);
      viewer.uid = null;
      expect(await ids(adapter, 'expenses')).toEqual([]);
      expect(await adapter.getDocument('expenses', 'own')).toBeNull();
    });

    it('a member removed from the group keeps rows that name them and loses the rest of the group feed', async () => {
      const viewer = { uid: 'u1' as string | null };
      const adapter = await seeded(viewer);
      await adapter.setDocument('expenses', 'named', { memberIds: ['u1', 'u3'], groupId: 'g1' });
      viewer.uid = 'u3';
      expect(await ids(adapter, 'expenses')).toEqual(['grp', 'named']);

      viewer.uid = 'u1';
      await adapter.updateDocument('expense_groups', 'g1', { memberIds: ['u1'] });
      viewer.uid = 'u3';
      expect(await ids(adapter, 'expenses')).toEqual(['named']);
    });

    it('getDocument, subscribe and subscribeToQuery all apply the same visibility', async () => {
      const viewer = { uid: 'u2' as string | null };
      const adapter = await seeded(viewer);
      expect(await adapter.getDocument('expenses', 'priv')).toBeNull();
      expect(await adapter.getDocument('expenses', 'own')).not.toBeNull();

      const single = vi.fn();
      const stopSingle = adapter.subscribe('expenses', 'priv', single);
      expect(single).toHaveBeenLastCalledWith(null);
      stopSingle();

      const list = vi.fn();
      const stopList = adapter.subscribeToQuery('expenses', [], list);
      expect((list.mock.calls[0]![0] as { id: string }[]).map((d) => d.id)).toEqual(['own']);
      const last = () => (list.mock.calls.at(-1)![0] as { id: string }[]).map((d) => d.id).sort();
      await adapter.setDocument('expenses', 'mine2', { memberIds: ['u2'] });
      expect(last()).toEqual(['mine2', 'own']);
      await adapter.setDocument('expenses', 'hidden', { memberIds: ['u1'] });
      expect(last()).toEqual(['mine2', 'own']);
      stopList();
    });

    it('updateDocument on a row the viewer cannot see reports success: false (batch_write raises no_data_found)', async () => {
      const viewer = { uid: 'u2' as string | null };
      const adapter = await seeded(viewer);
      expect(await adapter.updateDocument('expenses', 'priv', { description: 'x' })).toEqual({ id: 'priv', success: false });
      expect(await adapter.updateDocument('expenses', 'own', { description: 'x' })).toEqual({ id: 'own', success: true });
    });
  });
});
