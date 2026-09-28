import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Mock } from 'vitest';
import { RelationalSupabaseAdapter } from './relational-adapter';
import { schemaMap } from './schema-map';

/**
 * Plan B5a contingency adapter. Chainable mock of the supabase-js query
 * builder, mirroring the pattern the hub itself uses for
 * `SupabaseStorageAdapter.test.ts` (`cybereco-hub/packages/supabase/src/__tests__/`).
 */
interface MockBuilder {
  select: Mock;
  eq: Mock;
  neq: Mock;
  lt: Mock;
  lte: Mock;
  gt: Mock;
  gte: Mock;
  in: Mock;
  contains: Mock;
  order: Mock;
  limit: Mock;
  range: Mock;
  upsert: Mock;
  update: Mock;
  delete: Mock;
  maybeSingle: Mock;
  then: (onFulfilled: (v: { data: unknown; error: { message: string } | null }) => unknown) => Promise<unknown>;
  result: { data: unknown; error: { message: string } | null };
  singleResults: Array<{ data: unknown; error: { message: string } | null }>;
}

function createMockBuilder(): MockBuilder {
  const builder = {} as MockBuilder;
  builder.result = { data: [], error: null };
  builder.singleResults = [];
  const chainMethods = ['select', 'eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in', 'contains', 'order', 'limit', 'range', 'upsert', 'update', 'delete'] as const;
  for (const method of chainMethods) builder[method] = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => Promise.resolve(builder.singleResults.shift() ?? builder.result));
  builder.then = (onFulfilled) => Promise.resolve(builder.result).then(onFulfilled);
  return builder;
}

interface MockChannel {
  on: Mock;
  subscribe: Mock;
  _handler?: (payload: unknown) => void;
}

function createMockClient(builderFactory: () => MockBuilder) {
  let lastBuilder: MockBuilder = builderFactory();
  const builders: MockBuilder[] = [lastBuilder];
  const channel: MockChannel = {} as MockChannel;
  channel.on = vi.fn((_event: string, _filter: unknown, handler: (payload: unknown) => void) => {
    channel._handler = handler;
    return channel;
  });
  channel.subscribe = vi.fn(() => channel);
  const client = {
    from: vi.fn(() => {
      lastBuilder = builderFactory();
      builders.push(lastBuilder);
      return lastBuilder;
    }),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(() => Promise.resolve('ok')),
  };
  return { client, channel, builders };
}

describe('RelationalSupabaseAdapter (plan B5a contingency, spec D10)', () => {
  let client: ReturnType<typeof createMockClient>['client'];
  let builders: MockBuilder[];
  let channel: MockChannel;
  let adapter: RelationalSupabaseAdapter;

  beforeEach(() => {
    const mocks = createMockClient(createMockBuilder);
    client = mocks.client;
    builders = mocks.builders;
    channel = mocks.channel;
    adapter = new RelationalSupabaseAdapter(() => client as unknown as SupabaseClient, { schemaMap });
  });

  it('throws on an unmapped collection', async () => {
    await expect(adapter.getDocument('not_mapped', 'x')).rejects.toThrow(/not_mapped/);
    await expect(adapter.query('not_mapped', [])).rejects.toThrow(/not_mapped/);
    expect(() => adapter.subscribeToQuery('not_mapped', [], () => {})).toThrow(/not_mapped/);
  });

  describe('getDocument', () => {
    it('selects by the real table and id column, and rehydrates real columns + extra overflow flat', async () => {
      builders[0]!.singleResults.push({
        data: {
          id: 'e1',
          description: 'Tacos',
          amount: 100,
          member_ids: ['a', 'b'],
          paid_by: 'a',
          extra: { eventId: 'trip-1' },
        },
        error: null,
      });

      const doc = await adapter.getDocument<Record<string, unknown>>('expenses', 'e1');

      expect(client.from).toHaveBeenCalledWith('expenses');
      expect(builders[0]!.select).toHaveBeenCalledWith('*');
      expect(builders[0]!.eq).toHaveBeenCalledWith('id', 'e1');
      expect(doc).toMatchObject({ id: 'e1', description: 'Tacos', amount: 100, memberIds: ['a', 'b'], paidBy: 'a', eventId: 'trip-1' });
    });

    it('returns null when no row matches', async () => {
      builders[0]!.singleResults.push({ data: null, error: null });
      expect(await adapter.getDocument('expenses', 'missing')).toBeNull();
    });
  });

  describe('setDocument', () => {
    it('upserts a translated row: camelCase fields become snake_case columns, unmodeled fields fold into extra', async () => {
      await adapter.setDocument('expenses', 'e1', {
        description: 'Tacos',
        amount: 100,
        memberIds: ['a'],
        paidBy: 'a',
        eventId: 'trip-1',
      });

      expect(builders[0]!.upsert).toHaveBeenCalledTimes(1);
      const [row] = builders[0]!.upsert.mock.calls[0] as [Record<string, unknown>];
      expect(row).toMatchObject({ id: 'e1', description: 'Tacos', amount: 100, member_ids: ['a'], paid_by: 'a' });
      expect(row.extra).toEqual({ eventId: 'trip-1' });
    });

    it('never writes createdAt/updatedAt even when the caller passes serverTimestamp() (metadata.strategy: server)', async () => {
      await adapter.setDocument('expenses', 'e1', {
        description: 'Tacos',
        createdAt: adapter.serverTimestamp(),
        updatedAt: adapter.serverTimestamp(),
      });
      const [row] = builders[0]!.upsert.mock.calls[0] as [Record<string, unknown>];
      expect(row).not.toHaveProperty('created_at');
      expect(row).not.toHaveProperty('updated_at');
    });
  });

  describe('updateDocument (D9 overflow-merge invariant)', () => {
    it('a patch touching only a real column never reads or writes extra', async () => {
      builders[0]!.result = { data: [{ id: 'e1' }], error: null };
      const result = await adapter.updateDocument('expenses', 'e1', { amount: 50 });

      expect(result).toEqual({ id: 'e1', success: true });
      // Exactly one builder was used: the update itself. No prior read of extra.
      expect(builders).toHaveLength(1);
      const [payload] = builders[0]!.update.mock.calls[0] as [Record<string, unknown>];
      expect(payload).toEqual({ amount: 50 });
    });

    it('a patch with an overflow key merges into extra (extra = extra || patch), never replacing it — settledAt update leaves eventId intact', async () => {
      // First builder: the read of the existing row's extra column. Second
      // builder (created on the update's own .from() call): the update result.
      builders[0]!.singleResults.push({ data: { extra: { eventId: 'trip-1' } }, error: null });

      const result = await adapter.updateDocument('expenses', 'e1', { settledAt: '2026-09-28T00:00:00.000Z' });

      expect(result).toEqual({ id: 'e1', success: true });
      expect(builders.length).toBeGreaterThanOrEqual(2);
      const updateBuilder = builders[1]!;
      const [payload] = updateBuilder.update.mock.calls[0] as [Record<string, unknown>];
      expect(payload.extra).toEqual({ eventId: 'trip-1', settledAt: '2026-09-28T00:00:00.000Z' });
    });

    it('reports success: false when the update matches no visible row', async () => {
      builders[0]!.result = { data: [], error: null };
      const result = await adapter.updateDocument('expenses', 'e1', { amount: 50 });
      expect(result).toEqual({ id: 'e1', success: false });
    });
  });

  describe('query', () => {
    it('resolves a real-column filter directly and an overflow filter to extra->>field', async () => {
      await adapter.query('expenses', [
        { field: 'groupId', operator: '==', value: 'g1' },
        { field: 'eventId', operator: '==', value: 'trip-1' },
      ]);

      expect(builders[0]!.eq).toHaveBeenCalledWith('group_id', 'g1');
      expect(builders[0]!.eq).toHaveBeenCalledWith('extra->>eventId', 'trip-1');
    });

    it('translates array-contains on a real column to .contains', async () => {
      await adapter.query('expenses', [{ field: 'memberIds', operator: 'array-contains', value: 'u1' }]);
      expect(builders[0]!.contains).toHaveBeenCalledWith('member_ids', ['u1']);
    });

    it('throws on array-contains-any (spec D10: unsupported, unused)', async () => {
      await expect(
        adapter.query('expenses', [{ field: 'memberIds', operator: 'array-contains-any', value: ['u1'] }]),
      ).rejects.toThrow(/array-contains-any/);
    });

    it('rehydrates every result row flat (real columns + extra spread)', async () => {
      builders[0]!.result = {
        data: [{ id: 'e1', description: 'Tacos', member_ids: ['a'], extra: { eventId: 'trip-1' } }],
        error: null,
      };
      const result = await adapter.query<Record<string, unknown>>('expenses', []);
      expect(result.data).toEqual([{ id: 'e1', description: 'Tacos', memberIds: ['a'], eventId: 'trip-1' }]);
    });
  });

  describe('batchWrite', () => {
    it('pre-translates every op to row shape (snake_case columns + extra) before calling rpc(batch_write)', async () => {
      (client.rpc as Mock).mockResolvedValueOnce({ data: 2, error: null });

      const result = await adapter.batchWrite([
        { type: 'set', collection: 'expenses', id: 'e1', data: { description: 'Tacos', eventId: 'trip-1' } },
        { type: 'delete', collection: 'expenses', id: 'e2' },
      ]);

      expect(result).toEqual({ success: true, count: 2 });
      expect(client.rpc).toHaveBeenCalledWith('batch_write', {
        ops: [
          { type: 'set', collection: 'expenses', id: 'e1', data: { description: 'Tacos', extra: { eventId: 'trip-1' } }, merge: false },
          { type: 'delete', collection: 'expenses', id: 'e2' },
        ],
      });
    });

    it('reports failure without applying anything when the RPC rejects (transactional rollback)', async () => {
      (client.rpc as Mock).mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
      const result = await adapter.batchWrite([{ type: 'set', collection: 'expenses', id: 'e1', data: {} }]);
      expect(result).toEqual({ success: false, count: 0, errors: [{ index: -1, error: 'boom' }] });
    });
  });

  describe('subscribeToQuery (fetch-then-listen, hub adapter semantics)', () => {
    it('emits the initial fetch immediately without a prior getDocument/query call from the consumer', () => {
      builders[0]!.result = { data: [{ id: 'e1' }], error: null };
      const cb = vi.fn();
      adapter.subscribeToQuery('expenses', [], cb);
      // The initial emission is async (a query round-trip); flush microtasks.
      return Promise.resolve().then(() => {
        expect(cb).toHaveBeenCalled();
      });
    });

    it('re-runs the query on ANY postgres_changes event — INSERT, UPDATE, and a PK-only DELETE — never evaluating the payload', async () => {
      builders[0]!.result = { data: [], error: null };
      const cb = vi.fn();
      const unsubscribe = adapter.subscribeToQuery('expenses', [], cb);
      await Promise.resolve();
      cb.mockClear();

      expect(channel.on).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ event: '*', table: 'expenses' }), expect.any(Function));

      // INSERT
      channel._handler!({ eventType: 'INSERT', new: { id: 'e1' }, old: {} });
      await Promise.resolve();
      expect(cb).toHaveBeenCalledTimes(1);

      // UPDATE
      channel._handler!({ eventType: 'UPDATE', new: { id: 'e1' }, old: { id: 'e1' } });
      await Promise.resolve();
      expect(cb).toHaveBeenCalledTimes(2);

      // DELETE — payload carries only the PK (no RLS applied to deletes, D10).
      channel._handler!({ eventType: 'DELETE', new: {}, old: { id: 'e1' } });
      await Promise.resolve();
      expect(cb).toHaveBeenCalledTimes(3);

      unsubscribe();
      expect(client.removeChannel).toHaveBeenCalledWith(channel);
    });
  });

  it('generateId returns a fresh id per call', () => {
    const a = adapter.generateId('expenses');
    const b = adapter.generateId('expenses');
    expect(a).not.toEqual(b);
  });
});
