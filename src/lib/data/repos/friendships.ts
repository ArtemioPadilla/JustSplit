import type { QueryFilter } from '@cyber-eco/types';
import { CreateFriendshipInputSchema, FriendshipSchema, type CreateFriendshipInput, type Friendship } from '@/schemas/friendship';
import { assertOnline, requireStorageAdapter } from '../require-adapter';

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
  assertOnline();
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
  assertOnline();
  await requireStorageAdapter().updateDocument('friendships', id, patch);
  return get(id);
}

/** Cancel (the requester deletes a pending row) and Remove (either party deletes an accepted row) are the same primitive (plan B13) — `friendships_delete`'s RLS policy is "either party", with no status distinction. */
export async function remove(id: string): Promise<void> {
  assertOnline();
  await requireStorageAdapter().deleteDocument('friendships', id);
}

/**
 * Thrown by `request()` when a friendship row (any status) already exists
 * for the pair — the DB's `friendships_pair_uniq` unique index has no
 * partial predicate (plan B13, ADR 0006), so this covers a duplicate
 * pending request, an existing acceptance, AND a past rejection alike; the
 * message is deliberately generic about which of those it is (never reveal
 * a rejection to the person who'd re-request).
 */
export class FriendshipAlreadyExistsError extends Error {
  constructor() {
    super('repos.friendships.request: a friendship or request already exists between these two users');
    this.name = 'FriendshipAlreadyExistsError';
  }
}

/** True if any row (any status, either direction) already exists between the two users. Mirrors `friendships_pair_uniq` exactly: `forUserFilters` already returns every row `a` is on; this just checks whether `b` is the other party of any of them. */
export async function existsForPair(a: string, b: string): Promise<boolean> {
  const rows = await listForUser(a);
  return rows.some((f) => f.users.includes(b));
}

/**
 * The `/friends` add-by-email flow's insert step (plan B13). Pre-checks
 * `existsForPair` and throws the typed error BEFORE writing, rather than
 * relying on catching the DB's own unique-violation (Postgres `23505`):
 * `RelationalSupabaseAdapter.setDocument` (`relational-adapter.ts`) wraps
 * every write failure into a plain `Error(message)` string and discards the
 * original error's `.code`, so there is nothing to catch by code from this
 * repo layer today. This pre-check is deterministic and is what's actually
 * exercised against the in-memory adapter (`repos.test.ts`); the DB's own
 * unique index stays the authoritative defense against a genuine race
 * between two near-simultaneous requests for the same pair — an extremely
 * narrow window that, if hit, surfaces as the generic insert-failure toast
 * instead of this specific message. Recorded as a known, accepted gap in
 * ADR 0006, not silently claimed to be fully closed.
 */
export async function request(fromUid: string, toUid: string): Promise<Friendship> {
  assertOnline();
  if (await existsForPair(fromUid, toUid)) throw new FriendshipAlreadyExistsError();
  return create({ users: [fromUid, toUid], status: 'pending', requestedBy: fromUid });
}
