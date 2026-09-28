// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthlyTrendsChart } from './MonthlyTrendsChart';
import type { MonthlyTotal } from '@/domain/dashboard';

/**
 * Rewritten from the legacy Next tree's
 * `src/components/Dashboard/__tests__/MonthlyTrendsChart.test.tsx` (plan
 * B8a): the legacy component read `processedTrends`/hand-rolled CSS bars off
 * `AppContext`; this one takes the `monthlyTotals` selector's output as
 * props and renders on `ui/charts/bar-chart.tsx`. Kept: month labels,
 * formatted amounts, empty state. Dropped: the event/spender toggle,
 * hover-card drill-down and `isConvertingCurrencies` prop — none of those
 * behaviors survive the rebuild (spec: conversion is always on).
 */
const DATA: MonthlyTotal[] = [
  { monthKey: '2026-07', month: 'Jul 2026', total: 0, count: 0 },
  { monthKey: '2026-08', month: 'Aug 2026', total: 120, count: 2 },
  { monthKey: '2026-09', month: 'Sep 2026', total: 200.5, count: 3 },
];

describe('MonthlyTrendsChart', () => {
  it('renders every month label, including a zero month', () => {
    render(<MonthlyTrendsChart data={DATA} currency="USD" />);
    expect(screen.getByText('Jul 2026')).toBeInTheDocument();
    expect(screen.getByText('Aug 2026')).toBeInTheDocument();
    expect(screen.getByText('Sep 2026')).toBeInTheDocument();
  });

  it('renders each month total formatted in the display currency', () => {
    render(<MonthlyTrendsChart data={DATA} currency="USD" />);
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText('$200.50')).toBeInTheDocument();
  });

  it('uses the given currency symbol', () => {
    render(<MonthlyTrendsChart data={DATA} currency="EUR" />);
    expect(screen.getByText('€120.00')).toBeInTheDocument();
  });

  it('renders an accessible chart region', () => {
    render(<MonthlyTrendsChart data={DATA} currency="USD" />);
    expect(screen.getByRole('img', { name: /monthly/i })).toBeInTheDocument();
  });

  it('shows an empty state and no chart region when there is no data', () => {
    render(<MonthlyTrendsChart data={[]} currency="USD" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/no monthly/i)).toBeInTheDocument();
  });
});
