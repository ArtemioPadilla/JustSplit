import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseCalendarDate } from './dates';

/**
 * New suite (bug fix found in B8a review): `new Date('2026-03-01')` parses a
 * calendar-date-only string as UTC midnight, which reads back as the
 * PREVIOUS local day for anyone west of UTC — the user base is largely in
 * Mexico (UTC-6). Pin the timezone so this suite fails for the right reason
 * regardless of where/when it runs.
 */
describe('parseCalendarDate', () => {
  let originalTZ: string | undefined;

  beforeAll(() => {
    originalTZ = process.env.TZ;
    process.env.TZ = 'America/Mexico_City';
  });

  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  it('parses a strict YYYY-MM-DD string as LOCAL midnight, not UTC midnight', () => {
    const date = parseCalendarDate('2026-03-01');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2); // March, 0-indexed
    expect(date.getDate()).toBe(1);
    expect(date.getHours()).toBe(0);
  });

  it('does not shift a calendar date to the previous day west of UTC (the actual bug)', () => {
    // The buggy `new Date('2026-03-01')` reads back as Feb 28 18:00 in
    // America/Mexico_City (UTC-6) — assert the FIXED behaviour directly.
    const date = parseCalendarDate('2026-03-01');
    expect(date.getDate()).not.toBe(28);
    expect(date.getMonth()).not.toBe(1); // not February
  });

  it('leaves a full ISO timestamp (with a time and an explicit offset) unchanged', () => {
    const iso = '2026-03-01T00:00:00.000Z';
    expect(parseCalendarDate(iso).getTime()).toBe(new Date(iso).getTime());
  });

  it('leaves a full ISO timestamp without an offset unchanged', () => {
    const iso = '2026-03-01T10:30:00';
    expect(parseCalendarDate(iso).getTime()).toBe(new Date(iso).getTime());
  });

  it('passes garbage input straight through to `new Date` (still Invalid Date, never throws)', () => {
    expect(parseCalendarDate('not-a-real-date').getTime()).toBeNaN();
  });
});
