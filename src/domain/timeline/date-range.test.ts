// Ported from the legacy Next tree's `src/__tests__/timelineCalculations.test.tsx`
// (plan B3). B3 kept this file `describe.skip`'d on purpose, documenting a real bug
// (`formatDateRange` is off by one day, UTC parsing of date-only strings) explicitly
// deferred to plan issue B11a, which is THIS issue.
//
// What changed to un-skip it: `settled: boolean` → `settledAt: string | null` (the
// module's real type now); every other assertion's expected VALUE is unchanged from the
// legacy fixture (the legacy assertions already encoded the correct calendar day — only
// the underlying `+1 day` hack in the production code was wrong; removing that hack and
// parsing with `parseCalendarDate` makes these pass, in any timezone). No RTL render
// happens here (the original only imported `@testing-library/jest-dom` for matchers it
// never used), so this needs no jsdom pragma.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  calculateSettledPercentage,
  calculateTotalByCurrency,
  calculateUnsettledAmount,
  formatDateRange,
  type TimelineExpenseInput,
} from './index';

describe('Timeline Utility Functions — date range (ported from the legacy Jest suite, plan B11a)', () => {
  const mockExpenses: TimelineExpenseInput[] = [
    { id: 'exp1', amount: 100, currency: 'USD', settledAt: '2023-05-21T00:00:00.000Z', date: '2023-05-20' },
    { id: 'exp2', amount: 50, currency: 'USD', settledAt: null, date: '2023-06-01' },
    { id: 'exp3', amount: 200, currency: 'USD', settledAt: '2023-06-06T00:00:00.000Z', date: '2023-06-05' },
    { id: 'exp4', amount: 75, currency: 'EUR', settledAt: null, date: '2023-06-05' },
    { id: 'exp5', amount: 25, currency: 'USD', settledAt: null, date: '2023-06-10' },
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
    // B11a follow-up (plan B11b): these two assertions only prove the
    // calendar-date fix in a zone WEST of UTC (a bare `new Date('2023-06-01')`
    // is 18:00 the previous day there), so the block pins its own zone instead
    // of trusting the machine's. Without this guard the tests are green on a
    // UTC laptop and CI even if the parsing regressed.
    // Pinned per block, restored after (a missing TZ is DELETED, never set to the
    // string "undefined", which is what `process.env.TZ = undefined` would do).
    let originalTZ: string | undefined;
    beforeAll(() => {
      originalTZ = process.env.TZ;
      process.env.TZ = 'America/Mexico_City';
    });
    afterAll(() => {
      if (originalTZ === undefined) delete process.env.TZ;
      else process.env.TZ = originalTZ;
    });

    it('runs pinned to America/Mexico_City (UTC-6, no DST), whatever the machine zone', () => {
      expect(new Date(2023, 5, 1).getTimezoneOffset()).toBe(360);
    });

    it('formats a same-month range', () => {
      expect(formatDateRange('2023-06-01', '2023-06-15')).toBe('Jun 1-15, 2023');
    });

    it('formats a single date with no end date', () => {
      expect(formatDateRange('2023-06-01')).toBe('6/1/2023');
    });
  });
});
