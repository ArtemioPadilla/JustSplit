import * as React from 'react';
import { useStore } from '@nanostores/react';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurrencySelector } from '@/components/features/currency/CurrencySelector';
import { BalancePanel } from '@/components/features/settlements/BalancePanel';
import { HistoryPanel } from '@/components/features/settlements/HistoryPanel';
import { PendingPanel } from '@/components/features/settlements/PendingPanel';
import { useSuggestions, type SuggestionsResult } from '@/components/features/settlements/useSuggestions';
import { involvingUser } from '@/domain/dashboard';
import { balancesWithUser } from '@/domain/dashboard';
import { netBalances, settlementsForEvent } from '@/domain/ledger';
import { acceptedFriendIds } from '@/domain/friends';
import { pairwiseLists, pairwiseSuggestions, parseSettlementsScope, recordingRoute, splitBalances, type RecordingRoute } from '@/domain/settlements';
import { useDisplayConversion } from '@/lib/currency/useDisplayConversion';
import { useEvent } from '@/lib/data/hooks/useEvent';
import { useEvents } from '@/lib/data/hooks/useEvents';
import { useEventExpenses, useExpenses } from '@/lib/data/hooks/useExpenses';
import { useFriends } from '@/lib/data/hooks/useFriends';
import { useProfiles } from '@/lib/data/hooks/useProfiles';
import { useEventSettlements, useSettlements } from '@/lib/data/hooks/useSettlements';
import { withBase } from '@/lib/href';
import { cn } from '@/lib/utils';
import type { Event } from '@/schemas/event';
import type { Expense } from '@/schemas/expense';
import type { Friendship } from '@/schemas/friendship';
import type { Settlement } from '@/schemas/settlement';
import { $user } from '@/stores/auth';
import { $preferredCurrency } from '@/stores/preferences';
import AuthGate from './AuthGate';
import AuthIsland from './AuthIsland';
import ErrorBoundary from './ErrorBoundary';

const RETRY_HINT = 'Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.';

/**
 * `/settlements`'s route island (plan B14b, risk:high): `ErrorBoundary >
 * AuthIsland > AuthGate > Content`, the same composition as the other route
 * islands. The `<h1>` lives OUTSIDE the auth-gated subtree so axe's
 * `page-has-heading-one` passes in every auth state. Mounted
 * `client:only="react"` from `src/pages/settlements.astro`, so `location.search`
 * exists on first render.
 *
 * Scope (from `location.search`, `parseSettlementsScope`): no param is the
 * personal view (rows that name the viewer); `?event=<id>` is that event's
 * expenses and settlements (ADR 0013/0014); `?group=` keeps the personal view
 * and shows a "coming soon" note (Track D, D7).
 */
export default function SettlementsIsland() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Settlements</h1>
      <ErrorBoundary name="SettlementsIsland">
        <AuthIsland>
          <AuthGate>
            <SettlementsContent />
          </AuthGate>
        </AuthIsland>
      </ErrorBoundary>
    </div>
  );
}

function SettlementsContent() {
  const user = useStore($user);
  const uid = user?.uid ?? '';
  // Read once at mount (`client:only`): the page is a static shell and the scope never changes without a navigation.
  const route = React.useMemo(() => parseSettlementsScope(window.location.search), []);
  const eventId = route.scope.kind === 'event' ? route.scope.eventId : undefined;
  const personal = eventId === undefined;

  // Both scopes' hooks run every render (rules of hooks); the one that is not in scope is disabled by an undefined id.
  const expensesQuery = useExpenses(personal ? uid || undefined : undefined);
  const settlementsQuery = useSettlements(personal ? uid || undefined : undefined);
  const eventQuery = useEvent(eventId);
  const eventExpensesQuery = useEventExpenses(eventId);
  const eventSettlementsQuery = useEventSettlements(eventId);
  // Personal view only: who is an accepted friend and what the events are called, to decide where each row can be recorded
  // (`recordingRoute`) and to name the events. The event scope never needs them: a fellow member can be recorded inside the event.
  const friendsQuery = useFriends(personal ? uid || undefined : undefined);
  const eventsQuery = useEvents(personal ? uid || undefined : undefined);
  const dataQueries = personal
    ? [expensesQuery, settlementsQuery, friendsQuery, eventsQuery]
    : [eventExpensesQuery, eventSettlementsQuery];

  // ADR 0013: the personal queries return every row the viewer can SEE; the personal view is about the rows that name them.
  // The event scope is that event's expenses and settlements, whoever they name (ADR 0014).
  const expenses = React.useMemo<Expense[]>(
    () =>
      personal
        ? involvingUser(expensesQuery.data ?? [], uid)
        : (eventExpensesQuery.data ?? []).filter((expense) => expense.eventId === eventId),
    [personal, expensesQuery.data, eventExpensesQuery.data, uid, eventId],
  );
  const settlements = React.useMemo<Settlement[]>(
    () =>
      personal
        ? involvingUser(settlementsQuery.data ?? [], uid)
        : settlementsForEvent(eventSettlementsQuery.data ?? [], eventId),
    [personal, settlementsQuery.data, eventSettlementsQuery.data, uid, eventId],
  );

  const event = eventQuery.data ?? undefined;
  const profileIds = React.useMemo(() => {
    const ids = new Set<string>([uid]);
    for (const memberId of event?.memberIds ?? []) ids.add(memberId);
    for (const expense of expenses) {
      ids.add(expense.paidBy);
      for (const split of expense.splits) ids.add(split.userId);
    }
    for (const settlement of settlements) {
      ids.add(settlement.fromUserId);
      ids.add(settlement.toUserId);
      ids.add(settlement.createdBy);
    }
    return Array.from(ids);
  }, [uid, event, expenses, settlements]);
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

  const isError = Boolean(dataQueries.some((q) => q.isError) || (eventId && eventQuery.isError) || profilesQuery.isError);
  const isRetrying = Boolean(dataQueries.some((q) => q.isRetrying) || profilesQuery.isFetching);
  function handleRetry() {
    for (const q of dataQueries) q.refetch();
    if (eventId) void eventQuery.refetch();
    void profilesQuery.refetch();
  }

  const groupNote = route.groupRequested && (
    <p role="status" className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground">
      Group settlements are coming soon. Showing your personal settlements for now.
    </p>
  );

  let body: React.ReactNode;
  if (isError) {
    body = (
      <ErrorState
        title="Something went wrong loading your settlements"
        hint={RETRY_HINT}
        action={
          <Button type="button" onClick={handleRetry} disabled={isRetrying} aria-busy={isRetrying}>
            Retry
          </Button>
        }
      />
    );
  } else if (eventId && eventQuery.data === null) {
    // Missing and RLS-hidden are never told apart (ADR 0002's leaked-id reasoning). Not an error: there is a way on.
    body = (
      <EmptyState
        title="We couldn't find this event"
        description="It may have been deleted, or you may not be a member of it."
        action={
          <a href={withBase('/settlements')} className={cn(buttonVariants({ variant: 'default' }))}>
            See your own settlements
          </a>
        }
      />
    );
  } else if (dataQueries.some((q) => q.data === undefined) || (eventId && eventQuery.data === undefined) || profilesQuery.data === undefined) {
    // Header-, tab- and row-shaped blocks, so nothing jumps when the real content arrives.
    body = (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[4.5rem] w-full" />
        <Skeleton className="h-[4.5rem] w-full" />
      </div>
    );
  } else {
    body = (
      <SettlementsBoard
        viewerId={uid}
        event={event}
        expenses={expenses}
        settlements={settlements}
        friendships={friendsQuery.data ?? []}
        events={eventsQuery.data ?? []}
        names={names}
        avatars={avatars}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groupNote}
      {body}
    </div>
  );
}

interface SettlementsBoardProps {
  viewerId: string;
  /** Set in the event scope. */
  event: Event | undefined;
  expenses: Expense[];
  settlements: Settlement[];
  /** Personal view only (empty in the event scope). */
  friendships: Friendship[];
  events: Event[];
  names: Record<string, string>;
  avatars: Record<string, string | null>;
}

/** Everything that depends on the scope's rows: currency, the three tabs and their panels. */
function SettlementsBoard({ viewerId, event, expenses, settlements, friendships, events, names, avatars }: SettlementsBoardProps) {
  const preferredCurrency = useStore($preferredCurrency);
  // This island's OWN display currency (same one-way seed as every other island): the visitor's preferred one, never written back.
  const [displayCurrency, setDisplayCurrency] = React.useState(event?.preferredCurrency ?? preferredCurrency);

  // Settlements convert like expenses, so their currencies need resolved rates before `ready` too.
  const currencies = React.useMemo(
    () => [...expenses.map((expense) => expense.currency), ...settlements.map((settlement) => settlement.currency)],
    [expenses, settlements],
  );
  const { convert, ready, approximate, rates } = useDisplayConversion(currencies, displayCurrency);

  // Two kinds of suggestion (ADR 0014 §5). The EVENT scope is debt-simplified across the event: every member sees the same
  // rows, so `calculateSettlementsWithConversion` is consistent there. The PERSONAL view is PAIRWISE — one row per other person,
  // `balancesWithUser` (the dashboard's own maths): both parties see exactly the rows that name both of them, so they always
  // read the same number for the debt between them. No simplification across people happens in that view.
  const isEvent = event !== undefined;
  const eventSuggestions = useSuggestions({ expenses, settlements, displayCurrency, convert, ready: ready && isEvent, eventId: event?.id });
  const pairwise = React.useMemo(
    () => (ready && !isEvent ? balancesWithUser(expenses, settlements, viewerId, names, convert) : []),
    [ready, isEvent, expenses, settlements, viewerId, names, convert],
  );
  const suggestions = React.useMemo<SuggestionsResult>(() => {
    if (isEvent) return eventSuggestions;
    return ready ? { status: 'ready', suggestions: pairwiseSuggestions(pairwise, viewerId) } : { status: 'loading' };
  }, [isEvent, eventSuggestions, ready, pairwise, viewerId]);

  // Personal view: how each pairwise row can be recorded, by the other person. A friend is recorded directly; a non-friend only
  // inside the one event their whole debt belongs to (migration 015); otherwise the row links to the event(s) instead of a button.
  const routes = React.useMemo<Record<string, RecordingRoute> | undefined>(() => {
    if (isEvent) return undefined;
    const friends = new Set(acceptedFriendIds(friendships, viewerId));
    const map: Record<string, RecordingRoute> = {};
    for (const row of pairwiseSuggestions(pairwise, viewerId)) {
      const other = row.fromUser === viewerId ? row.toUser : row.fromUser;
      map[other] = recordingRoute({ viewerId, otherId: other, isFriend: friends.has(other), expenses, settlements });
    }
    return map;
  }, [isEvent, friendships, viewerId, pairwise, expenses, settlements]);
  const eventNames = React.useMemo(() => Object.fromEntries(events.map((e) => [e.id, e.name])), [events]);

  const balanceLists = React.useMemo(() => {
    if (!ready) return { owes: [], owed: [], owesTitle: '', owedTitle: '' };
    if (!isEvent) {
      const { youOwe, oweYou } = pairwiseLists(pairwise);
      return { owes: youOwe, owed: oweYou, owesTitle: 'You owe', owedTitle: 'Owe you' };
    }
    const { owes, owed } = splitBalances(netBalances(expenses, settlements, convert));
    return { owes, owed, owesTitle: 'Owes', owedTitle: 'Is owed' };
  }, [ready, isEvent, pairwise, expenses, settlements, convert]);

  // Focus targets: after a payment is recorded or undone, the row that held the button has changed or gone.
  const pendingHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const historyHeadingRef = React.useRef<HTMLHeadingElement>(null);

  return (
    <div className="flex flex-col gap-6">
      {event && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Event</p>
            <h2 className="font-display text-xl font-semibold text-foreground">{event.name}</h2>
          </div>
          <a href={withBase(`/events/${event.id}`)} className={cn(buttonVariants({ variant: 'outline' }))}>
            Back to event
          </a>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <CurrencySelector
          value={displayCurrency}
          onChange={setDisplayCurrency}
          label="Display currency"
          id="settlements-currency"
          className="max-w-xs"
        />
        {ready && approximate && <p className="text-xs text-muted-foreground">* Some amounts use approximate rates</p>}
      </div>

      {/* One island for the whole Tabs composition (CLAUDE.md compound-component rule). */}
      <Tabs defaultValue="pending">
        <TabsList aria-label="Settlements views">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="pt-4">
          <PendingPanel
            suggestions={suggestions}
            viewerId={viewerId}
            names={names}
            avatars={avatars}
            displayCurrency={displayCurrency}
            eventId={event?.id}
            simplified={isEvent}
            routes={routes}
            eventNames={isEvent ? { [event.id]: event.name } : eventNames}
            headingRef={pendingHeadingRef}
          />
        </TabsContent>
        <TabsContent value="balances" className="pt-4">
          <BalancePanel
            {...balanceLists}
            viewerId={viewerId}
            names={names}
            avatars={avatars}
            displayCurrency={displayCurrency}
            ready={ready}
            approximate={approximate}
            rates={rates}
          />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <HistoryPanel
            settlements={settlements}
            viewerId={viewerId}
            names={names}
            avatars={avatars}
            displayCurrency={displayCurrency}
            convert={convert}
            ready={ready}
            headingRef={historyHeadingRef}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
