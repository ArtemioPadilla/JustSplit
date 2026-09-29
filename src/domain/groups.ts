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
 * m.userId)` (plan B12) — for a brand-new group ONLY (`buildCreateGroupInput`),
 * where the roles were just built locally: the creator is `owner`, everyone else
 * `member`. `hasMinimumRole` treats `owner` as satisfying an `admin` requirement
 * (`ROLE_HIERARCHY`, `@cyber-eco/types`), so the creator is always included.
 *
 * Never call this on a STORED group (plan B19c, ADR 0015): `members[].role` is
 * user-writable (any member may edit that jsonb), so deriving `admin_ids` from
 * it would let a forged label become a real admin on the next admin patch.
 * Once a group exists `admin_ids` is the authority, and the membership patches
 * below start from it.
 */
export function computeAdminIds(members: Pick<ExpenseGroupMember, 'userId' | 'role'>[]): string[] {
  return members.filter((m) => hasMinimumRole(m.role, 'admin')).map((m) => m.userId);
}

/** What the UI shows for a member (plan B19c, ADR 0015). */
export type DisplayedRole = 'owner' | 'admin' | 'member';

export const ROLE_LABELS: Record<DisplayedRole, string> = { owner: 'Owner', admin: 'Admin', member: 'Member' };

/**
 * A member's role for display, derived from the authority and never from the
 * stored `members[].role` (which any member can edit): an admin is whoever is in
 * `admin_ids` (RLS and `guard_expense_groups` read exactly that); the owner is the
 * creator (`created_by` is immutable, the guard trigger enforces it) as long as
 * they are still an admin, so a badge never claims a power the person does not
 * have. Everyone else, including a stored `moderator` (nothing writes one) and a
 * person who is not in the group, is a Member: deny by default.
 */
export function displayedRole(group: Pick<ExpenseGroup, 'adminIds' | 'createdBy'>, userId: string): DisplayedRole {
  if (!group.adminIds.includes(userId)) return 'member';
  return userId === group.createdBy ? 'owner' : 'admin';
}

/**
 * The label to STORE in `members[].role` for a member: the displayed role, in the
 * `AppRole` vocabulary. Written on every membership patch so a forged or stale label
 * heals whenever an admin touches the group, and so the stored labels always agree with
 * `admin_ids` (migration 017's constraint: nobody is labelled owner or admin unless
 * they are in `admin_ids`).
 */
function storedRoleFor(group: Pick<ExpenseGroup, 'adminIds' | 'createdBy'>, userId: string): AppRole {
  return displayedRole(group, userId);
}

/** Every member with a label consistent with `admin_ids`; every other field is kept as it is. */
function withConsistentLabels(group: Pick<ExpenseGroup, 'members' | 'adminIds' | 'createdBy'>): ExpenseGroupMember[] {
  return group.members.map((m) => ({ ...m, role: storedRoleFor(group, m.userId) }));
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
  group: Pick<ExpenseGroup, 'members' | 'adminIds' | 'createdBy'>,
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
  const members = [...withConsistentLabels(group), ...added];
  // `admin_ids` is the authority and adding a member never changes it (plan B19c): never derived from labels.
  return { members, memberIds: members.map((m) => m.userId), adminIds: group.adminIds };
}

/**
 * Admin removing a member or leaving (plan B12: "leaving is an admin
 * action in v1"). `adminIds` is recomputed from the resulting `members[]`
 * so a removed admin also disappears from `adminIds` in the same patch —
 * never a stale id. Callers MUST preflight-check `isLastAdmin` before
 * calling this (this function itself does not). Removing a member needs no
 * other preflight since B2d (ADR 0013): rows that still name them stay
 * readable and editable.
 */
export function withRemovedMember(group: Pick<ExpenseGroup, 'members' | 'adminIds' | 'createdBy'>, memberId: string): GroupMembershipPatch {
  const members = withConsistentLabels(group).filter((m) => m.userId !== memberId);
  // Starts from `admin_ids`, the authority (plan B19c): the removed id leaves it, nobody joins it.
  return { members, memberIds: members.map((m) => m.userId), adminIds: group.adminIds.filter((id) => id !== memberId) };
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
