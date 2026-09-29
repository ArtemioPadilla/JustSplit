// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Expense } from '@/schemas/expense';
import { DashboardHeader } from './DashboardHeader';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

/**
 * Ported from `Dashboard/__tests__/DashboardHeader.test.tsx` (plan B8b), but
 * substantially rewritten:
 *   - the "Add Expense"/"Create Event" quick-action links were DROPPED in B8b
 *     (the legacy component linked `/expenses/new`/`/events/new`, which did not
 *     exist yet — new dead links, the same reasoning B6 applied to the header
 *     nav) and are RESTORED as their pages land: "Add expense" in B10, "Create
 *     event" in B11b (WelcomeScreen, the dashboard's OWN empty state, always
 *     had both), and "Settle up" (the legacy dashboard's other quick action,
 *     which linked `/settlements`) in B14b;
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

  it('renders a "Settle up" link to /settlements now that plan B14b shipped it (the legacy dashboard linked it too)', () => {
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
    expect(screen.getByRole('link', { name: /^settle up$/i })).toHaveAttribute('href', '/settlements');
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

/**
 * Plan B19c (risk:high, ADR 0015): the preferred-currency selector writes the profile, so it is blocked offline. Refreshing
 * exchange rates, exporting and the quick-action links are reads or navigation and stay available.
 */
describe('DashboardHeader — offline (plan B19c)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  it('blocks the currency selector with one visible explanation, and leaves every read action alone', () => {
    const onCurrencyChange = vi.fn();
    render(
      <DashboardHeader expenses={[makeExpense()]} users={users} events={events} currency="USD" onCurrencyChange={onCurrencyChange} onRefreshRates={vi.fn()} />,
    );
    const selector = screen.getByLabelText(/currency/i);
    expectWritable(selector);

    setOnLine(false);
    expectBlocked(screen.getByLabelText(/currency/i));
    expect(visibleNotices()).toHaveLength(1);
    expect(visibleNotices()[0]).toHaveTextContent(OFFLINE_SENTENCE);
    expect(screen.getByRole('button', { name: /refresh rates/i })).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('button', { name: 'Export as CSV' })).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('link', { name: /add expense/i })).not.toHaveAttribute('aria-disabled');

    setOnLine(true);
    expectWritable(screen.getByLabelText(/currency/i));
    expect(visibleNotices()).toHaveLength(0);
  });
});
