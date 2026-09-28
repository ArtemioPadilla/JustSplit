// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withBase } from '@/lib/href';
import type { Expense } from '@/schemas/expense';
import { RecentExpenses } from './RecentExpenses';

/**
 * Ported from `Dashboard/__tests__/RecentExpenses.test.tsx` (plan B8b), onto
 * props (already trimmed to the 5 most recent by `DashboardIsland`, per the
 * B8a-style "caller owns the selection" convention) instead of AppContext.
 * Dropped: the loading spinner ("Converting currencies...") — conversion is
 * synchronous once `DashboardIsland` gates on `useDisplayConversion`'s
 * `ready`, so there is no per-widget loading state; the 8-column raw table
 * (Participants/Notes columns) — not named in this issue's decision, which
 * lists description/amount/payer/link only.
 */
function makeExpense(overrides: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'currency' | 'paidBy' | 'date' | 'description'>): Expense {
  return {
    groupId: null,
    splitType: 'equal',
    splits: [],
    memberIds: [overrides.paidBy],
    createdBy: overrides.paidBy,
    createdAt: '2026-01-01T00:00:00.000Z',
    settledAt: null,
    ...overrides,
  };
}

const names = { user1: 'Alice', user2: 'Bob' };
const identity = (amount: number) => amount;

describe('RecentExpenses', () => {
  it('renders each expense description, converted amount, and payer name', () => {
    const expenses = [
      makeExpense({ id: 'exp1', description: 'Dinner', amount: 50.75, currency: 'USD', paidBy: 'user1', date: '2026-05-10' }),
    ];
    render(<RecentExpenses expenses={expenses} names={names} convert={identity} currency="USD" />);

    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText('$50.75')).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('links each expense to its detail page', () => {
    const expenses = [
      makeExpense({ id: 'exp1', description: 'Dinner', amount: 50.75, currency: 'USD', paidBy: 'user1', date: '2026-05-10' }),
    ];
    render(<RecentExpenses expenses={expenses} names={names} convert={identity} currency="USD" />);

    expect(screen.getByRole('link', { name: 'Dinner' })).toHaveAttribute('href', withBase('/expenses/exp1'));
  });

  it('shows the original currency alongside the converted amount when they differ', () => {
    const convertDoubling = (amount: number) => amount * 2;
    const expenses = [
      makeExpense({ id: 'exp1', description: 'Museum', amount: 20, currency: 'EUR', paidBy: 'user1', date: '2026-05-10' }),
    ];
    render(<RecentExpenses expenses={expenses} names={names} convert={convertDoubling} currency="USD" />);

    expect(screen.getByText('$40.00')).toBeInTheDocument();
    expect(screen.getByText(/20\.00 EUR/)).toBeInTheDocument();
  });

  it('renders an empty state with no expenses', () => {
    render(<RecentExpenses expenses={[]} names={names} convert={identity} currency="USD" />);
    expect(screen.getByText(/no expenses yet/i)).toBeInTheDocument();
  });
});
