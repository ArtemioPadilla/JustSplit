import type { QueryFilter } from '@cyber-eco/types';
import { CreateFriendshipInputSchema, FriendshipSchema, type CreateFriendshipInput, type Friendship } from '@/schemas/friendship';
import { requireStorageAdapter } from '../require-adapter';

/** `friendships` repo (plan B5a). */

/** ADR 0002 canonical query: `users array-contains uid`. */
export function forUserFilters(uid: string): QueryFilter[] {
  return [{ field: 'users', operator: 'array-contains', value: uid }];
}

export async function get(id: string): Promise<Friendship | null> {
  const doc = await requireStorageAdapter().getDocument('friendships', id);
  return doc ? FriendshipSchema.parse(doc) : null;
}

export async function listForUser(uid: string): Promise<Friendship[]> {
  const { data } = await requireStorageAdapter().query('friendships', forUserFilters(uid));
  return data.map((doc) => FriendshipSchema.parse(doc));
}

export async function create(input: CreateFriendshipInput): Promise<Friendship> {
  const adapter = requireStorageAdapter();
  const parsed = CreateFriendshipInputSchema.parse(input);
  const id = adapter.generateId('friendships');
  await adapter.setDocument('friendships', id, {
    ...parsed,
    createdAt: adapter.serverTimestamp(),
    updatedAt: adapter.serverTimestamp(),
  });
  const created = await get(id);
  if (!created) throw new Error(`repos.friendships.create: row ${id} not found after insert`);
  return created;
}

/** The only legitimate patch in practice is `{ status }` — the recipient accepting/rejecting a request (D10 guard trigger enforces recipient-only). */
export async function update(id: string, patch: Partial<Friendship>): Promise<Friendship | null> {
  await requireStorageAdapter().updateDocument('friendships', id, patch);
  return get(id);
}

export async function remove(id: string): Promise<void> {
  await requireStorageAdapter().deleteDocument('friendships', id);
}
