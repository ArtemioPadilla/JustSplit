// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinancialSummary } from './FinancialSummary';

/**
 * Ported from the legacy `Dashboard/__tests__/FinancialSummary.test.tsx`
 * (plan B8b), but only the two real figures survive: `totalSpent` and
 * `unsettledCount` (`src/domain/dashboard.ts`, this issue). Dropped: every
 * assertion about "Period Summary"/"Balance Situation"/"Your Insights"
 * blocks, `compareWithLastMonth`, `activeEvents`/`activeParticipants`,
 * `highestExpense`, `mostExpensiveCategory`, `avgPerDay` — `page.tsx` fed all
 * of those a hardcoded default and the legacy component never computed them
 * from real data (spec §6, plan B8b decision).
 */
describe('FinancialSummary', () => {
  it('renders the total spent in the display currency', () => {
    render(<FinancialSummary totalSpent={1250.75} unsettledCount={3} currency="USD" />);
    expect(screen.getByText('$1250.75')).toBeInTheDocument();
  });

  it('renders the unsettled expense count', () => {
    render(<FinancialSummary totalSpent={0} unsettledCount={3} currency="USD" />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/unsettled/i)).toBeInTheDocument();
  });

  it('renders zero state without crashing when there is no spend yet', () => {
    render(<FinancialSummary totalSpent={0} unsettledCount={0} currency="USD" />);
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
