/**
 * Calendar-date parsing (bug fix found in B8a review, plan B8a). `Expense.date`
 * and `Event.startDate`/`date` are free strings the app writes as calendar
 * dates (`YYYY-MM-DD`) from an `<input type="date">`. Per the ECMA-262
 * date-time string format, `new Date('2026-03-01')` parses that as **UTC
 * midnight**, not local midnight — so anyone west of UTC (the user base is
 * largely in Mexico, UTC-6) reads it back as 18:00 the PREVIOUS local day.
 * That silently shifted `monthlyTotals` (an expense on the 1st landed in the
 * prior month) and `upcomingEvents` (an event starting today read as
 * yesterday evening and was wrongly dropped as already past).
 *
 * `parseCalendarDate` treats a strict `YYYY-MM-DD` string as a LOCAL
 * calendar date instead — `new Date(y, m - 1, d)` is local midnight, which
 * is what a user who picked "March 1" in a date picker actually meant.
 * Anything else (a full ISO timestamp, with a time and/or an explicit
 * offset) already carries its own time zone information and keeps the
 * existing `new Date(value)` behaviour unchanged.
 *
 * `src/domain/timeline/*` (plan B11a's area) has the same root cause and is
 * deliberately left alone here — the plan's B11a entry notes it should
 * adopt this helper when that issue lands.
 */
const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseCalendarDate(value: string): Date {
  if (CALENDAR_DATE_RE.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}
