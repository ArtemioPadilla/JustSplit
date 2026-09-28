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
 *   - the "Add Expense"/"Create Event" quick-action links are DROPPED — the
 *     legacy component linked `/expenses/new`/`/events/new`, which are B10/
 *     B11b's pages and do not exist yet on this tree; adding the links now
 *     would be new dead links, same reasoning B6 already applied to the
 *     header nav (WelcomeScreen, whose CTAs are the decided exception, is
 *     the dashboard's OWN empty state, not this always-visible header);
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

  it('still does not render "Create event" (/events/new is plan B11b, not shipped yet)', () => {
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
    expect(screen.queryByRole('link', { name: /create event/i })).not.toBeInTheDocument();
  });
});
