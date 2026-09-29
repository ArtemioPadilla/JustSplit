import { describe, expect, it } from 'vitest';
import type { Expense } from '@/schemas/expense';
import type { Settlement } from '@/schemas/settlement';
import {
  isLegacySettled,
  isSettledUp,
  netBalances,
  round2,
  settlementProgress,
  settlementsBetween,
  settlementsForEvent,
} from './ledger';

/**
 * Plan B14a (ADR 0014): the ledger model. A person's balance in a scope is
 * their split debts and credits over EVERY expense in it, minus the
 * settlements in it — never a per-expense "settled" flag. Positive = is owed.
 */

const identity = (amount: number) => amount;

function expense(overrides: Partial<Expense> & Pick<Expense, 'id' | 'paidBy' | 'amount' | 'splits'>): Expense {
  return {
    groupId: null,
    description: 'Dinner',
    currency: 'USD',
    splitType: 'equal',
    date: '2026-09-28',
    memberIds: overrides.splits.map((s) => s.userId),
    createdBy: overrides.paidBy,
    createdAt: '2026-09-28T00:00:00.000Z',
    settledAt: null,
    ...overrides,
  };
}

function settlement(overrides: Partial<Settlement> & Pick<Settlement, 'id' | 'fromUserId' | 'toUserId' | 'amount'>): Settlement {
  return {
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

// The bug this model exists to fix: Ana paid 90, split between Ana, Beto and Carla.
const DINNER = expense({
  id: 'dinner',
  paidBy: 'ana',
  amount: 90,
  splits: [
    { userId: 'ana', amount: 30 },
    { userId: 'beto', amount: 30 },
    { userId: 'carla', amount: 30 },
  ],
});

describe('round2', () => {
  it('rounds to cents and never returns -0', () => {
    expect(round2(1.005 + 0.0001)).toBe(1.01);
    expect(Object.is(round2(-0.001), 0)).toBe(true);
  });
});

describe('netBalances', () => {
  it('with no settlements: the payer is owed both debts, each debtor owes their own share', () => {
    expect(netBalances([DINNER], [], identity)).toEqual({ ana: 60, beto: -30, carla: -30 });
  });

  it('three-person expense, one pair settles: the third person\'s debt is intact', () => {
    const balances = netBalances([DINNER], [settlement({ id: 's1', fromUserId: 'beto', toUserId: 'ana', amount: 30 })], identity);
    expect(balances).toEqual({ ana: 30, beto: 0, carla: -30 });
  });

  it('a partial payment lowers the balance by exactly the paid amount', () => {
    const balances = netBalances([DINNER], [settlement({ id: 's1', fromUserId: 'beto', toUserId: 'ana', amount: 12.5 })], identity);
    expect(balances.beto).toBe(-17.5);
    expect(balances.ana).toBe(47.5);
    expect(balances.carla).toBe(-30);
  });

  it('a settlement moves money F to T: it raises F\'s balance and lowers T\'s', () => {
    const balances = netBalances([], [settlement({ id: 's1', fromUserId: 'beto', toUserId: 'ana', amount: 10 })], identity);
    expect(balances).toEqual({ beto: 10, ana: -10 });
  });

  it('converts a settlement in another currency like an expense amount', () => {
    const eurToUsd = (amount: number, currency: string) => (currency === 'EUR' ? amount * 2 : amount);
    const balances = netBalances(
      [DINNER],
      [settlement({ id: 's1', fromUserId: 'beto', toUserId: 'ana', amount: 10, currency: 'EUR' })],
      eurToUsd,
    );
    // 10 EUR = 20 USD.
    expect(balances.beto).toBe(-10);
    expect(balances.ana).toBe(40);
  });

  it('excludes a legacy settled expense (settledAt != null) so imported data stays correct', () => {
    const legacy = expense({ ...DINNER, id: 'legacy', settledAt: '2026-01-01T00:00:00.000Z' });
    expect(netBalances([legacy], [], identity)).toEqual({});
  });

  it('a payer outside the split is credited without a debit', () => {
    const gift = expense({ id: 'gift', paidBy: 'ana', amount: 40, splits: [{ userId: 'beto', amount: 20 }, { userId: 'carla', amount: 20 }] });
    expect(netBalances([gift], [], identity)).toEqual({ ana: 40, beto: -20, carla: -20 });
  });

  it('ignores a settlement from a person to themselves', () => {
    expect(netBalances([], [settlement({ id: 's1', fromUserId: 'ana', toUserId: 'ana', amount: 5, memberIds: ['ana'] })], identity)).toEqual({});
  });

  it('rounds each figure to cents', () => {
    const third = expense({ id: 't', paidBy: 'ana', amount: 10, splits: [{ userId: 'ana', amount: 3.333 }, { userId: 'beto', amount: 3.333 }, { userId: 'carla', amount: 3.334 }] });
    const balances = netBalances([third], [], identity);
    expect(balances.beto).toBe(-3.33);
    expect(balances.carla).toBe(-3.33);
  });
});

describe('netBalances is zero-sum by construction (per-split pairing, not amount)', () => {
  const total = (balances: Record<string, number>) => Object.values(balances).reduce((sum, b) => sum + b, 0);

  it('an expense whose splits sum to LESS than its amount still yields balances that sum to 0', () => {
    const short = expense({
      id: 'short',
      paidBy: 'ana',
      amount: 100,
      splits: [{ userId: 'ana', amount: 30 }, { userId: 'beto', amount: 30 }, { userId: 'carla', amount: 30 }],
    });
    const balances = netBalances([short], [], identity);
    expect(Math.abs(total(balances))).toBeLessThan(0.01);
    expect(balances).toEqual({ ana: 60, beto: -30, carla: -30 });
  });

  it('an expense whose splits sum to MORE than its amount still yields balances that sum to 0', () => {
    const long = expense({
      id: 'long',
      paidBy: 'ana',
      amount: 80,
      splits: [{ userId: 'ana', amount: 30 }, { userId: 'beto', amount: 30 }, { userId: 'carla', amount: 30 }],
    });
    const balances = netBalances([long], [], identity);
    expect(Math.abs(total(balances))).toBeLessThan(0.01);
    expect(balances).toEqual({ ana: 60, beto: -30, carla: -30 });
  });

  it('a payer outside the split is credited exactly what the split users are debited', () => {
    const gift = expense({ id: 'gift', paidBy: 'ana', amount: 45, splits: [{ userId: 'beto', amount: 20 }, { userId: 'carla', amount: 20 }] });
    const balances = netBalances([gift], [], identity);
    expect(balances).toEqual({ ana: 40, beto: -20, carla: -20 });
  });

  it('a two-currency scope sums to 0 even when a foreign expense\'s splits do not add up to its amount', () => {
    const eurToUsd = (amount: number, currency: string) => (currency === 'EUR' ? amount * 1.1 : amount);
    const usd = expense({ id: 'usd', paidBy: 'ana', amount: 90, splits: [{ userId: 'ana', amount: 30 }, { userId: 'beto', amount: 30 }, { userId: 'carla', amount: 30 }] });
    const eur = expense({
      id: 'eur',
      paidBy: 'beto',
      amount: 10,
      currency: 'EUR',
      splits: [{ userId: 'ana', amount: 3.3 }, { userId: 'beto', amount: 3.3 }, { userId: 'carla', amount: 3.3 }],
    });
    const pay = settlement({ id: 'p', fromUserId: 'carla', toUserId: 'beto', amount: 2, currency: 'EUR' });
    expect(Math.abs(total(netBalances([usd, eur], [pay], eurToUsd)))).toBeLessThan(0.01);
  });

  it('a mismatched expense does not leave a phantom "still owed" once its real debts are paid', () => {
    const short = expense({
      id: 'short',
      paidBy: 'ana',
      amount: 100,
      splits: [{ userId: 'ana', amount: 30 }, { userId: 'beto', amount: 30 }, { userId: 'carla', amount: 30 }],
    });
    const payments = [
      settlement({ id: 's1', fromUserId: 'beto', toUserId: 'ana', amount: 30 }),
      settlement({ id: 's2', fromUserId: 'carla', toUserId: 'ana', amount: 30 }),
    ];
    expect(isSettledUp(netBalances([short], payments, identity))).toBe(true);
    expect(settlementProgress([short], payments, identity)).toEqual({ settled: 60, outstanding: 0, percentage: 100, settledUp: true });
  });

  it('a legacy settled expense counts as settled value from its non-payer splits (already per-split, so consistent)', () => {
    const legacy = expense({
      id: 'legacy',
      paidBy: 'ana',
      amount: 100,
      settledAt: '2026-01-01T00:00:00.000Z',
      splits: [{ userId: 'ana', amount: 30 }, { userId: 'beto', amount: 30 }, { userId: 'carla', amount: 30 }],
    });
    expect(settlementProgress([legacy], [], identity)).toEqual({ settled: 60, outstanding: 0, percentage: 100, settledUp: true });
  });
});

describe('isSettledUp', () => {
  it('is true when every balance is below one cent, including an empty scope', () => {
    expect(isSettledUp({})).toBe(true);
    expect(isSettledUp({ ana: 0.004, beto: -0.004 })).toBe(true);
  });

  it('is false as soon as one balance reaches a cent (the greedy pass\'s own tolerance)', () => {
    expect(isSettledUp({ ana: 0.01, beto: -0.01 })).toBe(false);
    expect(isSettledUp({ ana: 30, beto: 0, carla: -30 })).toBe(false);
  });
});

describe('settlementProgress', () => {
  it('reads "nothing to settle" (null percentage) when nothing is owed and nothing was settled', () => {
    expect(settlementProgress([], [], identity)).toEqual({ settled: 0, outstanding: 0, percentage: null, settledUp: true });
    const alone = expense({ id: 'solo', paidBy: 'ana', amount: 20, splits: [{ userId: 'ana', amount: 20 }] });
    expect(settlementProgress([alone], [], identity).percentage).toBeNull();
  });

  it('is 0% with debts and no payments', () => {
    expect(settlementProgress([DINNER], [], identity)).toEqual({ settled: 0, outstanding: 60, percentage: 0, settledUp: false });
  });

  it('is settled amount over settled plus outstanding', () => {
    const progress = settlementProgress([DINNER], [settlement({ id: 's1', fromUserId: 'beto', toUserId: 'ana', amount: 30 })], identity);
    // 30 settled, 30 still owed (Carla).
    expect(progress).toEqual({ settled: 30, outstanding: 30, percentage: 50, settledUp: false });
  });

  it('is 100% and settled up once every debt is paid', () => {
    const progress = settlementProgress(
      [DINNER],
      [
        settlement({ id: 's1', fromUserId: 'beto', toUserId: 'ana', amount: 30 }),
        settlement({ id: 's2', fromUserId: 'carla', toUserId: 'ana', amount: 30 }),
      ],
      identity,
    );
    expect(progress).toEqual({ settled: 60, outstanding: 0, percentage: 100, settledUp: true });
  });

  it('counts a legacy settled expense as settled value (what its debtors owed) and never as outstanding', () => {
    const legacy = expense({ ...DINNER, id: 'legacy', settledAt: '2026-01-01T00:00:00.000Z' });
    const open = expense({ id: 'open', paidBy: 'ana', amount: 60, splits: [{ userId: 'ana', amount: 30 }, { userId: 'beto', amount: 30 }] });
    // legacy: 60 of debts already settled; open: Beto owes 30.
    expect(settlementProgress([legacy, open], [], identity)).toEqual({ settled: 60, outstanding: 30, percentage: 66.67, settledUp: false });
    expect(settlementProgress([legacy], [], identity)).toEqual({ settled: 60, outstanding: 0, percentage: 100, settledUp: true });
  });

  it('converts settlements and legacy value into the display currency', () => {
    const eurToUsd = (amount: number, currency: string) => (currency === 'EUR' ? amount * 2 : amount);
    const progress = settlementProgress(
      [DINNER],
      [settlement({ id: 's1', fromUserId: 'beto', toUserId: 'ana', amount: 10, currency: 'EUR' })],
      eurToUsd,
    );
    expect(progress).toMatchObject({ settled: 20, outstanding: 40, percentage: 33.33 });
  });
});

describe('scope helpers', () => {
  const inEvent = settlement({ id: 'in', fromUserId: 'beto', toUserId: 'ana', amount: 5, eventId: 'ev1' });
  const otherEvent = settlement({ id: 'other', fromUserId: 'beto', toUserId: 'ana', amount: 5, eventId: 'ev2' });
  const noEvent = settlement({ id: 'none', fromUserId: 'beto', toUserId: 'ana', amount: 5, eventId: null });
  const undefinedEvent = settlement({ id: 'undef', fromUserId: 'beto', toUserId: 'ana', amount: 5, eventId: undefined });

  it('settlementsForEvent keeps only the settlements with that eventId', () => {
    expect(settlementsForEvent([inEvent, otherEvent, noEvent, undefinedEvent], 'ev1').map((s) => s.id)).toEqual(['in']);
  });

  it('settlementsBetween keeps only settlements between the two people, in either direction', () => {
    const forward = settlement({ id: 'a', fromUserId: 'ana', toUserId: 'beto', amount: 1 });
    const backward = settlement({ id: 'b', fromUserId: 'beto', toUserId: 'ana', amount: 1 });
    const withCarla = settlement({ id: 'c', fromUserId: 'ana', toUserId: 'carla', amount: 1 });
    const carlaBeto = settlement({ id: 'd', fromUserId: 'carla', toUserId: 'beto', amount: 1 });
    expect(settlementsBetween([forward, backward, withCarla, carlaBeto], 'ana', 'beto').map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('isLegacySettled is settledAt != null, treating null and undefined alike', () => {
    expect(isLegacySettled({ settledAt: '2026-01-01T00:00:00.000Z' })).toBe(true);
    expect(isLegacySettled({ settledAt: null })).toBe(false);
    expect(isLegacySettled({ settledAt: undefined })).toBe(false);
  });
});
