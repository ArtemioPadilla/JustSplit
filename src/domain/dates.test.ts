import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { formatCalendarDate, parseCalendarDate } from './dates';

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
    // Unset stays unset: assigning undefined would leave the string "undefined" (plan A7).
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
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

/**
 * `formatCalendarDate` (plan B10): the inverse of `parseCalendarDate` — the
 * expense form's `DatePicker` (`ui/date-picker.tsx`) hands back a local
 * `Date`, which the form must store as a `YYYY-MM-DD` string (spec D10). It
 * MUST use local getters (`getFullYear`/`getMonth`/`getDate`), never
 * `toISOString()` (UTC), for the same reason `parseCalendarDate` reads
 * `YYYY-MM-DD` as local midnight: `toISOString()` on a local midnight Date
 * west of UTC prints the PREVIOUS day.
 */
describe('formatCalendarDate', () => {
  let originalTZ: string | undefined;

  beforeAll(() => {
    originalTZ = process.env.TZ;
    process.env.TZ = 'America/Mexico_City';
  });

  afterAll(() => {
    // Unset stays unset: assigning undefined would leave the string "undefined" (plan A7).
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  });

  it('formats a local Date as YYYY-MM-DD, zero-padded', () => {
    expect(formatCalendarDate(new Date(2026, 2, 1))).toBe('2026-03-01');
  });

  it('zero-pads a single-digit month and day', () => {
    expect(formatCalendarDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('reads local date parts, never toISOString (which would read UTC and can land on a different calendar day)', () => {
    const localMidnight = new Date(2026, 2, 1, 0, 0, 0);
    expect(formatCalendarDate(localMidnight)).toBe(
      `${localMidnight.getFullYear()}-${String(localMidnight.getMonth() + 1).padStart(2, '0')}-${String(localMidnight.getDate()).padStart(2, '0')}`,
    );
  });

  it('round-trips with parseCalendarDate', () => {
    const original = '2026-12-31';
    expect(formatCalendarDate(parseCalendarDate(original))).toBe(original);
  });
});
