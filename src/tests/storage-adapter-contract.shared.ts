import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageAdapter } from '@cyber-eco/types';

/**
 * Backend-agnostic contract suite (plan B5a,
 * `cybereco-hub/docs/design/storage-adapter-contract.md` §5): run against the
 * in-memory adapter always (`storage-adapter-contract.test.ts`) and against
 * the real relational adapter as `test:contract:live`
 * (`storage-adapter-contract.live.test.ts`), gated on `supabase start` with
 * the migrations applied.
 */
export interface ContractHarness {
  adapter: StorageAdapter;
  /** The collection every case uses — always `expenses` (a real SchemaMap table for both backends). */
  collection: string;
  /** A fresh, minimal, RLS-valid expense document (id assigned separately via `generateId`). */
  makeExpense(overrides?: Record<string, unknown>): Record<string, unknown>;
  /** A fresh `expense_groups` document the harness's actor may create (B2d: foreign-key cases). */
  makeGroup(overrides?: Record<string, unknown>): Record<string, unknown>;
  /** A fresh `events` document the harness's actor may create (B2d: foreign-key cases). */
  makeEvent(overrides?: Record<string, unknown>): Record<string, unknown>;
  /** Removes anything the case wrote. Called after every `it`. */
  cleanup(): Promise<void>;
}

export function runStorageAdapterContractSuite(name: string, getHarness: () => Promise<ContractHarness> | ContractHarness): void {
  describe(`storage-adapter-contract.md (${name})`, () => {
    let harness: ContractHarness;

    beforeEach(async () => {
      harness = await getHarness();
    });

    afterEach(async () => {
      await harness.cleanup();
    });

    it('never falls back to document mode: an unmapped collection throws (spec D1/D10)', async () => {
      await expect(harness.adapter.getDocument('not_a_schema_map_collection', 'x')).rejects.toThrow();
    });

    it('getDocument/query inject `id`, and getDocument of an absent doc returns null (not throw)', async () => {
      expect(await harness.adapter.getDocument(harness.collection, 'does-not-exist')).toBeNull();
      const id = harness.adapter.generateId(harness.collection);
      await harness.adapter.setDocument(harness.collection, id, harness.makeExpense());
      const doc = await harness.adapter.getDocument<{ id: string }>(harness.collection, id);
      expect(doc?.id).toBe(id);
    });

    it('serverTimestamp() rehydrates as an ISO 8601 string after write + read (storage-adapter-contract.md §2)', async () => {
      const id = harness.adapter.generateId(harness.collection);
      await harness.adapter.setDocument(harness.collection, id, harness.makeExpense());
      const doc = await harness.adapter.getDocument<{ createdAt: string }>(harness.collection, id);
      expect(doc?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    // `eventId` left the overflow keys in B2d (ADR 0013: it is the `event_id`
    // column, with a foreign key), so the D9 overflow invariant is exercised
    // with `conceptId`, which still has no column.
    it("updateDocument merges a patch's overflow keys into extra without erasing others — settledAt never wipes conceptId (spec D9)", async () => {
      const id = harness.adapter.generateId(harness.collection);
      await harness.adapter.setDocument(harness.collection, id, harness.makeExpense({ conceptId: 'k1' }));
      await harness.adapter.updateDocument(harness.collection, id, { settledAt: '2026-09-28T00:00:00.000Z' });
      const doc = await harness.adapter.getDocument<Record<string, unknown>>(harness.collection, id);
      expect(doc).toMatchObject({ conceptId: 'k1', settledAt: '2026-09-28T00:00:00.000Z' });
    });

    it('concurrent updateDocument calls with different overflow keys both survive (no lost update)', async () => {
      const id = harness.adapter.generateId(harness.collection);
      await harness.adapter.setDocument(harness.collection, id, harness.makeExpense({ conceptId: 'k1' }));
      await Promise.all([
        harness.adapter.updateDocument(harness.collection, id, { settledAt: '2026-09-28T00:00:00.000Z' }),
        harness.adapter.updateDocument(harness.collection, id, { notes: 'a note' }),
        harness.adapter.updateDocument(harness.collection, id, { description: 'Renamed' }),
      ]);
      const doc = await harness.adapter.getDocument<Record<string, unknown>>(harness.collection, id);
      expect(doc).toMatchObject({ conceptId: 'k1', settledAt: '2026-09-28T00:00:00.000Z', notes: 'a note', description: 'Renamed' });
    });

    it('deleting a group sets groupId to null on the expenses that named it (ON DELETE SET NULL, ADR 0013)', async () => {
      const groupId = harness.adapter.generateId('expense_groups');
      await harness.adapter.setDocument('expense_groups', groupId, harness.makeGroup());
      const id = harness.adapter.generateId(harness.collection);
      await harness.adapter.setDocument(harness.collection, id, harness.makeExpense({ groupId }));
      expect((await harness.adapter.getDocument<{ groupId: string | null }>(harness.collection, id))?.groupId).toBe(groupId);

      await harness.adapter.deleteDocument('expense_groups', groupId);

      expect(await harness.adapter.getDocument('expense_groups', groupId)).toBeNull();
      expect((await harness.adapter.getDocument<{ groupId: string | null }>(harness.collection, id))?.groupId).toBeNull();
    });

    it('eventId is a real column: it filters with ==, and deleting the event sets it to null (ADR 0013)', async () => {
      const eventId = harness.adapter.generateId('events');
      await harness.adapter.setDocument('events', eventId, harness.makeEvent());
      const id = harness.adapter.generateId(harness.collection);
      await harness.adapter.setDocument(harness.collection, id, harness.makeExpense({ eventId }));

      const linked = await harness.adapter.query<{ id: string }>(harness.collection, [{ field: 'eventId', operator: '==', value: eventId }]);
      expect(linked.data.map((d) => d.id)).toEqual([id]);

      await harness.adapter.deleteDocument('events', eventId);

      expect((await harness.adapter.getDocument<{ eventId: string | null }>(harness.collection, id))?.eventId).toBeNull();
      const after = await harness.adapter.query(harness.collection, [{ field: 'eventId', operator: '==', value: eventId }]);
      expect(after.data).toEqual([]);
    });

    it('batchWrite is all-or-nothing: one op targeting an unmapped collection rolls back the whole batch', async () => {
      const id = harness.adapter.generateId(harness.collection);
      const result = await harness.adapter.batchWrite([
        { type: 'set', collection: harness.collection, id, data: harness.makeExpense() },
        { type: 'set', collection: 'not_a_schema_map_collection', id: 'x', data: {} },
      ]);
      expect(result.success).toBe(false);
      expect(await harness.adapter.getDocument(harness.collection, id)).toBeNull();
    });

    it('batchWrite applies every op when the whole batch is valid', async () => {
      const id = harness.adapter.generateId(harness.collection);
      const result = await harness.adapter.batchWrite([{ type: 'set', collection: harness.collection, id, data: harness.makeExpense() }]);
      expect(result).toEqual({ success: true, count: 1 });
      expect(await harness.adapter.getDocument(harness.collection, id)).not.toBeNull();
    });

    it(
      'subscribeToQuery is FETCH-THEN-LISTEN: the callback fires immediately with the current match set, ' +
        'before the consumer does its own getDocument/query',
      async () => {
        const id = harness.adapter.generateId(harness.collection);
        await harness.adapter.setDocument(harness.collection, id, harness.makeExpense());
        const emissions: unknown[][] = [];
        const unsubscribe = harness.adapter.subscribeToQuery<{ id: string }>(harness.collection, [], (rows) => emissions.push(rows));
        try {
          await vi.waitFor(() => expect(emissions.length).toBeGreaterThan(0));
          expect(emissions[0]!.some((row) => (row as { id: string }).id === id)).toBe(true);
        } finally {
          unsubscribe();
        }
      },
    );
  });
}
