import type { QueryFilter } from '@cyber-eco/types';
import { CreateExpenseInputSchema, ExpenseSchema, type CreateExpenseInput, type Expense } from '@/schemas/expense';
import { requireStorageAdapter, requireUid } from '../require-adapter';
import { removeReceipts } from '../storage';

/**
 * `expenses` repo (plan B5a). See `groups.ts` for the shared conventions
 * (literal collection names, StorageAdapter-only, Zod-validated).
 */

/** ADR 0002 canonical query: a user's expenses. */
export function forUserFilters(uid: string): QueryFilter[] {
  return [{ field: 'memberIds', operator: 'array-contains', value: uid }];
}

/** A group's expenses (`group_id = id`, real column). */
export function forGroupFilters(groupId: string): QueryFilter[] {
  return [{ field: 'groupId', operator: '==', value: groupId }];
}

/** An event's expenses (`eventId` has no column; the adapter resolves it to `extra->>'eventId'`). */
export function forEventFilters(eventId: string): QueryFilter[] {
  return [{ field: 'eventId', operator: '==', value: eventId }];
}

export async function get(id: string): Promise<Expense | null> {
  const doc = await requireStorageAdapter().getDocument('expenses', id);
  return doc ? ExpenseSchema.parse(doc) : null;
}

export async function listForUser(uid: string): Promise<Expense[]> {
  const { data } = await requireStorageAdapter().query('expenses', forUserFilters(uid));
  return data.map((doc) => ExpenseSchema.parse(doc));
}

export async function listForGroup(groupId: string): Promise<Expense[]> {
  const { data } = await requireStorageAdapter().query('expenses', forGroupFilters(groupId));
  return data.map((doc) => ExpenseSchema.parse(doc));
}

export async function listForEvent(eventId: string): Promise<Expense[]> {
  const { data } = await requireStorageAdapter().query('expenses', forEventFilters(eventId));
  return data.map((doc) => ExpenseSchema.parse(doc));
}

/**
 * Writers always set `memberIds` (group context -> the group's memberIds;
 * otherwise the split participants union payer, every one an accepted
 * friend or a co-member — the RLS membership mirror rejects anything else)
 * and `createdBy = uid` (plan B5a). Callers (B10) are responsible for that
 * invariant; this repo validates shape, not membership.
 */
export async function create(input: CreateExpenseInput): Promise<Expense> {
  const adapter = requireStorageAdapter();
  const parsed = CreateExpenseInputSchema.parse(input);
  const id = adapter.generateId('expenses');
  await adapter.setDocument('expenses', id, {
    ...parsed,
    createdAt: adapter.serverTimestamp(),
    updatedAt: adapter.serverTimestamp(),
  });
  const created = await get(id);
  if (!created) throw new Error(`repos.expenses.create: row ${id} not found after insert`);
  return created;
}

/**
 * A partial patch. D9 invariant, contract-tested in
 * `storage-adapter-contract.shared.ts`: a patch with an overflow key (e.g.
 * `settledAt`) merges into `extra` without erasing another overflow key
 * already on the row (e.g. `eventId`) — never a full-row replace.
 */
export async function update(id: string, patch: Partial<Expense>): Promise<Expense | null> {
  await requireStorageAdapter().updateDocument('expenses', id, patch);
  return get(id);
}

/** Thrown by `remove()` when `id` does not resolve to a row (already deleted, or never existed). */
export class ExpenseNotFoundError extends Error {
  constructor(id: string) {
    super(`repos.expenses.remove: expense "${id}" was not found`);
    this.name = 'ExpenseNotFoundError';
  }
}

/**
 * Thrown by `remove()`'s preflight (plan B9, ADR 0005 amendment "delete
 * ordering preflight") when the caller is neither the row's creator nor its
 * payer. This is a client-side safety check against a destructive PARTIAL
 * operation — see `remove()`'s own doc comment — never authorization: the
 * `expenses_delete` RLS policy denies the row delete on its own regardless
 * of whether this check exists (CLAUDE.md rule 8).
 */
export class ExpenseDeleteNotAllowedError extends Error {
  constructor(id: string) {
    super(`repos.expenses.remove: only the creator or payer may delete expense "${id}"`);
    this.name = 'ExpenseDeleteNotAllowedError';
  }
}

/**
 * Deletes every receipt object under `expenses/{id}/` BEFORE the row (spec
 * D10, plan B5b): once the row is gone, no `storage.objects` policy can
 * reach them, so a storage failure here must stop the row delete rather
 * than orphan the objects unreachable.
 *
 * Preflight (plan B9, risk:high, ADR 0005 amendment): the storage
 * `receipts_expenses_delete` policy is member-wide by design (B10 relies on
 * it so any member can edit/replace receipt images) — deliberately WIDER
 * than the row's own `expenses_delete` policy, which allows only the
 * creator or payer. Without this check, a member who is neither could call
 * `removeReceipts(id)` successfully (member-wide), then have the row
 * delete silently denied by RLS (0 rows affected) — every receipt gone,
 * the row still there, unrecoverable. Fetching the fresh row and refusing
 * BEFORE touching storage closes that window client-side; it changes
 * nothing about what RLS itself allows or denies.
 */
export async function remove(id: string): Promise<void> {
  const uid = requireUid();
  const expense = await get(id);
  if (!expense) throw new ExpenseNotFoundError(id);
  if ((expense.createdBy ?? '') !== uid && expense.paidBy !== uid) {
    throw new ExpenseDeleteNotAllowedError(id);
  }
  await removeReceipts(id);
  await requireStorageAdapter().deleteDocument('expenses', id);
}
