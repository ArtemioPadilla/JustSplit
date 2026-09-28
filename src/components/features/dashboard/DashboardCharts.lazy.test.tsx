// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardCharts from './DashboardCharts.lazy';

/**
 * New suite (plan B8a). This module is the single dynamic-import boundary
 * (`.lazy.tsx`) `ShowcaseDashboardCharts`/the future `DashboardIsland` (B8b)
 * load via `React.lazy` — everything it statically imports (Recharts,
 * transitively) must stay out of any page's static import graph
 * (`scripts/check-charts-bundle.mjs` asserts that at the built-HTML level).
 * This test only covers the composition wiring: each widget renders from
 * its own prop slice.
 */
describe('DashboardCharts (lazy composition module)', () => {
  it('renders all three chart widgets from their respective props', () => {
    render(
      <DashboardCharts
        monthlyTrends={{ data: [{ monthKey: '2026-09', month: 'Sep 2026', total: 10, count: 1 }], currency: 'USD' }}
        expenseDistribution={{ data: [{ category: 'Food', total: 10, percentage: 100 }], currency: 'USD' }}
        balanceOverview={{ balances: [{ userId: 'alex', name: 'Alex', balance: 10 }], currency: 'USD' }}
      />,
    );

    expect(screen.getByText('Monthly trends')).toBeInTheDocument();
    expect(screen.getByText('Expense distribution')).toBeInTheDocument();
    expect(screen.getByText('Balance overview')).toBeInTheDocument();
  });
});
