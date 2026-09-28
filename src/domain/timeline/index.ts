/**
 * Timeline calculations (plan B3; real fix + real types land in plan B11a).
 *
 * B3 deliberately left this module on small, schema-independent shapes
 * (`settled: boolean` instead of the real `Expense.settledAt`) because both
 * legacy Jest suites that exercised it were `describe.skip`'d with a known
 * bug: every date here was parsed with a bare `new Date(...)`, which reads a
 * calendar-date-only string (`YYYY-MM-DD`, what `<input type="date">` and
 * `domain/dates.ts#formatCalendarDate` produce) as **UTC midnight** — the
 * same bug fixed in `dashboard.ts`/`csvExport.ts`/`formatters.ts` (B8a
 * review). Anyone west of UTC (the user base is largely in Mexico, UTC-6)
 * could read a date back as the previous local day.
 *
 * This issue (B11a) does the real fix, adopting
 * `src/domain/dates.ts#parseCalendarDate` (local-midnight parsing)
 * everywhere a calendar-date string is parsed in this file, and gives the
 * module its real types: `TimelineExpenseInput`/`TimelineEventInput` are now
 * `Pick`s of the real `Expense`/`Event` schemas, and `settled: boolean`
 * becomes `settledAt: string | null` (the project-wide `settledAt == null`
 * convention — see `dashboard.ts#unsettledCount`, `csvExport.ts`,
 * `expenseCalculator.ts`).
 *
 * `calculateTimelineProgress`/`calculatePositionPercentage` gain an
 * injectable `now` (default `new Date()`), the same pattern
 * `dashboard.ts`'s selectors use, for deterministic tests — the only place
 * in this module a REAL clock reading is compared against a
 * calendar-date-parsed value (see the "timezone-safe against real time"
 * describe block in `index.test.ts` for the two cases that provably diverge
 * between the old and new parsing; two calendar-date strings compared
 * against each other never diverge by TZ, since `parseCalendarDate`'s local
 * offset is constant across the subtraction — only a comparison against a
 * true wall-clock instant, or reading a UTC-parsed `Date`'s LOCAL calendar
 * parts back out (`formatTimelineDate`/`formatDateRange`), can disagree).
 */
import { format } from 'date-fns';
import type { Expense } from '@/schemas/expense';
import type { Event } from '@/schemas/event';
import { parseCalendarDate } from '../dates';

export type TimelineExpenseInput = Pick<Expense, 'id' | 'date' | 'amount' | 'currency' | 'settledAt'>;
export type TimelineEventInput = Pick<Event, 'date' | 'startDate' | 'endDate'>;

/** Percentage of an event's duration elapsed so far (0-100). `now` is injectable for tests. */
export const calculateTimelineProgress = (startDate: string, endDate?: string, now: Date = new Date()): number => {
  const start = parseCalendarDate(startDate).getTime();
  const end = endDate ? parseCalendarDate(endDate).getTime() : now.getTime();
  const nowMs = now.getTime();

  if (nowMs > end) return 100;
  if (nowMs < start) return 0;

  const totalDuration = end - start;
  const elapsed = nowMs - start;
  return Math.min(100, Math.round((elapsed / totalDuration) * 100));
};

/**
 * Position (can be negative or >100 for pre-/post-event expenses) of `date`
 * on the event timeline. `now` is injectable for tests (used as `end` when
 * `endDate` is omitted — an ongoing event with no end date yet).
 */
export const calculatePositionPercentage = (
  date: string,
  startDate: string,
  endDate?: string,
  now: Date = new Date(),
): number => {
  const targetDate = parseCalendarDate(date).getTime();
  const start = parseCalendarDate(startDate).getTime();
  const end = endDate ? parseCalendarDate(endDate).getTime() : now.getTime();

  if (targetDate < start) {
    const daysBeforeEvent = (start - targetDate) / (1000 * 60 * 60 * 24);
    const maxDaysToShow = 30;
    const preEventPosition = (20 * Math.min(daysBeforeEvent, maxDaysToShow)) / maxDaysToShow;
    return -Math.min(20, preEventPosition);
  }

  if (endDate && targetDate > end) {
    const daysAfterEvent = (targetDate - end) / (1000 * 60 * 60 * 24);
    const maxDaysToShow = 30;
    const postEventPosition = (20 * Math.min(daysAfterEvent, maxDaysToShow)) / maxDaysToShow;
    return 100 + Math.min(20, postEventPosition);
  }

  if (Math.abs(targetDate - start) < 1000 * 60 * 60) return 1;
  if (endDate && Math.abs(targetDate - end) < 1000 * 60 * 60) return 99;

  if (targetDate >= start && (!endDate || targetDate <= end)) {
    const totalDuration = end - start;
    return Math.max(1, Math.min(99, Math.round(((targetDate - start) / totalDuration) * 100)));
  }

  return 100;
};

/**
 * Groups expenses whose timeline position falls within 5% of each other,
 * for hover display. Generic over `T` (rather than fixed to
 * `TimelineExpenseInput`) so a caller with a richer expense shape (e.g.
 * `EventTimeline`'s `description`/`paidBy`) gets those fields back on the
 * grouped result without a second lookup by id.
 */
export const groupNearbyExpenses = <T extends TimelineExpenseInput>(
  expenses: T[],
  event: TimelineEventInput,
  now: Date = new Date(),
): { position: number; expenses: T[] }[] => {
  const startDate = event.startDate ?? event.date ?? '';
  const withPositions = expenses.map((expense) => ({
    expense,
    position: calculatePositionPercentage(expense.date, startDate, event.endDate, now),
  }));

  const proximityThreshold = 5;
  const grouped: { position: number; expenses: T[] }[] = [];

  for (const { expense, position } of withPositions) {
    const existingGroup = grouped.find((group) => Math.abs(group.position - position) < proximityThreshold);
    if (existingGroup) {
      existingGroup.expenses.push(expense);
      existingGroup.position =
        existingGroup.expenses.reduce(
          (sum, exp) => sum + calculatePositionPercentage(exp.date, startDate, event.endDate, now),
          0,
        ) / existingGroup.expenses.length;
    } else {
      grouped.push({ position, expenses: [expense] });
    }
  }

  return grouped;
};

/** e.g. `formatTimelineDate('2023-06-01') === 'Jun 1, 2023'`. */
export const formatTimelineDate = (dateString: string): string => format(parseCalendarDate(dateString), 'MMM d, yyyy');

/**
 * Percentage (0-100) of `expenses` that are settled (`settledAt != null`). LEGACY per-expense
 * measure (plan B14a, ADR 0014): the events islands no longer use it — progress is derived from
 * the ledger (`domain/ledger.ts#settlementProgress`). Kept, with its tests, for imported data.
 */
export const calculateSettledPercentage = (expenses: TimelineExpenseInput[]): number => {
  if (expenses.length === 0) return 0;
  return (expenses.filter((e) => e.settledAt != null).length / expenses.length) * 100;
};

/** Sum of `expenses`' amounts, grouped by currency. */
export const calculateTotalByCurrency = (expenses: TimelineExpenseInput[]): Record<string, number> => {
  const totals: Record<string, number> = {};
  expenses.forEach((expense) => {
    totals[expense.currency] = (totals[expense.currency] ?? 0) + expense.amount;
  });
  return totals;
};

/** Sum of the *unsettled* (`settledAt == null`) expenses' amounts, grouped by currency. LEGACY per-expense measure, see `calculateSettledPercentage`. */
export const calculateUnsettledAmount = (expenses: TimelineExpenseInput[]): Record<string, number> => {
  const unsettled: Record<string, number> = {};
  expenses.forEach((expense) => {
    if (expense.settledAt == null) {
      unsettled[expense.currency] = (unsettled[expense.currency] ?? 0) + expense.amount;
    }
  });
  return unsettled;
};

/** e.g. `formatDateRange('2023-06-01', '2023-06-15') === 'Jun 1-15, 2023'`. */
export const formatDateRange = (startDate: string, endDate?: string): string => {
  const start = parseCalendarDate(startDate);

  if (!endDate) {
    return `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()}`;
  }

  const end = parseCalendarDate(endDate);

  if (start.toDateString() === end.toDateString()) {
    return `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()}`;
  }

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'MMM')} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
  }

  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'MMM')} ${start.getDate()} - ${format(end, 'MMM')} ${end.getDate()}, ${start.getFullYear()}`;
  }

  return `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()} - ${end.getMonth() + 1}/${end.getDate()}/${end.getFullYear()}`;
};
