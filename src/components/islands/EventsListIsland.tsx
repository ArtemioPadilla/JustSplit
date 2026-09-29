import * as React from 'react';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrencySelector } from '@/components/features/currency/CurrencySelector';
import { EventCard } from '@/components/features/events/EventCard';
import {
  eventStats,
  eventYears,
  expensesByEvent,
  filterEventsByYear,
  settlementsByEvent,
  sortEvents,
  type EventSortField,
  type SortOrder,
} from '@/domain/events';
import { useDisplayConversion } from '@/lib/currency/useDisplayConversion';
import { useEvents } from '@/lib/data/hooks/useEvents';
import { useExpenses } from '@/lib/data/hooks/useExpenses';
import { useProfiles } from '@/lib/data/hooks/useProfiles';
import { useSettlements } from '@/lib/data/hooks/useSettlements';
import { withBase } from '@/lib/href';
import { cn } from '@/lib/utils';
import { $preferredCurrency } from '@/stores/preferences';
import { $user } from '@/stores/auth';
import AuthGate from './AuthGate';
import AuthIsland from './AuthIsland';
import ErrorBoundary from './ErrorBoundary';

/** Linked from the list's header row, present in every content state (loading, empty, error, loaded). */
function NewEventLink() {
  return (
    <a href={withBase('/events/new')} className={cn(buttonVariants({ variant: 'default' }))}>
      <PlusIcon aria-hidden="true" className="size-4" />
      New event
    </a>
  );
}

/**
 * `/events/list`'s route island (plan B11b): `ErrorBoundary > AuthIsland >
 * AuthGate > Content`, the same composition and error/retry handling as
 * `ExpenseListIsland`/`GroupsListIsland`. The `<h1>` lives OUTSIDE the
 * auth-gated subtree so axe's `page-has-heading-one` passes in every auth
 * state. Mounted `client:only="react"` from `src/pages/events/list.astro`.
 */
export default function EventsListIsland() {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Events</h1>
        <NewEventLink />
      </div>
      <ErrorBoundary name="EventsListIsland">
        <AuthIsland>
          <AuthGate>
            <EventsListContent />
          </AuthGate>
        </AuthIsland>
      </ErrorBoundary>
    </>
  );
}

const ALL_DATES = 'all';

/** The order a field starts in when it is chosen: newest, A to Z, highest. */
const DEFAULT_ORDER: Record<EventSortField, SortOrder> = { date: 'desc', name: 'asc', total: 'desc' };
const ORDER_LABELS: Record<EventSortField, Record<SortOrder, string>> = {
  date: { desc: 'Newest first', asc: 'Oldest first' },
  name: { asc: 'A to Z', desc: 'Z to A' },
  total: { desc: 'Highest first', asc: 'Lowest first' },
};

const SELECT_CLASS = 'h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function EventsListContent() {
  const user = useStore($user);
  const preferredCurrency = useStore($preferredCurrency);
  const uid = user?.uid;

  const eventsQuery = useEvents(uid);
  const expensesQuery = useExpenses(uid);
  // Every settlement the viewer can see (RLS); each event's card counts only the ones whose `eventId` is its own (ADR 0014).
  const settlementsQuery = useSettlements(uid);

  const events = React.useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const expenses = React.useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  // Every expense that belongs to an event, grouped by it. Since ADR 0013 a member sees ALL of an event's
  // expenses, so these are the same rows for every viewer (unlike a list narrowed to the viewer's own).
  const byEvent = React.useMemo(() => expensesByEvent(expenses), [expenses]);
  const settlements = React.useMemo(() => settlementsQuery.data ?? [], [settlementsQuery.data]);
  const settlementsOfEvent = React.useMemo(() => settlementsByEvent(settlements), [settlements]);

  const profileIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const event of events) {
      for (const memberId of event.memberIds) ids.add(memberId);
      for (const expense of byEvent.get(event.id) ?? []) {
        ids.add(expense.paidBy);
        for (const split of expense.splits) ids.add(split.userId);
      }
      for (const settlement of settlementsOfEvent.get(event.id) ?? []) {
        ids.add(settlement.fromUserId);
        ids.add(settlement.toUserId);
      }
    }
    return Array.from(ids);
  }, [events, byEvent, settlementsOfEvent]);
  const profilesQuery = useProfiles(profileIds);
  const names = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of profilesQuery.data ?? []) map[row.id] = row.name ?? 'Unknown';
    return map;
  }, [profilesQuery.data]);
  const avatars = React.useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const row of profilesQuery.data ?? []) map[row.id] = row.avatarUrl;
    return map;
  }, [profilesQuery.data]);

  // This island's OWN display currency: seeded once from the visitor's preferred one, never written back.
  const [displayCurrency, setDisplayCurrency] = React.useState(preferredCurrency);
  const currencies = React.useMemo(() => {
    const list: string[] = [];
    for (const rows of byEvent.values()) for (const expense of rows) list.push(expense.currency);
    for (const rows of settlementsOfEvent.values()) for (const settlement of rows) list.push(settlement.currency);
    return list;
  }, [byEvent, settlementsOfEvent]);
  const { convert, ready, approximate } = useDisplayConversion(currencies, displayCurrency);

  const [sortField, setSortField] = React.useState<EventSortField>('date');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>(DEFAULT_ORDER.date);
  const [year, setYear] = React.useState<string>(ALL_DATES);

  const totals = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const event of events) map[event.id] = eventStats(byEvent.get(event.id) ?? [], settlementsOfEvent.get(event.id) ?? [], convert).total;
    return map;
  }, [events, byEvent, settlementsOfEvent, convert]);
  const years = React.useMemo(() => eventYears(events), [events]);
  const visible = React.useMemo(
    () => sortEvents(filterEventsByYear(events, year === ALL_DATES ? 'all' : Number(year)), { field: sortField, order: sortOrder }, totals),
    [events, year, sortField, sortOrder, totals],
  );

  const isError = Boolean(eventsQuery.isError || expensesQuery.isError || settlementsQuery.isError || profilesQuery.isError);
  const isRetrying = Boolean(eventsQuery.isRetrying || expensesQuery.isRetrying || settlementsQuery.isRetrying || profilesQuery.isFetching);
  function handleRetry() {
    eventsQuery.refetch();
    expensesQuery.refetch();
    settlementsQuery.refetch();
    void profilesQuery.refetch();
  }

  if (isError) {
    return (
      <ErrorState
        title="Something went wrong loading your events"
        hint='Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.'
        action={
          <Button type="button" onClick={handleRetry} disabled={isRetrying} aria-busy={isRetrying}>
            Retry
          </Button>
        }
      />
    );
  }

  if (eventsQuery.data === undefined || expensesQuery.data === undefined || settlementsQuery.data === undefined) {
    // Card-shaped blocks, so the list does not jump when the real cards arrive.
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        title="No events yet"
        description="Create an event to track what a trip, a dinner or a project costs, and who owes whom."
        action={
          <a href={withBase('/events/new')} className={cn(buttonVariants({ variant: 'default' }))}>
            Create your first event
          </a>
        }
      />
    );
  }

  const orderLabel = ORDER_LABELS[sortField][sortOrder];
  const otherOrder: SortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  const otherLabel = ORDER_LABELS[sortField][otherOrder];
  const OrderIcon = sortOrder === 'asc' ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} label="Display currency" id="events-list-currency" />

        <div className="flex flex-col gap-1">
          <label htmlFor="events-list-sort" className="text-sm font-medium text-foreground">
            Sort by
          </label>
          <select
            id="events-list-sort"
            value={sortField}
            onChange={(e) => {
              const field = e.target.value as EventSortField;
              setSortField(field);
              setSortOrder(DEFAULT_ORDER[field]);
            }}
            className={SELECT_CLASS}
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="total">Total</option>
          </select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setSortOrder(otherOrder)}
          aria-label={`Sort order: ${orderLabel}. Switch to ${otherLabel.toLowerCase()}.`}
        >
          <OrderIcon aria-hidden="true" className="size-4" />
          {orderLabel}
        </Button>

        <div className="flex flex-col gap-1">
          <label htmlFor="events-list-date" className="text-sm font-medium text-foreground">
            Date
          </label>
          <select id="events-list-date" value={year} onChange={(e) => setYear(e.target.value)} className={SELECT_CLASS}>
            <option value={ALL_DATES}>All dates</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* A polite live region: the count changes as the filter does, and a screen-reader user hears it. */}
      <p role="status" className="text-sm text-muted-foreground">
        {visible.length} {visible.length === 1 ? 'event' : 'events'}
        {year !== ALL_DATES && ` starting in ${year}`}
      </p>

      {ready && approximate && <p className="text-xs text-muted-foreground">* Some amounts use approximate rates</p>}

      {visible.length === 0 ? (
        <EmptyState
          title={`No events start in ${year}`}
          description="Try a different date, or show every event."
          action={
            <Button type="button" variant="outline" onClick={() => setYear(ALL_DATES)}>
              Show all dates
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((event) => (
            <li key={event.id}>
              <EventCard
                event={event}
                expenses={byEvent.get(event.id) ?? []}
                settlements={settlementsOfEvent.get(event.id) ?? []}
                names={names}
                avatars={avatars}
                displayCurrency={displayCurrency}
                convert={convert}
                ready={ready}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
