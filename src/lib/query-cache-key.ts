import { del } from 'idb-keyval';

/**
 * The one shared idb-keyval key every JustSplit route island passes to
 * `QueryProvider` (plan B5a, spec D3: "exactly one `QueryProvider` per page
 * ... with the single shared idbKey='justsplit:query'"), so a warm
 * navigation to any route reuses collections fetched on another.
 *
 * Lives in its own tiny module (plan B19) so `signOut()` can wipe the
 * persisted cache without loading the Query client chunk (TanStack core +
 * persister, ~40 kB), which is lazy on /auth/* and could fail to load after
 * the session is already gone. `@/lib/queryClient` re-exports both names.
 */
export const JUSTSPLIT_QUERY_IDB_KEY = 'justsplit:query';

/**
 * Clears the persisted Query cache from IndexedDB (ADR 0004 / ADR 0008: a
 * signed-out user's cached groups/expenses/settlements must not linger for
 * the next person to use this device). Called from `src/stores/auth.ts`'s
 * `signOut()` — the in-memory `QueryClient` itself needs no explicit
 * clearing, since the app is an MPA and sign-out navigates to a fresh page.
 */
export async function clearPersistedQueryCache(idbKey: string = JUSTSPLIT_QUERY_IDB_KEY): Promise<void> {
  await del(idbKey);
}
