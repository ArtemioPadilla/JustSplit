/**
 * Expense participant resolution for `?event=` (plan B10, coordinator
 * review, risk:high). `eventId` is a JustSplit-only overflow key with no
 * column (spec D9) — the `expenses_insert`/`expenses_update` RLS policies
 * (`db/migrations/20260928000004_rls_policies.sql`) know nothing about
 * event membership. They only ever check one of two things:
 *
 *   - `group_id is not null`: `member_ids` must be a subset of the group's
 *     `member_ids`, and the caller must be a member of that group.
 *   - `group_id is null`: every member OTHER than the caller must be an
 *     accepted friend of the caller (evaluated against the editor on
 *     update, not the creator).
 *
 * So an event's own participant pool has to be derived from whichever of
 * those two the event actually falls under — never from `event.memberIds`
 * directly, which the policy has no way to honor on its own.
 */
export interface EventLike {
  memberIds: string[];
  /** JustSplit's own field name for the group an event belongs to (`src/schemas/event.ts`). */
  groupId?: string | null;
  preferredCurrency?: string;
}

export interface GroupLike {
  id: string;
  memberIds: string[];
  currency: string;
}

export interface EventParticipantResolution {
  candidateIds: string[];
  /** Set only when the event belongs to a group — this then IS a group expense (same rule as `?group=`). */
  groupId?: string;
  currency?: string;
  /** Only ever nonzero for a no-group event: how many members were excluded for not being an accepted friend of the caller. Count only — never names (never reveal who). */
  excludedNonFriendCount: number;
}

/**
 * `event.groupId` set: treat this as a group expense — candidates are the
 * group's members, restricted to whoever is also in the event (falling
 * back to the whole group when that intersection is empty, e.g. an event
 * whose own member list hasn't caught up with the group's yet). `group` is
 * `undefined` while its query hasn't resolved (candidates stay empty, same
 * "wait for it" treatment every other async-resolved context gets) or
 * `null`/never happens here — callers pass whatever `useGroup` returned.
 *
 * `event.groupId` unset: no group backs this event, so the ONLY people who
 * may legally be on the expense are the caller and their accepted friends
 * (the `group_id is null` RLS branch) — candidates are `event.memberIds`
 * restricted to that set, and `excludedNonFriendCount` is how many of the
 * event's real members got left out.
 */
export function resolveEventParticipants(
  event: EventLike,
  group: GroupLike | null | undefined,
  acceptedFriendIds: string[],
  uid: string,
): EventParticipantResolution {
  if (event.groupId) {
    if (!group) return { candidateIds: [], excludedNonFriendCount: 0 };
    const intersection = event.memberIds.filter((id) => group.memberIds.includes(id));
    const candidateIds = intersection.length > 0 ? intersection : group.memberIds;
    return { candidateIds, groupId: group.id, currency: group.currency, excludedNonFriendCount: 0 };
  }

  const friendPool = new Set([uid, ...acceptedFriendIds]);
  const candidateIds = event.memberIds.filter((id) => friendPool.has(id));
  return {
    candidateIds,
    currency: event.preferredCurrency,
    excludedNonFriendCount: event.memberIds.length - candidateIds.length,
  };
}

/**
 * Mirrors the `group_id is null` branch of `expenses_insert`/`_update`'s
 * `WITH CHECK` directly: every member other than `uid` must be an accepted
 * friend of `uid`. Used two ways, both UX-only (RLS stays the sole
 * authority either way, CLAUDE.md rule 8):
 *   - a defensive pre-submit check on `memberIds` before any no-group
 *     create/update, so stale client state never sends a doomed insert;
 *   - `ExpenseForm`'s edit-mode notice: if the CURRENT editor isn't friends
 *     with everyone already on a no-group expense, Save is disabled upfront
 *     instead of failing after a round trip.
 */
export function violatesNoGroupInvariant(memberIds: string[], acceptedFriendIds: string[], uid: string): boolean {
  const friendSet = new Set(acceptedFriendIds);
  return memberIds.some((id) => id !== uid && !friendSet.has(id));
}
