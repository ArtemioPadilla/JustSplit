// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Settlement } from '@/schemas/settlement';
import { RecentSettlements } from './RecentSettlements';

/**
 * Ported from `Dashboard/__tests__/RecentSettlements.test.tsx` (`describe.skip`d
 * in A3a — a locale-formatted-date assertion that rendered differently in
 * this environment; not reused here). Props-based (caller trims to the 3
 * most recent, resolves names/convert), no AppContext. Trust-statement
 * wording (ADR 0002, plan B14): never says "paid" — a settlement row is an
 * attestation by whoever created it, not a verified payment.
 */
function makeSettlement(overrides: Partial<Settlement> & Pick<Settlement, 'id' | 'amount' | 'currency' | 'fromUserId' | 'toUserId' | 'date'>): Settlement {
  return {
    groupId: null,
    memberIds: [overrides.fromUserId, overrides.toUserId],
    createdBy: overrides.fromUserId,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const names = { user1: 'Alice', user2: 'Bob' };
const identity = (amount: number) => amount;

describe('RecentSettlements', () => {
  it("renders both parties' names and the amount", () => {
    const settlements = [
      makeSettlement({ id: 's1', amount: 50, currency: 'USD', fromUserId: 'user1', toUserId: 'user2', date: '2026-05-11' }),
    ];
    render(<RecentSettlements settlements={settlements} names={names} convert={identity} currency="USD" />);

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });

  it('never claims the settlement was "paid" (ADR 0002 trust statement)', () => {
    const settlements = [
      makeSettlement({ id: 's1', amount: 50, currency: 'USD', fromUserId: 'user1', toUserId: 'user2', date: '2026-05-11' }),
    ];
    render(<RecentSettlements settlements={settlements} names={names} convert={identity} currency="USD" />);

    expect(screen.queryByText(/\bpaid\b/i)).not.toBeInTheDocument();
  });

  it('renders an empty state with no settlements', () => {
    render(<RecentSettlements settlements={[]} names={names} convert={identity} currency="USD" />);
    expect(screen.getByText(/no settlements yet/i)).toBeInTheDocument();
  });

  it('falls back to Unknown for a party with no resolved name', () => {
    const settlements = [
      makeSettlement({ id: 's1', amount: 50, currency: 'USD', fromUserId: 'user1', toUserId: 'ghost', date: '2026-05-11' }),
    ];
    render(<RecentSettlements settlements={settlements} names={names} convert={identity} currency="USD" />);
    expect(screen.getByText(/Unknown/)).toBeInTheDocument();
  });
});
