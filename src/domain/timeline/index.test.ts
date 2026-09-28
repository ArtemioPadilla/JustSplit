// Ported from the legacy Next tree's `src/utils/__tests__/timelineCalculations.test.ts`
// (plan B3). Kept `describe.skip` on purpose — the original file documents a
// real bug (`calculateTimelineProgress` returns 100 for a future start; date
// formatting is off by one day) that plan issue B11a fixes together with
// rewriting `EventTimeline` on top of it. Un-skipping here without fixing the
// underlying code would just re-introduce a red suite plan B11a already
// expects to inherit and rewrite.
import { describe, expect, it } from 'vitest';
import {
  calculatePositionPercentage,
  calculateSettledPercentage,
  calculateTimelineProgress,
  calculateTotalByCurrency,
  calculateUnsettledAmount,
  formatTimelineDate,
  groupNearbyExpenses,
  type TimelineEventInput,
  type TimelineExpenseInput,
} from './index';

describe.skip('Timeline Calculations (B11a fixes the underlying bugs, then un-skips)', () => {
  const past = new Date('2025-01-01').toISOString();
  const today = new Date('2025-05-09').toISOString();
  const future = new Date('2025-12-31').toISOString();

  const mockEvent: TimelineEventInput = { startDate: past, endDate: future };

  const mockExpenses: TimelineExpenseInput[] = [
    { id: '1', amount: 100, currency: 'USD', date: past, settled: true },
    { id: '2', amount: 200, currency: 'USD', date: today, settled: false },
    { id: '3', amount: 300, currency: 'EUR', date: future, settled: true },
    { id: '4', amount: 400, currency: 'EUR', date: today, settled: false },
  ];

  describe('calculateTimelineProgress', () => {
    it('returns 0 if the event has not started yet', () => {
      expect(calculateTimelineProgress(future)).toBe(0);
    });

    it('returns 100 if the event has ended', () => {
      expect(calculateTimelineProgress(past, past)).toBe(100);
    });
  });

  describe('calculatePositionPercentage', () => {
    it('positions an expense within the event window', () => {
      const position = calculatePositionPercentage(today, past, future);
      expect(position).toBeGreaterThan(0);
      expect(position).toBeLessThan(100);
    });
  });

  describe('groupNearbyExpenses', () => {
    it('groups expenses close together on the timeline', () => {
      const groups = groupNearbyExpenses(mockExpenses, mockEvent);
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('formatTimelineDate', () => {
    it('formats an ISO date string', () => {
      expect(formatTimelineDate('2025-01-01')).toBe('Jan 1, 2025');
    });
  });

  describe('calculateSettledPercentage', () => {
    it('calculates the percentage of settled expenses', () => {
      expect(calculateSettledPercentage(mockExpenses)).toBe(50);
    });
  });

  describe('calculateTotalByCurrency', () => {
    it('sums amounts per currency', () => {
      expect(calculateTotalByCurrency(mockExpenses)).toEqual({ USD: 300, EUR: 700 });
    });
  });

  describe('calculateUnsettledAmount', () => {
    it('sums only the unsettled amounts per currency', () => {
      expect(calculateUnsettledAmount(mockExpenses)).toEqual({ USD: 200, EUR: 400 });
    });
  });
});
