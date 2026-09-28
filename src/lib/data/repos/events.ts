import type { QueryFilter } from '@cyber-eco/types';
import { CreateEventInputSchema, EventSchema, type CreateEventInput, type Event } from '@/schemas/event';
import { requireStorageAdapter } from '../require-adapter';

/** `events` repo (plan B5a). JustSplit-local collection, not a universal `@cyber-eco/types` type (see `src/schemas/event.ts`). */

export function forUserFilters(uid: string): QueryFilter[] {
  return [{ field: 'memberIds', operator: 'array-contains', value: uid }];
}

export function forGroupFilters(groupId: string): QueryFilter[] {
  return [{ field: 'groupId', operator: '==', value: groupId }];
}

export async function get(id: string): Promise<Event | null> {
  const doc = await requireStorageAdapter().getDocument('events', id);
  return doc ? EventSchema.parse(doc) : null;
}

export async function listForUser(uid: string): Promise<Event[]> {
  const { data } = await requireStorageAdapter().query('events', forUserFilters(uid));
  return data.map((doc) => EventSchema.parse(doc));
}

export async function listForGroup(groupId: string): Promise<Event[]> {
  const { data } = await requireStorageAdapter().query('events', forGroupFilters(groupId));
  return data.map((doc) => EventSchema.parse(doc));
}

export async function create(input: CreateEventInput): Promise<Event> {
  const adapter = requireStorageAdapter();
  const parsed = CreateEventInputSchema.parse(input);
  const id = adapter.generateId('events');
  await adapter.setDocument('events', id, {
    ...parsed,
    createdAt: adapter.serverTimestamp(),
    updatedAt: adapter.serverTimestamp(),
  });
  const created = await get(id);
  if (!created) throw new Error(`repos.events.create: row ${id} not found after insert`);
  return created;
}

export async function update(id: string, patch: Partial<Event>): Promise<Event | null> {
  await requireStorageAdapter().updateDocument('events', id, patch);
  return get(id);
}

export async function remove(id: string): Promise<void> {
  await requireStorageAdapter().deleteDocument('events', id);
}
