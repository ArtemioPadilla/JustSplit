import type { Expense } from '@/schemas/expense';
import type { Event } from '@/schemas/event';
import type { Settlement } from '@/schemas/settlement';
import { parseCalendarDate } from './dates';
import { BALANCE_TOLERANCE, isLegacySettled, round2 } from './ledger';

/**
 * Pure dashboard selectors (plan B8a). Every selector takes domain objects
 * (`src/schemas/*`) plus a **synchronous** `convert(amount, currency)`
 * function that returns the amount in the caller's display currency —
 * selectors never fetch. B8b builds `convert` from `fetchExchangeRate`
 * (`src/lib/currency/rates.ts`) once per render and passes it down; tests
 * pass a stub. Name resolution (`names: Record<id, string>`) stays a caller
 * concern too, fed later from `useProfiles` — selectors fall back to
 * 'Unknown' for an id with no entry.
 */

// ─── involvingUser ──────────────────────────────────────────────────────────

/**
 * Rows that name `uid` in their `memberIds` (plan B2d, ADR 0013). Since
 * visibility follows group and event membership, `useExpenses` /
 * `useSettlements` also return rows the viewer can see only because they
 * belong to the row's group or event — other members' spending. Everything
 * personal (total spent, monthly trends, the recent lists, "shared with a
 * friend", "attach to a group") is about the rows the viewer is part of, so
 * those call sites narrow with this; the expense LIST and the group/event
 * feeds deliberately keep everything visible. UX scoping only — RLS decides
 * what the viewer may see and write.
 */
export function involvingUser<T extends { memberIds: string[] }>(rows: readonly T[], uid: string): T[] {
  return rows.filter((row) => row.memberIds.includes(uid));
}

// ─── monthlyTotals ──────────────────────────────────────────────────────────

export interface MonthlyTotal {
  /** Stable sort/lookup key, e.g. '2026-03' — never shown to users. */
  monthKey: string;
  /** Display label, e.g. 'Mar 2026'. */
  month: string;
  /** Total spend in the display currency for this month. */
  total: number;
  /** Number of expenses that fell in this month. */
  count: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Monthly spend totals in the display currency, the last 6 months (this
 * month inclusive) oldest first, **including months with zero expenses** —
 * the dashboard shows a flat line for a quiet month rather than skipping it.
 * `now` is injectable for tests; defaults to the real clock. `expense.date`
 * is parsed with `parseCalendarDate` (bug fix, B8a review), not a bare
 * `new Date(...)` — the latter reads a calendar-date string as UTC midnight,
 * which bucketed an expense on the 1st into the PRIOR month for anyone west
 * of UTC (the user base is largely in Mexico, UTC-6).
 */
export function monthlyTotals(
  expenses: Expense[],
  convert: (amount: number, currency: string) => number,
  now: Date = new Date(),
): MonthlyTotal[] {
  const months: MonthlyTotal[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ monthKey: monthKeyOf(d), month: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`, total: 0, count: 0 });
  }
  const byKey = new Map(months.map((m) => [m.monthKey, m]));
  const rawTotals = new Map<string, number>();

  for (const expense of expenses) {
    const date = parseCalendarDate(expense.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = monthKeyOf(date);
    if (!byKey.has(key)) continue; // outside the 6-month window
    rawTotals.set(key, (rawTotals.get(key) ?? 0) + convert(expense.amount, expense.currency));
    byKey.get(key)!.count += 1;
  }

  for (const month of months) {
    month.total = round2(rawTotals.get(month.monthKey) ?? 0);
  }

  return months;
}

// ─── categoryDistribution ───────────────────────────────────────────────────

export interface CategoryTotal {
  /** The raw `expense.category` string, or 'Uncategorized' when missing/empty. */
  category: string;
  /** Total spend in the display currency for this category. */
  total: number;
  /** Share of the grand total, 0-100. */
  percentage: number;
}

/**
 * Totals grouped by the raw `category` string (missing or empty → the
 * `'Uncategorized'` bucket). `category` stays a free string forever (spec
 * D9) — Track D issue D8 re-keys this selector against the global category
 * taxonomy once it exists; until then it groups on the literal value.
 * Sorted by total, descending.
 */
export function categoryDistribution(
  expenses: Expense[],
  convert: (amount: number, currency: string) => number,
): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    const category = expense.category?.trim() || 'Uncategorized';
    totals.set(category, (totals.get(category) ?? 0) + convert(expense.amount, expense.currency));
  }

  const grandTotal = [...totals.values()].reduce((sum, v) => sum + v, 0);

  return [...totals.entries()]
    .map(([category, total]) => ({
      category,
      total: round2(total),
      percentage: grandTotal > 0 ? round2((total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

// ─── balancesWithUser ───────────────────────────────────────────────────────

export interface PersonBalance {
  userId: string;
  name: string;
  /** Signed, in the display currency: positive = they owe you, negative = you owe them. */
  balance: number;
}

/**
 * Net balance between `currentUserId` and every other person, from the ledger
 * (plan B14a, ADR 0014): the split debts and credits of every expense they
 * share, minus the settlements between them. Derived directly from `splits[]`
 * (spec D10) rather than `calculateSettlements`'s greedy pairing: a settlement
 * suggestion matches the largest debtor with the largest creditor globally,
 * which is not necessarily the two people who actually shared an expense — it
 * cannot answer "who owes whom" for a specific relationship. `paidBy` may be
 * outside `splits[]` entirely (spec D10 lets the payer take no share); that
 * case still resolves correctly here because the loop only ever looks at the
 * two parties on each individual split.
 *
 * A settlement counts when it names the current user, whatever its `eventId`
 * or `groupId` — it moved money between two people. The one they paid (or who
 * paid them) owes less: settling never rewrites an expense, so a payment
 * covers part of one, several, or a debt that came from a third person's
 * expense. A settlement between two OTHER people is irrelevant here. A legacy
 * settled expense (`settledAt != null`, only ever imported) is excluded.
 * Relationships that round to exactly zero are dropped — there is nothing to
 * render for them. Sorted by balance, descending (most owed to you first).
 */
export function balancesWithUser(
  expenses: Expense[],
  settlements: Settlement[],
  currentUserId: string,
  names: Record<string, string>,
  convert: (amount: number, currency: string) => number,
): PersonBalance[] {
  const raw = new Map<string, number>();

  for (const expense of expenses) {
    if (isLegacySettled(expense)) continue;
    const { paidBy, splits, currency } = expense;

    for (const split of splits) {
      if (split.userId === paidBy) continue; // the payer's own share is not a debt
      const converted = convert(split.amount, currency);

      if (paidBy === currentUserId && split.userId !== currentUserId) {
        // The other person owes the current user their share.
        raw.set(split.userId, (raw.get(split.userId) ?? 0) + converted);
      } else if (split.userId === currentUserId && paidBy !== currentUserId) {
        // The current user owes the payer their own share.
        raw.set(paidBy, (raw.get(paidBy) ?? 0) - converted);
      }
      // Neither party is the current user: irrelevant to this selector.
    }
  }

  for (const settlement of settlements) {
    if (settlement.fromUserId === settlement.toUserId) continue;
    const converted = convert(settlement.amount, settlement.currency);

    if (settlement.fromUserId === currentUserId) {
      // The current user paid them: they owe the current user more (or the current user owes them less).
      raw.set(settlement.toUserId, (raw.get(settlement.toUserId) ?? 0) + converted);
    } else if (settlement.toUserId === currentUserId) {
      // They paid the current user: they owe less.
      raw.set(settlement.fromUserId, (raw.get(settlement.fromUserId) ?? 0) - converted);
    }
    // Neither party is the current user: irrelevant to this selector.
  }

  return [...raw.entries()]
    .map(([userId, balance]) => ({ userId, name: names[userId] ?? 'Unknown', balance: round2(balance) }))
    .filter((b) => b.balance !== 0)
    .sort((a, b) => b.balance - a.balance);
}

// ─── totalSpent / openBalanceCount ─────────────────────────────────────────

/**
 * The figures `FinancialSummary` actually computed from real data (plan
 * B8b) — every other prop the legacy component accepted
 * (`compareWithLastMonth`, `avgPerDay`, `mostExpensiveCategory`,
 * `activeEvents`, `activeParticipants`, `highestExpense`) was fed a
 * hardcoded default by `page.tsx` and never reflected real state, so those
 * are dropped, not ported.
 */

/** Sum of every expense (settled and unsettled) in the display currency. */
export function totalSpent(expenses: Expense[], convert: (amount: number, currency: string) => number): number {
  return round2(expenses.reduce((sum, expense) => sum + convert(expense.amount, expense.currency), 0));
}

/**
 * How many people the viewer has an open balance with (plan B14a, ADR 0014):
 * the honest replacement for `unsettledCount`, which counted expenses without
 * `settledAt` — a per-expense flag that no longer exists to count, since
 * settling up is a payment on a ledger, not a mark on an expense. Takes
 * `balancesWithUser`'s output (already converted and net of settlements); a
 * balance below one cent is not open.
 */
export function openBalanceCount(balances: PersonBalance[]): number {
  return balances.filter((b) => Math.abs(b.balance) >= BALANCE_TOLERANCE).length;
}

// ─── upcomingEvents ─────────────────────────────────────────────────────────

/**
 * Events whose start (`startDate`, falling back to `date`) is today or
 * later, soonest first, capped at 3. An event with neither field set is
 * dropped — there is nothing to sort it by. `now` is injectable for tests.
 * The start is parsed with `parseCalendarDate` (bug fix, B8a review): a bare
 * `new Date(startDate)` reads a calendar-date string as UTC midnight, which
 * read as 18:00 the previous local day west of UTC and wrongly dropped an
 * event starting today as already past.
 */
export function upcomingEvents(events: Event[], now: Date = new Date()): Event[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return events
    .map((event) => ({ event, start: event.startDate ?? event.date }))
    .filter((e): e is { event: Event; start: string } => e.start != null)
    .map(({ event, start }) => ({ event, startAt: parseCalendarDate(start) }))
    .filter(({ startAt }) => !Number.isNaN(startAt.getTime()) && startAt >= startOfToday)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .slice(0, 3)
    .map(({ event }) => event);
}
