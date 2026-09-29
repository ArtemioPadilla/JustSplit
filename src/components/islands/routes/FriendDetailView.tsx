import * as React from 'react';
import { useStore } from '@nanostores/react';
import { UserAvatar } from '@/components/features/profile/UserAvatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrencySelector } from '@/components/features/currency/CurrencySelector';
import { RemoveFriendDialog } from '@/components/features/friends/RemoveFriendDialog';
import { balancesWithUser, involvingUser } from '@/domain/dashboard';
import { parseCalendarDate } from '@/domain/dates';
import { otherUser } from '@/domain/friends';
import { settlementsBetween } from '@/domain/ledger';
import { useDisplayConversion } from '@/lib/currency/useDisplayConversion';
import { useExpenses } from '@/lib/data/hooks/useExpenses';
import { useFriends } from '@/lib/data/hooks/useFriends';
import { useProfiles } from '@/lib/data/hooks/useProfiles';
import { useSettlements } from '@/lib/data/hooks/useSettlements';
import { withBase } from '@/lib/href';
import { cn } from '@/lib/utils';
import type { Expense } from '@/schemas/expense';
import type { Friendship } from '@/schemas/friendship';
import type { Settlement } from '@/schemas/settlement';
import { $preferredCurrency } from '@/stores/preferences';
import { $user } from '@/stores/auth';
import AuthGate from '../AuthGate';
import AuthIsland from '../AuthIsland';
import NotFoundView from './NotFoundView';


/**
 * `/friends/<id>`'s route view (plan B13, ADR 0006), loaded through
 * `AppRouterIsland`'s `React.lazy` per-route boundary. `AuthIsland >
 * AuthGate > Content` — the outer `ErrorBoundary` is the 404 shell's own,
 * per-route one (same reasoning as `ExpenseDetailView`).
 *
 * `id` is the OTHER USER's uid (not a friendship row id — same convention
 * `?friend=<id>` already uses, plan B10). An id that doesn't resolve to an
 * ACCEPTED friendship of the caller renders the SAME `NotFoundView` whether
 * that id belongs to no user at all, a stranger, or someone with a pending
 * (not yet accepted) request either direction — this route never lets a
 * caller distinguish any of those (ADR 0002's leaked-id reasoning, extended
 * here to "does this user even exist").
 */
export default function FriendDetailView({ id }: { id: string }) {
  return (
    <>
      <h1 className="sr-only">Friend</h1>
      <AuthIsland>
        <AuthGate>
          <FriendDetailContent friendId={id} />
        </AuthGate>
      </AuthIsland>
    </>
  );
}

function FriendDetailContent({ friendId }: { friendId: string }) {
  const user = useStore($user);
  const uid = user?.uid ?? '';

  const friendsQuery = useFriends(uid || undefined);
  const expensesQuery = useExpenses(uid || undefined);
  const settlementsQuery = useSettlements(uid || undefined);

  const isError = Boolean(friendsQuery.isError || expensesQuery.isError || settlementsQuery.isError);
  const isRetrying = Boolean(friendsQuery.isRetrying || expensesQuery.isRetrying || settlementsQuery.isRetrying);
  function handleRetry() {
    friendsQuery.refetch();
    expensesQuery.refetch();
    settlementsQuery.refetch();
  }

  if (isError) {
    return (
      <ErrorState
        title="Something went wrong loading this friend"
        hint='Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.'
        action={
          <Button type="button" onClick={handleRetry} disabled={isRetrying} aria-busy={isRetrying}>
            Retry
          </Button>
        }
      />
    );
  }

  if (friendsQuery.data === undefined || expensesQuery.data === undefined || settlementsQuery.data === undefined) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const friendshipRow = friendsQuery.data.find((f: Friendship) => f.status === 'accepted' && otherUser(f, uid) === friendId);
  if (!friendshipRow) return <NotFoundView />;

  // ADR 0013: the query returns every row the viewer can see; "shared with this
  // friend" and the balance are about the rows that name the viewer. The friend
  // scope's settlements are the ones between exactly the two of them, whatever
  // event they were made in (plan B14a, ADR 0014: money moved).
  return (
    <FriendDetailLoaded
      friendId={friendId}
      friendshipId={friendshipRow.id}
      uid={uid}
      expenses={involvingUser(expensesQuery.data, uid)}
      settlements={settlementsBetween(settlementsQuery.data, uid, friendId)}
    />
  );
}

function FriendDetailLoaded({
  friendId,
  friendshipId,
  uid,
  expenses,
  settlements,
}: {
  friendId: string;
  friendshipId: string;
  uid: string;
  expenses: Expense[];
  settlements: Settlement[];
}) {
  const preferredCurrency = useStore($preferredCurrency);
  const profilesQuery = useProfiles([friendId]);
  const profile = profilesQuery.data?.[0];
  const name = profile?.name ?? 'Unknown';

  const sharedExpenses = React.useMemo(() => expenses.filter((e) => e.memberIds.includes(friendId)), [expenses, friendId]);

  // This view's OWN local display currency, same one-way-seed pattern as
  // every other detail island (plan B9/B11a): initialised from
  // `$preferredCurrency`, never written back to the profile.
  const [displayCurrency, setDisplayCurrency] = React.useState(preferredCurrency);
  // The FULL currency set of `uid`'s own expenses (not just the shared
  // subset) feeds `useDisplayConversion` — `balancesWithUser` below walks
  // every one of `uid`'s expenses to compute the balance, so every currency
  // it might call `convert()` with must have a resolved rate before `ready`
  // (same wiring `DashboardIsland`'s own `BalanceOverview` uses).
  const currencies = React.useMemo(() => [...expenses.map((e) => e.currency), ...settlements.map((s) => s.currency)], [expenses, settlements]);
  const { convert, ready, approximate } = useDisplayConversion(currencies, displayCurrency);

  const names = React.useMemo(() => ({ [friendId]: name }), [friendId, name]);
  const balance = React.useMemo(() => {
    if (!ready) return undefined;
    return balancesWithUser(expenses, settlements, uid, names, convert).find((b) => b.userId === friendId);
  }, [expenses, settlements, uid, names, convert, ready, friendId]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex items-center gap-4">
        <UserAvatar src={profile?.avatarUrl} name={name} alt="" className="h-14 w-14" fallbackClassName="text-lg" />
        <h2 className="font-display text-2xl font-semibold text-foreground">{name}</h2>
      </div>

      <div className="flex flex-col gap-2">
        <CurrencySelector
          value={displayCurrency}
          onChange={setDisplayCurrency}
          label="Display currency"
          id="friend-detail-currency"
          className="max-w-xs"
        />
        {!ready ? (
          <Skeleton className="h-6 w-64" />
        ) : balance ? (
          <p className="text-lg font-medium text-foreground">
            {balance.balance > 0
              ? `${name} owes you ${displayCurrency} ${balance.balance.toFixed(2)}`
              : `You owe ${name} ${displayCurrency} ${Math.abs(balance.balance).toFixed(2)}`}
          </p>
        ) : (
          <p className="text-lg font-medium text-foreground">You&apos;re all settled up with {name}.</p>
        )}
        {ready && approximate && <p className="text-xs text-muted-foreground">* Some amounts use approximate rates</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <a href={withBase(`/expenses/new?friend=${friendId}`)} className={cn(buttonVariants({ variant: 'default' }))}>
          Add shared expense
        </a>
        {/* The personal settlements view (plan B14b): this friend's balance is one of its rows. */}
        <a href={withBase('/settlements')} className={cn(buttonVariants({ variant: 'outline' }))}>
          Settle up
        </a>
        <RemoveFriendDialog friendshipId={friendshipId} name={name} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Shared expenses</h3>
        {sharedExpenses.length === 0 ? (
          <EmptyState title="No shared expenses yet" description={`Expenses you split with ${name} will appear here.`} />
        ) : (
          <ul className="flex flex-col gap-2">
            {sharedExpenses.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3 text-sm">
                <div className="flex flex-col">
                  <a href={withBase(`/expenses/${expense.id}`)} className="underline underline-offset-2">
                    {expense.description}
                  </a>
                  <span className="text-muted-foreground">{parseCalendarDate(expense.date).toLocaleDateString()}</span>
                </div>
                <span>
                  {ready ? `${displayCurrency} ${convert(expense.amount, expense.currency).toFixed(2)}` : <Skeleton className="h-4 w-16" />}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
