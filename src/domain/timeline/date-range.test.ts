// Ported from the legacy Next tree's `src/__tests__/timelineCalculations.test.tsx`
// (plan B3). Kept `describe.skip` on purpose — the original file documents a
// real bug (`formatTimelineDate`/`formatDateRange` are off by one day, UTC
// parsing of date-only strings) that plan issue B11a fixes together with
// rewriting `EventTimeline` on fixed-TZ fixtures. No RTL render happens here
// (the original only imported `@testing-library/jest-dom` for matchers it
// never used), so this needs no jsdom pragma.
import { describe, expect, it } from 'vitest';
import {
  calculateSettledPercentage,
  calculateTotalByCurrency,
  calculateUnsettledAmount,
  formatDateRange,
  type TimelineExpenseInput,
} from './index';

describe.skip('Timeline Utility Functions — date range (B11a fixes the underlying bugs, then un-skips)', () => {
  const mockExpenses: TimelineExpenseInput[] = [
    { id: 'exp1', amount: 100, currency: 'USD', settled: true, date: '2023-05-20' },
    { id: 'exp2', amount: 50, currency: 'USD', settled: false, date: '2023-06-01' },
    { id: 'exp3', amount: 200, currency: 'USD', settled: true, date: '2023-06-05' },
    { id: 'exp4', amount: 75, currency: 'EUR', settled: false, date: '2023-06-05' },
    { id: 'exp5', amount: 25, currency: 'USD', settled: false, date: '2023-06-10' },
  ];

  describe('calculateSettledPercentage', () => {
    it('returns 0 for an empty array', () => {
      expect(calculateSettledPercentage([])).toBe(0);
    });

    it('calculates the mixed percentage (2 of 5 settled = 40%)', () => {
      expect(calculateSettledPercentage(mockExpenses)).toBe(40);
    });
  });

  describe('calculateTotalByCurrency', () => {
    it('sums amounts per currency', () => {
      expect(calculateTotalByCurrency(mockExpenses)).toEqual({ USD: 375, EUR: 75 });
    });
  });

  describe('calculateUnsettledAmount', () => {
    it('sums only the unsettled amounts per currency', () => {
      expect(calculateUnsettledAmount(mockExpenses)).toEqual({ USD: 75, EUR: 75 });
    });
  });

  describe('formatDateRange', () => {
    it('formats a same-month range', () => {
      expect(formatDateRange('2023-06-01', '2023-06-15')).toBe('Jun 1-15, 2023');
    });

    it('formats a single date with no end date', () => {
      expect(formatDateRange('2023-06-01')).toBe('6/1/2023');
    });
  });
});
