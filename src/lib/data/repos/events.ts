import type { QueryFilter } from '@cyber-eco/types';
import { CreateEventInputSchema, EventPatchSchema, EventSchema, type CreateEventInput, type Event, type EventPatch } from '@/schemas/event';
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

/**
 * Thrown by `update()` when the write matched no row: the event was deleted, or
 * RLS hides it from this user (this repo never distinguishes the two, same
 * leaked-id reasoning as ADR 0002). `adapter.updateDocument` reports that as
 * `success: false`, not as an exception.
 */
export class EventNotFoundError extends Error {
  constructor(id: string) {
    super(`repos.events: event "${id}" was not found`);
    this.name = 'EventNotFoundError';
  }
}

/**
 * A partial patch, validated by `EventPatchSchema` (strict: no `createdBy`, no
 * `groupId`/`kind`; `null` clears a column). Throws `EventNotFoundError` if the
 * write matched no visible row instead of returning the untouched row as if it
 * had worked. Membership rules for ADDED members are `guard_events`' job, not
 * this repo's.
 */
export async function update(id: string, patch: EventPatch): Promise<Event | null> {
  const parsed = EventPatchSchema.parse(patch);
  const result = await requireStorageAdapter().updateDocument('events', id, parsed);
  if (!result.success) throw new EventNotFoundError(id);
  return get(id);
}

export async function remove(id: string): Promise<void> {
  await requireStorageAdapter().deleteDocument('events', id);
}
