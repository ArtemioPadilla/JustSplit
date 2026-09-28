// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Expense } from '@/schemas/expense';
import { DashboardHeader } from './DashboardHeader';

/**
 * Ported from `Dashboard/__tests__/DashboardHeader.test.tsx` (plan B8b), but
 * substantially rewritten:
 *   - the "Add Expense"/"Create Event" quick-action links were DROPPED in B8b
 *     (the legacy component linked `/expenses/new`/`/events/new`, which did not
 *     exist yet — new dead links, the same reasoning B6 applied to the header
 *     nav) and are RESTORED as their pages land: "Add expense" in B10, "Create
 *     event" in B11b (WelcomeScreen, the dashboard's OWN empty state, always
 *     had both);
 *   - `exportExpensesToCSV` -> the shared `ExportCsvButton` (B17a);
 *   - the legacy `CurrencySelector`'s baked-in refresh button/`isConverting`
 *     toggle -> the B16 `CurrencySelector` (`value`/`onChange` only) plus a
 *     separate "Refresh rates" button, per this issue's decision.
 */
const users = [{ id: 'user1', name: 'Alice' }];
const events: never[] = [];

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp1',
    groupId: null,
    description: 'Lunch',
    amount: 42,
    currency: 'USD',
    paidBy: 'user1',
    splitType: 'equal',
    splits: [{ userId: 'user1', amount: 42 }],
    date: '2026-01-01',
    memberIds: ['user1'],
    createdBy: 'user1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('DashboardHeader', () => {
  it('renders an ExportCsvButton over all expenses', () => {
    render(
      <DashboardHeader
        expenses={[makeExpense()]}
        users={users}
        events={events}
        currency="USD"
        onCurrencyChange={vi.fn()}
        onRefreshRates={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Export as CSV' })).toBeInTheDocument();
  });

  it('renders the currency selector bound to the current preferred currency', () => {
    render(
      <DashboardHeader
        expenses={[]}
        users={users}
        events={events}
        currency="EUR"
        onCurrencyChange={vi.fn()}
        onRefreshRates={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Currency/i)).toHaveValue('EUR');
  });

  it('calls onRefreshRates when "Refresh rates" is clicked', async () => {
    const user = userEvent.setup();
    const onRefreshRates = vi.fn();
    render(
      <DashboardHeader
        expenses={[]}
        users={users}
        events={events}
        currency="USD"
        onCurrencyChange={vi.fn()}
        onRefreshRates={onRefreshRates}
      />,
    );

    await user.click(screen.getByRole('button', { name: /refresh rates/i }));
    expect(onRefreshRates).toHaveBeenCalledTimes(1);
  });

  it('renders an "Add expense" link to /expenses/new now that plan B10 shipped it', () => {
    render(
      <DashboardHeader
        expenses={[]}
        users={users}
        events={events}
        currency="USD"
        onCurrencyChange={vi.fn()}
        onRefreshRates={vi.fn()}
      />,
    );
    expect(screen.getByRole('link', { name: /add expense/i })).toHaveAttribute('href', '/expenses/new');
  });

  it('renders a "Create event" link to /events/new now that plan B11b shipped it (the legacy quick action, restored like "Add expense" was in B10)', () => {
    render(
      <DashboardHeader
        expenses={[]}
        users={users}
        events={events}
        currency="USD"
        onCurrencyChange={vi.fn()}
        onRefreshRates={vi.fn()}
      />,
    );
    expect(screen.getByRole('link', { name: /create event/i })).toHaveAttribute('href', '/events/new');
  });
});
