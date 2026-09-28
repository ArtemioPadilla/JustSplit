import type { QueryFilter } from '@cyber-eco/types';
import { CreateExpenseInputSchema, ExpenseSchema, type CreateExpenseInput, type Expense } from '@/schemas/expense';
import { requireStorageAdapter } from '../require-adapter';
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

/**
 * Deletes every receipt object under `expenses/{id}/` BEFORE the row (spec
 * D10, plan B5b): once the row is gone, no `storage.objects` policy can
 * reach them, so a storage failure here must stop the row delete rather
 * than orphan the objects unreachable.
 */
export async function remove(id: string): Promise<void> {
  await removeReceipts(id);
  await requireStorageAdapter().deleteDocument('expenses', id);
}
