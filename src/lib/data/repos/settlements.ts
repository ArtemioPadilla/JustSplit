import type { QueryFilter } from '@cyber-eco/types';
import { CreateSettlementInputSchema, SettlementSchema, type CreateSettlementInput, type Settlement } from '@/schemas/settlement';
import { requireStorageAdapter } from '../require-adapter';

/**
 * `settlements` repo (plan B5a). No `update` export on purpose: spec D10's
 * RLS has no update policy on `settlements` ("none (immutable; correct by
 * delete + insert)") — a settlement is corrected by deleting and re-creating
 * it, never patched.
 */

export function forUserFilters(uid: string): QueryFilter[] {
  return [{ field: 'memberIds', operator: 'array-contains', value: uid }];
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

export async function listForUser(uid: string): Promise<Settlement[]> {
  const { data } = await requireStorageAdapter().query('settlements', forUserFilters(uid));
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
