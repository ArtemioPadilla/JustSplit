import type { CreateEventInput, Event, EventPatch } from '@/schemas/event';
import type { EventFormValues } from '@/schemas/event-form';
import type { Expense } from '@/schemas/expense';
import type { Settlement } from '@/schemas/settlement';
import { formatCalendarDate, parseCalendarDate } from './dates';
import { netBalances, round2, settlementProgress } from './ledger';

/**
 * Pure events selectors and payload builders (plan B11b). Pulled out of the
 * islands so the totals, balances, sorting and the create/edit payloads are
 * each provable in one place (same reasoning as `domain/groups.ts` and
 * `domain/friends.ts`).
 *
 * ADR 0013: every member of an event sees every expense of it, so the
 * figures here are computed over ALL of an event's expenses and are identical
 * for every viewer — nothing takes a viewer id. Plan B14a (ADR 0014): they are
 * a ledger — the event's expenses minus the event's settlements
 * (`eventId == id`; a settlement with no event, or another, is not part of
 * this scope) — never a per-expense settled flag. Everything is UX/wiring only:
 * `events_insert`/`events_update` and `guard_events` are the authority
 * (CLAUDE.md rule 8).
 *
 * Fields the relational adapter reads from a nullable column can arrive as
 * `null` at runtime on a live-query row (the hooks hand rows over unparsed),
 * so every reader here treats `null` and `undefined` alike.
 */

type Convert = (amount: number, currency: string) => number;
type EventDates = Pick<Event, 'startDate' | 'date'>;

/** The event's start: `startDate`, falling back to `date` (legacy rows). `undefined` when neither is set. */
export function eventStartDate(event: EventDates): string | undefined {
  return event.startDate ?? event.date ?? undefined;
}

function startYear(event: EventDates): number | undefined {
  const start = eventStartDate(event);
  if (!start) return undefined;
  const year = parseCalendarDate(start).getFullYear();
  return Number.isNaN(year) ? undefined : year;
}

/** Distinct start years, newest first — the date filter offers only years that have an event. */
export function eventYears(events: EventDates[]): number[] {
  const years = new Set<number>();
  for (const event of events) {
    const year = startYear(event);
    if (year !== undefined) years.add(year);
  }
  return Array.from(years).sort((a, b) => b - a);
}

/** Keeps the events that start in `year`; `'all'` keeps everything (undated events included). */
export function filterEventsByYear<T extends EventDates>(events: T[], year: number | 'all'): T[] {
  if (year === 'all') return events;
  return events.filter((event) => startYear(event) === year);
}

export type EventSortField = 'date' | 'name' | 'total';
export type SortOrder = 'asc' | 'desc';

const nameCollator = new Intl.Collator(undefined, { sensitivity: 'base' });

/**
 * A new array sorted by start date, name or total. `totals` is the per-event
 * total in the display currency (a missing entry counts as 0). An undated
 * event sorts last in either direction (there is nothing to order it by), and
 * ties always fall back to name then id so a re-sort never shuffles equal rows.
 */
export function sortEvents<T extends EventDates & Pick<Event, 'id' | 'name'>>(
  events: T[],
  sort: { field: EventSortField; order: SortOrder },
  totals: Record<string, number>,
): T[] {
  const direction = sort.order === 'asc' ? 1 : -1;
  const tieBreak = (a: T, b: T) => nameCollator.compare(a.name, b.name) || a.id.localeCompare(b.id);

  return [...events].sort((a, b) => {
    if (sort.field === 'name') return direction * nameCollator.compare(a.name, b.name) || tieBreak(a, b);
    if (sort.field === 'total') return direction * ((totals[a.id] ?? 0) - (totals[b.id] ?? 0)) || tieBreak(a, b);

    const startA = eventStartDate(a);
    const startB = eventStartDate(b);
    if (startA === undefined && startB === undefined) return tieBreak(a, b);
    if (startA === undefined) return 1;
    if (startB === undefined) return -1;
    return direction * (parseCalendarDate(startA).getTime() - parseCalendarDate(startB).getTime()) || tieBreak(a, b);
  });
}

/** Expenses grouped by `eventId`; an expense with no event (null/undefined) is left out. */
export function expensesByEvent(expenses: Expense[]): Map<string, Expense[]> {
  const grouped = new Map<string, Expense[]>();
  for (const expense of expenses) {
    if (!expense.eventId) continue;
    const list = grouped.get(expense.eventId);
    if (list) list.push(expense);
    else grouped.set(expense.eventId, [expense]);
  }
  return grouped;
}

/** Settlements grouped by `eventId`; a settlement with no event (null/undefined) is left out — the event scope counts only its own. */
export function settlementsByEvent(settlements: Settlement[]): Map<string, Settlement[]> {
  const grouped = new Map<string, Settlement[]>();
  for (const settlement of settlements) {
    if (!settlement.eventId) continue;
    const list = grouped.get(settlement.eventId);
    if (list) list.push(settlement);
    else grouped.set(settlement.eventId, [settlement]);
  }
  return grouped;
}

export interface EventStats {
  count: number;
  /** Every expense (legacy settled included), in the display currency. */
  total: number;
  /** Still to be paid: the sum of the positive net balances, in the display currency. */
  outstanding: number;
  /** Already paid: the event's settlements plus what its legacy settled expenses had owed, in the display currency. */
  settled: number;
  /** 0-100 = settled / (settled + outstanding), or `null` for "nothing to settle" (nothing owed and nothing settled). */
  settledPercentage: number | null;
  /** Every net balance is within a cent of zero. */
  settledUp: boolean;
}

/** Totals and progress over all of an event's expenses and settlements (ADR 0013, 0014), converted into the display currency. */
export function eventStats(expenses: Expense[], settlements: Settlement[], convert: Convert): EventStats {
  let total = 0;
  for (const expense of expenses) total += convert(expense.amount, expense.currency);
  const progress = settlementProgress(expenses, settlements, convert);
  return {
    count: expenses.length,
    total: round2(total),
    outstanding: progress.outstanding,
    settled: progress.settled,
    settledPercentage: progress.percentage,
    settledUp: progress.settledUp,
  };
}

/**
 * The whole percentage the progress bar shows, or `null` for "nothing to
 * settle" (no bar: not 0% and not 100%). 100 only when actually settled up — a
 * balance still open never rounds up to 100.
 */
export function settlementProgressPercent(stats: Pick<EventStats, 'settledPercentage' | 'settledUp'>): number | null {
  if (stats.settledPercentage === null) return null;
  if (stats.settledUp) return 100;
  return Math.min(99, Math.round(stats.settledPercentage));
}

/**
 * Per-user balance over the event's ledger, in the display currency (positive =
 * is owed, negative = owes): the payer is credited the whole amount and each
 * participant debited their own `splits[]` share — never an equal division (the
 * legacy page divided by the participant count, ignoring exact/percentage
 * splits) — minus the event's settlements (F to T for X raises F and lowers T).
 * A payer outside the split is credited without a debit, as they paid for the
 * others. Legacy settled expenses are skipped.
 */
export function eventBalances(expenses: Expense[], settlements: Settlement[], convert: Convert): Record<string, number> {
  return netBalances(expenses, settlements, convert);
}

/**
 * Who the member picker lists. Registered users only, never free text: the
 * caller (always an event member — the creator on create, an actor on edit),
 * then anyone already on the event (so a non-friend member stays visible and
 * removable — existing members never block an edit), then the pool the caller
 * may ADD from (their accepted friends, or the event group's members).
 */
export function eventCandidateIds(input: { uid: string; poolIds: string[]; existingMemberIds?: string[] }): string[] {
  return Array.from(new Set([input.uid, ...(input.existingMemberIds ?? []), ...input.poolIds]));
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // `new Date(2026, 1, 31)` rolls over to March 3rd: only a round trip proves it is a real day.
  return formatCalendarDate(parseCalendarDate(value)) === value;
}

/** The message to show under the date fields, or `null` when they are valid. The end date is optional. */
export function validateEventDates(startDate: string, endDate: string): string | null {
  if (!isCalendarDate(startDate)) return 'Choose a start date.';
  if (endDate === '') return null;
  if (!isCalendarDate(endDate)) return 'Enter the end date as a real date, or leave it empty.';
  if (endDate < startDate) return 'The end date can’t be before the start date.';
  return null;
}

/**
 * The event form's parsed values (`EventFormValues`, derived from its Zod schema — never
 * re-declared here, so the form and the payload builders cannot drift) plus who is creating it.
 * `memberIds` are the picked members; the creator is added if missing and never duplicated.
 * `groupId` is `?group=`: `events_insert` then requires every member to be in that group.
 */
export type BuildCreateEventInputParams = EventFormValues & { uid: string; groupId?: string };

/** The `events` create payload: text trimmed, `date` written with `startDate`, `kind: 'event'`, the creator first in `memberIds`. */
export function buildCreateEventInput(params: BuildCreateEventInputParams): CreateEventInput {
  const description = params.description.trim();
  return {
    name: params.name.trim(),
    ...(description ? { description } : {}),
    date: params.startDate,
    startDate: params.startDate,
    ...(params.endDate ? { endDate: params.endDate } : {}),
    preferredCurrency: params.preferredCurrency,
    kind: 'event',
    groupId: params.groupId ?? null,
    memberIds: Array.from(new Set([params.uid, ...params.memberIds])),
    createdBy: params.uid,
  };
}

export type EventEditValues = EventFormValues;

/**
 * The minimal patch for an edit: only the fields that changed, so an
 * untouched event sends nothing and never re-sends an immutable column.
 * `null` clears a column (an `undefined` key is dropped from the request and
 * would leave the old value); `date` follows `startDate`. `memberIds` keeps
 * the existing order and appends additions, and always keeps the editor —
 * `events_update` requires the actor to still be a member afterwards. Only
 * ADDED members are checked by the database (`guard_events`), so removing a
 * member, or leaving a non-friend member in place, never blocks the edit.
 */
export function buildEventPatch(event: Event, values: EventEditValues, editorId: string): EventPatch {
  const patch: EventPatch = {};

  const name = values.name.trim();
  if (name !== event.name) patch.name = name;

  const description = values.description.trim();
  if (description !== (event.description ?? '')) patch.description = description || null;

  if (values.startDate !== eventStartDate(event)) {
    patch.startDate = values.startDate;
    patch.date = values.startDate;
  }

  if (values.endDate !== (event.endDate ?? '')) patch.endDate = values.endDate || null;

  if (values.preferredCurrency !== (event.preferredCurrency ?? '')) patch.preferredCurrency = values.preferredCurrency;

  const wanted = new Set([...values.memberIds, editorId]);
  const existing = new Set(event.memberIds);
  const kept = event.memberIds.filter((id) => wanted.has(id));
  const added = values.memberIds.filter((id) => !existing.has(id));
  const memberIds = Array.from(new Set([...kept, ...added]));
  if (memberIds.length !== event.memberIds.length || memberIds.some((id) => !existing.has(id))) patch.memberIds = memberIds;

  return patch;
}
