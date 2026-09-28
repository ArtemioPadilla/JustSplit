import type { Friendship } from '@/schemas/friendship';

/**
 * Pure friendship-row helpers (plan B13, ADR 0006). `friendships.users` is
 * always exactly the two parties (`friendships_two_distinct_users`, spec
 * D10) with no notion of "me" — every caller that needs the OTHER party
 * relative to the signed-in user goes through `otherUser` here, so that
 * logic exists in exactly one place. Pulled out of `ExpenseForm.tsx`'s own
 * B10 `acceptedFriendIds` memo (this issue's refactor) rather than
 * duplicated for the friends islands.
 */

/** The user on `friendship.users` who is NOT `uid`, or `undefined` if `uid` isn't on the row at all (shouldn't happen for a row RLS returned, but keeps this total). */
export function otherUser(friendship: Pick<Friendship, 'users'>, uid: string): string | undefined {
  if (!friendship.users.includes(uid)) return undefined;
  return friendship.users.find((id) => id !== uid);
}

/** uids of every user with an ACCEPTED friendship with `uid` — the shared "candidate pool" input for both the expense form's participant picker (B10) and the friends islands (B13). */
export function acceptedFriendIds(friendships: Pick<Friendship, 'users' | 'status'>[], uid: string): string[] {
  return friendships
    .filter((f) => f.status === 'accepted')
    .map((f) => otherUser(f, uid))
    .filter((id): id is string => Boolean(id));
}

export interface PartitionedFriendships {
  /** status === 'accepted', either party requested. */
  accepted: Friendship[];
  /** status === 'pending', someone else requested — `uid`'s own Accept/Reject queue. */
  received: Friendship[];
  /** status === 'pending', `uid` requested — the Sent Requests / Cancel queue. */
  sent: Friendship[];
}

/**
 * Buckets a user's raw `friendships` rows (`useFriends`'s "every status"
 * contract) into the three sections `/friends` renders. A `status ===
 * 'rejected'` row falls into none of the three buckets — it is neither
 * pending nor accepted, so the list page has nothing to show it as (ADR
 * 0006 records this as a known limitation: the row still exists and, per
 * the DB's `friendships_pair_uniq` unique index having no partial predicate,
 * permanently blocks a fresh request for that same pair until someone with
 * database access deletes it — there is no user-facing "remove" affordance
 * for a rejected row today).
 */
export function partitionFriendships(friendships: Friendship[], uid: string): PartitionedFriendships {
  const accepted: Friendship[] = [];
  const received: Friendship[] = [];
  const sent: Friendship[] = [];
  for (const f of friendships) {
    if (f.status === 'accepted') accepted.push(f);
    else if (f.status === 'pending' && f.requestedBy === uid) sent.push(f);
    else if (f.status === 'pending') received.push(f);
  }
  return { accepted, received, sent };
}
