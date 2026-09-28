import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Expense } from '@/schemas/expense';
import type { Event } from '@/schemas/event';
import type { Settlement } from '@/schemas/settlement';
import { balancesWithUser, categoryDistribution, involvingUser, monthlyTotals, openBalanceCount, totalSpent, upcomingEvents } from './dashboard';

/** New suite (plan B8a): pure dashboard selectors had no equivalent in the legacy tree (the
 * hand-rolled Dashboard components read `AppContext` and computed inline). */

const identity = (amount: number, _currency: string): number => amount;

function makeExpense(overrides: Partial<Expense> & Pick<Expense, 'amount' | 'paidBy' | 'date'>): Expense {
  return {
    id: 'exp1',
    groupId: null,
    description: 'Lunch',
    currency: 'USD',
    splitType: 'equal',
    splits: [],
    memberIds: [overrides.paidBy],
    createdBy: overrides.paidBy,
    createdAt: '2026-01-01T00:00:00.000Z',
    settledAt: null,
    ...overrides,
  };
}

function makeSettlement(overrides: Partial<Settlement> & Pick<Settlement, 'fromUserId' | 'toUserId' | 'amount'>): Settlement {
  return {
    id: 'set1',
    groupId: null,
    currency: 'USD',
    date: '2026-01-05',
    memberIds: [overrides.fromUserId, overrides.toUserId],
    createdBy: overrides.fromUserId,
    createdAt: '2026-01-05T00:00:00.000Z',
    eventId: null,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<Event> & Pick<Event, 'id' | 'name'>): Event {
  return {
    memberIds: ['user1'],
    kind: 'event',
    createdBy: 'user1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('involvingUser (ADR 0013: rows the viewer can see because of a group or event are not "theirs")', () => {
  const mine = makeExpense({ id: 'mine', amount: 10, paidBy: 'u1', date: '2026-05-01', memberIds: ['u1', 'u2'] });
  const groupFeed = makeExpense({ id: 'feed', amount: 999, paidBy: 'u2', date: '2026-05-01', memberIds: ['u2', 'u3'], groupId: 'g1' });
  const eventFeed = makeExpense({ id: 'evt', amount: 999, paidBy: 'u3', date: '2026-05-01', memberIds: ['u3'], eventId: 'ev1' });

  it('keeps only the rows whose memberIds name the user', () => {
    expect(involvingUser([mine, groupFeed, eventFeed], 'u1').map((e) => e.id)).toEqual(['mine']);
    expect(involvingUser([mine, groupFeed, eventFeed], 'u3').map((e) => e.id)).toEqual(['feed', 'evt']);
  });

  it('works for any row with memberIds (settlements too), keeps the input untouched and returns [] when nothing names the user', () => {
    const rows = [{ id: 's1', memberIds: ['u1', 'u2'] }, { id: 's2', memberIds: ['u2', 'u3'] }];
    expect(involvingUser(rows, 'u1')).toEqual([{ id: 's1', memberIds: ['u1', 'u2'] }]);
    expect(rows).toHaveLength(2);
    expect(involvingUser(rows, 'nobody')).toEqual([]);
  });

  it('makes the dashboard totals personal: a group row the user is not in does not inflate totalSpent', () => {
    const all = [mine, groupFeed, eventFeed];
    expect(totalSpent(all, identity)).toBe(2008);
    expect(totalSpent(involvingUser(all, 'u1'), identity)).toBe(10);
  });
});

describe('monthlyTotals', () => {
  it('returns the last 6 months oldest-first, including zero months, when there are no expenses', () => {
    const now = new Date(2026, 8, 28); // Sep 28 2026 (month is 0-indexed)
    const result = monthlyTotals([], identity, now);

    expect(result).toHaveLength(6);
    expect(result.map((m) => m.month)).toEqual(['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026']);
    expect(result.every((m) => m.total === 0 && m.count === 0)).toBe(true);
  });

  it('sums expenses into the month they fall in and converts through the injected function', () => {
    const now = new Date(2026, 8, 28);
    const convertDoubling = (amount: number) => amount * 2;
    const expenses = [
      makeExpense({ amount: 10, paidBy: 'user1', date: '2026-09-01', currency: 'EUR' }),
      makeExpense({ amount: 5, paidBy: 'user1', date: '2026-09-15', currency: 'EUR' }),
    ];

    const result = monthlyTotals(expenses, convertDoubling, now);
    const sep = result.find((m) => m.month === 'Sep 2026')!;
    expect(sep.total).toBe(30); // (10 + 5) * 2
    expect(sep.count).toBe(2);
  });

  it('ignores expenses outside the 6-month window', () => {
    const now = new Date(2026, 8, 28);
    const expenses = [makeExpense({ amount: 999, paidBy: 'user1', date: '2025-01-01' })];
    const result = monthlyTotals(expenses, identity, now);
    expect(result.reduce((sum, m) => sum + m.total, 0)).toBe(0);
  });
});

describe('categoryDistribution', () => {
  it('treats a missing or empty category as Uncategorized', () => {
    const expenses = [
      makeExpense({ amount: 10, paidBy: 'user1', date: '2026-01-01' }), // no category
      makeExpense({ amount: 10, paidBy: 'user1', date: '2026-01-01', category: '' }),
      makeExpense({ amount: 10, paidBy: 'user1', date: '2026-01-01', category: '   ' }),
    ];
    const result = categoryDistribution(expenses, identity);
    expect(result).toEqual([{ category: 'Uncategorized', total: 30, percentage: 100 }]);
  });

  it('groups by the raw category string and computes percentages over the grand total', () => {
    const expenses = [
      makeExpense({ amount: 75, paidBy: 'user1', date: '2026-01-01', category: 'Food' }),
      makeExpense({ amount: 25, paidBy: 'user1', date: '2026-01-01', category: 'Transport' }),
    ];
    const result = categoryDistribution(expenses, identity);
    expect(result).toEqual([
      { category: 'Food', total: 75, percentage: 75 },
      { category: 'Transport', total: 25, percentage: 25 },
    ]);
  });

  it('converts mixed currencies through the injected convert function before grouping', () => {
    const convert = (amount: number, currency: string) => (currency === 'EUR' ? amount * 2 : amount);
    const expenses = [
      makeExpense({ amount: 10, paidBy: 'user1', date: '2026-01-01', category: 'Food', currency: 'EUR' }),
      makeExpense({ amount: 10, paidBy: 'user1', date: '2026-01-01', category: 'Food', currency: 'USD' }),
    ];
    const result = categoryDistribution(expenses, convert);
    expect(result).toEqual([{ category: 'Food', total: 30, percentage: 100 }]);
  });

  it('returns an empty array for no expenses', () => {
    expect(categoryDistribution([], identity)).toEqual([]);
  });
});

describe('balancesWithUser', () => {
  it('computes a positive balance when the current user paid and someone else owes their share', () => {
    const expenses = [
      makeExpense({
        amount: 100,
        paidBy: 'you',
        date: '2026-01-01',
        splits: [
          { userId: 'you', amount: 50 },
          { userId: 'alex', amount: 50 },
        ],
      }),
    ];
    const result = balancesWithUser(expenses, [], 'you', { alex: 'Alex' }, identity);
    expect(result).toEqual([{ userId: 'alex', name: 'Alex', balance: 50 }]);
  });

  it('computes a negative balance when someone else paid and the current user owes their share', () => {
    const expenses = [
      makeExpense({
        amount: 100,
        paidBy: 'alex',
        date: '2026-01-01',
        splits: [
          { userId: 'alex', amount: 50 },
          { userId: 'you', amount: 50 },
        ],
      }),
    ];
    const result = balancesWithUser(expenses, [], 'you', { alex: 'Alex' }, identity);
    expect(result).toEqual([{ userId: 'alex', name: 'Alex', balance: -50 }]);
  });

  it('handles a payer outside the participants (paidBy has no split of their own)', () => {
    const expenses = [
      makeExpense({
        amount: 100,
        paidBy: 'ghost',
        date: '2026-01-01',
        splits: [
          { userId: 'you', amount: 50 },
          { userId: 'alex', amount: 50 },
        ],
      }),
    ];
    // "you" owe the ghost payer your own share; "alex" is unrelated to "you" in this expense.
    const result = balancesWithUser(expenses, [], 'you', { ghost: 'Ghost', alex: 'Alex' }, identity);
    expect(result).toEqual([{ userId: 'ghost', name: 'Ghost', balance: -50 }]);
  });

  it('falls back to Unknown when no name is provided for a counterparty', () => {
    const expenses = [
      makeExpense({
        amount: 20,
        paidBy: 'you',
        date: '2026-01-01',
        splits: [
          { userId: 'you', amount: 10 },
          { userId: 'mystery', amount: 10 },
        ],
      }),
    ];
    const result = balancesWithUser(expenses, [], 'you', {}, identity);
    expect(result).toEqual([{ userId: 'mystery', name: 'Unknown', balance: 10 }]);
  });

  it('converts mixed currencies before summing and ignores legacy settled expenses (settledAt)', () => {
    const convert = (amount: number, currency: string) => (currency === 'EUR' ? amount * 2 : amount);
    const expenses = [
      makeExpense({
        amount: 20,
        paidBy: 'you',
        date: '2026-01-01',
        currency: 'EUR',
        splits: [
          { userId: 'you', amount: 10 },
          { userId: 'alex', amount: 10 },
        ],
      }),
      makeExpense({
        amount: 999,
        paidBy: 'alex',
        date: '2026-01-01',
        settledAt: '2026-01-02T00:00:00.000Z',
        splits: [
          { userId: 'alex', amount: 500 },
          { userId: 'you', amount: 499 },
        ],
      }),
    ];
    const result = balancesWithUser(expenses, [], 'you', { alex: 'Alex' }, convert);
    expect(result).toEqual([{ userId: 'alex', name: 'Alex', balance: 20 }]); // 10 EUR -> 20, settled expense ignored
  });

  it('drops relationships that round to exactly zero', () => {
    const expenses = [
      makeExpense({
        amount: 20,
        paidBy: 'you',
        date: '2026-01-01',
        splits: [
          { userId: 'you', amount: 10 },
          { userId: 'alex', amount: 10 },
        ],
      }),
      makeExpense({
        amount: 20,
        paidBy: 'alex',
        date: '2026-01-01',
        splits: [
          { userId: 'alex', amount: 10 },
          { userId: 'you', amount: 10 },
        ],
      }),
    ];
    const result = balancesWithUser(expenses, [], 'you', { alex: 'Alex' }, identity);
    expect(result).toEqual([]);
  });
});

describe('balancesWithUser — the ledger model (plan B14a, ADR 0014): a settlement is a payment', () => {
  // You paid 90 for you, Alex and Carla.
  const dinner = () =>
    makeExpense({
      amount: 90,
      paidBy: 'you',
      date: '2026-01-01',
      memberIds: ['you', 'alex', 'carla'],
      splits: [
        { userId: 'you', amount: 30 },
        { userId: 'alex', amount: 30 },
        { userId: 'carla', amount: 30 },
      ],
    });
  const names = { alex: 'Alex', carla: 'Carla' };

  it('three-person expense, one pair settles: the third person\'s debt is intact', () => {
    const paid = makeSettlement({ fromUserId: 'alex', toUserId: 'you', amount: 30 });
    expect(balancesWithUser([dinner()], [paid], 'you', names, identity)).toEqual([{ userId: 'carla', name: 'Carla', balance: 30 }]);
  });

  it('a partial payment lowers the balance by exactly the paid amount', () => {
    const paid = makeSettlement({ fromUserId: 'alex', toUserId: 'you', amount: 12.5 });
    const result = balancesWithUser([dinner()], [paid], 'you', names, identity);
    expect(result.find((b) => b.userId === 'alex')?.balance).toBe(17.5);
    expect(result.find((b) => b.userId === 'carla')?.balance).toBe(30);
  });

  it('your own payment counts the other way: paying what you owe clears it, paying part leaves the rest', () => {
    const theirs = makeExpense({ amount: 100, paidBy: 'alex', date: '2026-01-01', memberIds: ['you', 'alex'], splits: [{ userId: 'alex', amount: 50 }, { userId: 'you', amount: 50 }] });
    expect(balancesWithUser([theirs], [makeSettlement({ fromUserId: 'you', toUserId: 'alex', amount: 50 })], 'you', names, identity)).toEqual([]);
    expect(balancesWithUser([theirs], [makeSettlement({ fromUserId: 'you', toUserId: 'alex', amount: 20 })], 'you', names, identity)).toEqual([
      { userId: 'alex', name: 'Alex', balance: -30 },
    ]);
  });

  it('a settlement in another currency is converted like an expense amount', () => {
    const convert = (amount: number, currency: string) => (currency === 'EUR' ? amount * 2 : amount);
    const paid = makeSettlement({ fromUserId: 'alex', toUserId: 'you', amount: 5, currency: 'EUR' });
    expect(balancesWithUser([dinner()], [paid], 'you', names, convert).find((b) => b.userId === 'alex')?.balance).toBe(20);
  });

  it('a settlement between two other people never touches your balances', () => {
    const between = makeSettlement({ fromUserId: 'alex', toUserId: 'carla', amount: 30 });
    const result = balancesWithUser([dinner()], [between], 'you', names, identity);
    expect(result).toEqual([
      { userId: 'alex', name: 'Alex', balance: 30 },
      { userId: 'carla', name: 'Carla', balance: 30 },
    ]);
  });

  it('the global scope counts every settlement that names you, whatever its eventId or groupId', () => {
    const inEvent = makeSettlement({ id: 'a', fromUserId: 'alex', toUserId: 'you', amount: 10, eventId: 'ev1' });
    const inGroup = makeSettlement({ id: 'b', fromUserId: 'alex', toUserId: 'you', amount: 5, groupId: 'g1' });
    const loose = makeSettlement({ id: 'c', fromUserId: 'alex', toUserId: 'you', amount: 2.5 });
    expect(balancesWithUser([dinner()], [inEvent, inGroup, loose], 'you', names, identity).find((b) => b.userId === 'alex')?.balance).toBe(12.5);
  });

  it('a legacy settled expense (settledAt) is excluded, so imported data stays correct', () => {
    const legacy = { ...dinner(), settledAt: '2026-01-02T00:00:00.000Z' };
    expect(balancesWithUser([legacy], [], 'you', names, identity)).toEqual([]);
  });

  it('an overpayment flips the direction', () => {
    const paid = makeSettlement({ fromUserId: 'alex', toUserId: 'you', amount: 40 });
    expect(balancesWithUser([dinner()], [paid], 'you', names, identity).find((b) => b.userId === 'alex')?.balance).toBe(-10);
  });

  it('a settlement with someone you share no expense with still shows (money moved)', () => {
    expect(balancesWithUser([], [makeSettlement({ fromUserId: 'you', toUserId: 'alex', amount: 15 })], 'you', names, identity)).toEqual([
      { userId: 'alex', name: 'Alex', balance: 15 },
    ]);
  });
});

describe('openBalanceCount (plan B14a: replaces unsettledCount — an honest figure, not a per-expense flag)', () => {
  it('counts the people you have a non-zero balance with, in either direction', () => {
    expect(
      openBalanceCount([
        { userId: 'a', name: 'A', balance: 30 },
        { userId: 'b', name: 'B', balance: -12.5 },
      ]),
    ).toBe(2);
  });

  it('does not count a balance below one cent', () => {
    expect(openBalanceCount([{ userId: 'a', name: 'A', balance: 0.004 }, { userId: 'b', name: 'B', balance: 0 }])).toBe(0);
  });

  it('is 0 when everyone is settled up', () => {
    expect(openBalanceCount([])).toBe(0);
  });

  it('follows the ledger: after one of two debtors pays, one person is left', () => {
    const dinner = makeExpense({
      amount: 90,
      paidBy: 'you',
      date: '2026-01-01',
      splits: [{ userId: 'you', amount: 30 }, { userId: 'alex', amount: 30 }, { userId: 'carla', amount: 30 }],
    });
    const paid = makeSettlement({ fromUserId: 'alex', toUserId: 'you', amount: 30 });
    expect(openBalanceCount(balancesWithUser([dinner], [paid], 'you', {}, identity))).toBe(1);
  });
});

describe('upcomingEvents', () => {
  it('returns only events starting today or later, soonest first, capped at 3', () => {
    const now = new Date(2026, 8, 28); // Sep 28 2026
    const events = [
      makeEvent({ id: 'past', name: 'Past trip', startDate: '2026-09-01' }),
      makeEvent({ id: 'today', name: 'Today', startDate: '2026-09-28' }),
      makeEvent({ id: 'soon', name: 'Soon', startDate: '2026-10-01' }),
      makeEvent({ id: 'later', name: 'Later', startDate: '2026-11-01' }),
      makeEvent({ id: 'latest', name: 'Latest', startDate: '2026-12-01' }),
    ];
    const result = upcomingEvents(events, now);
    expect(result.map((e) => e.id)).toEqual(['today', 'soon', 'later']);
  });

  it('falls back to `date` when `startDate` is absent, and drops events with neither', () => {
    const now = new Date(2026, 8, 28);
    const events = [
      makeEvent({ id: 'has-date', name: 'Has date', date: '2026-10-05' }),
      makeEvent({ id: 'no-date', name: 'No date at all' }),
    ];
    const result = upcomingEvents(events, now);
    expect(result.map((e) => e.id)).toEqual(['has-date']);
  });
});

/**
 * Plan B8b: `totalSpent` and (until B14a replaced it with `openBalanceCount`) `unsettledCount` were the ONLY two figures the
 * legacy `FinancialSummary` actually computed from real data — every other
 * prop it accepted (`compareWithLastMonth`, `avgPerDay`,
 * `mostExpensiveCategory`, `activeEvents`, `activeParticipants`,
 * `highestExpense`) was fed a hardcoded default by `page.tsx` and never a
 * real value, so those are not ported (spec §6, plan B8b decision).
 */
describe('totalSpent', () => {
  it('sums every expense (settled and unsettled) through the injected convert function', () => {
    const expenses = [
      makeExpense({ amount: 10, paidBy: 'user1', date: '2026-01-01', settledAt: null }),
      makeExpense({ amount: 20, paidBy: 'user1', date: '2026-01-02', settledAt: '2026-01-03T00:00:00.000Z' }),
    ];
    expect(totalSpent(expenses, identity)).toBe(30);
  });

  it('converts each expense through its own currency', () => {
    const convert = (amount: number, currency: string) => (currency === 'EUR' ? amount * 2 : amount);
    const expenses = [
      makeExpense({ amount: 10, currency: 'USD', paidBy: 'user1', date: '2026-01-01' }),
      makeExpense({ amount: 10, currency: 'EUR', paidBy: 'user1', date: '2026-01-02' }),
    ];
    expect(totalSpent(expenses, convert)).toBe(30);
  });

  it('is 0 for no expenses', () => {
    expect(totalSpent([], identity)).toBe(0);
  });
});

/**
 * Bug fix (found in B8a review): `expense.date`/`event.startDate` are
 * calendar-date strings (`YYYY-MM-DD`) from an `<input type="date">`, but
 * `new Date('2026-03-01')` parses that as UTC midnight — anyone west of UTC
 * (the user base is largely in Mexico, UTC-6) reads it back as the PREVIOUS
 * local day. Pinned to America/Mexico_City so these fail for the right
 * reason regardless of where/when the suite runs.
 */
describe('monthlyTotals / upcomingEvents — timezone-safe calendar-date parsing (bug fix)', () => {
  let originalTZ: string | undefined;

  beforeAll(() => {
    originalTZ = process.env.TZ;
    process.env.TZ = 'America/Mexico_City';
  });

  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  it('monthlyTotals buckets an expense dated the 1st of the month into that month, not the previous one', () => {
    const now = new Date(2026, 2, 15); // Mar 15 2026, local
    const expenses = [makeExpense({ amount: 10, paidBy: 'user1', date: '2026-03-01' })];

    const result = monthlyTotals(expenses, identity, now);
    const march = result.find((m) => m.month === 'Mar 2026')!;
    const february = result.find((m) => m.month === 'Feb 2026')!;

    expect(march.total).toBe(10);
    expect(march.count).toBe(1);
    expect(february.total).toBe(0);
    expect(february.count).toBe(0);
  });

  it('upcomingEvents includes an event starting today, not drops it as already past', () => {
    const now = new Date(2026, 2, 15); // Mar 15 2026, local midnight
    const events = [makeEvent({ id: 'today', name: 'Today', startDate: '2026-03-15' })];

    const result = upcomingEvents(events, now);
    expect(result.map((e) => e.id)).toEqual(['today']);
  });
});
