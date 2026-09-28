// Ported from the legacy Next tree's `src/utils/__tests__/timelineCalculations.test.ts`
// (plan B3). B3 kept this file `describe.skip`'d on purpose, documenting a real bug
// (`calculateTimelineProgress` returns 100 for a future start; date formatting is off
// by one day) explicitly deferred to plan issue B11a, which is THIS issue.
//
// What changed to un-skip it (B11a):
//  - `now` is pinned via `vi.useFakeTimers()`/`vi.setSystemTime` — the original fixture's
//    `past`/`today`/`future` are literal 2025 dates that are only meaningfully in the past/
//    present/future relative to when the fixture was authored; without pinning the clock
//    they've since drifted into the past relative to the real system clock, which would fail
//    `calculateTimelineProgress(future)` for a reason that has nothing to do with this issue's
//    date-parsing bug fix. This is a test-infrastructure fix, not a production-code one.
//  - `settled: boolean` → `settledAt: string | null` (the module's real type now, matching the
//    project-wide `settledAt == null` convention — see `dashboard.ts#unsettledCount`).
//  - `formatTimelineDate('2025-01-01')` now expects the CORRECT `'Jan 1, 2025'` (the legacy
//    fixture already asserted the correct value; only the underlying `+1 day` hack was wrong).
// Dropped: nothing behavioral — every original assertion is kept.
// New: a second describe block below asserts the actual timezone bug this issue fixes
// (`calculateTimelineProgress`/`calculatePositionPercentage` compared against a REAL clock
// reading, pinned to America/Mexico_City — see that block's own header comment for why pure
// calendar-to-calendar comparisons never diverge by timezone, only a comparison against `now`).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('Timeline Calculations (ported from the legacy Jest suite, plan B11a)', () => {
  const past = new Date('2025-01-01').toISOString();
  const today = new Date('2025-05-09').toISOString();
  const future = new Date('2025-12-31').toISOString();

  const mockEvent: TimelineEventInput = { startDate: past, endDate: future };

  const mockExpenses: TimelineExpenseInput[] = [
    { id: '1', amount: 100, currency: 'USD', date: past, settledAt: '2025-01-02T00:00:00.000Z' },
    { id: '2', amount: 200, currency: 'USD', date: today, settledAt: null },
    { id: '3', amount: 300, currency: 'EUR', date: future, settledAt: '2025-12-01T00:00:00.000Z' },
    { id: '4', amount: 400, currency: 'EUR', date: today, settledAt: null },
  ];

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(today));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

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
    it('formats a calendar date string without shifting the day', () => {
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

/**
 * New suite (plan B11a, B8a review note): `calculateTimelineProgress`/
 * `calculatePositionPercentage` are the only two functions in this module that
 * compare a calendar-date-parsed value against a REAL clock reading (`now`,
 * `Date.now()` before this issue, the injectable `now` parameter after it) —
 * every other comparison in this file is calendar-date-string vs.
 * calendar-date-string, and `parseCalendarDate`'s local-midnight offset is
 * CONSTANT across any two dates, so it cancels out of a subtraction and can
 * never disagree with the old UTC-midnight parsing on relative position
 * (verified by hand — see the module's own header comment). Only a
 * comparison against a genuine wall-clock instant exposes the bug, which is
 * what these two tests pin down with `vi.useFakeTimers`.
 *
 * TZ pinned to America/Mexico_City (UTC-6, no DST) — same as
 * `dashboard.test.ts`'s equivalent block — so these fail for the right
 * reason regardless of where/when the suite runs.
 */
describe('calculateTimelineProgress / calculatePositionPercentage — timezone-safe against real time (bug fix, B11a)', () => {
  let originalTZ: string | undefined;

  beforeAll(() => {
    originalTZ = process.env.TZ;
    process.env.TZ = 'America/Mexico_City';
  });

  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not report a "today"-started event as already underway before local midnight has actually passed', () => {
    // Real "now" is 2026-03-10T03:00:00Z — 9pm the PREVIOUS evening in
    // Mexico City (UTC-6). The event's calendar startDate is '2026-03-10',
    // whose correct LOCAL midnight is 2026-03-10T06:00:00Z — still 3 hours
    // in the future. The buggy `new Date('2026-03-10')` reads that as
    // 2026-03-10T00:00:00Z UTC, 3 hours in the PAST, so it wrongly reports
    // the event as already 1% underway.
    vi.setSystemTime(new Date('2026-03-10T03:00:00.000Z'));
    expect(calculateTimelineProgress('2026-03-10', '2026-03-20')).toBe(0);
  });

  it('positions an ongoing (no-end-date) event\'s expense using the LOCAL elapsed duration, not the UTC one', () => {
    // No `endDate` — the function falls back to `now` (real clock, pinned
    // here) as the open end of the range. `start`/`target` are both
    // calendar-date strings 5 days apart; the 6-hour local-midnight offset
    // is present in `start`/`target` but NOT in `now` (a real instant), so
    // it does NOT cancel out of `elapsed / totalDuration` the way it does
    // for two calendar-date-only comparisons — the buggy UTC-midnight
    // parsing under-counts both, landing on a rounded 50% instead of 51%.
    vi.setSystemTime(new Date('2026-03-20T00:00:00.000Z'));
    expect(calculatePositionPercentage('2026-03-15', '2026-03-10')).toBe(51);
  });

  it('lands an expense dated exactly on the event start day inside the range (position 1, never pre-event)', () => {
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
    expect(calculatePositionPercentage('2026-03-10', '2026-03-10', '2026-03-20')).toBe(1);
  });

  it('lands an expense dated exactly on the event end day inside the range (position 99, never post-event)', () => {
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
    expect(calculatePositionPercentage('2026-03-20', '2026-03-10', '2026-03-20')).toBe(99);
  });
});
