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

    it("updateDocument merges a patch's overflow keys into extra without erasing others — settledAt never wipes eventId (spec D9)", async () => {
      const id = harness.adapter.generateId(harness.collection);
      await harness.adapter.setDocument(harness.collection, id, harness.makeExpense({ eventId: 'trip-1' }));
      await harness.adapter.updateDocument(harness.collection, id, { settledAt: '2026-09-28T00:00:00.000Z' });
      const doc = await harness.adapter.getDocument<Record<string, unknown>>(harness.collection, id);
      expect(doc).toMatchObject({ eventId: 'trip-1', settledAt: '2026-09-28T00:00:00.000Z' });
    });

    it('concurrent updateDocument calls with different overflow keys both survive (no lost update)', async () => {
      const id = harness.adapter.generateId(harness.collection);
      await harness.adapter.setDocument(harness.collection, id, harness.makeExpense({ eventId: 'trip-1' }));
      await Promise.all([
        harness.adapter.updateDocument(harness.collection, id, { settledAt: '2026-09-28T00:00:00.000Z' }),
        harness.adapter.updateDocument(harness.collection, id, { conceptId: 'k1' }),
        harness.adapter.updateDocument(harness.collection, id, { description: 'Renamed' }),
      ]);
      const doc = await harness.adapter.getDocument<Record<string, unknown>>(harness.collection, id);
      expect(doc).toMatchObject({ eventId: 'trip-1', settledAt: '2026-09-28T00:00:00.000Z', conceptId: 'k1', description: 'Renamed' });
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
