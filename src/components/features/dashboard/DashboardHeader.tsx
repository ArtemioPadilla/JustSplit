import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencySelector } from '@/components/features/currency/CurrencySelector';
import { ExportCsvButton } from '@/components/features/export/ExportCsvButton';
import type { CsvNamedEvent, CsvNamedUser } from '@/domain/csvExport';
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
 * Dashboard header (plan B8b): the preferred-currency selector, a "Refresh
 * rates" action, and the all-expenses CSV export. The legacy quick-action
 * links ("Add Expense" -> /expenses/new, "Create Event" -> /events/new) are
 * dropped here — those pages don't exist until B10/B11b, and this header is
 * always visible (unlike `WelcomeScreen`, the dashboard's own empty state,
 * which is the decided exception for those two CTAs).
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
