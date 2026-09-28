// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalanceLine } from './BalanceLine';
import { BalanceOverview } from './BalanceOverview';
import type { PersonBalance } from '@/domain/dashboard';

/**
 * New suite (plan B8a) — no legacy equivalent test existed for
 * `BalanceLine.tsx` (only for the class-based `BalanceOverview` it composed).
 * BalanceLine is rebuilt as an accessible CSS bar rather than a Recharts
 * chart: a single-row diverging bar has no natural Recharts representation
 * that isn't one `ResponsiveContainer` per person, which is not justified
 * for what is, visually, one bar (see BalanceLine.tsx's doc comment).
 */
describe('BalanceLine', () => {
  it('labels a positive balance as the other person owing the current user, never by color alone', () => {
    render(<BalanceLine name="Alex" balance={50} maxAbsBalance={100} currency="USD" />);
    expect(screen.getByText('Alex owes you $50.00')).toBeInTheDocument();
  });

  it('labels a negative balance as the current user owing the other person', () => {
    render(<BalanceLine name="Alex" balance={-50} maxAbsBalance={100} currency="USD" />);
    expect(screen.getByText('You owe Alex $50.00')).toBeInTheDocument();
  });

  it('points the fill bar right for a positive balance and left for a negative one', () => {
    const { rerender } = render(<BalanceLine name="Alex" balance={50} maxAbsBalance={100} currency="USD" />);
    expect(screen.getByTestId('balance-line-fill')).toHaveAttribute('data-direction', 'right');

    rerender(<BalanceLine name="Alex" balance={-50} maxAbsBalance={100} currency="USD" />);
    expect(screen.getByTestId('balance-line-fill')).toHaveAttribute('data-direction', 'left');
  });

  it('sizes the fill bar proportional to the max magnitude across all balances', () => {
    render(<BalanceLine name="Alex" balance={50} maxAbsBalance={100} currency="USD" />);
    // Half the track represents the max magnitude, so 50/100 of that half = 25% of the full track.
    expect(screen.getByTestId('balance-line-fill')).toHaveStyle({ width: '25%' });
  });

  it('renders a full-width fill bar when the balance equals the max magnitude', () => {
    render(<BalanceLine name="Alex" balance={100} maxAbsBalance={100} currency="USD" />);
    expect(screen.getByTestId('balance-line-fill')).toHaveStyle({ width: '50%' });
  });
});

describe('BalanceOverview', () => {
  const BALANCES: PersonBalance[] = [
    { userId: 'alex', name: 'Alex', balance: 50 },
    { userId: 'sam', name: 'Sam', balance: -20 },
  ];

  it('renders one BalanceLine row per balance, in the given order', () => {
    render(<BalanceOverview balances={BALANCES} currency="USD" />);
    expect(screen.getByText('Alex owes you $50.00')).toBeInTheDocument();
    expect(screen.getByText('You owe Sam $20.00')).toBeInTheDocument();
  });

  it('shows an empty state when there are no outstanding balances', () => {
    render(<BalanceOverview balances={[]} currency="USD" />);
    expect(screen.getByText(/all settled up/i)).toBeInTheDocument();
  });
});
