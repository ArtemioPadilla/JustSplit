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
import type { Settlement } from '../schemas/settlement';
import { isLegacySettled, netBalances, round2, settlementsForEvent } from './ledger';

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
 * Suggested payments that would zero out every balance among `userIds` (plan
 * B14a, ADR 0014): the scope's expenses net of the scope's `settlements`, then
 * the greedy minimal-transactions pass. Optionally scoped to one `eventId`,
 * which narrows BOTH lists to that event; without it every row given counts
 * (the personal/global scope — the caller narrows to the rows that name the
 * viewer, and a settlement counts whatever its `eventId`). Legacy settled
 * expenses (`settledAt != null`) are excluded. Amounts are summed as given,
 * with no currency conversion: use `calculateSettlementsWithConversion` for
 * mixed currencies.
 *
 * `expenseIds` on a suggestion is informational only — which expenses the
 * pair's debt came from at best; nothing may rely on it for balance maths.
 */
export function calculateSettlements(
  expenses: Expense[],
  settlements: Settlement[],
  userIds: string[],
  eventId?: string,
): SettlementSuggestion[] {
  const scopedExpenses = eventId ? expenses.filter((e) => e.eventId === eventId) : expenses;
  const scopedSettlements = eventId ? settlementsForEvent(settlements, eventId) : settlements;
  const liveExpenses = scopedExpenses.filter((e) => !isLegacySettled(e));

  const balances: Record<string, number> = {};
  userIds.forEach((id) => {
    balances[id] = 0;
  });
  Object.entries(netBalances(liveExpenses, scopedSettlements, (amount) => amount)).forEach(([id, amount]) => {
    balances[id] = amount;
  });

  return greedySettle(
    balances,
    (debtorId, creditorId) =>
      liveExpenses
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
 * Like `calculateSettlements`, but every expense and settlement amount is
 * converted to `targetCurrency` first via the injected `convert` function.
 */
export async function calculateSettlementsWithConversion(
  expenses: Expense[],
  settlements: Settlement[],
  userIds: string[],
  targetCurrency: string,
  convert: ConvertCurrency,
  filterEventId?: string,
): Promise<SettlementSuggestion[]> {
  const scopedExpenses = filterEventId ? expenses.filter((e) => e.eventId === filterEventId) : expenses;
  const scopedSettlements = filterEventId ? settlementsForEvent(settlements, filterEventId) : settlements;
  const liveExpenses = scopedExpenses.filter((e) => !isLegacySettled(e));

  const balances: Record<string, number> = {};
  userIds.forEach((id) => {
    balances[id] = 0;
  });

  const toTarget = async (amount: number, currency: string): Promise<number> =>
    currency.toUpperCase() === targetCurrency.toUpperCase() ? amount : (await convert(amount, currency, targetCurrency)).convertedAmount;

  const contributingExpenseIds = new Set<string>();

  for (const expense of liveExpenses) {
    contributingExpenseIds.add(expense.id);
    if (expense.splits.length === 0) continue;

    const amountInTargetCurrency = await toTarget(expense.amount, expense.currency);
    const conversionRatio = expense.amount === 0 ? 0 : amountInTargetCurrency / expense.amount;

    // Per-split pairing (zero-sum by construction, same as `ledger.netBalances`): the payer's own
    // share nets out and `expense.amount` only supplies the conversion ratio.
    expense.splits.forEach((split) => {
      if (split.userId === expense.paidBy) return;
      const converted = split.amount * conversionRatio;
      balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + converted;
      balances[split.userId] = (balances[split.userId] ?? 0) - converted;
    });
  }

  for (const settlement of scopedSettlements) {
    if (settlement.fromUserId === settlement.toUserId) continue;
    const amount = await toTarget(settlement.amount, settlement.currency);
    balances[settlement.fromUserId] = (balances[settlement.fromUserId] ?? 0) + amount;
    balances[settlement.toUserId] = (balances[settlement.toUserId] ?? 0) - amount;
  }

  const rounded: Record<string, number> = {};
  Object.entries(balances).forEach(([id, amount]) => {
    rounded[id] = round2(amount);
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
 * Who absorbs the remainder cents: the payer when they take a share,
 * otherwise the first participant (spec D10 lets the payer be a member who
 * takes no share). Either way the splits sum to exactly `amount`.
 */
const remainderHolder = (participantIds: string[], payerId: string): string | undefined =>
  participantIds.includes(payerId) ? payerId : participantIds[0];

/**
 * The **only** writer of `Expense.splits[].amount` (spec D10; used by plan
 * B10/B14). `equal` divides `amount` evenly among `participantIds` in whole
 * cents, placing any leftover cent on the payer (or on the first participant
 * when the payer takes no share). `percentage` rounds each
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
    const holder = remainderHolder(participantIds, payerId);

    return participantIds.map((userId) => ({
      userId,
      amount: fromCents(userId === holder ? baseCents + remainderCents : baseCents),
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
  const holder = remainderHolder(entries.map(([userId]) => userId), payerId);

  return centsByUser.map(([userId, cents]) => ({
    userId,
    amount: fromCents(userId === holder ? cents + remainderCents : cents),
    percentage: shares[userId],
  }));
}
