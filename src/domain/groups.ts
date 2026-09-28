import { hasMinimumRole, type AppRole } from '@cyber-eco/types';
import type { CreateExpenseGroupInput, ExpenseGroup, ExpenseGroupMember } from '@/schemas/group';
import type { Expense } from '@/schemas/expense';
import type { Event } from '@/schemas/event';

/**
 * Pure group-membership-lifecycle helpers (plan B12, risk:high, ADR 0002
 * amendment "group membership lifecycle"). Pulled out of `GroupForm`/
 * `GroupDetailView` so `adminIds` derivation, the attach filters, and the
 * member-removal preflight are each provable in one place — same reasoning
 * as `domain/friends.ts` (B13) and `domain/expenseParticipants.ts` (B10).
 * Every function here is UX/wiring logic only: the `expense_groups_insert`/
 * `_update` RLS policies and the `guard_expense_groups` trigger
 * (`db/migrations/20260928000004_rls_policies.sql`,
 * `…000005_guard_triggers.sql`) are the actual authority (CLAUDE.md rule 8).
 */

export const MAX_GROUP_MEMBERS = 50;

export interface GroupMemberCandidate {
  userId: string;
  displayName: string;
}

/**
 * `adminIds = members.filter(m => hasMinimumRole(m.role, 'admin')).map(m =>
 * m.userId)` (plan B12) — the ONE place this derivation happens, so
 * `adminIds` and `members[].role` never drift. `hasMinimumRole` treats
 * `owner` as satisfying an `admin` requirement (`ROLE_HIERARCHY`,
 * `@cyber-eco/types`), so the creator (always `role: 'owner'`) is always
 * included.
 */
export function computeAdminIds(members: Pick<ExpenseGroupMember, 'userId' | 'role'>[]): string[] {
  return members.filter((m) => hasMinimumRole(m.role, 'admin')).map((m) => m.userId);
}

export interface BuildCreateGroupInputParams {
  name: string;
  description?: string;
  /** The creator's preferred currency (plan B12). */
  currency: string;
  creator: GroupMemberCandidate;
  /** Accepted friends invited at create time (plan B12: "members are picked from accepted friends only"). */
  invitees: GroupMemberCandidate[];
  /** ISO timestamp, injected for testability — every member's `joinedAt`. */
  now: string;
}

/**
 * The universal `ExpenseGroup` create payload (plan B12's field list): the
 * creator is `role: 'owner'`, every invitee `role: 'member', invitedBy:
 * creator.userId`; `type: 'friends'` until Track D; `settings` is the fixed
 * `{ defaultSplitType: 'equal', simplifyDebts: true, maxMembers: 50 }`;
 * `totalExpenses: 0` is written and then ignored by the UI (deviation,
 * plan B12 — see `GroupDetailView`'s own doc comment: nothing keeps it in
 * sync, so the detail page sums the loaded rows instead).
 */
export function buildCreateGroupInput(params: BuildCreateGroupInputParams): CreateExpenseGroupInput {
  const { name, description, currency, creator, invitees, now } = params;
  const members: ExpenseGroupMember[] = [
    { userId: creator.userId, displayName: creator.displayName, role: 'owner' as AppRole, joinedAt: now },
    ...invitees.map(
      (i): ExpenseGroupMember => ({
        userId: i.userId,
        displayName: i.displayName,
        role: 'member' as AppRole,
        joinedAt: now,
        invitedBy: creator.userId,
      }),
    ),
  ];
  return {
    name,
    description,
    type: 'friends',
    currency,
    members,
    memberIds: members.map((m) => m.userId),
    adminIds: computeAdminIds(members),
    settings: { defaultSplitType: 'equal', simplifyDebts: true, maxMembers: MAX_GROUP_MEMBERS },
    totalExpenses: 0,
    createdBy: creator.userId,
  };
}

export interface GroupMembershipPatch {
  members: ExpenseGroupMember[];
  memberIds: string[];
  adminIds: string[];
}

/**
 * Admin adding members (plan B12): a partial patch of `memberIds`,
 * `members[]` and `adminIds` TOGETHER (RLS's `guard_expense_groups`
 * BEFORE UPDATE trigger requires all three to change atomically, and
 * rejects the update entirely unless the actor is already an admin and
 * every ADDED member is that admin's accepted friend — both enforced
 * server-side; this is UX-only construction of the patch).
 */
export function withAddedMembers(
  group: Pick<ExpenseGroup, 'members'>,
  invitees: GroupMemberCandidate[],
  invitedBy: string,
  now: string,
): GroupMembershipPatch {
  const added: ExpenseGroupMember[] = invitees.map((i) => ({
    userId: i.userId,
    displayName: i.displayName,
    role: 'member' as AppRole,
    joinedAt: now,
    invitedBy,
  }));
  const members = [...group.members, ...added];
  return { members, memberIds: members.map((m) => m.userId), adminIds: computeAdminIds(members) };
}

/**
 * Admin removing a member or leaving (plan B12: "leaving is an admin
 * action in v1"). `adminIds` is recomputed from the resulting `members[]`
 * so a removed admin also disappears from `adminIds` in the same patch —
 * never a stale id. Callers MUST preflight-check
 * `memberRemovalBlockerCount`/`isLastAdmin` before calling this (this
 * function itself does not).
 */
export function withRemovedMember(group: Pick<ExpenseGroup, 'members'>, memberId: string): GroupMembershipPatch {
  const members = group.members.filter((m) => m.userId !== memberId);
  return { members, memberIds: members.map((m) => m.userId), adminIds: computeAdminIds(members) };
}

/**
 * How many of the group's own expenses/events still carry `memberId` in
 * their `memberIds` (plan B12). Removing that member would make those rows
 * UNEDITABLE FOREVER: `expenses_update`/`events_update`'s WITH CHECK both
 * require `member_ids ⊆ group.member_ids`, so a row with a member the
 * group no longer has can never pass a future update. A nonzero count
 * means the UI must preflight-block the removal with an honest inline
 * message (e.g. "Alex is still part of 3 expenses in this group, so they
 * can't be removed yet.") — this is a client-side safety check, not
 * authorization.
 */
export function memberRemovalBlockerCount(
  memberId: string,
  groupExpenses: Pick<Expense, 'memberIds'>[],
  groupEvents: Pick<Event, 'memberIds'>[],
): number {
  const inExpenses = groupExpenses.filter((e) => e.memberIds.includes(memberId)).length;
  const inEvents = groupEvents.filter((e) => e.memberIds.includes(memberId)).length;
  return inExpenses + inEvents;
}

/** UX guard (plan B12): never let the last admin remove or demote themselves — a group with no admin can never be managed or deleted again. */
export function isLastAdmin(memberId: string, adminIds: string[]): boolean {
  return adminIds.length === 1 && adminIds[0] === memberId;
}

/**
 * Attach an expense (plan B12): offer only UNGROUPED expenses whose
 * `splits[].userId ∪ {paidBy} ⊆ group.memberIds` — the same subset the
 * `expenses_update` group branch's WITH CHECK requires, so attaching never
 * constructs a payload RLS was always going to reject.
 */
export function isExpenseAttachable(expense: Pick<Expense, 'groupId' | 'paidBy' | 'splits'>, group: Pick<ExpenseGroup, 'memberIds'>): boolean {
  if (expense.groupId) return false;
  const participants = new Set<string>([expense.paidBy, ...expense.splits.map((s) => s.userId)]);
  return Array.from(participants).every((id) => group.memberIds.includes(id));
}

export function filterAttachableExpenses(expenses: Expense[], group: Pick<ExpenseGroup, 'memberIds'>): Expense[] {
  return expenses.filter((e) => isExpenseAttachable(e, group));
}

/** Attach an event (plan B12): offer only UNGROUPED events whose `memberIds ⊆ group.memberIds`. */
export function isEventAttachable(event: Pick<Event, 'groupId' | 'memberIds'>, group: Pick<ExpenseGroup, 'memberIds'>): boolean {
  if (event.groupId) return false;
  return event.memberIds.every((id) => group.memberIds.includes(id));
}

export function filterAttachableEvents(events: Event[], group: Pick<ExpenseGroup, 'memberIds'>): Event[] {
  return events.filter((e) => isEventAttachable(e, group));
}
