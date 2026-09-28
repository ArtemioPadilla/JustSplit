import type { Expense } from '@/schemas/expense';
import type { Settlement } from '@/schemas/settlement';

/**
 * The settlements ledger (plan B14a, ADR 0014). Every balance in the app —
 * the dashboard's people, a friend's page, an event's members and progress,
 * the suggested payments — is derived here, one way:
 *
 *   balance(person, scope) = split debts and credits over EVERY expense in
 *                            the scope − the settlements in the scope.
 *
 * Positive = is owed, negative = owes. A settlement from F to T for X
 * increases F's balance by X and decreases T's by X, converted like any
 * expense amount. Settling up never edits an expense: there is no per-expense
 * "settled" flag to keep in step with a payment that covers part of an
 * expense, several expenses, or somebody else's debt (a debt-simplified
 * suggestion A→C for a debt that came from B's expense).
 *
 * `settledAt` is legacy and read-only. It can only arrive from Track D's
 * Firebase import; an expense that carries it counts as fully settled and is
 * excluded from every balance, exactly as before, so imported data stays
 * correct. Nothing in this app writes it.
 *
 * Scopes (the caller picks the rows; this module never looks at who is
 * viewing): an event is its `eventId` expenses plus its `eventId`
 * settlements; the personal/global view is the rows that name the viewer,
 * where a settlement counts whatever its `eventId`/`groupId` because it moves
 * money between two people; a friend is the rows that involve both people. A
 * settlement made inside an event therefore also counts in the global and
 * friend views — money moved.
 *
 * Everything here is UX only. RLS decides what a viewer may read and write.
 */

/** One cent — the tolerance the greedy suggestion pass has always used for "zero". */
export const BALANCE_TOLERANCE = 0.01;

/** Rounds to cents and never returns `-0` (which `toEqual` and `toFixed` both distinguish from `0`). */
export function round2(amount: number): number {
  return Math.round(amount * 100) / 100 + 0;
}

/** Synchronous conversion into the display currency (build it from `useDisplayConversion`). */
export type Convert = (amount: number, currency: string) => number;

/** Fields the ledger reads from an expense; a live row can carry `null` where the type says `undefined`. */
export type LedgerExpense = Pick<Expense, 'amount' | 'currency' | 'paidBy' | 'splits'> & { settledAt?: string | null };
export type LedgerSettlement = Pick<Settlement, 'fromUserId' | 'toUserId' | 'amount' | 'currency'>;

/** `settledAt != null` — the legacy "fully settled" marker (`null` and `undefined` alike are "not"). */
export function isLegacySettled(expense: { settledAt?: string | null }): boolean {
  return expense.settledAt != null;
}

/** The settlements of one event: `eventId == id`. Rows with no event (`null`/`undefined`) are left out. */
export function settlementsForEvent<T extends { eventId?: string | null }>(settlements: readonly T[], eventId: string): T[] {
  return settlements.filter((settlement) => settlement.eventId === eventId);
}

/** The settlements between exactly these two people, in either direction (the friend scope). */
export function settlementsBetween<T extends { fromUserId: string; toUserId: string }>(settlements: readonly T[], a: string, b: string): T[] {
  return settlements.filter(
    (settlement) =>
      (settlement.fromUserId === a && settlement.toUserId === b) || (settlement.fromUserId === b && settlement.toUserId === a),
  );
}

/**
 * Net balance per person over `expenses` and `settlements`, in the currency
 * `convert` returns, rounded to cents per person. Legacy settled expenses are
 * skipped. **Zero-sum by construction**: each split whose user is not the payer
 * credits the payer and debits that user by the same converted amount, so the
 * payer's own share nets out, a payer outside the split is credited exactly
 * what the others are debited, and `expense.amount` is never read. (Crediting
 * `amount` and debiting the splits left a phantom balance whenever they
 * disagreed — an import, a legacy row, a rounding remainder, conversion
 * rounding — and progress stuck below 100%.) Never an equal division. Only
 * people who appear in a debt or a settlement get an entry.
 */
export function netBalances(
  expenses: readonly LedgerExpense[],
  settlements: readonly LedgerSettlement[],
  convert: Convert,
): Record<string, number> {
  const balances: Record<string, number> = {};

  for (const expense of expenses) {
    if (isLegacySettled(expense)) continue;
    for (const split of expense.splits) {
      if (split.userId === expense.paidBy) continue; // the payer's own share is not a debt
      const amount = convert(split.amount, expense.currency);
      balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + amount;
      balances[split.userId] = (balances[split.userId] ?? 0) - amount;
    }
  }

  for (const settlement of settlements) {
    if (settlement.fromUserId === settlement.toUserId) continue;
    const amount = convert(settlement.amount, settlement.currency);
    balances[settlement.fromUserId] = (balances[settlement.fromUserId] ?? 0) + amount;
    balances[settlement.toUserId] = (balances[settlement.toUserId] ?? 0) - amount;
  }

  for (const userId of Object.keys(balances)) balances[userId] = round2(balances[userId]!);
  return balances;
}

/** True when every balance is within a cent of zero (an empty scope is settled up). */
export function isSettledUp(balances: Record<string, number>): boolean {
  return Object.values(balances).every((balance) => Math.abs(balance) < BALANCE_TOLERANCE);
}

export interface SettlementProgress {
  /** Money already moved: the scope's settlements plus what its legacy settled expenses had owed. */
  settled: number;
  /** Money still to move: the sum of the positive net balances. */
  outstanding: number;
  /** 0-100, or `null` for "nothing to settle" (nothing owed and nothing settled — not 0%, not 100%). */
  percentage: number | null;
  settledUp: boolean;
}

/**
 * Progress towards being settled up (plan B14a): settled ÷ (settled +
 * outstanding). A legacy settled expense contributes what its debtors owed
 * (the non-payer splits) as settled value — the same unit as a settlement.
 * Paying more than was owed flips the direction and shows up as outstanding
 * for the overpaid person, so the figure can dip below 100 again; it never
 * exceeds it.
 */
export function settlementProgress(
  expenses: readonly LedgerExpense[],
  settlements: readonly LedgerSettlement[],
  convert: Convert,
): SettlementProgress {
  const balances = netBalances(expenses, settlements, convert);

  let settled = 0;
  for (const settlement of settlements) {
    if (settlement.fromUserId !== settlement.toUserId) settled += convert(settlement.amount, settlement.currency);
  }
  for (const expense of expenses) {
    if (!isLegacySettled(expense)) continue;
    for (const split of expense.splits) {
      if (split.userId !== expense.paidBy) settled += convert(split.amount, expense.currency);
    }
  }

  const outstanding = Object.values(balances).reduce((sum, balance) => (balance >= BALANCE_TOLERANCE ? sum + balance : sum), 0);

  const settledRounded = round2(settled);
  const outstandingRounded = round2(outstanding);
  const settledUp = isSettledUp(balances);

  if (settledRounded < BALANCE_TOLERANCE && outstandingRounded < BALANCE_TOLERANCE) {
    return { settled: 0, outstanding: 0, percentage: null, settledUp };
  }
  return {
    settled: settledRounded,
    outstanding: outstandingRounded,
    percentage: round2((settledRounded / (settledRounded + outstandingRounded)) * 100),
    settledUp,
  };
}
