import * as React from 'react';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { QueryFilter } from '@cyber-eco/types';
import { createDisposer } from '@/lib/disposer';
import type { LiveQueryCallback } from '../relational-adapter';
import { requireStorageAdapter } from '../require-adapter';

export interface UseLiveQueryOptions {
  /** Skips the subscription entirely (no signed-in user yet, etc). Default `true`. */
  enabled?: boolean;
  /** Opts the key into the idb persister (plan B5a: `meta: { persist: true }`, `shouldPersistQuery`). */
  persist?: boolean;
}

export type UseLiveQueryResult<T> = Omit<ReturnType<typeof useQuery<T[]>>, 'isError' | 'error' | 'refetch'> & {
  /** True when the adapter's subscription reported a failure (coordinator review, plan B8b). */
  isError: boolean;
  /** The forwarded failure, or `null`. Never shown to the user verbatim — callers show a generic message. */
  error: Error | null;
  /** Clears the error and forces a full teardown + re-subscribe (the underlying `useQuery`'s own `refetch` is a no-op here — see below). */
  refetch: () => void;
};

/**
 * The single network source for a "live" collection query (plan B5a, spec
 * D3). Subscribes `adapter.subscribeToQuery` inside a `useEffect` through
 * `createDisposer` (Inceptor island-lifecycle discipline); every emission is
 * written straight into the Query cache via `queryClient.setQueryData`. The
 * paired `useQuery` runs with `enabled: false` — `subscribeToQuery`'s
 * FETCH-THEN-LISTEN first emission IS the initial fetch, so its own
 * `queryFn` must never run (`queryFn` here is a safety fallback that reads
 * whatever is already cached and never actually gets invoked, since
 * `enabled: false` means TanStack Query never calls it).
 *
 * Because that `queryFn` never runs, the underlying `useQuery`'s own
 * `isError`/`error`/`refetch` are permanently inert — `refetch()` on it
 * would just re-resolve the cache, not retry anything. This hook overrides
 * all three: `isError`/`error` track the adapter's forwarded subscription
 * failure (coordinator review, plan B8b — a failed query used to be
 * silently indistinguishable from a genuinely empty result), and `refetch()`
 * bumps an internal generation counter that tears down and re-opens the
 * subscription from scratch.
 *
 * Non-live keys (detail pages) use `repos.*` through a normal `useQuery`
 * instead of this hook.
 */
export function useLiveQuery<T>(
  queryKey: QueryKey,
  collection: string,
  filters: QueryFilter[],
  options: UseLiveQueryOptions = {},
): UseLiveQueryResult<T> {
  const { enabled = true, persist = false } = options;
  const queryClient = useQueryClient();
  const queryKeyJson = JSON.stringify(queryKey);
  const filtersJson = JSON.stringify(filters);
  const [queryError, setQueryError] = React.useState<Error | null>(null);
  const [generation, setGeneration] = React.useState(0);

  const query = useQuery<T[]>({
    queryKey,
    queryFn: () => Promise.resolve(queryClient.getQueryData<T[]>(queryKey) ?? []),
    enabled: false,
    meta: persist ? { persist: true } : undefined,
  });

  React.useEffect(() => {
    if (!enabled) return undefined;
    const disposer = createDisposer();
    const adapter = requireStorageAdapter();
    // `error` is `LiveQueryCallback`'s app-owned extension of the
    // StorageAdapter callback shape (relational-adapter.ts's doc comment) —
    // real adapters only ever pass it on a genuine query failure.
    const callback: LiveQueryCallback<T> = (rows, error) => {
      if (error) {
        setQueryError(error instanceof Error ? error : new Error('Failed to load data.'));
        return;
      }
      setQueryError(null);
      queryClient.setQueryData(queryKey, rows);
    };
    const unsubscribe = adapter.subscribeToQuery<T>(collection, JSON.parse(filtersJson) as QueryFilter[], callback);
    disposer.add(unsubscribe);
    return disposer.dispose;
    // `queryKey`/`filters` are plain values rebuilt every render by the
    // caller; their JSON strings are the real identity for this effect (a
    // `$user` transition changes the uid inside both, which is exactly what
    // must tear down the old subscription and open a new one). `generation`
    // is bumped by `refetch()` to force the same teardown-and-reopen cycle
    // on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, collection, queryKeyJson, filtersJson, queryClient, generation]);

  const refetch = React.useCallback(() => {
    setQueryError(null);
    setGeneration((g) => g + 1);
  }, []);

  return { ...query, isError: queryError !== null, error: queryError, refetch };
}
