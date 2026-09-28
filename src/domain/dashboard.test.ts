import { describe, expect, it } from 'vitest';
import type { Expense } from '@/schemas/expense';
import type { Event } from '@/schemas/event';
import { balancesWithUser, categoryDistribution, monthlyTotals, upcomingEvents } from './dashboard';

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

function makeEvent(overrides: Partial<Event> & Pick<Event, 'id' | 'name'>): Event {
  return {
    memberIds: ['user1'],
    kind: 'event',
    createdBy: 'user1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

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
    const result = balancesWithUser(expenses, 'you', { alex: 'Alex' }, identity);
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
    const result = balancesWithUser(expenses, 'you', { alex: 'Alex' }, identity);
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
    const result = balancesWithUser(expenses, 'you', { ghost: 'Ghost', alex: 'Alex' }, identity);
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
    const result = balancesWithUser(expenses, 'you', {}, identity);
    expect(result).toEqual([{ userId: 'mystery', name: 'Unknown', balance: 10 }]);
  });

  it('converts mixed currencies before summing and ignores settled expenses', () => {
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
    const result = balancesWithUser(expenses, 'you', { alex: 'Alex' }, convert);
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
    const result = balancesWithUser(expenses, 'you', { alex: 'Alex' }, identity);
    expect(result).toEqual([]);
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
