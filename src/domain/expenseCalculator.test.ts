import { beforeEach, describe, expect, it } from 'vitest';
import type { Expense } from '../schemas/expense';
import type { Settlement } from '../schemas/settlement';
import { calculateSettlements, calculateSettlementsWithConversion, materializeSplits, type ConvertCurrency } from './expenseCalculator';

/**
 * Ported from the legacy Next tree's `src/utils/__tests__/expenseCalculator.test.ts`
 * (plan B3, spec D10): fixtures move from `participants`/`amount` to
 * `splits[]` (via `materializeSplits`), and `settled` becomes `settledAt`.
 * `calculateSettlements` is re-typed onto the universal `Expense` and now
 * consumes `splits[].amount` — the old share bug (equal division regardless
 * of each participant's actual share) does not survive the re-typing.
 */

let nextId = 0;
beforeEach(() => {
  nextId = 0;
});
function makeExpense(overrides: Partial<Expense> & Pick<Expense, 'amount' | 'paidBy'> & { participantIds: string[] }): Expense {
  nextId += 1;
  const { participantIds, ...rest } = overrides;
  const splits = materializeSplits(rest.amount, {
    splitType: 'equal',
    participantIds,
    payerId: rest.paidBy,
  });
  return {
    id: `exp${nextId}`,
    groupId: null,
    description: 'Lunch',
    currency: 'USD',
    splitType: 'equal',
    date: '2026-09-28',
    memberIds: participantIds,
    createdBy: rest.paidBy,
    createdAt: '2026-09-28T00:00:00.000Z',
    settledAt: null,
    splits,
    ...rest,
  };
}

function makeSettlement(overrides: Partial<Settlement> & Pick<Settlement, 'fromUserId' | 'toUserId' | 'amount'>): Settlement {
  nextId += 1;
  return {
    id: `set${nextId}`,
    groupId: null,
    currency: 'USD',
    date: '2026-09-29',
    memberIds: [overrides.fromUserId, overrides.toUserId],
    createdBy: overrides.fromUserId,
    createdAt: '2026-09-29T00:00:00.000Z',
    eventId: null,
    ...overrides,
  };
}

describe('calculateSettlements (plan B3, spec D10 — consumes splits[])', () => {
  it('returns an empty array for no expenses', () => {
    expect(calculateSettlements([], [], [])).toEqual([]);
  });

  it('calculates settlements for a simple equal-split expense (equal unchanged on the ported fixture)', () => {
    const expenses = [makeExpense({ amount: 100, paidBy: 'user1', participantIds: ['user1', 'user2'] })];

    const result = calculateSettlements(expenses, [], ['user1', 'user2']);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ fromUser: 'user2', toUser: 'user1', amount: 50, expenseIds: ['exp1'] }));
  });

  it('ignores settled expenses (settledAt != null)', () => {
    const expenses = [makeExpense({ amount: 100, paidBy: 'user1', participantIds: ['user1', 'user2'], settledAt: '2026-09-28T00:00:00.000Z' })];
    expect(calculateSettlements(expenses, [], ['user1', 'user2'])).toHaveLength(0);
  });

  it('handles multiple expenses with circular debts (equal unchanged on the ported fixture)', () => {
    const expenses = [
      makeExpense({ amount: 60, paidBy: 'user1', participantIds: ['user1', 'user2', 'user3'] }),
      makeExpense({ amount: 90, paidBy: 'user2', participantIds: ['user1', 'user2', 'user3'] }),
      makeExpense({ amount: 30, paidBy: 'user3', participantIds: ['user1', 'user2', 'user3'] }),
    ];

    const result = calculateSettlements(expenses, [], ['user1', 'user2', 'user3']);
    const totalSettlementAmount = result.reduce((sum, s) => sum + s.amount, 0);
    // Total 180 / 3 = 60 fair share each; user2 overpaid 30, user3 underpaid 30.
    expect(totalSettlementAmount).toBeCloseTo(30);

    const user3Settlements = result.filter((s) => s.fromUser === 'user3');
    expect(user3Settlements.length).toBeGreaterThan(0);
    expect(user3Settlements.reduce((sum, s) => sum + s.amount, 0)).toBeCloseTo(30);
  });

  it('filters by eventId when provided', () => {
    const expenses = [
      makeExpense({ amount: 100, paidBy: 'user1', participantIds: ['user1', 'user2'], eventId: 'event1' }),
      makeExpense({ amount: 200, paidBy: 'user1', participantIds: ['user1', 'user2'], eventId: 'event2' }),
    ];

    const resultEvent1 = calculateSettlements(expenses, [], ['user1', 'user2'], 'event1');
    expect(resultEvent1).toHaveLength(1);
    expect(resultEvent1[0].amount).toBe(50);
    expect(resultEvent1[0].expenseIds).toEqual(['exp1']);

    const resultEvent2 = calculateSettlements(expenses, [], ['user1', 'user2'], 'event2');
    expect(resultEvent2).toHaveLength(1);
    expect(resultEvent2[0].amount).toBe(100);
    expect(resultEvent2[0].expenseIds).toEqual(['exp2']);
  });

  describe('ledger model (plan B14a, ADR 0014): suggestions net the scope\'s settlements', () => {
    const dinner = () => makeExpense({ amount: 90, paidBy: 'ana', participantIds: ['ana', 'beto', 'carla'] });

    it('three-person expense, one pair settles: only the third person\'s debt is still suggested', () => {
      const result = calculateSettlements([dinner()], [makeSettlement({ fromUserId: 'beto', toUserId: 'ana', amount: 30 })], ['ana', 'beto', 'carla']);
      expect(result).toEqual([expect.objectContaining({ fromUser: 'carla', toUser: 'ana', amount: 30 })]);
    });

    it('a partial payment leaves exactly the remainder', () => {
      const result = calculateSettlements([dinner()], [makeSettlement({ fromUserId: 'beto', toUserId: 'ana', amount: 12.5 })], ['ana', 'beto', 'carla']);
      expect(result.find((s) => s.fromUser === 'beto')).toEqual(expect.objectContaining({ toUser: 'ana', amount: 17.5 }));
      expect(result.find((s) => s.fromUser === 'carla')).toEqual(expect.objectContaining({ toUser: 'ana', amount: 30 }));
    });

    it('a debt-simplified suggestion A to C, once recorded, zeroes the whole scope', () => {
      // Ana owes Beto 30 (Beto\'s expense); Beto owes Carla 30 (Carla\'s expense): the minimal pass says Ana pays Carla.
      const expenses = [
        makeExpense({ amount: 60, paidBy: 'beto', participantIds: ['ana', 'beto'] }),
        makeExpense({ amount: 60, paidBy: 'carla', participantIds: ['beto', 'carla'] }),
      ];
      const users = ['ana', 'beto', 'carla'];
      const suggestion = calculateSettlements(expenses, [], users);
      expect(suggestion).toEqual([expect.objectContaining({ fromUser: 'ana', toUser: 'carla', amount: 30 })]);

      const recorded = makeSettlement({ fromUserId: 'ana', toUserId: 'carla', amount: suggestion[0]!.amount });
      expect(calculateSettlements(expenses, [recorded], users)).toEqual([]);
    });

    it('a legacy settled expense (settledAt) is excluded, settlements or not', () => {
      const legacy = makeExpense({ amount: 100, paidBy: 'ana', participantIds: ['ana', 'beto'], settledAt: '2026-01-01T00:00:00.000Z' });
      expect(calculateSettlements([legacy], [], ['ana', 'beto'])).toEqual([]);
    });

    it('the event scope counts only that event\'s expenses and settlements', () => {
      const expenses = [
        makeExpense({ amount: 100, paidBy: 'ana', participantIds: ['ana', 'beto'], eventId: 'ev1' }),
        makeExpense({ amount: 200, paidBy: 'ana', participantIds: ['ana', 'beto'], eventId: 'ev2' }),
      ];
      const settlements = [
        makeSettlement({ fromUserId: 'beto', toUserId: 'ana', amount: 20, eventId: 'ev1' }),
        makeSettlement({ fromUserId: 'beto', toUserId: 'ana', amount: 70, eventId: 'ev2' }),
        makeSettlement({ fromUserId: 'beto', toUserId: 'ana', amount: 5, eventId: null }),
      ];
      const result = calculateSettlements(expenses, settlements, ['ana', 'beto'], 'ev1');
      // 50 owed in ev1, 20 paid in ev1; the other event's and the unlinked settlement do not count here.
      expect(result).toEqual([expect.objectContaining({ fromUser: 'beto', toUser: 'ana', amount: 30, eventId: 'ev1' })]);
    });

    it('the global scope counts every settlement it is given, whatever its eventId', () => {
      const expenses = [
        makeExpense({ amount: 100, paidBy: 'ana', participantIds: ['ana', 'beto'], eventId: 'ev1' }),
        makeExpense({ amount: 100, paidBy: 'ana', participantIds: ['ana', 'beto'] }),
      ];
      const settlements = [
        makeSettlement({ fromUserId: 'beto', toUserId: 'ana', amount: 20, eventId: 'ev1' }),
        makeSettlement({ fromUserId: 'beto', toUserId: 'ana', amount: 10, eventId: null }),
      ];
      const result = calculateSettlements(expenses, settlements, ['ana', 'beto']);
      expect(result).toEqual([expect.objectContaining({ fromUser: 'beto', toUser: 'ana', amount: 70 })]);
    });

    it('an expense whose splits add up to more than its amount still asks each debtor for their whole split', () => {
      const odd = makeExpense({ amount: 50, paidBy: 'ana', participantIds: ['beto', 'carla'] });
      odd.splits = [{ userId: 'beto', amount: 30 }, { userId: 'carla', amount: 30 }];
      const result = calculateSettlements([odd], [], ['ana', 'beto', 'carla']);
      expect(result.map((s) => [s.fromUser, s.toUser, s.amount])).toEqual([
        ['beto', 'ana', 30],
        ['carla', 'ana', 30],
      ]);
    });

    it('an overpayment makes the payer a creditor: the third person then owes both', () => {
      const result = calculateSettlements([dinner()], [makeSettlement({ fromUserId: 'beto', toUserId: 'ana', amount: 40 })], ['ana', 'beto', 'carla']);
      // Beto paid 10 more than he owed, so he is now owed 10; Ana is still owed 20; Carla owes 30.
      expect(result).toEqual([
        expect.objectContaining({ fromUser: 'carla', toUser: 'ana', amount: 20 }),
        expect.objectContaining({ fromUser: 'carla', toUser: 'beto', amount: 10 }),
      ]);
    });
  });
});

describe('calculateSettlementsWithConversion', () => {
  it('converts currencies when calculating settlements', async () => {
    const expenses = [
      makeExpense({ amount: 100, currency: 'USD', paidBy: 'user1', participantIds: ['user1', 'user2'] }),
      makeExpense({ amount: 100, currency: 'EUR', paidBy: 'user2', participantIds: ['user1', 'user2'] }),
    ];

    const convert: ConvertCurrency = async (amount) => ({ convertedAmount: amount * 1.5, isFallback: false });
    const result = await calculateSettlementsWithConversion(expenses, [], ['user1', 'user2'], 'USD', convert);

    // user1 paid USD 100 (fair share 125), user2 paid EUR 100 = USD 150 (fair share 125):
    // user1 underpaid by 25, so user1 owes user2 USD 25.
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ fromUser: 'user1', toUser: 'user2', amount: 25 }));
  });

  it('returns an empty array when there are no unsettled expenses', async () => {
    const convert: ConvertCurrency = async (amount) => ({ convertedAmount: amount, isFallback: false });
    expect(await calculateSettlementsWithConversion([], [], [], 'USD', convert)).toEqual([]);
  });

  describe('ledger model (plan B14a, ADR 0014)', () => {
    const doubleEur: ConvertCurrency = async (amount, from) => ({ convertedAmount: from === 'EUR' ? amount * 2 : amount, isFallback: false });

    it('converts a settlement in another currency before netting it', async () => {
      const expenses = [makeExpense({ amount: 90, paidBy: 'ana', participantIds: ['ana', 'beto', 'carla'] })];
      const settlements = [makeSettlement({ fromUserId: 'beto', toUserId: 'ana', amount: 10, currency: 'EUR' })];

      const result = await calculateSettlementsWithConversion(expenses, settlements, ['ana', 'beto', 'carla'], 'USD', doubleEur);

      // 10 EUR = 20 USD of Beto's 30 USD debt.
      expect(result.find((s) => s.fromUser === 'beto')).toEqual(expect.objectContaining({ toUser: 'ana', amount: 10 }));
      expect(result.find((s) => s.fromUser === 'carla')).toEqual(expect.objectContaining({ toUser: 'ana', amount: 30 }));
    });

    it('three-person expense, one pair settles: the third person\'s debt is intact', async () => {
      const expenses = [makeExpense({ amount: 90, paidBy: 'ana', participantIds: ['ana', 'beto', 'carla'] })];
      const settlements = [makeSettlement({ fromUserId: 'beto', toUserId: 'ana', amount: 30 })];
      const result = await calculateSettlementsWithConversion(expenses, settlements, ['ana', 'beto', 'carla'], 'USD', doubleEur);
      expect(result).toEqual([expect.objectContaining({ fromUser: 'carla', toUser: 'ana', amount: 30 })]);
    });

    it('a recorded debt-simplified suggestion zeroes the scope, in another currency too', async () => {
      const expenses = [
        makeExpense({ amount: 60, paidBy: 'beto', participantIds: ['ana', 'beto'], currency: 'EUR' }),
        makeExpense({ amount: 120, paidBy: 'carla', participantIds: ['beto', 'carla'] }),
      ];
      const users = ['ana', 'beto', 'carla'];
      const suggestion = await calculateSettlementsWithConversion(expenses, [], users, 'USD', doubleEur);
      expect(suggestion).toEqual([expect.objectContaining({ fromUser: 'ana', toUser: 'carla', amount: 60 })]);

      const recorded = makeSettlement({ fromUserId: 'ana', toUserId: 'carla', amount: suggestion[0]!.amount });
      expect(await calculateSettlementsWithConversion(expenses, [recorded], users, 'USD', doubleEur)).toEqual([]);
    });

    it('an expense whose splits add up to more than its amount still asks each debtor for their whole split', async () => {
      const odd = makeExpense({ amount: 50, paidBy: 'ana', participantIds: ['beto', 'carla'] });
      odd.splits = [{ userId: 'beto', amount: 30 }, { userId: 'carla', amount: 30 }];
      const result = await calculateSettlementsWithConversion([odd], [], ['ana', 'beto', 'carla'], 'USD', doubleEur);
      expect(result.map((s) => [s.fromUser, s.toUser, s.amount])).toEqual([
        ['beto', 'ana', 30],
        ['carla', 'ana', 30],
      ]);
    });

    it('excludes a legacy settled expense and scopes to the event\'s own settlements', async () => {
      const expenses = [
        makeExpense({ amount: 100, paidBy: 'ana', participantIds: ['ana', 'beto'], eventId: 'ev1' }),
        makeExpense({ amount: 100, paidBy: 'ana', participantIds: ['ana', 'beto'], eventId: 'ev1', settledAt: '2026-01-01T00:00:00.000Z' }),
      ];
      const settlements = [
        makeSettlement({ fromUserId: 'beto', toUserId: 'ana', amount: 20, eventId: 'ev1' }),
        makeSettlement({ fromUserId: 'beto', toUserId: 'ana', amount: 20, eventId: 'ev2' }),
      ];
      const result = await calculateSettlementsWithConversion(expenses, settlements, ['ana', 'beto'], 'USD', doubleEur, 'ev1');
      expect(result).toEqual([expect.objectContaining({ fromUser: 'beto', toUser: 'ana', amount: 30, eventId: 'ev1' })]);
    });
  });
});

describe('materializeSplits (plan B3, spec D10 — the only writer of splits[].amount)', () => {
  it('equal: divides evenly with no remainder', () => {
    const splits = materializeSplits(100, { splitType: 'equal', participantIds: ['user1', 'user2'], payerId: 'user1' });
    expect(splits).toEqual([
      { userId: 'user1', amount: 50 },
      { userId: 'user2', amount: 50 },
    ]);
  });

  it('equal: places the remainder cent on the payer', () => {
    const splits = materializeSplits(10, { splitType: 'equal', participantIds: ['user1', 'user2', 'user3'], payerId: 'user2' });
    const total = splits.reduce((sum, s) => sum + s.amount, 0);
    expect(total).toBeCloseTo(10, 5);
    expect(splits.find((s) => s.userId === 'user2')?.amount).toBeCloseTo(3.34, 5);
    expect(splits.find((s) => s.userId === 'user1')?.amount).toBeCloseTo(3.33, 5);
    expect(splits.find((s) => s.userId === 'user3')?.amount).toBeCloseTo(3.33, 5);
  });

  it('exact: uses the literal per-participant amounts (40/30/30)', () => {
    const splits = materializeSplits(100, { splitType: 'exact', shares: { user1: 40, user2: 30, user3: 30 } });
    expect(splits).toEqual([
      { userId: 'user1', amount: 40 },
      { userId: 'user2', amount: 30 },
      { userId: 'user3', amount: 30 },
    ]);
  });

  it('percentage: rounds each share to cents (50/25/25)', () => {
    const splits = materializeSplits(100, {
      splitType: 'percentage',
      shares: { user1: 50, user2: 25, user3: 25 },
      payerId: 'user1',
    });
    expect(splits).toEqual([
      { userId: 'user1', amount: 50, percentage: 50 },
      { userId: 'user2', amount: 25, percentage: 25 },
      { userId: 'user3', amount: 25, percentage: 25 },
    ]);
  });

  it('percentage: places the rounding remainder on the payer', () => {
    const splits = materializeSplits(10, {
      splitType: 'percentage',
      shares: { user1: 33.33, user2: 33.33, user3: 33.34 },
      payerId: 'user1',
    });
    const total = splits.reduce((sum, s) => sum + s.amount, 0);
    expect(total).toBeCloseTo(10, 5);
  });

  it('equal: returns an empty array for no participants', () => {
    expect(materializeSplits(100, { splitType: 'equal', participantIds: [], payerId: 'user1' })).toEqual([]);
  });

  // spec D10: paidBy must be in member_ids but NOT necessarily in splits (a
  // payer who covers others without taking a share). The remainder cents
  // must still land somewhere, or the splits no longer sum to the amount.
  const sumCents = (splits: { amount: number }[]) => splits.reduce((s, x) => s + Math.round(x.amount * 100), 0);

  it('equal: a payer outside the participants still yields splits that sum to the amount', () => {
    const splits = materializeSplits(100, { splitType: 'equal', participantIds: ['a', 'b', 'c'], payerId: 'payer' });
    expect(sumCents(splits)).toBe(10000);
    expect(splits.map((s) => s.amount)).toEqual([33.34, 33.33, 33.33]);
  });

  it('percentage: a payer outside the participants still yields splits that sum to the amount', () => {
    const splits = materializeSplits(10, {
      splitType: 'percentage',
      shares: { a: 33.333, b: 33.333, c: 33.334 },
      payerId: 'payer',
    });
    expect(sumCents(splits)).toBe(1000);
  });

  it('equal and percentage always sum to the amount across awkward totals', () => {
    for (const amount of [0.01, 0.1, 1, 9.99, 100, 123.45, 1000.01]) {
      for (const n of [1, 2, 3, 6, 7]) {
        const ids = Array.from({ length: n }, (_, i) => `u${i}`);
        for (const payerId of ['u0', 'outsider']) {
          const eq = materializeSplits(amount, { splitType: 'equal', participantIds: ids, payerId });
          expect(sumCents(eq), `equal ${amount}/${n}/${payerId}`).toBe(Math.round(amount * 100));
          const shares = Object.fromEntries(ids.map((id) => [id, 100 / n]));
          const pct = materializeSplits(amount, { splitType: 'percentage', shares, payerId });
          expect(sumCents(pct), `percentage ${amount}/${n}/${payerId}`).toBe(Math.round(amount * 100));
        }
      }
    }
  });
});
