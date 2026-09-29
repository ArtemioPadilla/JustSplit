// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalanceOverview } from './BalanceOverview';
import { ExpenseDistribution } from './ExpenseDistribution';
import { MonthlyTrendsChart } from './MonthlyTrendsChart';

/**
 * Plan A7 (found by the live smoke's signed-in axe pass on the dashboard, in
 * light, dark and 375px): `heading-order`. The dashboard's only heading above
 * these widgets is the island's sr-only `<h1>`, and each widget titled itself
 * with an `<h3>`, so the page went h1 -> h3. They are the page's level-2
 * sections.
 */
describe('dashboard chart widgets: heading level (plan A7)', () => {
  it('MonthlyTrendsChart titles itself with a level-2 heading', () => {
    render(<MonthlyTrendsChart data={[{ monthKey: '2026-09', month: 'Sep 2026', total: 10, count: 1 }]} currency="USD" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Monthly trends' })).toBeInTheDocument();
  });

  it('ExpenseDistribution titles itself with a level-2 heading', () => {
    render(<ExpenseDistribution data={[{ category: 'Food', total: 10, percentage: 100 }]} currency="USD" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Expense distribution' })).toBeInTheDocument();
  });

  it('BalanceOverview titles itself with a level-2 heading', () => {
    render(<BalanceOverview balances={[{ userId: 'u2', name: 'Beto', balance: -30 }]} currency="USD" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Balance overview' })).toBeInTheDocument();
  });
});
