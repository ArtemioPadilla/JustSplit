import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatCurrency } from '@/domain/formatters';

export interface FinancialSummaryProps {
  /** `domain/dashboard.ts#totalSpent` output, already converted to `currency`. */
  totalSpent: number;
  /** `domain/dashboard.ts#unsettledCount` output. */
  unsettledCount: number;
  currency: string;
}

/**
 * Financial summary (plan B8b) — the two figures the legacy component
 * actually computed from real data. Everything else the legacy
 * `FinancialSummary` rendered (`compareWithLastMonth`, `activeEvents`,
 * `activeParticipants`, `highestExpense`, `mostExpensiveCategory`,
 * `avgPerDay`) was fed a hardcoded default by `page.tsx` and never reflected
 * real state (spec §6), so it is not ported.
 */
export function FinancialSummary({ totalSpent, unsettledCount, currency }: FinancialSummaryProps) {
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
          <p className="text-2xl font-semibold text-foreground">{unsettledCount}</p>
          <p className="text-sm text-muted-foreground">Unsettled expense{unsettledCount === 1 ? '' : 's'}</p>
        </div>
      </CardContent>
    </Card>
  );
}
