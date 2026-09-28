/**
 * Expense participant resolution (plan B10, rewritten for plan B2d, ADR 0013).
 *
 * `event_id` is a real column and RLS knows event membership, so an event's
 * own member list IS the participant pool: `?event=` offers every event member,
 * friend or not (the friend filter, the "N people aren't your friends" count
 * and the edit block of the B10 addendum are gone). What is left client-side is
 * a mirror of the database's rule for people ADDED to a row
 * (`guard_expenses` on update, `expenses_insert` on create), so a doomed save is
 * refused before the round trip. UX only — RLS stays the sole authority
 * (CLAUDE.md rule 8).
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
  /** Every event member — the pool the expense's participants are picked from. */
  candidateIds: string[];
  /** Set only when this can be a GROUP expense too: the event's group is visible and every event member is in it. */
  groupId?: string;
  currency?: string;
}

/**
 * `?event=` participants. `group` is the event's own group as the caller sees
 * it: `undefined` while its query has not resolved (no candidates yet — same
 * "wait for it" treatment every other async-resolved context gets), `null`
 * when the caller cannot see it (they are not a member of that group).
 *
 * A group-backed event is a group expense (so it shows up in the group's feed)
 * only when the row would satisfy the group rule: every event member must be a
 * member of the group (`member_ids ⊆ group`), and the caller must be able to
 * see the group. Otherwise — a member left the group since, or the caller is
 * not in it — it is an event expense (`groupId` null) with every event member,
 * which `expenses_insert` allows for members of the event.
 */
export function resolveEventParticipants(event: EventLike, group: GroupLike | null | undefined): EventParticipantResolution {
  if (event.groupId && group === undefined) return { candidateIds: [] };
  if (event.groupId && group && event.memberIds.every((id) => group.memberIds.includes(id))) {
    return { candidateIds: event.memberIds, groupId: group.id, currency: group.currency };
  }
  return { candidateIds: event.memberIds, groupId: undefined, currency: event.preferredCurrency };
}

export interface AddedMembersContext {
  /** The signed-in user: never asked to be their own friend. */
  uid: string;
  acceptedFriendIds: string[];
  /** Present when the row has a group whose members are known: the group rule applies. */
  groupMemberIds?: string[];
  /** Present when the row has an event (and no group) whose members are known. */
  eventMemberIds?: string[];
}

/**
 * True when adding `newMemberIds` (over `previousMemberIds`; `[]` on create)
 * would be rejected by the database. Mirrors `guard_expenses` /
 * `expenses_insert` for each ADDED member (anyone already on the row, and
 * removals, are never re-checked):
 *   - the row has a group  → the added member must be in that group;
 *   - else it has an event → an event member OR an accepted friend of the caller;
 *   - else                 → an accepted friend of the caller.
 * The caller is exempt (`expenses_insert` only checks "every OTHER member").
 * Leave the group/event members out of `ctx` when they are unknown (a query
 * still loading) and skip the check instead — RLS decides either way.
 */
export function violatesAddedMembersRule(newMemberIds: string[], previousMemberIds: string[], ctx: AddedMembersContext): boolean {
  const previous = new Set(previousMemberIds);
  const friends = new Set(ctx.acceptedFriendIds);
  return newMemberIds.some((id) => {
    if (previous.has(id) || id === ctx.uid) return false;
    if (ctx.groupMemberIds) return !ctx.groupMemberIds.includes(id);
    if (ctx.eventMemberIds) return !(ctx.eventMemberIds.includes(id) || friends.has(id));
    return !friends.has(id);
  });
}

export interface ResolveMemberIdsInput {
  mode: 'create' | 'edit';
  participantIds: string[];
  paidBy: string;
  /** The signed-in user (may be absent while the session resolves). */
  uid?: string;
  /** The group's own memberIds, when the row has a group and it is loaded. */
  groupMemberIds?: string[];
  /** Whether the row has a group at all (defaults to `groupMemberIds !== undefined`); an edit needs it even while the group is loading. */
  hasGroup?: boolean;
  /** The row's memberIds before this edit. */
  existingMemberIds?: string[];
}

const union = (...lists: Array<Array<string | undefined>>): string[] =>
  Array.from(new Set(lists.flat().filter((id): id is string => Boolean(id))));

/**
 * The `memberIds` an expense is written with.
 *   - create, group:    the group's own memberIds (unchanged since B10);
 *   - create, no group: participants ∪ payer ∪ the caller;
 *   - edit, group:      the existing members ∪ participants ∪ payer — an edit
 *     never drops anyone (a member who has since left the group and is still
 *     on the row stays on it) and does not pull in everyone who joined the
 *     group later; only people who are now participants are added;
 *   - edit, no group:   participants ∪ payer (an unticked participant leaves the
 *     row), plus the caller only if they were already on it — an event member
 *     editing a row that never named them is not added to it.
 */
export function resolveMemberIds(input: ResolveMemberIdsInput): string[] {
  const hasGroup = input.hasGroup ?? input.groupMemberIds !== undefined;
  if (input.mode === 'create') {
    return hasGroup && input.groupMemberIds ? input.groupMemberIds : union(input.participantIds, [input.paidBy, input.uid]);
  }
  const existing = input.existingMemberIds ?? [];
  if (hasGroup) return union(existing, input.participantIds, [input.paidBy]);
  const editorWasOnRow = input.uid !== undefined && existing.includes(input.uid);
  return union(input.participantIds, [input.paidBy, editorWasOnRow ? input.uid : undefined]);
}
