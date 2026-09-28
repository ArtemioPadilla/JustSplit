/**
 * Expense calculator (plan B3, spec D10). Ported from the legacy Next tree's
 * `src/utils/expenseCalculator.ts`, **re-typed onto the universal `Expense`**:
 * both balance paths now consume `splits[].amount` instead of
 * `amount / participants.length` — the old share bug (equal division
 * regardless of each participant's actual share) does not survive the
 * re-typing. `participants = splits.map(s => s.userId)`; `settled =
 * settledAt != null`.
 *
 * `calculateSettlementsWithConversion` takes an injected `convert` function
 * instead of importing `domain/currency` directly, so this module stays free
 * of `fetch`/cache concerns (spec: currency.ts is pure, fetch/cache
 * injected) — callers pass `domain/currency.convertCurrency` bound to a real
 * cache in production, or a stub in tests.
 */
import type { Expense } from '../schemas/expense';
import type { ExpenseSplit, SplitType } from '../schemas/expense';

export interface SettlementSuggestion {
  fromUser: string;
  toUser: string;
  amount: number;
  expenseIds: string[];
  eventId?: string;
}

interface Balance {
  id: string;
  amount: number;
}

function greedySettle(balances: Record<string, number>, expenseIdsFor: (debtorId: string, creditorId: string) => string[], eventId?: string): SettlementSuggestion[] {
  const debtors: Balance[] = [];
  const creditors: Balance[] = [];

  Object.entries(balances).forEach(([userId, balance]) => {
    if (Math.abs(balance) < 0.01) return;
    if (balance < 0) {
      debtors.push({ id: userId, amount: -balance });
    } else {
      creditors.push({ id: userId, amount: balance });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: SettlementSuggestion[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    const settlementAmount = Math.min(debtor.amount, creditor.amount);

    if (settlementAmount > 0) {
      settlements.push({
        fromUser: debtor.id,
        toUser: creditor.id,
        amount: settlementAmount,
        expenseIds: expenseIdsFor(debtor.id, creditor.id),
        eventId,
      });

      debtor.amount -= settlementAmount;
      creditor.amount -= settlementAmount;
    }

    if (debtor.amount < 0.01) debtors.shift();
    if (creditor.amount < 0.01) creditors.shift();
  }

  return settlements;
}

/**
 * Suggested settlements that would zero out every balance among `userIds`,
 * from `expenses` unsettled at the time of the call (`settledAt == null`),
 * optionally scoped to one `eventId`.
 */
export function calculateSettlements(expenses: Expense[], userIds: string[], eventId?: string): SettlementSuggestion[] {
  const filteredExpenses = eventId
    ? expenses.filter((e) => e.eventId === eventId && e.settledAt == null)
    : expenses.filter((e) => e.settledAt == null);

  if (filteredExpenses.length === 0) return [];

  const balances: Record<string, number> = {};
  userIds.forEach((id) => {
    balances[id] = 0;
  });

  filteredExpenses.forEach((expense) => {
    const { paidBy, splits } = expense;
    splits.forEach((split) => {
      if (split.userId === paidBy) return;
      balances[split.userId] = (balances[split.userId] ?? 0) - split.amount;
      balances[paidBy] = (balances[paidBy] ?? 0) + split.amount;
    });
  });

  return greedySettle(balances, (debtorId, creditorId) =>
    filteredExpenses
      .filter((expense) => expense.paidBy === creditorId && expense.splits.some((s) => s.userId === debtorId))
      .map((expense) => expense.id),
    eventId,
  );
}

/** Injected currency converter — bind `domain/currency.convertCurrency` to a real cache in production. */
export type ConvertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
) => Promise<{ convertedAmount: number; isFallback: boolean }>;

/**
 * Like `calculateSettlements`, but every expense's amount is converted to
 * `targetCurrency` first via the injected `convert` function.
 */
export async function calculateSettlementsWithConversion(
  expenses: Expense[],
  userIds: string[],
  targetCurrency: string,
  convert: ConvertCurrency,
  filterEventId?: string,
): Promise<SettlementSuggestion[]> {
  const unsettled = expenses.filter((e) => e.settledAt == null);
  const filteredExpenses = filterEventId ? unsettled.filter((e) => e.eventId === filterEventId) : unsettled;

  if (filteredExpenses.length === 0) return [];

  const balances: Record<string, number> = {};
  userIds.forEach((id) => {
    balances[id] = 0;
  });

  const contributingExpenseIds = new Set<string>();

  for (const expense of filteredExpenses) {
    contributingExpenseIds.add(expense.id);
    if (expense.splits.length === 0) continue;

    let amountInTargetCurrency = expense.amount;
    if (expense.currency.toUpperCase() !== targetCurrency.toUpperCase()) {
      const { convertedAmount } = await convert(expense.amount, expense.currency, targetCurrency);
      amountInTargetCurrency = convertedAmount;
    }

    const conversionRatio = expense.amount === 0 ? 0 : amountInTargetCurrency / expense.amount;

    balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + amountInTargetCurrency;
    expense.splits.forEach((split) => {
      balances[split.userId] = (balances[split.userId] ?? 0) - split.amount * conversionRatio;
    });
  }

  const rounded: Record<string, number> = {};
  Object.entries(balances).forEach(([id, amount]) => {
    rounded[id] = Math.round(amount * 100) / 100;
  });

  return greedySettle(rounded, () => Array.from(contributingExpenseIds), filterEventId);
}

// ─── materializeSplits (spec D10) ──────────────────────────────────────────

export type MaterializeSplitsInput =
  | { splitType: Extract<SplitType, 'equal'>; participantIds: string[]; payerId: string }
  | { splitType: Extract<SplitType, 'exact'>; shares: Record<string, number> }
  | { splitType: Extract<SplitType, 'percentage'>; shares: Record<string, number>; payerId: string };

const toCents = (amount: number): number => Math.round(amount * 100);
const fromCents = (cents: number): number => cents / 100;

/**
 * The **only** writer of `Expense.splits[].amount` (spec D10; used by plan
 * B10/B14). `equal` divides `amount` evenly among `participantIds` in whole
 * cents, placing any leftover cent on the payer. `percentage` rounds each
 * participant's share to whole cents, placing the rounding remainder on the
 * payer so the splits always sum to exactly `amount`. `exact` takes the
 * literal per-participant amounts as given (the caller is responsible for
 * them summing to `amount`).
 */
export function materializeSplits(amount: number, input: MaterializeSplitsInput): ExpenseSplit[] {
  const totalCents = toCents(amount);

  if (input.splitType === 'equal') {
    const { participantIds, payerId } = input;
    const n = participantIds.length;
    if (n === 0) return [];

    const baseCents = Math.floor(totalCents / n);
    const remainderCents = totalCents - baseCents * n;

    return participantIds.map((userId) => ({
      userId,
      amount: fromCents(userId === payerId ? baseCents + remainderCents : baseCents),
    }));
  }

  if (input.splitType === 'exact') {
    return Object.entries(input.shares).map(([userId, shareAmount]) => ({ userId, amount: shareAmount }));
  }

  // percentage
  const { shares, payerId } = input;
  const entries = Object.entries(shares);
  const centsByUser = entries.map(([userId, percentage]) => [userId, Math.round((totalCents * percentage) / 100)] as const);
  const distributedCents = centsByUser.reduce((sum, [, cents]) => sum + cents, 0);
  const remainderCents = totalCents - distributedCents;

  return centsByUser.map(([userId, cents]) => ({
    userId,
    amount: fromCents(userId === payerId ? cents + remainderCents : cents),
    percentage: shares[userId],
  }));
}
