import * as React from 'react';
import { useStore } from '@nanostores/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { AddFriendForm } from '@/components/features/friends/AddFriendForm';
import { RemoveFriendDialog } from '@/components/features/friends/RemoveFriendDialog';
import { otherUser, partitionFriendships } from '@/domain/friends';
import { useFriends } from '@/lib/data/hooks/useFriends';
import { useProfiles } from '@/lib/data/hooks/useProfiles';
import { useRemoveFriendship } from '@/lib/data/hooks/useRemoveFriendship';
import { useUpdateFriendshipStatus } from '@/lib/data/hooks/useUpdateFriendshipStatus';
import { withBase } from '@/lib/href';
import type { Friendship } from '@/schemas/friendship';
import { $profile, $user } from '@/stores/auth';
import { notifyError, notifySuccess } from '@/stores/notifications';
import AuthGate from './AuthGate';
import AuthIsland from './AuthIsland';
import ErrorBoundary from './ErrorBoundary';

/** First letters of up to two words — same rule as `UserAccountMenu`'s Avatar fallback. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

type PersonRow = { id: string; name: string | null; avatarUrl: string | null };

function byId(rows: PersonRow[] | undefined): Record<string, PersonRow> {
  const map: Record<string, PersonRow> = {};
  for (const row of rows ?? []) map[row.id] = row;
  return map;
}

/**
 * `/friends`'s route island (plan B13, ADR 0006): `ErrorBoundary >
 * AuthIsland > AuthGate > Content`, the same composition and error/retry
 * handling as `ExpenseListIsland` (plan B9). Mounted `client:only="react"`
 * from `src/pages/friends/index.astro`.
 */
export default function FriendsIsland() {
  return (
    <>
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight text-foreground">Friends</h1>
      <ErrorBoundary name="FriendsIsland">
        <AuthIsland>
          <AuthGate>
            <FriendsContent />
          </AuthGate>
        </AuthIsland>
      </ErrorBoundary>
    </>
  );
}

function FriendsContent() {
  const user = useStore($user);
  const profile = useStore($profile);
  const uid = user?.uid ?? '';

  const friendsQuery = useFriends(uid || undefined);
  const friendships = React.useMemo(() => friendsQuery.data ?? [], [friendsQuery.data]);

  const otherIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const f of friendships) {
      const other = otherUser(f, uid);
      if (other) ids.add(other);
    }
    return Array.from(ids);
  }, [friendships, uid]);
  const profilesQuery = useProfiles(otherIds);
  const people = React.useMemo(() => byId(profilesQuery.data), [profilesQuery.data]);

  const isError = Boolean(friendsQuery.isError || profilesQuery.isError);
  const isRetrying = Boolean(friendsQuery.isRetrying || profilesQuery.isFetching);
  function handleRetry() {
    friendsQuery.refetch();
    void profilesQuery.refetch();
  }

  if (isError) {
    return (
      <ErrorState
        title="Something went wrong loading your friends"
        hint='Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.'
        action={
          <Button type="button" onClick={handleRetry} disabled={isRetrying} aria-busy={isRetrying}>
            Retry
          </Button>
        }
      />
    );
  }

  if (friendsQuery.data === undefined) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const partitioned = partitionFriendships(friendships, uid);
  const selfEmail = user?.email ?? null;
  const inviterName = profile?.name ?? user?.displayName ?? null;

  return (
    <div className="flex flex-col gap-10">
      <AddFriendForm uid={uid} selfEmail={selfEmail} inviterName={inviterName} />

      {partitioned.received.length > 0 && (
        <section aria-labelledby="friend-requests-heading" className="flex flex-col gap-3">
          <h2 id="friend-requests-heading" className="text-lg font-semibold text-foreground">
            Friend requests
          </h2>
          <ul className="flex flex-col gap-3">
            {partitioned.received.map((f) => {
              const id = otherUser(f, uid);
              if (!id) return null;
              return <ReceivedRequestRow key={f.id} friendship={f} person={people[id]} otherId={id} />;
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="friends-heading" className="flex flex-col gap-3">
        <h2 id="friends-heading" className="text-lg font-semibold text-foreground">
          Friends ({partitioned.accepted.length})
        </h2>
        {partitioned.accepted.length === 0 ? (
          <EmptyState title="No friends yet" description="Add a friend by email above to get started." />
        ) : (
          <ul className="flex flex-col gap-3">
            {partitioned.accepted.map((f) => {
              const id = otherUser(f, uid);
              if (!id) return null;
              return <FriendRow key={f.id} friendship={f} person={people[id]} otherId={id} />;
            })}
          </ul>
        )}
      </section>

      {partitioned.sent.length > 0 && (
        <section aria-labelledby="sent-requests-heading" className="flex flex-col gap-3">
          <h2 id="sent-requests-heading" className="text-lg font-semibold text-foreground">
            Sent requests
          </h2>
          <ul className="flex flex-col gap-3">
            {partitioned.sent.map((f) => {
              const id = otherUser(f, uid);
              if (!id) return null;
              return <SentRequestRow key={f.id} friendship={f} person={people[id]} />;
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function PersonBadge({ person }: { person: PersonRow | undefined }) {
  const name = person?.name ?? 'Unknown';
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        {person?.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" />}
        <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="font-medium text-foreground">{name}</span>
    </div>
  );
}

interface RowProps {
  friendship: Friendship;
  person: PersonRow | undefined;
  otherId: string;
}

/** Recipient-only in practice: this row only ever renders for a request where `f.requestedBy !== uid` (`partitionFriendships`'s "received" bucket) — `friendships_update`'s RLS + `guard_friendships` are the actual authority (CLAUDE.md rule 8), this is UX only. */
function ReceivedRequestRow({ friendship, person, otherId }: RowProps) {
  const updateStatus = useUpdateFriendshipStatus();
  const [pendingAction, setPendingAction] = React.useState<'accepted' | 'rejected' | null>(null);

  async function handle(status: 'accepted' | 'rejected') {
    setPendingAction(status);
    try {
      await updateStatus.mutateAsync({ id: friendship.id, status });
      notifySuccess(status === 'accepted' ? 'Friend request accepted' : 'Friend request declined');
    } catch {
      notifyError('Could not update this request');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <li className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
      <PersonBadge person={person ?? { id: otherId, name: null, avatarUrl: null }} />
      <div className="flex gap-2">
        <Button type="button" onClick={() => handle('accepted')} disabled={updateStatus.isPending} aria-busy={pendingAction === 'accepted'}>
          Accept
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handle('rejected')}
          disabled={updateStatus.isPending}
          aria-busy={pendingAction === 'rejected'}
        >
          Reject
        </Button>
      </div>
    </li>
  );
}

function FriendRow({ friendship, person, otherId }: RowProps) {
  const name = person?.name ?? 'Unknown';
  return (
    <li className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
      <a href={withBase(`/friends/${otherId}`)} className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={name}>
        <PersonBadge person={person ?? { id: otherId, name: null, avatarUrl: null }} />
      </a>
      <RemoveFriendDialog friendshipId={friendship.id} name={name} />
    </li>
  );
}

/** Cancel = the requester deletes the pending row (plan B13) — this row only ever renders in the "sent" bucket (`f.requestedBy === uid`). */
function SentRequestRow({ friendship, person }: RowProps) {
  const removeFriendship = useRemoveFriendship();

  async function handleCancel() {
    try {
      await removeFriendship.mutateAsync(friendship.id);
      notifySuccess('Friend request canceled');
    } catch {
      notifyError('Could not cancel this request');
    }
  }

  return (
    <li className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
      <PersonBadge person={person} />
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        disabled={removeFriendship.isPending}
        aria-busy={removeFriendship.isPending}
      >
        Cancel
      </Button>
    </li>
  );
}
