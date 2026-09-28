import * as React from 'react';
import { useStore } from '@nanostores/react';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrencySelector } from '@/components/features/currency/CurrencySelector';
import { AttachRowsPanel } from '@/components/features/groups/AttachRowsPanel';
import { DeleteGroupDialog } from '@/components/features/groups/DeleteGroupDialog';
import { MembersSection } from '@/components/features/groups/MembersSection';
import { acceptedFriendIds } from '@/domain/friends';
import { filterAttachableEvents, filterAttachableExpenses } from '@/domain/groups';
import { parseCalendarDate } from '@/domain/dates';
import { useDisplayConversion } from '@/lib/currency/useDisplayConversion';
import { useEvents, useGroupEvents } from '@/lib/data/hooks/useEvents';
import { useExpenses, useGroupExpenses } from '@/lib/data/hooks/useExpenses';
import { useFriends } from '@/lib/data/hooks/useFriends';
import { useGroup } from '@/lib/data/hooks/useGroup';
import { useProfiles } from '@/lib/data/hooks/useProfiles';
import { withBase } from '@/lib/href';
import { cn } from '@/lib/utils';
import type { ExpenseGroup } from '@/schemas/group';
import { $user } from '@/stores/auth';
import AuthGate from '../AuthGate';
import AuthIsland from '../AuthIsland';
import NotFoundView from './NotFoundView';

function namesFrom(rows: { id: string; name: string | null }[] | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows ?? []) map[row.id] = row.name ?? 'Unknown';
  return map;
}

/**
 * `/groups/<id>`'s route view (plan B12, risk:high), loaded through
 * `AppRouterIsland`'s own `React.lazy` per-route boundary — `AuthIsland >
 * AuthGate > Content`, the outer `ErrorBoundary` is the 404 shell's own
 * (same reasoning as `ExpenseDetailView`/`FriendDetailView`). A missing or
 * RLS-hidden group renders the SAME `NotFoundView` (ADR 0002's leaked-id
 * reasoning).
 */
export default function GroupDetailView({ id }: { id: string }) {
  return (
    <>
      <h1 className="sr-only">Group</h1>
      <AuthIsland>
        <AuthGate>
          <GroupDetailContent id={id} />
        </AuthGate>
      </AuthIsland>
    </>
  );
}

function GroupDetailContent({ id }: { id: string }) {
  const groupQuery = useGroup(id);

  if (groupQuery.isError) {
    return (
      <ErrorState
        title="Something went wrong loading this group"
        hint='Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.'
        action={
          <Button type="button" onClick={() => groupQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (groupQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!groupQuery.data) {
    return <NotFoundView />;
  }

  return <GroupDetailLoaded group={groupQuery.data} />;
}

function GroupDetailLoaded({ group }: { group: ExpenseGroup }) {
  const user = useStore($user);
  const uid = user?.uid ?? '';
  const isAdmin = group.adminIds.includes(uid);

  const groupExpensesQuery = useGroupExpenses(group.id);
  const groupEventsQuery = useGroupEvents(group.id);
  const expensesQuery = useExpenses(uid || undefined);
  const eventsQuery = useEvents(uid || undefined);
  const friendsQuery = useFriends(uid || undefined);

  const groupExpenses = React.useMemo(() => groupExpensesQuery.data ?? [], [groupExpensesQuery.data]);
  const groupEvents = React.useMemo(() => groupEventsQuery.data ?? [], [groupEventsQuery.data]);

  const notYetMemberFriendIds = React.useMemo(() => {
    const friends = friendsQuery.data ? acceptedFriendIds(friendsQuery.data, uid) : [];
    return friends.filter((friendId) => !group.memberIds.includes(friendId));
  }, [friendsQuery.data, uid, group.memberIds]);

  const profileIds = React.useMemo(
    () => Array.from(new Set([...group.memberIds, ...notYetMemberFriendIds])),
    [group.memberIds, notYetMemberFriendIds],
  );
  const profilesQuery = useProfiles(profileIds);
  const names = React.useMemo(() => namesFrom(profilesQuery.data), [profilesQuery.data]);

  const friendCandidates = React.useMemo(
    () => notYetMemberFriendIds.map((friendId) => ({ id: friendId, name: names[friendId] ?? 'Unknown' })),
    [notYetMemberFriendIds, names],
  );

  const attachableExpenses = React.useMemo(
    () => filterAttachableExpenses(expensesQuery.data ?? [], group).map((e) => ({ id: e.id, description: e.description })),
    [expensesQuery.data, group],
  );
  const attachableEvents = React.useMemo(
    () => filterAttachableEvents(eventsQuery.data ?? [], group).map((e) => ({ id: e.id, name: e.name })),
    [eventsQuery.data, group],
  );

  // This view's OWN local display currency (same one-way-seed pattern as
  // every other detail island, plan B9/B11a) — seeded from `group.currency`
  // (plan B12), never written back to the group.
  const [displayCurrency, setDisplayCurrency] = React.useState(group.currency);
  const currencies = React.useMemo(() => groupExpenses.map((e) => e.currency), [groupExpenses]);
  const { convert, ready, approximate } = useDisplayConversion(currencies, displayCurrency);

  // Deviation (plan B12): `group.totalExpenses` is written as `0` at
  // create and never kept in sync by any mutation (this issue's own B10/B9
  // create/delete/attach paths don't touch it, and it carries no
  // currency), so it would drift silently. This total is the sum of the
  // LOADED rows only, converted — never `group.totalExpenses`.
  const total = React.useMemo(() => {
    if (!ready) return undefined;
    return groupExpenses.reduce((sum, expense) => sum + convert(expense.amount, expense.currency), 0);
  }, [groupExpenses, convert, ready]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">{group.name}</h2>
          {group.description && <p className="mt-1 text-muted-foreground">{group.description}</p>}
        </div>
        {isAdmin && <DeleteGroupDialog groupId={group.id} name={group.name} />}
      </div>

      <div className="flex flex-col gap-2">
        <CurrencySelector
          value={displayCurrency}
          onChange={setDisplayCurrency}
          label="Display currency"
          id="group-detail-currency"
          className="max-w-xs"
        />
        <p className="text-3xl font-semibold text-foreground">
          {ready ? (
            <>
              {displayCurrency} {(total ?? 0).toFixed(2)}
            </>
          ) : (
            <Skeleton className="h-9 w-32" />
          )}
        </p>
        {ready && approximate && <p className="text-xs text-muted-foreground">* Some amounts use approximate rates</p>}
      </div>

      <a href={withBase(`/expenses/new?group=${group.id}`)} className={cn(buttonVariants({ variant: 'default' }), 'self-start')}>
        Add expense
      </a>

      <MembersSection
        group={group}
        names={names}
        groupExpenses={groupExpenses}
        groupEvents={groupEvents}
        uid={uid}
        friendCandidates={friendCandidates}
      />

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Expenses ({groupExpenses.length})</h3>
        {groupExpenses.length === 0 ? (
          <EmptyState title="No expenses yet" description="Expenses added to this group will appear here." />
        ) : (
          <ul className="flex flex-col gap-2">
            {groupExpenses.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3 text-sm">
                <div className="flex flex-col">
                  <a href={withBase(`/expenses/${expense.id}`)} className="underline underline-offset-2">
                    {expense.description}
                  </a>
                  <span className="text-muted-foreground">{parseCalendarDate(expense.date).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span>{ready ? `${displayCurrency} ${convert(expense.amount, expense.currency).toFixed(2)}` : <Skeleton className="h-4 w-16" />}</span>
                  {ready && expense.currency !== displayCurrency && (
                    <span className="text-xs text-muted-foreground">
                      (Originally: {expense.amount.toFixed(2)} {expense.currency})
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Events ({groupEvents.length})</h3>
        {groupEvents.length === 0 ? (
          <EmptyState title="No events yet" description="Events attached to this group will appear here." />
        ) : (
          <ul className="flex flex-col gap-2">
            {groupEvents.map((event) => (
              <li key={event.id} className="rounded-md border border-border px-4 py-3 text-sm">
                <a href={withBase(`/events/${event.id}`)} className="underline underline-offset-2">
                  {event.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AttachRowsPanel groupId={group.id} attachableExpenses={attachableExpenses} attachableEvents={attachableEvents} />
    </div>
  );
}
