import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatCurrency } from '@/domain/formatters';

export interface FinancialSummaryProps {
  /** `domain/dashboard.ts#totalSpent` output, already converted to `currency`. */
  totalSpent: number;
  /** `domain/dashboard.ts#openBalanceCount` output: people you have a non-zero balance with. */
  openBalanceCount: number;
  currency: string;
}

/**
 * Financial summary (plan B8b) — the two figures the legacy component
 * actually computed from real data (the second, since B14a, is people with an
 * open balance rather than a count of unsettled expenses). Everything else the legacy
 * `FinancialSummary` rendered (`compareWithLastMonth`, `activeEvents`,
 * `activeParticipants`, `highestExpense`, `mostExpensiveCategory`,
 * `avgPerDay`) was fed a hardcoded default by `page.tsx` and never reflected
 * real state (spec §6), so it is not ported.
 */
export function FinancialSummary({ totalSpent, openBalanceCount, currency }: FinancialSummaryProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Financial summary</p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-semibold text-foreground">{formatCurrency(totalSpent, currency)}</p>
          <p className="text-sm text-muted-foreground">Total spent</p>
        </div>
        <div>
          {/* Words, not a bare 0: nobody owed and nobody owing is good news, said as such (plan B14a). */}
          {openBalanceCount === 0 ? (
            <>
              <p className="text-2xl font-semibold text-foreground">All settled up</p>
              <p className="text-sm text-muted-foreground">No open balances</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold text-foreground">{openBalanceCount}</p>
              <p className="text-sm text-muted-foreground">{openBalanceCount === 1 ? 'Person' : 'People'} to settle up with</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
