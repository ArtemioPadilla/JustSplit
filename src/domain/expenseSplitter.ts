/**
 * Expense splitter validation + split building (plan B10, spec D10). The
 * `ExpenseSplitter` widget edits SHARES (exact dollar amounts, or
 * percentages) — `buildSplits` is a thin wrapper over
 * `expenseCalculator#materializeSplits`, the ONLY writer of
 * `Expense.splits[].amount` (that module's own doc comment); this file never
 * re-implements its cent-rounding.
 */
import type { ExpenseSplit, SplitType } from '../schemas/expense';
import { materializeSplits } from './expenseCalculator';

/** Amounts (`exact`) or percentages (`percentage`), keyed by participant id. Ignored for `equal`. */
export type Shares = Record<string, number>;

export interface SplitValidation {
  valid: boolean;
  /** `exact`: dollars left to assign (negative = over). `percentage`: points left to 100 (negative = over). Always 0 for `equal`. */
  remaining: number;
  /** A clear, user-facing message when `!valid`; absent when valid. */
  message?: string;
}

const EPSILON = 0.005;

function sumShares(participantIds: string[], shares: Shares): number {
  return participantIds.reduce((sum, id) => sum + (shares[id] ?? 0), 0);
}

/**
 * Validates the current split. `equal` only needs at least one participant
 * (there are no shares to assign); `exact` needs the shares to sum to
 * `amount`; `percentage` needs them to sum to 100. A participant missing
 * from `shares` counts as a zero share, never a crash — the caller (the
 * form) is expected to still surface "N left to assign" for it.
 */
export function validateSplit(splitType: SplitType, amount: number, participantIds: string[], shares: Shares): SplitValidation {
  if (participantIds.length === 0) {
    return { valid: false, remaining: splitType === 'percentage' ? 100 : amount, message: 'Select at least one participant.' };
  }

  if (splitType === 'equal') {
    return { valid: true, remaining: 0 };
  }

  const target = splitType === 'percentage' ? 100 : amount;
  const sum = sumShares(participantIds, shares);
  const remaining = Math.round((target - sum) * 100) / 100;
  const valid = Math.abs(remaining) < EPSILON;

  if (valid) return { valid: true, remaining: 0 };

  const unit = splitType === 'percentage' ? '%' : '';
  const prefix = splitType === 'percentage' ? '' : '$';
  if (remaining > 0) {
    return { valid: false, remaining, message: `${prefix}${remaining.toFixed(splitType === 'percentage' ? 1 : 2)}${unit} left to assign` };
  }
  const over = Math.abs(remaining);
  return { valid: false, remaining, message: `${prefix}${over.toFixed(splitType === 'percentage' ? 1 : 2)}${unit} over the total` };
}

/** Shares restricted to `participantIds` (drops a stale entry for someone no longer selected). */
function pick(shares: Shares, participantIds: string[]): Shares {
  const picked: Shares = {};
  for (const id of participantIds) picked[id] = shares[id] ?? 0;
  return picked;
}

/**
 * Materializes `splits[]` for the current split type — the only place a
 * caller should turn `(splitType, amount, participantIds, payerId, shares)`
 * into `ExpenseSplit[]`. Callers should check `validateSplit(...).valid`
 * first; this function does not itself refuse an inconsistent `exact` split
 * (it takes the shares as given, same as `materializeSplits`'s own contract).
 */
export function buildSplits(
  splitType: SplitType,
  amount: number,
  participantIds: string[],
  payerId: string,
  shares: Shares,
): ExpenseSplit[] {
  if (splitType === 'equal') {
    return materializeSplits(amount, { splitType: 'equal', participantIds, payerId });
  }
  if (splitType === 'exact') {
    return materializeSplits(amount, { splitType: 'exact', shares: pick(shares, participantIds) });
  }
  return materializeSplits(amount, { splitType: 'percentage', shares: pick(shares, participantIds), payerId });
}
