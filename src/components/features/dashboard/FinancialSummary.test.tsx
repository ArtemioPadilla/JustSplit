// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinancialSummary } from './FinancialSummary';

/**
 * Ported from the legacy `Dashboard/__tests__/FinancialSummary.test.tsx`
 * (plan B8b), but only the two real figures survive: `totalSpent` and
 * `unsettledCount` (`src/domain/dashboard.ts`, this issue), the latter replaced in B14a by `openBalanceCount` (ADR 0014: no per-expense settled flag exists to count). Dropped: every
 * assertion about "Period Summary"/"Balance Situation"/"Your Insights"
 * blocks, `compareWithLastMonth`, `activeEvents`/`activeParticipants`,
 * `highestExpense`, `mostExpensiveCategory`, `avgPerDay` — `page.tsx` fed all
 * of those a hardcoded default and the legacy component never computed them
 * from real data (spec §6, plan B8b decision).
 */
describe('FinancialSummary', () => {
  it('renders the total spent in the display currency', () => {
    render(<FinancialSummary totalSpent={1250.75} openBalanceCount={3} currency="USD" />);
    expect(screen.getByText('$1250.75')).toBeInTheDocument();
  });

  it('renders how many people you have an open balance with', () => {
    render(<FinancialSummary totalSpent={0} openBalanceCount={3} currency="USD" />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('People to settle up with')).toBeInTheDocument();
    expect(screen.queryByText(/unsettled/i)).not.toBeInTheDocument();
  });

  it('is singular for one person', () => {
    render(<FinancialSummary totalSpent={0} openBalanceCount={1} currency="USD" />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Person to settle up with')).toBeInTheDocument();
  });

  it('says "All settled up" rather than a bare 0 when nobody is owed or owes', () => {
    render(<FinancialSummary totalSpent={0} openBalanceCount={0} currency="USD" />);
    expect(screen.getByText('All settled up')).toBeInTheDocument();
    expect(screen.getByText('No open balances')).toBeInTheDocument();
  });

  it('renders zero state without crashing when there is no spend yet', () => {
    render(<FinancialSummary totalSpent={0} openBalanceCount={0} currency="USD" />);
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });
});
