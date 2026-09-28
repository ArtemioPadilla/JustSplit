import type { BatchOperation, QueryFilter } from '@cyber-eco/types';
import { isEventAttachable, isExpenseAttachable } from '@/domain/groups';
import { CreateExpenseGroupInputSchema, ExpenseGroupSchema, type CreateExpenseGroupInput, type ExpenseGroup } from '@/schemas/group';
import { requireStorageAdapter, requireUid } from '../require-adapter';
import * as expensesRepo from './expenses';
import * as eventsRepo from './events';

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
 * Thrown by `remove()`'s preflight (plan B12) when the caller is not a
 * fresh-read admin of the group. Client-side safety preflight, never
 * authorization: `expense_groups_delete`'s RLS policy denies the row delete on
 * its own regardless (CLAUDE.md rule 8).
 */
export class GroupDeleteNotAllowedError extends Error {
  constructor(id: string) {
    super(`repos.groups.remove: only a group admin may delete group "${id}"`);
    this.name = 'GroupDeleteNotAllowedError';
  }
}

/**
 * Thrown when a re-read after the delete shows the group is still there.
 * `expense_groups_delete` denies a non-admin as a silent 0-row delete (and the
 * delete of a row the caller cannot see is a no-op too), so "the call didn't
 * error" is never proof the group is actually gone. Nothing else changed in
 * that case: the foreign key only ungroups rows when the group row itself is
 * deleted.
 */
export class GroupDeleteVerificationFailedError extends Error {
  constructor(id: string) {
    super(`repos.groups.remove: group "${id}" could not be deleted`);
    this.name = 'GroupDeleteVerificationFailedError';
  }
}

/**
 * Deletes a group (plan B12, risk:high; simplified by plan B2d, ADR 0013).
 * A PLAIN delete: `expenses.group_id`, `events.group_id` and
 * `settlements.group_id` are foreign keys `ON DELETE SET NULL`
 * (`db/migrations/20260928000011_membership_foreign_keys.sql`), so the database
 * ungroups every row atomically — including rows this admin cannot see and rows
 * naming people they are not friends with. The client no longer reads the
 * group's rows or friendships, ungroups anything, or batches.
 *
 * Kept: the fresh-read admin preflight (a client-side safety check, never
 * authorization — `expense_groups_delete` RLS is the authority) and the
 * post-delete re-read (see `GroupDeleteVerificationFailedError`). Identity
 * comes from `requireUid()` (same convention as `repos.expenses.remove`) —
 * never a caller-passed argument.
 */
export async function remove(id: string): Promise<void> {
  const uid = requireUid();
  const group = await get(id);
  if (!group) throw new GroupNotFoundError(id);
  if (!group.adminIds.includes(uid)) throw new GroupDeleteNotAllowedError(id);

  await requireStorageAdapter().deleteDocument('expense_groups', id);

  const stillExists = await get(id);
  if (stillExists) throw new GroupDeleteVerificationFailedError(id);
}
export interface AttachResult {
  /** Ids that were attached AND verified by a re-read after the batch. */
  attached: string[];
  /** Ids that were not attachable to begin with, or failed the post-batch verification — never claimed as a success (plan B12). */
  skipped: string[];
}

/**
 * Attaches existing ungrouped expenses to a group (plan B12): offers only
 * expenses `isExpenseAttachable` (ungrouped, `splits[].userId ∪ {paidBy} ⊆
 * group.memberIds`) accepts — anything else is skipped rather than sent to
 * a doomed write. One `batchWrite` for every attachable id, then a re-read
 * of each attempted id verifies `groupId` actually changed before counting
 * it as attached (same "never claim success for rows that didn't change"
 * rule `remove()` follows for its own batch).
 */
export async function attachExpenses(groupId: string, expenseIds: string[]): Promise<AttachResult> {
  const group = await get(groupId);
  if (!group) throw new GroupNotFoundError(groupId);

  const skipped: string[] = [];
  const ops: BatchOperation[] = [];
  for (const id of expenseIds) {
    const expense = await expensesRepo.get(id);
    if (!expense || !isExpenseAttachable(expense, group)) {
      skipped.push(id);
      continue;
    }
    ops.push({ type: 'update', collection: 'expenses', id, data: { groupId, memberIds: group.memberIds } });
  }

  if (ops.length === 0) return { attached: [], skipped };

  const adapter = requireStorageAdapter();
  const result = await adapter.batchWrite(ops);
  if (!result.success) return { attached: [], skipped: [...skipped, ...ops.map((op) => op.id)] };

  const attached: string[] = [];
  for (const op of ops) {
    const fresh = await expensesRepo.get(op.id);
    if (fresh?.groupId === groupId) attached.push(op.id);
    else skipped.push(op.id);
  }
  return { attached, skipped };
}

/**
 * Attaches existing ungrouped events to a group (plan B12): offers only
 * events `isEventAttachable` (ungrouped, `memberIds ⊆ group.memberIds`)
 * accepts, writing `groupId` only (an event's own expenses stay keyed by
 * `eventId`, unaffected by this). Same one-batch-then-verify contract as
 * `attachExpenses`.
 */
export async function attachEvents(groupId: string, eventIds: string[]): Promise<AttachResult> {
  const group = await get(groupId);
  if (!group) throw new GroupNotFoundError(groupId);

  const skipped: string[] = [];
  const ops: BatchOperation[] = [];
  for (const id of eventIds) {
    const event = await eventsRepo.get(id);
    if (!event || !isEventAttachable(event, group)) {
      skipped.push(id);
      continue;
    }
    ops.push({ type: 'update', collection: 'events', id, data: { groupId } });
  }

  if (ops.length === 0) return { attached: [], skipped };

  const adapter = requireStorageAdapter();
  const result = await adapter.batchWrite(ops);
  if (!result.success) return { attached: [], skipped: [...skipped, ...ops.map((op) => op.id)] };

  const attached: string[] = [];
  for (const op of ops) {
    const fresh = await eventsRepo.get(op.id);
    if (fresh?.groupId === groupId) attached.push(op.id);
    else skipped.push(op.id);
  }
  return { attached, skipped };
}
