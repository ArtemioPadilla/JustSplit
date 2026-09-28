import { beforeEach, describe, expect, it } from 'vitest';
import type { Expense } from '../schemas/expense';
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

describe('calculateSettlements (plan B3, spec D10 — consumes splits[])', () => {
  it('returns an empty array for no expenses', () => {
    expect(calculateSettlements([], [])).toEqual([]);
  });

  it('calculates settlements for a simple equal-split expense (equal unchanged on the ported fixture)', () => {
    const expenses = [makeExpense({ amount: 100, paidBy: 'user1', participantIds: ['user1', 'user2'] })];

    const result = calculateSettlements(expenses, ['user1', 'user2']);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ fromUser: 'user2', toUser: 'user1', amount: 50, expenseIds: ['exp1'] }));
  });

  it('ignores settled expenses (settledAt != null)', () => {
    const expenses = [makeExpense({ amount: 100, paidBy: 'user1', participantIds: ['user1', 'user2'], settledAt: '2026-09-28T00:00:00.000Z' })];
    expect(calculateSettlements(expenses, ['user1', 'user2'])).toHaveLength(0);
  });

  it('handles multiple expenses with circular debts (equal unchanged on the ported fixture)', () => {
    const expenses = [
      makeExpense({ amount: 60, paidBy: 'user1', participantIds: ['user1', 'user2', 'user3'] }),
      makeExpense({ amount: 90, paidBy: 'user2', participantIds: ['user1', 'user2', 'user3'] }),
      makeExpense({ amount: 30, paidBy: 'user3', participantIds: ['user1', 'user2', 'user3'] }),
    ];

    const result = calculateSettlements(expenses, ['user1', 'user2', 'user3']);
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

    const resultEvent1 = calculateSettlements(expenses, ['user1', 'user2'], 'event1');
    expect(resultEvent1).toHaveLength(1);
    expect(resultEvent1[0].amount).toBe(50);
    expect(resultEvent1[0].expenseIds).toEqual(['exp1']);

    const resultEvent2 = calculateSettlements(expenses, ['user1', 'user2'], 'event2');
    expect(resultEvent2).toHaveLength(1);
    expect(resultEvent2[0].amount).toBe(100);
    expect(resultEvent2[0].expenseIds).toEqual(['exp2']);
  });
});

describe('calculateSettlementsWithConversion', () => {
  it('converts currencies when calculating settlements', async () => {
    const expenses = [
      makeExpense({ amount: 100, currency: 'USD', paidBy: 'user1', participantIds: ['user1', 'user2'] }),
      makeExpense({ amount: 100, currency: 'EUR', paidBy: 'user2', participantIds: ['user1', 'user2'] }),
    ];

    const convert: ConvertCurrency = async (amount) => ({ convertedAmount: amount * 1.5, isFallback: false });
    const result = await calculateSettlementsWithConversion(expenses, ['user1', 'user2'], 'USD', convert);

    // user1 paid USD 100 (fair share 125), user2 paid EUR 100 = USD 150 (fair share 125):
    // user1 underpaid by 25, so user1 owes user2 USD 25.
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ fromUser: 'user1', toUser: 'user2', amount: 25 }));
  });

  it('returns an empty array when there are no unsettled expenses', async () => {
    const convert: ConvertCurrency = async (amount) => ({ convertedAmount: amount, isFallback: false });
    expect(await calculateSettlementsWithConversion([], [], 'USD', convert)).toEqual([]);
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
