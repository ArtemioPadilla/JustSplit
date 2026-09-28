import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/domain/formatters';
import { withBase } from '@/lib/href';
import type { Expense } from '@/schemas/expense';

export interface RecentExpensesProps {
  /** Already trimmed to the 5 most recent by date (caller's job — `DashboardIsland`). */
  expenses: Expense[];
  /** `{id: name}` — resolved from `useProfiles` by the caller. */
  names: Record<string, string>;
  /** Synchronous display-currency conversion (`useDisplayConversion`). */
  convert: (amount: number, currency: string) => number;
  /** The display currency `convert` targets. */
  currency: string;
}

/**
 * Recent expenses widget (plan B8b), ported from the legacy `RecentExpenses`
 * onto props (no `AppContext`, no own currency-conversion effect — the
 * caller's `useDisplayConversion` already resolved rates before this
 * renders). Each row: description (linking to `/expenses/<id>`, the real
 * route shape — `src/lib/app-routes.ts`), the converted amount with its
 * original currency alongside when they differ, and the payer's name.
 */
export function RecentExpenses({ expenses, names, convert, currency }: RecentExpensesProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Recent expenses</p>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <EmptyState title="No expenses yet" description="Expenses you add will show up here." />
        ) : (
          <ul className="divide-y divide-border">
            {expenses.map((expense) => {
              const convertedAmount = convert(expense.amount, expense.currency);
              const showOriginal = expense.currency !== currency;
              return (
                <li key={expense.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <a
                      href={withBase(`/expenses/${expense.id}`)}
                      className="truncate font-medium text-foreground hover:underline"
                    >
                      {expense.description}
                    </a>
                    <p className="text-xs text-muted-foreground">Paid by {names[expense.paidBy] ?? 'Unknown'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium text-foreground">{formatCurrency(convertedAmount, currency)}</p>
                    {showOriginal && (
                      <p className="text-xs text-muted-foreground">
                        {expense.amount.toFixed(2)} {expense.currency}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
