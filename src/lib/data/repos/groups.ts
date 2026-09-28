import type { BatchOperation, QueryFilter } from '@cyber-eco/types';
import { acceptedFriendIds } from '@/domain/friends';
import { violatesNoGroupInvariant } from '@/domain/expenseParticipants';
import { CreateExpenseGroupInputSchema, ExpenseGroupSchema, type CreateExpenseGroupInput, type ExpenseGroup } from '@/schemas/group';
import { requireStorageAdapter, requireUid } from '../require-adapter';
import * as expensesRepo from './expenses';
import * as eventsRepo from './events';
import * as friendshipsRepo from './friendships';

/**
 * `expense_groups` repo (plan B5a). Plain async functions over the
 * `StorageAdapter` interface only — never `@supabase/supabase-js` /
 * `@cyber-eco/supabase` (`src/tests/data-boundary.test.ts`). The collection
 * name is spelled out as a literal at every call site (not a shared local
 * const) so `src/tests/collections-mapped.test.ts` can grep it against
 * `schemaMap`.
 */

/** ADR 0002 canonical query: a user's groups. */
export function forUserFilters(uid: string): QueryFilter[] {
  return [{ field: 'memberIds', operator: 'array-contains', value: uid }];
}

export async function get(id: string): Promise<ExpenseGroup | null> {
  const doc = await requireStorageAdapter().getDocument('expense_groups', id);
  return doc ? ExpenseGroupSchema.parse(doc) : null;
}

export async function listForUser(uid: string): Promise<ExpenseGroup[]> {
  const { data } = await requireStorageAdapter().query('expense_groups', forUserFilters(uid));
  return data.map((doc) => ExpenseGroupSchema.parse(doc));
}

/** `memberIds` must include every member's id (D10: the RLS membership mirror reads it on every row). */
export async function create(input: CreateExpenseGroupInput): Promise<ExpenseGroup> {
  const adapter = requireStorageAdapter();
  const parsed = CreateExpenseGroupInputSchema.parse(input);
  const id = adapter.generateId('expense_groups');
  await adapter.setDocument('expense_groups', id, {
    ...parsed,
    createdAt: adapter.serverTimestamp(),
    updatedAt: adapter.serverTimestamp(),
  });
  const created = await get(id);
  if (!created) throw new Error(`repos.groups.create: row ${id} not found after insert`);
  return created;
}

/** A partial patch (D9: repos.*.update writes partial adapter.updateDocument patches, never a full-row setDocument). */
export async function update(id: string, patch: Partial<ExpenseGroup>): Promise<ExpenseGroup | null> {
  await requireStorageAdapter().updateDocument('expense_groups', id, patch);
  return get(id);
}

/**
 * Thrown when `id` does not resolve to a group — never existed, already
 * deleted, or RLS-hidden (this repo never distinguishes those, same
 * leaked-id reasoning as ADR 0002).
 */
export class GroupNotFoundError extends Error {
  constructor(id: string) {
    super(`repos.groups: group "${id}" was not found`);
    this.name = 'GroupNotFoundError';
  }
}

/**
 * Thrown by `remove()`'s preflight (plan B12, ADR 0002 amendment "group
 * membership lifecycle") when the caller is not a fresh-read admin of the
 * group. Client-side safety preflight against a destructive PARTIAL
 * operation, never authorization: `expense_groups_delete`'s RLS policy
 * denies the row delete on its own regardless (CLAUDE.md rule 8).
 */
export class GroupDeleteNotAllowedError extends Error {
  constructor(id: string) {
    super(`repos.groups.remove: only a group admin may delete group "${id}"`);
    this.name = 'GroupDeleteNotAllowedError';
  }
}

/**
 * Thrown by `remove()`'s preflight when ungrouping any of the group's
 * expenses/events would leave a row whose other members are not accepted
 * friends of the acting admin — the no-group `expenses_update`/
 * `events_update` WITH CHECK branch would reject that row's update one by
 * one, leaving the group partially ungrouped and permanently undeletable.
 * Checked BEFORE any write with `violatesNoGroupInvariant` (plan B10/B12).
 */
export class GroupDeleteBlockedByFriendshipError extends Error {
  constructor(id: string) {
    super(`repos.groups.remove: group "${id}" has rows whose members are not all accepted friends of the acting admin`);
    this.name = 'GroupDeleteBlockedByFriendshipError';
  }
}

/**
 * Thrown when the batch reports failure, OR when it reports success but a
 * re-read after the batch shows the group is still there — `batch_write`'s
 * DELETE op is a silent no-op when denied or the row is not visible
 * (`db/migrations/20260928000008_batch_write.sql`), so "the RPC didn't
 * error" is never proof the group is actually gone. In the second case the
 * group's rows WERE ungrouped (the batch's update ops did apply) but the
 * group row itself remained — this is reported honestly, never claimed as
 * a full success.
 */
export class GroupDeleteVerificationFailedError extends Error {
  constructor(id: string) {
    super(`repos.groups.remove: group "${id}"'s rows were ungrouped, but the group itself could not be deleted`);
    this.name = 'GroupDeleteVerificationFailedError';
  }
}

/**
 * Deletes a group (plan B12, risk:high, ADR 0002 amendment): preflights
 * (admin-only; the no-group friendship invariant for every row that would
 * be ungrouped) run BEFORE any write, then one `batchWrite` nulls `groupId`
 * on every group expense/event and deletes the group row, then a re-read
 * verifies the group is actually gone (see `GroupDeleteVerificationFailedError`).
 * Identity comes from `requireUid()` (same convention as
 * `repos.expenses.remove`'s own ADR 0005 amendment) — never a caller-passed
 * argument.
 */
export async function remove(id: string): Promise<void> {
  const uid = requireUid();
  const group = await get(id);
  if (!group) throw new GroupNotFoundError(id);
  if (!group.adminIds.includes(uid)) throw new GroupDeleteNotAllowedError(id);

  const [groupExpenses, groupEvents, friendships] = await Promise.all([
    expensesRepo.listForGroup(id),
    eventsRepo.listForGroup(id),
    friendshipsRepo.listForUser(uid),
  ]);
  const friends = acceptedFriendIds(friendships, uid);
  const wouldViolate = (memberIds: string[]) => violatesNoGroupInvariant(memberIds, friends, uid);
  if (groupExpenses.some((e) => wouldViolate(e.memberIds)) || groupEvents.some((e) => wouldViolate(e.memberIds))) {
    throw new GroupDeleteBlockedByFriendshipError(id);
  }

  const adapter = requireStorageAdapter();
  const ops: BatchOperation[] = [
    ...groupExpenses.map((e) => ({ type: 'update' as const, collection: 'expenses', id: e.id, data: { groupId: null } })),
    ...groupEvents.map((e) => ({ type: 'update' as const, collection: 'events', id: e.id, data: { groupId: null } })),
    { type: 'delete' as const, collection: 'expense_groups', id },
  ];
  const result = await adapter.batchWrite(ops);
  if (!result.success) throw new GroupDeleteVerificationFailedError(id);

  const stillExists = await get(id);
  if (stillExists) throw new GroupDeleteVerificationFailedError(id);
}
