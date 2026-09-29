import * as React from 'react';
import { useStore } from '@nanostores/react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Editable } from '@/components/ui/editable';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrencySelector, useWarmCurrencyCombobox } from '@/components/features/currency/CurrencySelector';
import { EventTimeline } from '@/components/features/events/EventTimeline';
import { ExportCsvButton } from '@/components/features/export/ExportCsvButton';
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { UserAvatar } from '@/components/features/profile/UserAvatar';
import { parseCalendarDate } from '@/domain/dates';
import { eventBalances, eventStartDate, eventStats, settlementProgressPercent } from '@/domain/events';
import { isLegacySettled } from '@/domain/ledger';
import { useDisplayConversion } from '@/lib/currency/useDisplayConversion';
import { useEvent } from '@/lib/data/hooks/useEvent';
import { useEventExpenses } from '@/lib/data/hooks/useExpenses';
import { useProfiles } from '@/lib/data/hooks/useProfiles';
import { useEventSettlements } from '@/lib/data/hooks/useSettlements';
import { useUpdateEvent } from '@/lib/data/hooks/useUpdateEvent';
import { withBase } from '@/lib/href';
import { writeErrorMessage } from '@/lib/offline-write';
import { useCanWrite } from '@/lib/use-can-write';
import { cn } from '@/lib/utils';
import type { Event } from '@/schemas/event';
import type { Expense } from '@/schemas/expense';
import type { Settlement } from '@/schemas/settlement';
import { $preferredCurrency } from '@/stores/preferences';
import { notifyError } from '@/stores/notifications';
import AuthGate from '../AuthGate';
import AuthIsland from '../AuthIsland';
import NotFoundView from './NotFoundView';

const RETRY_HINT = 'Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.';

/**
 * `/events/<id>`'s route view (plan B11b), loaded through `AppRouterIsland`'s
 * `React.lazy` per-route boundary — `AuthIsland > AuthGate > Content`, the
 * outer `ErrorBoundary` is the 404 shell's own (same reasoning as
 * `ExpenseDetailView`/`GroupDetailView`). A missing or RLS-hidden event renders
 * the SAME `NotFoundView` every other dynamic route uses (ADR 0002's leaked-id
 * reasoning).
 *
 * ADR 0013: every member of an event sees every expense of it, so the totals,
 * the per-member balances and the settlement progress here are computed over ALL
 * of the event's expenses (`useEventExpenses` — `eventId == id`, which RLS
 * already limits to what this viewer may see, i.e. all of them for a member) and
 * are the same for every viewer. Nothing is narrowed to the viewer.
 *
 * Plan B14a (ADR 0014): they are a ledger — those expenses minus the event's
 * settlements (`useEventSettlements`, `eventId == id`). There is no per-expense
 * "unsettled" badge: only a legacy (imported) `settledAt` earns a "Settled" one.
 */
export default function EventDetailView({ id }: { id: string }) {
  // Fetch the currency combobox chunk in idle time; the selector below renders after auth and data (B19b).
  useWarmCurrencyCombobox();
  return (
    <>
      <h1 className="sr-only">Event</h1>
      <AuthIsland>
        <AuthGate>
          <EventDetailContent id={id} />
        </AuthGate>
      </AuthIsland>
    </>
  );
}

function EventDetailContent({ id }: { id: string }) {
  const eventQuery = useEvent(id);

  if (eventQuery.isError) {
    return (
      <ErrorState
        title="Something went wrong loading this event"
        hint={RETRY_HINT}
        action={
          <Button type="button" onClick={() => eventQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (eventQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!eventQuery.data) {
    return <NotFoundView />;
  }

  return <EventDetailLoaded event={eventQuery.data} />;
}

function namesFrom(rows: { id: string; name: string | null }[] | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows ?? []) map[row.id] = row.name ?? 'Unknown';
  return map;
}

function localDate(calendarDate: string): string {
  return parseCalendarDate(calendarDate).toLocaleDateString();
}

function EventDetailLoaded({ event }: { event: Event }) {
  const preferredCurrency = useStore($preferredCurrency);

  const expensesQuery = useEventExpenses(event.id);
  const settlementsQuery = useEventSettlements(event.id);
  // Newest first, like the legacy page; `date` is a calendar date, so a plain string compare orders it.
  const expenses = React.useMemo(
    () => [...(expensesQuery.data ?? [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [expensesQuery.data],
  );

  const settlements = React.useMemo(() => settlementsQuery.data ?? [], [settlementsQuery.data]);

  const profileIds = React.useMemo(() => {
    const ids = new Set<string>(event.memberIds);
    for (const expense of expenses) {
      ids.add(expense.paidBy);
      for (const split of expense.splits) ids.add(split.userId);
    }
    for (const settlement of settlements) {
      ids.add(settlement.fromUserId);
      ids.add(settlement.toUserId);
    }
    return Array.from(ids);
  }, [event.memberIds, expenses, settlements]);
  const profilesQuery = useProfiles(profileIds);
  const names = React.useMemo(() => namesFrom(profilesQuery.data), [profilesQuery.data]);
  const avatars = React.useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const row of profilesQuery.data ?? []) map[row.id] = row.avatarUrl;
    return map;
  }, [profilesQuery.data]);

  // This view's OWN local display currency (same one-way seed as every detail
  // view, B9/B12): the event's preferred currency, else the visitor's — never
  // written back to the event.
  const [displayCurrency, setDisplayCurrency] = React.useState(event.preferredCurrency ?? preferredCurrency);
  const currencies = React.useMemo(
    () => [...expenses.map((expense) => expense.currency), ...settlements.map((settlement) => settlement.currency)],
    [expenses, settlements],
  );
  const { convert, ready, approximate } = useDisplayConversion(currencies, displayCurrency);

  // `Editable` is UNCONTROLLED (`defaultValue`), so `key={draft}` remounts it
  // with the new value on both an optimistic update and a revert — the same
  // pattern (and the same during-render prop sync) as `ExpenseDetailView`.
  const [nameDraft, setNameDraft] = React.useState(event.name);
  const [prevName, setPrevName] = React.useState(event.name);
  if (event.name !== prevName) {
    setPrevName(event.name);
    setNameDraft(event.name);
  }

  // Plan B19c (ADR 0015): renaming the event inline is a write; with no connection it is blocked and explained.
  const write = useCanWrite();
  const updateEvent = useUpdateEvent();
  const handleNameCommit = React.useCallback(
    async (value: string) => {
      const previous = nameDraft;
      setNameDraft(value);
      try {
        await updateEvent.mutateAsync({ id: event.id, patch: { name: value } });
      } catch (error) {
        setNameDraft(previous);
        notifyError(writeErrorMessage(error, 'Could not rename the event'));
      }
    },
    [updateEvent, event.id, nameDraft],
  );

  const start = eventStartDate(event);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Editable
          key={nameDraft}
          defaultValue={nameDraft}
          onValueCommit={handleNameCommit}
          readOnly={!write.canWrite}
          describedBy={write.noticeId}
          className="font-display text-2xl font-semibold text-foreground"
        />
        <a href={withBase('/events/list')} className={cn(buttonVariants({ variant: 'ghost' }))}>
          Back to events
        </a>
      </div>

      <OfflineWriteNotice write={write} />

      {event.description && <p className="text-muted-foreground">{event.description}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <a href={withBase(`/expenses/new?event=${event.id}`)} className={cn(buttonVariants({ variant: 'default' }))}>
          Add expense
        </a>
        <a href={withBase(`/events/edit/${event.id}`)} className={cn(buttonVariants({ variant: 'outline' }))}>
          Edit event
        </a>
        {/* The event scope of `/settlements` (plan B14b). */}
        <a href={withBase(`/settlements?event=${event.id}`)} className={cn(buttonVariants({ variant: 'outline' }))}>
          View Settlements
        </a>
        <ExportCsvButton
          expenses={expenses}
          users={Object.entries(names).map(([id, name]) => ({ id, name }))}
          events={[{ id: event.id, name: event.name }]}
          filename={`${event.name}-expenses.csv`}
          disabled={expenses.length === 0}
        />
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Start date</dt>
          <dd className="text-foreground">{start ? localDate(start) : 'Not set'}</dd>
        </div>
        {event.endDate && (
          <div>
            <dt className="text-muted-foreground">End date</dt>
            <dd className="text-foreground">{localDate(event.endDate)}</dd>
          </div>
        )}
      </dl>

      {expensesQuery.isError || settlementsQuery.isError ? (
        <ErrorState
          title="Something went wrong loading this event's expenses and settlements"
          hint={RETRY_HINT}
          action={
            <Button
              type="button"
              onClick={() => {
                expensesQuery.refetch();
                settlementsQuery.refetch();
              }}
              disabled={Boolean(expensesQuery.isRetrying || settlementsQuery.isRetrying)}
              aria-busy={Boolean(expensesQuery.isRetrying || settlementsQuery.isRetrying)}
            >
              Retry
            </Button>
          }
        />
      ) : expensesQuery.data === undefined || settlementsQuery.data === undefined ? (
        // Same blocks, same heights as the loaded sections below, so nothing jumps when they arrive.
        <div className="flex flex-col gap-8" aria-busy="true">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <EventFigures
          event={event}
          expenses={expenses}
          settlements={settlements}
          names={names}
          avatars={avatars}
          displayCurrency={displayCurrency}
          onDisplayCurrencyChange={setDisplayCurrency}
          convert={convert}
          ready={ready}
          approximate={approximate}
        />
      )}
    </div>
  );
}

interface EventFiguresProps {
  event: Event;
  expenses: Expense[];
  settlements: Settlement[];
  names: Record<string, string>;
  avatars: Record<string, string | null>;
  displayCurrency: string;
  onDisplayCurrencyChange: (code: string) => void;
  convert: (amount: number, currency: string) => number;
  ready: boolean;
  approximate: boolean;
}

/** Everything that depends on the event's expenses: timeline, summary, balances and the list. */
function EventFigures({ event, expenses, settlements, names, avatars, displayCurrency, onDisplayCurrencyChange, convert, ready, approximate }: EventFiguresProps) {
  const stats = React.useMemo(() => eventStats(expenses, settlements, convert), [expenses, settlements, convert]);
  const balances = React.useMemo(() => eventBalances(expenses, settlements, convert), [expenses, settlements, convert]);
  const progressPercent = settlementProgressPercent(stats);

  // Every current member, then anyone else an expense names (a former member with a balance).
  const participantIds = React.useMemo(() => Array.from(new Set([...event.memberIds, ...Object.keys(balances)])), [event.memberIds, balances]);

  const money = (amount: number) => `${displayCurrency} ${amount.toFixed(2)}`;

  const timelineExpenses = React.useMemo(
    () =>
      expenses.map((expense) => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date,
        paidBy: expense.paidBy,
        settledAt: expense.settledAt,
      })),
    [expenses],
  );

  return (
    <>
      <section aria-labelledby="event-timeline-heading" className="flex flex-col gap-3">
        <h2 id="event-timeline-heading" className="text-sm font-medium text-muted-foreground">
          Event timeline
        </h2>
        {ready ? (
          <EventTimeline
            event={{ startDate: event.startDate, date: event.date, endDate: event.endDate }}
            expenses={timelineExpenses}
            users={names}
            convert={convert}
            currency={displayCurrency}
            showSettlementStatus={false}
            onNavigate={(expenseId) => window.location.assign(withBase(`/expenses/${expenseId}`))}
          />
        ) : (
          // Not the timeline yet: its hover cards would show unconverted amounts labelled with the display currency.
          <Skeleton className="h-16 w-full" />
        )}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Settlement progress</span>
            {/* Not 0% and not 100% when there is nothing to settle: that would claim something happened. */}
            <span className="text-foreground">
              {!ready ? <Skeleton className="h-4 w-20" /> : progressPercent === null ? 'Nothing to settle' : progressPercent === 100 ? 'Settled up' : `${progressPercent}% settled`}
            </span>
          </div>
          {ready && progressPercent !== null && <ProgressBar value={progressPercent} label="Settlement progress" />}
        </div>
      </section>

      <section aria-labelledby="event-summary-heading" className="flex flex-col gap-4">
        <h2 id="event-summary-heading" className="text-sm font-medium text-muted-foreground">
          Summary
        </h2>
        <CurrencySelector
          value={displayCurrency}
          onChange={onDisplayCurrencyChange}
          label="Display currency"
          id="event-detail-currency"
          className="max-w-xs"
        />
        <dl className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-sm text-muted-foreground">Expenses</dt>
            <dd className="text-2xl font-semibold text-foreground">{stats.count}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Total</dt>
            <dd className="text-2xl font-semibold text-foreground">{ready ? money(stats.total) : <Skeleton className="h-8 w-28" />}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Still owed</dt>
            <dd className="text-2xl font-semibold text-foreground">{ready ? money(stats.outstanding) : <Skeleton className="h-8 w-28" />}</dd>
          </div>
        </dl>
        {ready && approximate && <p className="text-xs text-muted-foreground">* Some amounts use approximate rates</p>}
      </section>

      <section aria-labelledby="event-participants-heading" className="flex flex-col gap-2">
        <h2 id="event-participants-heading" className="text-sm font-medium text-muted-foreground">
          Participants ({participantIds.length})
        </h2>
        <ul aria-label="Balances" className="flex flex-col gap-2">
          {participantIds.map((userId) => {
            const name = names[userId] ?? 'Unknown';
            const balance = balances[userId] ?? 0;
            // Words carry the meaning; the numbers repeat it, and colour is never the only cue.
            const status = !ready
              ? null
              : balance > 0
                ? `is owed ${money(balance)}`
                : balance < 0
                  ? `owes ${money(-balance)}`
                  : 'settled up';
            return (
              <li key={userId} className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3 text-sm">
                <span className="flex items-center gap-2">
                  <UserAvatar src={avatars[userId]} name={name} alt="" className="size-7" />
                  <span className="font-medium text-foreground">{name}</span>
                </span>
                {status === null ? (
                  <Skeleton className="h-4 w-28" />
                ) : (
                  <span className={cn(balance > 0 ? 'text-green-800 dark:text-green-200' : balance < 0 ? 'text-destructive' : 'text-muted-foreground')}>{status}</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="event-expenses-heading" className="flex flex-col gap-2">
        <h2 id="event-expenses-heading" className="text-sm font-medium text-muted-foreground">
          Expenses ({expenses.length})
        </h2>
        {expenses.length === 0 ? (
          <EmptyState
            title="No expenses yet"
            description="Expenses added to this event will appear here."
            action={
              <a href={withBase(`/expenses/new?event=${event.id}`)} className={cn(buttonVariants({ variant: 'default' }))}>
                Add the first expense
              </a>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex flex-col gap-2 rounded-md border border-border px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <a href={withBase(`/expenses/${expense.id}`)} className="font-medium text-foreground underline underline-offset-2">
                    {expense.description}
                  </a>
                  <span className="text-muted-foreground">{localDate(expense.date)}</span>
                  <span className="text-muted-foreground">Paid by {names[expense.paidBy] ?? 'Unknown'}</span>
                  <span className="text-muted-foreground">
                    Split among {expense.splits.length} {expense.splits.length === 1 ? 'person' : 'people'}
                  </span>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <span className="text-foreground">
                    {ready ? money(convert(expense.amount, expense.currency)) : <Skeleton className="h-4 w-20" />}
                  </span>
                  {ready && expense.currency !== displayCurrency && (
                    <span className="text-xs text-muted-foreground">
                      (Originally: {expense.amount.toFixed(2)} {expense.currency})
                    </span>
                  )}
                  {/* Only a legacy (imported) settledAt: nothing else is derivable per expense (ADR 0014). */}
                  {isLegacySettled(expense) && <Badge>Settled</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
