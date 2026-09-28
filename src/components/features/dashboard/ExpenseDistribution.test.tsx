// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpenseDistribution } from './ExpenseDistribution';
import type { CategoryTotal } from '@/domain/dashboard';

/**
 * Rewritten from the legacy Next tree's
 * `src/components/Dashboard/__tests__/ExpenseDistribution.test.tsx` (plan
 * B8a) — that suite was `describe.skip`'d in A3a (TODO(track-b): it passed
 * an `expenses` prop the component never took). This version takes the
 * `categoryDistribution` selector's output directly and renders on
 * `ui/charts/donut-chart.tsx`. Kept: category names, formatted amounts,
 * percentages, empty state.
 */
const DATA: CategoryTotal[] = [
  { category: 'Food', total: 200, percentage: 40 },
  { category: 'Transport', total: 150, percentage: 30 },
  { category: 'Entertainment', total: 100, percentage: 20 },
  { category: 'Uncategorized', total: 50, percentage: 10 },
];

describe('ExpenseDistribution', () => {
  it('renders every category name', () => {
    render(<ExpenseDistribution data={DATA} currency="USD" />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('renders formatted amounts and percentages', () => {
    render(<ExpenseDistribution data={DATA} currency="USD" />);
    expect(screen.getByText(/\$200\.00/)).toBeInTheDocument();
    expect(screen.getByText(/40%/)).toBeInTheDocument();
    expect(screen.getByText(/\$150\.00/)).toBeInTheDocument();
    expect(screen.getByText(/30%/)).toBeInTheDocument();
  });

  it('renders an accessible chart region', () => {
    render(<ExpenseDistribution data={DATA} currency="USD" />);
    expect(screen.getByRole('img', { name: /distribution/i })).toBeInTheDocument();
  });

  it('shows an empty state when there is no expense data', () => {
    render(<ExpenseDistribution data={[]} currency="USD" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/no expense data/i)).toBeInTheDocument();
  });
});
