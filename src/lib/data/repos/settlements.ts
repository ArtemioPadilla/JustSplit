import type { QueryFilter } from '@cyber-eco/types';
import { CreateSettlementInputSchema, SettlementSchema, type CreateSettlementInput, type Settlement } from '@/schemas/settlement';
import { requireStorageAdapter } from '../require-adapter';

/**
 * `settlements` repo (plan B5a). No `update` export on purpose: spec D10's
 * RLS has no update policy on `settlements` ("none (immutable; correct by
 * delete + insert)") — a settlement is corrected by deleting and re-creating
 * it, never patched.
 */

/**
 * Every settlement the signed-in user may see: NO filter (plan B2d, ADR 0013).
 * A settlement is visible to its two parties, to members of its group and to
 * members of its event; only RLS knows that, so a `memberIds` filter would
 * hide the group and event rows the user is allowed to see.
 */
export function visibleFilters(): QueryFilter[] {
  return [];
}

export function forGroupFilters(groupId: string): QueryFilter[] {
  return [{ field: 'groupId', operator: '==', value: groupId }];
}

export function forEventFilters(eventId: string): QueryFilter[] {
  return [{ field: 'eventId', operator: '==', value: eventId }];
}

export async function get(id: string): Promise<Settlement | null> {
  const doc = await requireStorageAdapter().getDocument('settlements', id);
  return doc ? SettlementSchema.parse(doc) : null;
}

/** Every settlement the signed-in user can see (see `visibleFilters`). */
export async function listVisible(): Promise<Settlement[]> {
  const { data } = await requireStorageAdapter().query('settlements', visibleFilters());
  return data.map((doc) => SettlementSchema.parse(doc));
}

export async function listForGroup(groupId: string): Promise<Settlement[]> {
  const { data } = await requireStorageAdapter().query('settlements', forGroupFilters(groupId));
  return data.map((doc) => SettlementSchema.parse(doc));
}

export async function listForEvent(eventId: string): Promise<Settlement[]> {
  const { data } = await requireStorageAdapter().query('settlements', forEventFilters(eventId));
  return data.map((doc) => SettlementSchema.parse(doc));
}

export async function create(input: CreateSettlementInput): Promise<Settlement> {
  const adapter = requireStorageAdapter();
  const parsed = CreateSettlementInputSchema.parse(input);
  const id = adapter.generateId('settlements');
  await adapter.setDocument('settlements', id, {
    ...parsed,
    createdAt: adapter.serverTimestamp(),
    updatedAt: adapter.serverTimestamp(),
  });
  const created = await get(id);
  if (!created) throw new Error(`repos.settlements.create: row ${id} not found after insert`);
  return created;
}

export async function remove(id: string): Promise<void> {
  await requireStorageAdapter().deleteDocument('settlements', id);
}
