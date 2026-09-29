import * as React from 'react';
import { PlusIcon } from 'lucide-react';
import { useStore } from '@nanostores/react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrencySelector, useWarmCurrencyCombobox } from '@/components/features/currency/CurrencySelector';
import { ExportCsvButton } from '@/components/features/export/ExportCsvButton';
import { parseCalendarDate } from '@/domain/dates';
import { isLegacySettled } from '@/domain/ledger';
import { useDisplayConversion } from '@/lib/currency/useDisplayConversion';
import { useEvents } from '@/lib/data/hooks/useEvents';
import { useExpenses } from '@/lib/data/hooks/useExpenses';
import { useProfiles } from '@/lib/data/hooks/useProfiles';
import { withBase } from '@/lib/href';
import { cn } from '@/lib/utils';
import { useUrlParam } from '@/lib/use-url-param';
import type { Expense } from '@/schemas/expense';
import type { Event } from '@/schemas/event';
import { $preferredCurrency } from '@/stores/preferences';
import { $user } from '@/stores/auth';
import AuthGate from './AuthGate';
import AuthIsland from './AuthIsland';
import ErrorBoundary from './ErrorBoundary';

/** Plan B10: linked from the list's header row, present in every content state (empty, loaded, filtered). */
function AddExpenseLink() {
  return (
    <a href={withBase('/expenses/new')} className={cn(buttonVariants({ variant: 'default' }))}>
      <PlusIcon aria-hidden="true" className="size-4" />
      Add expense
    </a>
  );
}

const ALL_EVENTS = 'all';

/**
 * `/expenses/list`'s route island (plan B9): `ErrorBoundary > AuthIsland >
 * AuthGate > Content`, the same composition as `DashboardIsland` (plan B8b)
 * — including its error/retry handling (`ErrorState` + a bounded Retry +
 * the FeedbackFAB pointer) and the sr-only `<h1>` living OUTSIDE the
 * auth-gated subtree so axe's `page-has-heading-one` passes in every auth
 * state. Mounted `client:only="react"` from `src/pages/expenses/list.astro`.
 */
export default function ExpenseListIsland() {
  // Fetch the currency combobox chunk in idle time; the selector below renders after auth and data (B19b).
  useWarmCurrencyCombobox();
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Expenses</h1>
        <AddExpenseLink />
      </div>
      <ErrorBoundary name="ExpenseListIsland">
        <AuthIsland>
          <AuthGate>
            <ExpenseListContent />
          </AuthGate>
        </AuthIsland>
      </ErrorBoundary>
    </>
  );
}

function names(rows: { id: string; name: string | null }[] | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows ?? []) map[row.id] = row.name ?? 'Unknown';
  return map;
}

function ExpenseListContent() {
  const user = useStore($user);
  const preferredCurrency = useStore($preferredCurrency);
  const uid = user?.uid;

  const expensesQuery = useExpenses(uid);
  const eventsQuery = useEvents(uid);

  const expenses = React.useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const events = React.useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const dataLoading = expensesQuery.data === undefined || eventsQuery.data === undefined;

  const participantIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const expense of expenses) {
      ids.add(expense.paidBy);
      for (const split of expense.splits) ids.add(split.userId);
    }
    return Array.from(ids);
  }, [expenses]);
  const profilesQuery = useProfiles(participantIds);
  const userNames = React.useMemo(() => names(profilesQuery.data), [profilesQuery.data]);

  const isError = Boolean(expensesQuery.isError || eventsQuery.isError || profilesQuery.isError);
  const isRetrying = Boolean(expensesQuery.isRetrying || eventsQuery.isRetrying || profilesQuery.isFetching);
  function handleRetry() {
    expensesQuery.refetch();
    eventsQuery.refetch();
    void profilesQuery.refetch();
  }

  // This island's OWN local display currency (plan B9): initialised from
  // $preferredCurrency once, but never written back to the profile — a
  // deliberate one-way seed, not a two-way binding (a caller who wants the
  // dashboard's "set as my preferred currency" behavior has that button
  // there; this is a scratch, per-visit display choice).
  const [displayCurrency, setDisplayCurrency] = React.useState(preferredCurrency);
  const currencies = React.useMemo(() => expenses.map((expense) => expense.currency), [expenses]);
  const { convert, ready, approximate } = useDisplayConversion(currencies, displayCurrency);

  const [eventFilter, setEventFilter] = useUrlParam('event', ALL_EVENTS);
  const filteredExpenses = React.useMemo(() => {
    if (eventFilter === ALL_EVENTS) return expenses;
    return expenses.filter((expense) => expense.eventId === eventFilter);
  }, [expenses, eventFilter]);
  const selectedEvent = events.find((event) => event.id === eventFilter);

  // Only a legacy (imported) settledAt is a per-expense status (ADR 0014); without one the column would be blank.
  const showStatus = React.useMemo(() => expenses.some(isLegacySettled), [expenses]);
  const columns = React.useMemo<ColumnDef<Expense>[]>(
    () => buildColumns({ names: userNames, events, convert, displayCurrency, showStatus }),
    [userNames, events, convert, displayCurrency, showStatus],
  );

  const csvUsers = React.useMemo(() => Object.entries(userNames).map(([id, name]) => ({ id, name })), [userNames]);
  const csvEvents = React.useMemo(() => events.map((event) => ({ id: event.id, name: event.name })), [events]);
  const csvFilename = selectedEvent ? `${selectedEvent.name}-expenses.csv` : 'all-expenses.csv';

  if (isError) {
    return (
      <ErrorState
        title="Something went wrong loading your expenses"
        hint='Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.'
        action={
          <Button type="button" onClick={handleRetry} disabled={isRetrying} aria-busy={isRetrying}>
            Retry
          </Button>
        }
      />
    );
  }

  if (dataLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (expenses.length === 0) {
    return <EmptyState title="No expenses yet" description="Expenses you add will appear here." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} label="Display currency" id="expense-list-currency" />
          <div className="flex flex-col gap-1">
            <label htmlFor="expense-list-event-filter" className="text-sm font-medium text-foreground">
              Filter by event
            </label>
            <select
              id="expense-list-event-filter"
              aria-label="Filter by event"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value={ALL_EVENTS}>All events</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ExportCsvButton expenses={filteredExpenses} users={csvUsers} events={csvEvents} filename={csvFilename} />
      </div>

      {approximate && <p className="text-xs text-muted-foreground">* Some amounts use approximate rates</p>}

      {!ready ? (
        <Skeleton className="h-64 w-full" aria-label="Loading" />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState title="No expenses match this filter" description="Try a different event filter." />
      ) : (
        <DataTable columns={columns} data={filteredExpenses} syncToUrl={{ key: 'expenses' }} getRowId={(row) => row.id} />
      )}
    </div>
  );
}

interface BuildColumnsArgs {
  names: Record<string, string>;
  events: Event[];
  convert: (amount: number, currency: string) => number;
  displayCurrency: string;
  showStatus: boolean;
}

function buildColumns({ names: userNames, events, convert, displayCurrency, showStatus }: BuildColumnsArgs): ColumnDef<Expense>[] {
  const columns: ColumnDef<Expense>[] = [
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <a href={withBase(`/expenses/${row.original.id}`)} className="underline underline-offset-2">
          {row.original.description}
        </a>
      ),
    },
    {
      id: 'date',
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => parseCalendarDate(row.original.date).toLocaleDateString(),
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const expense = row.original;
        const converted = convert(expense.amount, expense.currency);
        return (
          <div className="flex flex-col">
            <span>
              {displayCurrency} {converted.toFixed(2)}
            </span>
            {expense.currency !== displayCurrency && (
              <span className="text-xs text-muted-foreground">
                (Originally: {expense.amount.toFixed(2)} {expense.currency})
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'paidBy',
      header: 'Paid by',
      cell: ({ row }) => userNames[row.original.paidBy] ?? 'Unknown',
    },
    {
      id: 'event',
      header: 'Event',
      cell: ({ row }) => {
        const eventId = row.original.eventId;
        const event = eventId ? events.find((e) => e.id === eventId) : undefined;
        if (!event) return <span className="text-muted-foreground">No event</span>;
        return (
          <a href={withBase(`/events/${event.id}`)} className="underline underline-offset-2">
            {event.name}
          </a>
        );
      },
    },
  ];

  if (showStatus) {
    columns.push({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (isLegacySettled(row.original) ? <Badge>Settled</Badge> : null),
    });
  }

  return columns;
}
