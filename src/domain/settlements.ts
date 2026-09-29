import type { PersonBalance } from './dashboard';
import { BALANCE_TOLERANCE } from './ledger';

/**
 * Pure helpers behind the `/settlements` island (plan B14b). The money maths
 * lives in `ledger.ts` and `expenseCalculator.ts` (plan B14a, ADR 0014); this
 * file only decides what the URL asks for, how rows are ordered and who is
 * offered which action. All of it is UX: RLS decides what a viewer may read
 * and write, so nothing here is authorization.
 */

/** Which rows the page shows: the viewer's own (`involvingUser`) or one event's. */
export type SettlementsScope = { kind: 'personal' } | { kind: 'event'; eventId: string };

export type SettlementsRoute = {
  scope: SettlementsScope;
  /** `?group=` was present. Group settlements are Track D (D7): the page shows a note and stays personal. */
  groupRequested: boolean;
};

/**
 * Reads `location.search`. `?event=<id>` is the event scope; anything else is
 * the personal view, so the page is never a dead end. `?group=` never changes
 * the scope: it only asks for the "coming soon" note (the event wins when both
 * are present).
 */
export function parseSettlementsScope(search: string): SettlementsRoute {
  const params = new URLSearchParams(search);
  const eventId = params.get('event')?.trim();
  const groupRequested = Boolean(params.get('group')?.trim());
  return {
    scope: eventId ? { kind: 'event', eventId } : { kind: 'personal' },
    groupRequested,
  };
}

/**
 * True when `uid` is the payer or the payee of the suggestion. The insert
 * policy requires the creator to be a party, so only they are offered "Record
 * payment". Denies by default: no viewer means no party (never `!== …`).
 */
export function isParty(suggestion: { fromUser: string; toUser: string }, uid: string | undefined): boolean {
  if (!uid) return false;
  return suggestion.fromUser === uid || suggestion.toUser === uid;
}

/** The viewer's own suggestions first; each group keeps its incoming (greedy) order. */
export function viewerFirst<T extends { fromUser: string; toUser: string }>(suggestions: readonly T[], uid: string | undefined): T[] {
  const mine = suggestions.filter((suggestion) => isParty(suggestion, uid));
  const others = suggestions.filter((suggestion) => !isParty(suggestion, uid));
  return [...mine, ...others];
}

/** Newest first: `date` is a calendar date (`YYYY-MM-DD`), so strings compare; ties fall back to `createdAt`. */
export function newestFirst<T extends { date: string; createdAt: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return 0;
  });
}

export type BalanceEntry = { userId: string; amount: number };

/**
 * Groups net balances (positive = is owed) into who owes and who is owed, as
 * positive amounts, largest first. Anyone within a cent of zero is settled up
 * and appears in neither list.
 */
export function splitBalances(balances: Record<string, number>): { owes: BalanceEntry[]; owed: BalanceEntry[] } {
  const owes: BalanceEntry[] = [];
  const owed: BalanceEntry[] = [];
  for (const [userId, balance] of Object.entries(balances)) {
    if (Math.abs(balance) < BALANCE_TOLERANCE) continue;
    if (balance < 0) owes.push({ userId, amount: -balance });
    else owed.push({ userId, amount: balance });
  }
  const bySize = (a: BalanceEntry, b: BalanceEntry) => b.amount - a.amount || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);
  return { owes: owes.sort(bySize), owed: owed.sort(bySize) };
}

/** True when `entered` is at least one cent above `owed`, compared in whole cents (never float noise). */
export function exceedsOwed(entered: number, owed: number): boolean {
  return Math.round(entered * 100) > Math.round(owed * 100);
}

/** One suggested payment: `fromUser` pays `toUser` `amount` (positive, in the display currency). */
export type PairwiseSuggestion = { fromUser: string; toUser: string; amount: number };

/**
 * The personal view (plan B14b, ADR 0014 §5) is PAIRWISE: one suggested payment
 * per other person with a non-zero balance, from `dashboard.balancesWithUser`
 * (positive = they owe the viewer). There is deliberately no simplification
 * across people: both parties of a debt see exactly the rows that name both of
 * them, so both compute the same number, and it is the number the dashboard
 * shows. Largest first, ties by the other person's id.
 */
export function pairwiseSuggestions(balances: readonly PersonBalance[], viewerId: string): PairwiseSuggestion[] {
  return balances
    .filter((entry) => Math.abs(entry.balance) >= BALANCE_TOLERANCE)
    .map<PairwiseSuggestion & { other: string }>((entry) =>
      entry.balance > 0
        ? { fromUser: entry.userId, toUser: viewerId, amount: entry.balance, other: entry.userId }
        : { fromUser: viewerId, toUser: entry.userId, amount: -entry.balance, other: entry.userId },
    )
    .sort((a, b) => b.amount - a.amount || (a.other < b.other ? -1 : a.other > b.other ? 1 : 0))
    .map(({ fromUser, toUser, amount }) => ({ fromUser, toUser, amount }));
}

/** The same pairwise balances as two lists for the Balances tab: people the viewer owes, and people who owe the viewer. */
export function pairwiseLists(balances: readonly PersonBalance[]): { youOwe: BalanceEntry[]; oweYou: BalanceEntry[] } {
  const youOwe: BalanceEntry[] = [];
  const oweYou: BalanceEntry[] = [];
  for (const entry of balances) {
    if (Math.abs(entry.balance) < BALANCE_TOLERANCE) continue;
    if (entry.balance < 0) youOwe.push({ userId: entry.userId, amount: -entry.balance });
    else oweYou.push({ userId: entry.userId, amount: entry.balance });
  }
  const bySize = (a: BalanceEntry, b: BalanceEntry) => b.amount - a.amount || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);
  return { youOwe: youOwe.sort(bySize), oweYou: oweYou.sort(bySize) };
}
