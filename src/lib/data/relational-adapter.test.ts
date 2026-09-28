import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Mock } from 'vitest';
import { RelationalSupabaseAdapter } from './relational-adapter';
import { schemaMap } from './schema-map';

/**
 * Plan B5a contingency adapter. Chainable mock of the supabase-js query
 * builder — one shared builder returned by every `client.from()` call,
 * mirroring the pattern the hub itself uses for
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
  /** Consumed one per awaited query (a paged read awaits several); falls back to `result` once empty. */
  pages: Array<{ data: unknown; error: { message: string } | null }>;
}

function createMockBuilder(): MockBuilder {
  const builder = {} as MockBuilder;
  builder.result = { data: [], error: null };
  builder.singleResults = [];
  builder.pages = [];
  const chainMethods = ['select', 'eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in', 'contains', 'order', 'limit', 'range', 'upsert', 'update', 'delete'] as const;
  for (const method of chainMethods) builder[method] = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => Promise.resolve(builder.singleResults.shift() ?? builder.result));
  builder.then = (onFulfilled) => Promise.resolve(builder.pages.length > 0 ? builder.pages.shift()! : builder.result).then(onFulfilled);
  return builder;
}

interface MockChannel {
  on: Mock;
  subscribe: Mock;
  _handler?: (payload: unknown) => void;
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function createMockClient(builder: MockBuilder) {
  const channel: MockChannel = {} as MockChannel;
  channel.on = vi.fn((_event: string, _filter: unknown, handler: (payload: unknown) => void) => {
    channel._handler = handler;
    return channel;
  });
  channel.subscribe = vi.fn(() => channel);
  const client = {
    from: vi.fn(() => builder),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(() => Promise.resolve('ok')),
  };
  return { client, channel };
}

describe('RelationalSupabaseAdapter (plan B5a contingency, spec D10)', () => {
  let builder: MockBuilder;
  let client: ReturnType<typeof createMockClient>['client'];
  let channel: MockChannel;
  let adapter: RelationalSupabaseAdapter;

  beforeEach(() => {
    builder = createMockBuilder();
    const mocks = createMockClient(builder);
    client = mocks.client;
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
      builder.singleResults.push({
        data: {
          id: 'e1',
          description: 'Tacos',
          amount: 100,
          member_ids: ['a', 'b'],
          paid_by: 'a',
          event_id: 'trip-1',
          extra: { conceptId: 'k1' },
        },
        error: null,
      });

      const doc = await adapter.getDocument<Record<string, unknown>>('expenses', 'e1');

      expect(client.from).toHaveBeenCalledWith('expenses');
      expect(builder.select).toHaveBeenCalledWith('*');
      expect(builder.eq).toHaveBeenCalledWith('id', 'e1');
      expect(doc).toMatchObject({ id: 'e1', description: 'Tacos', amount: 100, memberIds: ['a', 'b'], paidBy: 'a', eventId: 'trip-1', conceptId: 'k1' });
    });

    it('returns null when no row matches', async () => {
      builder.singleResults.push({ data: null, error: null });
      expect(await adapter.getDocument('expenses', 'missing')).toBeNull();
    });
  });

  describe('setDocument (through batch_write: update-then-insert, atomic extra merge)', () => {
    it('sends one translated set op to batch_write: camelCase → snake_case columns, unmodeled fields folded into extra', async () => {
      const result = await adapter.setDocument('expenses', 'e1', {
        description: 'Tacos',
        amount: 100,
        memberIds: ['a'],
        paidBy: 'a',
        conceptId: 'k1',
      });

      expect(result).toEqual({ id: 'e1', success: true });
      expect(client.rpc).toHaveBeenCalledTimes(1);
      const [fn, args] = client.rpc.mock.calls[0] as unknown as [string, { ops: Array<Record<string, unknown>> }];
      expect(fn).toBe('batch_write');
      expect(args.ops).toHaveLength(1);
      expect(args.ops[0]).toMatchObject({ type: 'set', collection: 'expenses', id: 'e1', merge: false });
      expect(args.ops[0]!.data).toMatchObject({ description: 'Tacos', amount: 100, member_ids: ['a'], paid_by: 'a' });
      expect((args.ops[0]!.data as Record<string, unknown>).extra).toEqual({ conceptId: 'k1' });
      // No client-side upsert: an INSERT … ON CONFLICT is checked against the
      // INSERT policy even when the row exists, which denies a non-creator
      // member's replace (ADR 0002).
      expect(builder.upsert).not.toHaveBeenCalled();
      expect(builder.maybeSingle).not.toHaveBeenCalled();
    });

    it('eventId is written as the event_id column, not folded into extra (ADR 0013)', async () => {
      await adapter.setDocument('expenses', 'e1', { description: 'Tacos', eventId: 'trip-1' });
      await adapter.updateDocument('settlements', 's1', { eventId: null });

      const calls = (client.rpc as Mock).mock.calls as unknown as Array<[string, { ops: Array<{ data: Record<string, unknown> }> }]>;
      expect(calls[0]![1].ops[0]!.data).toEqual({ description: 'Tacos', event_id: 'trip-1', extra: {} });
      expect(calls[1]![1].ops[0]!.data).toEqual({ event_id: null, extra: {} });
    });

    it('merge: true is passed to the server; extra is never read and merged client-side', async () => {
      await adapter.setDocument('expenses', 'e1', { conceptId: 'k1' }, { merge: true });
      const [, args] = client.rpc.mock.calls[0] as unknown as [string, { ops: Array<Record<string, unknown>> }];
      expect(args.ops[0]).toMatchObject({ type: 'set', merge: true, data: { extra: { conceptId: 'k1' } } });
      expect(builder.maybeSingle).not.toHaveBeenCalled();
    });

    it('never writes createdAt/updatedAt even when the caller passes serverTimestamp() (metadata.strategy: server)', async () => {
      await adapter.setDocument('expenses', 'e1', {
        description: 'Tacos',
        createdAt: adapter.serverTimestamp(),
        updatedAt: adapter.serverTimestamp(),
      });
      const [, args] = client.rpc.mock.calls[0] as unknown as [string, { ops: Array<{ data: Record<string, unknown> }> }];
      expect(args.ops[0]!.data).not.toHaveProperty('created_at');
      expect(args.ops[0]!.data).not.toHaveProperty('updated_at');
    });

    it('throws with the database message when the write is rejected', async () => {
      client.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } } as never);
      await expect(adapter.setDocument('expenses', 'e1', { description: 'x' })).rejects.toThrow(/row-level security/);
    });
  });

  describe('updateDocument (D9 overflow-merge invariant, atomic on the server)', () => {
    it('sends one update op; a column-only patch carries an empty extra (a no-op merge)', async () => {
      const result = await adapter.updateDocument('expenses', 'e1', { amount: 50 });
      expect(result).toEqual({ id: 'e1', success: true });
      const [fn, args] = client.rpc.mock.calls[0] as unknown as [string, { ops: Array<Record<string, unknown>> }];
      expect(fn).toBe('batch_write');
      expect(args.ops[0]).toMatchObject({ type: 'update', collection: 'expenses', id: 'e1', data: { amount: 50, extra: {} } });
      expect(builder.update).not.toHaveBeenCalled();
    });

    it('overflow keys go to the server as extra, merged there (extra = extra || patch) — never read-modify-written here', async () => {
      await adapter.updateDocument('expenses', 'e1', { settledAt: '2026-09-28T00:00:00.000Z' });
      const [, args] = client.rpc.mock.calls[0] as unknown as [string, { ops: Array<Record<string, unknown>> }];
      expect(args.ops[0]).toMatchObject({ type: 'update', data: { extra: { settledAt: '2026-09-28T00:00:00.000Z' } } });
      expect(builder.maybeSingle).not.toHaveBeenCalled();
      expect(builder.update).not.toHaveBeenCalled();
    });

    it('reports success: false when no visible row matches (batch_write raises no_data_found)', async () => {
      client.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0002', message: 'batch_write: update target expenses/e1 does not exist (op 0)' } } as never);
      expect(await adapter.updateDocument('expenses', 'e1', { amount: 50 })).toEqual({ id: 'e1', success: false });
    });

    it('throws on any other database error', async () => {
      client.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } } as never);
      await expect(adapter.updateDocument('expenses', 'e1', { amount: 50 })).rejects.toThrow(/row-level security/);
    });
  });

  describe('query', () => {
    it('resolves a real-column filter directly and an overflow filter to extra->>field', async () => {
      await adapter.query('expenses', [
        { field: 'groupId', operator: '==', value: 'g1' },
        { field: 'conceptId', operator: '==', value: 'k1' },
      ]);

      expect(builder.eq).toHaveBeenCalledWith('group_id', 'g1');
      expect(builder.eq).toHaveBeenCalledWith('extra->>conceptId', 'k1');
    });

    it('eventId is a real column (ADR 0013): the filter hits event_id, never extra->>eventId, on expenses and settlements', async () => {
      await adapter.query('expenses', [{ field: 'eventId', operator: '==', value: 'trip-1' }]);
      await adapter.query('settlements', [{ field: 'eventId', operator: '==', value: 'trip-2' }]);

      expect(builder.eq).toHaveBeenCalledWith('event_id', 'trip-1');
      expect(builder.eq).toHaveBeenCalledWith('event_id', 'trip-2');
      expect(builder.eq).not.toHaveBeenCalledWith('extra->>eventId', expect.anything());
    });

    describe('without an explicit limit (ADR 0013: PostgREST caps a response at max_rows = 1000)', () => {
      const rowsOf = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ id: `e${from + i}`, description: 'x', member_ids: ['a'], extra: {} }));

      it('pages with .range() in pages of 1000 until a short page: 2 full pages + a short one are all returned', async () => {
        builder.pages.push(
          { data: rowsOf(1000, 0), error: null },
          { data: rowsOf(1000, 1000), error: null },
          { data: rowsOf(5, 2000), error: null },
        );

        const result = await adapter.query<{ id: string }>('expenses', [{ field: 'groupId', operator: '==', value: 'g1' }]);

        expect(result.data).toHaveLength(2005);
        expect(result.data[0]!.id).toBe('e0');
        expect(result.data[2004]!.id).toBe('e2004');
        expect(result.hasMore).toBe(false);
        expect(builder.range.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
        // A fresh query is built per page (a reused builder would stack filters/params).
        expect(client.from).toHaveBeenCalledTimes(3);
        expect(builder.eq).toHaveBeenCalledTimes(3);
        expect(builder.limit).not.toHaveBeenCalled();
      });

      it('keeps the caller\'s sort and adds the id as the final tie-breaker on every page, so pages neither overlap nor skip', async () => {
        builder.pages.push({ data: rowsOf(1000), error: null }, { data: rowsOf(1, 1000), error: null });

        await adapter.query('expenses', [], { sort: [{ field: 'date', direction: 'desc' }] });

        // Per page: the caller's order first, then id ascending — twice, once per page.
        expect(builder.order.mock.calls).toEqual([
          ['date', { ascending: false }],
          ['id', { ascending: true }],
          ['date', { ascending: false }],
          ['id', { ascending: true }],
        ]);
      });

      it('orders by id alone when the caller gave no sort, and does not repeat an id sort the caller already asked for', async () => {
        await adapter.query('expenses', []);
        expect(builder.order.mock.calls).toEqual([['id', { ascending: true }]]);

        builder.order.mockClear();
        await adapter.query('expenses', [], { sort: [{ field: 'id', direction: 'desc' }] });
        expect(builder.order.mock.calls).toEqual([['id', { ascending: false }]]);
      });

      it('stops after a full page followed by an empty one (an exact multiple of 1000 rows)', async () => {
        builder.pages.push({ data: rowsOf(1000), error: null }, { data: [], error: null });
        const result = await adapter.query('expenses', []);
        expect(result.data).toHaveLength(1000);
        expect(builder.range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
      });

      it('a failure on any page rejects instead of returning a silently short list', async () => {
        builder.pages.push({ data: rowsOf(1000), error: null }, { data: null, error: { message: 'boom' } });
        await expect(adapter.query('expenses', [])).rejects.toThrow(/boom/);
      });

      it('an explicit limit or offset keeps the single-request behaviour: no paging, no id tie-breaker', async () => {
        await adapter.query('expenses', [], { limit: 50 });
        expect(builder.limit).toHaveBeenCalledWith(50);
        expect(builder.range).not.toHaveBeenCalled();
        expect(builder.order).not.toHaveBeenCalled();

        await adapter.query('expenses', [], { offset: 100, limit: 20 });
        expect(builder.range).toHaveBeenCalledTimes(1);
        expect(builder.range).toHaveBeenCalledWith(100, 119);
        expect(client.from).toHaveBeenCalledTimes(2);
      });

      it('fetch-then-listen reuses the same paged fetch: the first emission carries every page', async () => {
        builder.pages.push({ data: rowsOf(1000), error: null }, { data: rowsOf(3, 1000), error: null });
        const cb = vi.fn();
        adapter.subscribeToQuery('expenses', [], cb);
        await flush();
        expect(cb).toHaveBeenCalledTimes(1);
        expect((cb.mock.calls[0]![0] as unknown[]).length).toBe(1003);
      });
    });

    it('translates array-contains on a real column to .contains', async () => {
      await adapter.query('expenses', [{ field: 'memberIds', operator: 'array-contains', value: 'u1' }]);
      expect(builder.contains).toHaveBeenCalledWith('member_ids', ['u1']);
    });

    it('throws on array-contains-any (spec D10: unsupported, unused)', async () => {
      await expect(
        adapter.query('expenses', [{ field: 'memberIds', operator: 'array-contains-any', value: ['u1'] }]),
      ).rejects.toThrow(/array-contains-any/);
    });

    it('rehydrates every result row flat (real columns + extra spread)', async () => {
      builder.result = {
        data: [{ id: 'e1', description: 'Tacos', member_ids: ['a'], extra: { conceptId: 'k1' } }],
        error: null,
      };
      const result = await adapter.query<Record<string, unknown>>('expenses', []);
      expect(result.data).toEqual([{ id: 'e1', description: 'Tacos', memberIds: ['a'], conceptId: 'k1' }]);
    });
  });

  describe('batchWrite', () => {
    it('pre-translates every op to row shape (snake_case columns + extra) before calling rpc(batch_write)', async () => {
      (client.rpc as Mock).mockResolvedValueOnce({ data: 2, error: null });

      const result = await adapter.batchWrite([
        { type: 'set', collection: 'expenses', id: 'e1', data: { description: 'Tacos', conceptId: 'k1' } },
        { type: 'delete', collection: 'expenses', id: 'e2' },
      ]);

      expect(result).toEqual({ success: true, count: 2 });
      expect(client.rpc).toHaveBeenCalledWith('batch_write', {
        ops: [
          { type: 'set', collection: 'expenses', id: 'e1', data: { description: 'Tacos', extra: { conceptId: 'k1' } }, merge: false },
          { type: 'delete', collection: 'expenses', id: 'e2' },
        ],
      });
    });

    it('reports failure instead of throwing when an op targets an unmapped collection (client-side pre-translation must never throw)', async () => {
      // Regression: batchWrite's own operations.map(...) used to call
      // mappingFor() unguarded, so an unmapped collection threw synchronously
      // out of batchWrite() instead of resolving { success: false, ... } like
      // every other failure mode (storage-adapter-contract.md §3). Caught by
      // storage-adapter-contract.live.test.ts against the real stack.
      const result = await adapter.batchWrite([
        { type: 'set', collection: 'expenses', id: 'e1', data: {} },
        { type: 'set', collection: 'not_mapped', id: 'e2', data: {} },
      ]);
      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
      expect(client.rpc).not.toHaveBeenCalled();
    });

    it('reports failure without applying anything when the RPC rejects (transactional rollback)', async () => {
      (client.rpc as Mock).mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
      const result = await adapter.batchWrite([{ type: 'set', collection: 'expenses', id: 'e1', data: {} }]);
      expect(result).toEqual({ success: false, count: 0, errors: [{ index: -1, error: 'boom' }] });
    });
  });

  describe('subscribeToQuery (fetch-then-listen, hub adapter semantics)', () => {
    it('emits the initial fetch immediately without a prior getDocument/query call from the consumer', async () => {
      builder.result = { data: [{ id: 'e1' }], error: null };
      const cb = vi.fn();
      adapter.subscribeToQuery('expenses', [], cb);
      // The initial emission is async (a query round-trip); flush the microtask queue.
      await flush();
      expect(cb).toHaveBeenCalled();
    });

    it('re-runs the query on ANY postgres_changes event — INSERT, UPDATE, and a PK-only DELETE — never evaluating the payload', async () => {
      builder.result = { data: [], error: null };
      const cb = vi.fn();
      const unsubscribe = adapter.subscribeToQuery('expenses', [], cb);
      await flush();
      cb.mockClear();

      expect(channel.on).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ event: '*', table: 'expenses' }), expect.any(Function));

      // INSERT
      channel._handler!({ eventType: 'INSERT', new: { id: 'e1' }, old: {} });
      await flush();
      expect(cb).toHaveBeenCalledTimes(1);

      // UPDATE
      channel._handler!({ eventType: 'UPDATE', new: { id: 'e1' }, old: { id: 'e1' } });
      await flush();
      expect(cb).toHaveBeenCalledTimes(2);

      // DELETE — payload carries only the PK (no RLS applied to deletes, D10).
      channel._handler!({ eventType: 'DELETE', new: {}, old: { id: 'e1' } });
      await flush();
      expect(cb).toHaveBeenCalledTimes(3);

      unsubscribe();
      expect(client.removeChannel).toHaveBeenCalledWith(channel);
    });

    it('forwards a query failure as the callback\'s second (error) argument instead of silently emitting [] (coordinator review, plan B8b)', async () => {
      builder.result = { data: null, error: { message: 'permission denied for table expenses' } };
      const cb = vi.fn();
      adapter.subscribeToQuery('expenses', [], cb);
      await flush();

      expect(cb).toHaveBeenCalledTimes(1);
      const [rows, error] = cb.mock.calls[0]!;
      expect(rows).toEqual([]);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/permission denied/);
    });

    it('recovers on the next postgres_changes event once the underlying query succeeds again', async () => {
      builder.result = { data: null, error: { message: 'boom' } };
      const cb = vi.fn();
      adapter.subscribeToQuery('expenses', [], cb);
      await flush();
      expect(cb.mock.calls[0]![1]).toBeInstanceOf(Error);

      builder.result = { data: [{ id: 'e1' }], error: null };
      channel._handler!({ eventType: 'INSERT', new: { id: 'e1' }, old: {} });
      await flush();

      const [rows, error] = cb.mock.calls[1]!;
      expect(error).toBeUndefined();
      expect(rows).toEqual([{ id: 'e1' }]);
    });
  });

  it('generateId returns a fresh id per call', () => {
    const a = adapter.generateId('expenses');
    const b = adapter.generateId('expenses');
    expect(a).not.toEqual(b);
  });
});
