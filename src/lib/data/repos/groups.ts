import type { QueryFilter } from '@cyber-eco/types';
import { CreateExpenseGroupInputSchema, ExpenseGroupSchema, type CreateExpenseGroupInput, type ExpenseGroup } from '@/schemas/group';
import { requireStorageAdapter } from '../require-adapter';

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

export async function remove(id: string): Promise<void> {
  await requireStorageAdapter().deleteDocument('expense_groups', id);
}
