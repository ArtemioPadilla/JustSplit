import { QueryClient } from '@tanstack/react-query';
import {
  persistQueryClient,
  type Persister,
} from '@tanstack/query-persist-client-core';
import { get, set, del } from 'idb-keyval';

const IDB_PERSIST_KEY = 'tanstack-query-cache';

/**
 * The one shared idb-keyval key every JustSplit route island passes to
 * `QueryProvider` (plan B5a, spec D3: "exactly one `QueryProvider` per page
 * ... with the single shared idbKey='justsplit:query'"), so a warm
 * navigation to any route reuses collections fetched on another.
 */
export const JUSTSPLIT_QUERY_IDB_KEY = 'justsplit:query';

/**
 * idb-keyval-backed Persister. Stores the whole TanStack Query cache as one
 * JSON-serializable object under a single key in IndexedDB.
 */
export function createIdbPersister(idbKey: string = IDB_PERSIST_KEY): Persister {
  return {
    persistClient: async (client) => {
      await set(idbKey, client);
    },
    restoreClient: async () => {
      return (await get(idbKey)) ?? undefined;
    },
    removeClient: async () => {
      await del(idbKey);
    },
  };
}

/**
 * Creates a QueryClient + (optionally) wires it up to persistence.
 *
 * Persistence is OPT-IN at the query level: a query opts in by setting
 *   useQuery({ queryKey, queryFn, meta: { persist: true } })
 * The dehydrate filter below excludes queries without that meta flag, so
 * the persister never touches transient queries (avatars, search-as-you-type,
 * one-off pings) that would just bloat the cache.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Sensible offline-first defaults — long staleTime so cached data is
        // shown immediately on revisit; tweak per query if needed.
        staleTime: 5 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

/**
 * Predicate for which queries get written to IndexedDB.
 *
 * Two conditions, both required:
 *  - the query opted in via `meta.persist === true`
 *  - the query has settled successfully — TanStack v5's `dehydrate()`
 *    includes *pending* queries by default, and a dehydrated pending query
 *    carries its in-flight `promise`, which IndexedDB's structured clone
 *    rejects (`DataCloneError: #<Promise> could not be cloned`).
 */
export function shouldPersistQuery(query: {
  state: { status: string };
  meta?: Record<string, unknown> | null;
}): boolean {
  return (
    query.state.status === 'success' &&
    Boolean(query.meta && (query.meta as { persist?: boolean }).persist)
  );
}

/**
 * Attach the idb-keyval persister to a QueryClient. Returns a cleanup function
 * that detaches and removes the persisted cache.
 *
 * Only successfully-settled queries with `meta.persist === true` are written
 * to disk (see `shouldPersistQuery`).
 */
/**
 * Clears the persisted Query cache from IndexedDB (ADR 0004: a signed-out
 * user's cached groups/expenses/settlements must not linger for the next
 * person to use this device). Called from `src/stores/auth.ts`'s `signOut()`
 * — the in-memory `QueryClient` itself needs no explicit clearing, since
 * Inceptor is an MPA and sign-out navigates to a fresh page anyway.
 */
export async function clearPersistedQueryCache(idbKey: string = JUSTSPLIT_QUERY_IDB_KEY): Promise<void> {
  await del(idbKey);
}

export function attachPersister(
  client: QueryClient,
  options?: { idbKey?: string },
): () => void {
  const persister = createIdbPersister(options?.idbKey);
  const [unsubscribe] = persistQueryClient({
    queryClient: client,
    persister,
    maxAge: 24 * 60 * 60 * 1000, // 24h
    dehydrateOptions: {
      shouldDehydrateQuery: shouldPersistQuery,
    },
  });
  return unsubscribe;
}
