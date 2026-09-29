import * as React from 'react';
import { calculateSettlementsWithConversion, type ConvertCurrency, type SettlementSuggestion } from '@/domain/expenseCalculator';
import type { Convert } from '@/domain/ledger';
import type { Expense } from '@/schemas/expense';
import type { Settlement } from '@/schemas/settlement';

export type SuggestionsResult =
  | { status: 'loading' }
  | { status: 'ready'; suggestions: SettlementSuggestion[] }
  | { status: 'error' };

export interface UseSuggestionsInput {
  expenses: Expense[];
  settlements: Settlement[];
  displayCurrency: string;
  /** From `useDisplayConversion`; only trusted once `ready`. */
  convert: Convert;
  ready: boolean;
  /** Set in the event scope, which narrows both lists to that event (the caller has already scoped them). */
  eventId?: string;
}

/** Every person a debt or a payment names — the calculator seeds a zero balance for each. */
function peopleIn(expenses: readonly Expense[], settlements: readonly Settlement[]): string[] {
  const ids = new Set<string>();
  for (const expense of expenses) {
    ids.add(expense.paidBy);
    for (const split of expense.splits) ids.add(split.userId);
  }
  for (const settlement of settlements) {
    ids.add(settlement.fromUserId);
    ids.add(settlement.toUserId);
  }
  return Array.from(ids);
}

/**
 * The scope's suggested payments (plan B14b): `calculateSettlementsWithConversion`
 * over its expenses AND settlements (ADR 0014), in the display currency. It is
 * async by contract, but the injected converter reads the already-resolved rates
 * synchronously, so it settles within a microtask.
 *
 * `loading` until the rates are ready and the result belongs to THESE inputs:
 * the result is compared by identity with the expenses, settlements, converter
 * and currency it was computed from, so a stale answer (a payment just recorded,
 * a currency just changed) is never shown as current.
 */
export function useSuggestions({ expenses, settlements, displayCurrency, convert, ready, eventId }: UseSuggestionsInput): SuggestionsResult {
  const [done, setDone] = React.useState<{
    expenses: Expense[];
    settlements: Settlement[];
    displayCurrency: string;
    convert: Convert;
    eventId: string | undefined;
    result: SuggestionsResult;
  } | null>(null);

  React.useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const toDisplay: ConvertCurrency = async (amount, from) => ({ convertedAmount: convert(amount, from), isFallback: false });
    const finish = (result: SuggestionsResult) => {
      if (!cancelled) setDone({ expenses, settlements, displayCurrency, convert, eventId, result });
    };
    calculateSettlementsWithConversion(expenses, settlements, peopleIn(expenses, settlements), displayCurrency, toDisplay, eventId).then(
      (suggestions) => finish({ status: 'ready', suggestions }),
      () => finish({ status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [ready, expenses, settlements, displayCurrency, convert, eventId]);

  const current =
    done !== null &&
    ready &&
    done.expenses === expenses &&
    done.settlements === settlements &&
    done.displayCurrency === displayCurrency &&
    done.convert === convert &&
    done.eventId === eventId;
  return current ? done.result : { status: 'loading' };
}
