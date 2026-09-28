import type { PublicProfileRow } from '../client';
import { rpc } from '../client';

/** Re-exported so islands import every profile-lookup error from the repo, never from `client.ts`. */
export { LookupRateLimitedError } from '../client';

/**
 * `profiles` repo (plan B5a). `profiles` is NOT a `SchemaMap` collection
 * (spec D10): own-row access goes through `SupabaseProfileStore`
 * (`src/lib/data/adapter.ts`'s `profileStore`, used by `src/stores/auth.ts`);
 * cross-user lookup goes through these two B2 `SECURITY DEFINER` functions
 * via `client.ts`'s typed `rpc()` helper — never `adapter.<method>('profiles', ...)`
 * (`src/tests/collections-mapped.test.ts` asserts this file spells no
 * collection literal at all).
 */

/**
 * Friend search by exact, CONFIRMED email (`auth.users`, never the
 * user-writable `profiles.email` — spec D10). `null` for no match or an
 * invalid address. Rejects with `LookupRateLimitedError` past the per-caller
 * hourly limit (plan B2d, ADR 0013).
 */
export async function byEmail(email: string): Promise<PublicProfileRow | null> {
  const rows = await rpc('find_profile_by_email', { p_email: email });
  return rows[0] ?? null;
}

/** `find_profiles_by_ids` raises on more than this many ids in one call (migration `…012`). */
const MAX_IDS_PER_CALL = 200;

/**
 * Names/avatars for users who share a row with the caller (friendship,
 * group, event, expense or settlement), plus the caller (spec D10). Used by
 * B9/B11b/B13/B14 and CSV export to resolve other users' display data. Skips
 * the RPC round-trip for an empty list. The server refuses more than 200 ids
 * in one call, so a longer list (a busy account's events list) is split into
 * calls of at most 200, issued together, and the rows are merged in id order.
 */
export async function byIds(ids: string[]): Promise<PublicProfileRow[]> {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += MAX_IDS_PER_CALL) chunks.push(ids.slice(i, i + MAX_IDS_PER_CALL));
  const results = await Promise.all(chunks.map((chunk) => rpc('find_profiles_by_ids', { ids: chunk })));
  return results.flat();
}
