import { formatCurrency } from '@/domain/formatters';
import { formatTimelineDate } from '@/domain/timeline';

/**
 * What the light timeline (`EventTimeline.tsx`) and its lazily loaded hover-card
 * marker (`EventTimelineMarkerImpl.tsx`) share (plan B19b): the expense shape and
 * the settlement-status wording. No Base UI, no hover card: the marker chunk holds
 * those, and the timeline must not reach them statically.
 */
export interface EventTimelineExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  /** Calendar-date string (`YYYY-MM-DD`), per `domain/dates.ts#formatCalendarDate`. */
  date: string;
  paidBy: string;
  /** `null`/`undefined` = unsettled — the project-wide `settledAt == null` convention. */
  settledAt: string | null | undefined;
}


export type SettlementStatus = 'settled' | 'unsettled' | 'mixed' | 'neutral';

export function isSettled(expense: EventTimelineExpense): boolean {
  return expense.settledAt != null;
}

export function groupStatus(expenses: EventTimelineExpense[]): SettlementStatus {
  const settledCount = expenses.filter(isSettled).length;
  if (settledCount === 0) return 'unsettled';
  if (settledCount === expenses.length) return 'settled';
  return 'mixed';
}

export const STATUS_LABEL: Record<SettlementStatus, string> = {
  settled: 'settled',
  unsettled: 'unsettled',
  mixed: 'partially settled',
  neutral: '',
};

export const STATUS_MARKER_CLASSES: Record<SettlementStatus, string> = {
  settled: 'bg-chart-2',
  unsettled: 'bg-destructive',
  mixed: 'bg-chart-4',
  neutral: 'bg-primary',
};

export function paidByName(users: Record<string, string>, paidBy: string): string {
  return users[paidBy] ?? 'Unknown';
}

export function expenseAriaLabel(expense: EventTimelineExpense, convert: (amount: number, currency: string) => number, currency: string, showStatus: boolean): string {
  const amount = formatCurrency(convert(expense.amount, expense.currency), currency);
  const status = showStatus ? `${isSettled(expense) ? 'Settled' : 'Unsettled'}, ` : '';
  return `View expense: ${expense.description}, ${amount}, ${status}${formatTimelineDate(expense.date)}`;
}

