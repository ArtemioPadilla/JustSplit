/**
 * Timeline calculations (plan B3). Ported from the legacy Next tree's
 * `src/utils/timelineUtils/index.ts`.
 *
 * Deliberately **not** re-typed onto `src/schemas/expense.ts`'s `Expense`
 * (spec D10, `settledAt` instead of `settled`): both legacy Jest suites that
 * exercise these functions ship `describe.skip` with a documented, known bug
 * (`calculateTimelineProgress` returns 100 for a future start; date
 * formatting is off by one day) explicitly deferred to plan issue B11a
 * (`EventTimeline` widget port + timeline suites), which is also where these
 * functions get their real fix and their real type. Until then this module
 * takes small, local, schema-independent shapes so it compiles without
 * depending on — or committing to — a type it is about to be rewritten
 * around.
 */
import { format } from 'date-fns';

export interface TimelineExpenseInput {
  id: string;
  date: string;
  amount: number;
  currency: string;
  settled: boolean;
}

export interface TimelineEventInput {
  date?: string;
  startDate?: string;
  endDate?: string;
}

/** Percentage of an event's duration elapsed so far (0-100). */
export const calculateTimelineProgress = (startDate: string, endDate?: string): number => {
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  const now = Date.now();

  if (now > end) return 100;
  if (now < start) return 0;

  const totalDuration = end - start;
  const elapsed = now - start;
  return Math.min(100, Math.round((elapsed / totalDuration) * 100));
};

/** Position (can be negative or >100 for pre-/post-event expenses) of `date` on the event timeline. */
export const calculatePositionPercentage = (date: string, startDate: string, endDate?: string): number => {
  const targetDate = new Date(date).getTime();
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  const totalDuration = end - start;

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
    return Math.max(1, Math.min(99, Math.round(((targetDate - start) / totalDuration) * 100)));
  }

  return 100;
};

/** Groups expenses whose timeline position falls within 5% of each other, for hover display. */
export const groupNearbyExpenses = (
  expenses: TimelineExpenseInput[],
  event: TimelineEventInput,
): { position: number; expenses: TimelineExpenseInput[] }[] => {
  const startDate = event.startDate ?? event.date ?? '';
  const withPositions = expenses.map((expense) => ({
    expense,
    position: calculatePositionPercentage(expense.date, startDate, event.endDate),
  }));

  const proximityThreshold = 5;
  const grouped: { position: number; expenses: TimelineExpenseInput[] }[] = [];

  for (const { expense, position } of withPositions) {
    const existingGroup = grouped.find((group) => Math.abs(group.position - position) < proximityThreshold);
    if (existingGroup) {
      existingGroup.expenses.push(expense);
      existingGroup.position =
        existingGroup.expenses.reduce((sum, exp) => sum + calculatePositionPercentage(exp.date, startDate, event.endDate), 0) /
        existingGroup.expenses.length;
    } else {
      grouped.push({ position, expenses: [expense] });
    }
  }

  return grouped;
};

/** e.g. `formatTimelineDate('2023-06-01') === 'Jun 2, 2023'` (the legacy off-by-one-day quirk, B11a fixes it). */
export const formatTimelineDate = (dateString: string): string => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + 1);
  return format(date, 'MMM d, yyyy');
};

/** Percentage (0-100) of `expenses` that are settled. */
export const calculateSettledPercentage = (expenses: TimelineExpenseInput[]): number => {
  if (expenses.length === 0) return 0;
  return (expenses.filter((e) => e.settled).length / expenses.length) * 100;
};

/** Sum of `expenses`' amounts, grouped by currency. */
export const calculateTotalByCurrency = (expenses: TimelineExpenseInput[]): Record<string, number> => {
  const totals: Record<string, number> = {};
  expenses.forEach((expense) => {
    totals[expense.currency] = (totals[expense.currency] ?? 0) + expense.amount;
  });
  return totals;
};

/** Sum of the *unsettled* expenses' amounts, grouped by currency. */
export const calculateUnsettledAmount = (expenses: TimelineExpenseInput[]): Record<string, number> => {
  const unsettled: Record<string, number> = {};
  expenses.forEach((expense) => {
    if (!expense.settled) {
      unsettled[expense.currency] = (unsettled[expense.currency] ?? 0) + expense.amount;
    }
  });
  return unsettled;
};

/** e.g. `formatDateRange('2023-06-01', '2023-06-15') === 'Jun 1-15, 2023'` (same off-by-one-day quirk). */
export const formatDateRange = (startDate: string, endDate?: string): string => {
  const start = new Date(startDate);
  start.setDate(start.getDate() + 1);

  if (!endDate) {
    return `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()}`;
  }

  const end = new Date(endDate);
  end.setDate(end.getDate() + 1);

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
