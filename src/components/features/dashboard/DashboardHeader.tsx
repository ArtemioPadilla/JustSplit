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
 * Dashboard header (plan B8b; "Add expense" restored by plan B10, "Create
 * event" by plan B11b): the preferred-currency selector, a "Refresh rates"
 * action, the two quick-action links the legacy component had, and the
 * all-expenses CSV export. Both links were dropped in B8b because their pages
 * did not exist yet (a dead link on the landing view of the app), and came
 * back as each page landed.
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
        <a href={withBase('/events/new')} className={cn(buttonVariants({ variant: 'outline' }))}>
          <PlusIcon aria-hidden="true" className="size-4" />
          Create event
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
