import { PlusIcon, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { CurrencySelector } from '@/components/features/currency/CurrencySelector';
import { ExportCsvButton } from '@/components/features/export/ExportCsvButton';
import type { CsvNamedEvent, CsvNamedUser } from '@/domain/csvExport';
import { withBase } from '@/lib/href';
import { cn } from '@/lib/utils';
import type { Expense } from '@/schemas/expense';

export interface DashboardHeaderProps {
  /** ALL of the signed-in user's expenses, for the "export everything" button. */
  expenses: Expense[];
  users: CsvNamedUser[];
  events: CsvNamedEvent[];
  /** The preferred display currency ($preferredCurrency). */
  currency: string;
  /** Writes the new preferred currency through the profile (updateProfile — the source of truth). */
  onCurrencyChange: (code: string) => void;
  /** Clears the rate cache and forces a fresh fetch. */
  onRefreshRates: () => void;
}

/**
 * Dashboard header (plan B8b, "Add expense" restored by plan B10): the
 * preferred-currency selector, a "Refresh rates" action, "Add expense", and
 * the all-expenses CSV export. The legacy "Create Event" quick-action link
 * stays dropped — `/events/new` is B11b, not shipped yet, and adding it now
 * would be a new dead link (the same reasoning that dropped both links in
 * B8b, now half-resolved).
 */
export function DashboardHeader({ expenses, users, events, currency, onCurrencyChange, onRefreshRates }: DashboardHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <CurrencySelector value={currency} onChange={onCurrencyChange} id="dashboard-currency-selector" />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={onRefreshRates}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Refresh rates
        </Button>
        <a href={withBase('/expenses/new')} className={cn(buttonVariants({ variant: 'default' }))}>
          <PlusIcon aria-hidden="true" className="size-4" />
          Add expense
        </a>
        <ExportCsvButton
          expenses={expenses}
          users={users}
          events={events}
          filename="all-expenses.csv"
          disabled={expenses.length === 0}
        />
      </div>
    </div>
  );
}
