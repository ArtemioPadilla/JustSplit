// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cast, eventRow, expenseRow, groupRow, seed, settlementRow, type Actor } from './fixtures';

/**
 * Spec D9 forward-compat (tests only): the Track D fields live as overflow
 * keys in `extra` and need no migration — a member can read and write them,
 * a non-member cannot.
 */
let A: Actor, B: Actor, C: Actor;
let done: () => Promise<void>;

beforeAll(async () => {
  const c = await cast();
  ({ A, B, C } = c);
  done = c.cleanup;
});
afterAll(() => done());

const cases = () => [
  {
    table: 'expense_groups',
    row: groupRow(A, [C], {
      extra: {
        kind: 'couple',
        settings: { defaultSplitType: 'percentage', defaultShares: { [A.id]: 60, [C.id]: 40 }, budget: { amount: 5000, currency: 'MXN', period: 'monthly' } },
        concepts: [{ id: 'k1', name: 'Súper', emoji: '🛒' }],
      },
    }),
    patch: { concepts: [{ id: 'k2', name: 'Renta' }] },
  },
  {
    table: 'events',
    row: eventRow(A, [C], { extra: { settings: { budget: { amount: 900, currency: 'MXN' } } } }),
    patch: { settings: { budget: { amount: 1000, currency: 'MXN' } } },
  },
  {
    table: 'expenses',
    row: expenseRow(A, [C], { extra: { conceptId: 'k1', settledAt: null, eventId: 'ev1' } }),
    patch: { settledAt: '2026-09-28T00:00:00Z' },
  },
];

describe('Track D overflow keys (no migration needed)', () => {
  it.each([0, 1, 2])('case %i: a member reads and writes them; a non-member cannot', async (i) => {
    const { table, row, patch } = cases()[i]!;
    await seed(table, row);

    const read = await C.db.from(table).select('extra').eq('id', row.id).single();
    expect(read.error).toBeNull();
    expect(read.data!.extra).toEqual(row.extra);

    const merged = { ...(row.extra as object), ...patch };
    const upd = await C.db.from(table).update({ extra: merged }).eq('id', row.id).select('extra').single();
    expect(upd.error).toBeNull();
    expect(upd.data!.extra).toEqual(merged);

    expect((await B.db.from(table).select('extra').eq('id', row.id)).data).toEqual([]);
    expect((await B.db.from(table).update({ extra: {} }).eq('id', row.id).select('id')).data).toEqual([]);
  });

  it('settlements carry expenseIds / eventId as overflow keys', async () => {
    const s = settlementRow(A, A, C, { extra: { expenseIds: ['e1', 'e2'], eventId: 'ev1' } });
    await seed('settlements', s);
    const read = await C.db.from('settlements').select('extra').eq('id', s.id).single();
    expect(read.data!.extra).toEqual({ expenseIds: ['e1', 'e2'], eventId: 'ev1' });
    expect((await B.db.from('settlements').select('id').eq('id', s.id)).data).toEqual([]);
  });

  it('the canonical eventId query resolves through extra->>eventId', async () => {
    const e = expenseRow(A, [C], { extra: { eventId: 'ev-query' } });
    await seed('expenses', e);
    const { data } = await C.db.from('expenses').select('id').eq('extra->>eventId', 'ev-query');
    expect(data).toEqual([{ id: e.id }]);
  });
});
