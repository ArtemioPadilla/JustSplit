import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/domain/formatters';
import type { Settlement } from '@/schemas/settlement';

export interface RecentSettlementsProps {
  /** Already trimmed to the 3 most recent by date (caller's job — `DashboardIsland`). */
  settlements: Settlement[];
  /** `{id: name}` — resolved from `useProfiles` by the caller. */
  names: Record<string, string>;
  convert: (amount: number, currency: string) => number;
  currency: string;
}

/**
 * Recent settlements widget (plan B8b). Trust statement (ADR 0002, plan
 * B14): a settlement row is an attestation by whoever created it, never a
 * verified payment — this never uses the word "paid", only "from -> to".
 */
export function RecentSettlements({ settlements, names, convert, currency }: RecentSettlementsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Recent settlements</p>
      </CardHeader>
      <CardContent>
        {settlements.length === 0 ? (
          <EmptyState title="No settlements yet" description="Settle-ups you record will show up here." />
        ) : (
          <ul className="divide-y divide-border">
            {settlements.map((settlement) => (
              <li key={settlement.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                  <span className="truncate">{names[settlement.fromUserId] ?? 'Unknown'}</span>
                  <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{names[settlement.toUserId] ?? 'Unknown'}</span>
                </div>
                <p className="shrink-0 font-medium text-foreground">
                  {formatCurrency(convert(settlement.amount, settlement.currency), currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
