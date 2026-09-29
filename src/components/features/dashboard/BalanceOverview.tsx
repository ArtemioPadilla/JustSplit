import { EmptyState } from '@/components/ui/empty-state';
import { BalanceLine } from './BalanceLine';
import type { PersonBalance } from '@/domain/dashboard';

export interface BalanceOverviewProps {
  /** `balancesWithUser` selector output — already converted to `currency`, zero balances dropped. */
  balances: PersonBalance[];
  currency: string;
}

/**
 * Composes one `BalanceLine` per counterparty over the pure
 * `domain/dashboard.ts#balancesWithUser` selector (plan B8a). No chart
 * library involved — see `BalanceLine.tsx`'s doc comment for why.
 */
export function BalanceOverview({ balances, currency }: BalanceOverviewProps) {
  if (balances.length === 0) {
    return <EmptyState title="All settled up" description="You have no outstanding balances with anyone." />;
  }

  const maxAbsBalance = Math.max(...balances.map((b) => Math.abs(b.balance)));

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-base font-semibold text-foreground">Balance overview</h2>
      <div className="divide-y divide-border">
        {balances.map((b) => (
          <BalanceLine key={b.userId} name={b.name} balance={b.balance} maxAbsBalance={maxAbsBalance} currency={currency} />
        ))}
      </div>
    </div>
  );
}
