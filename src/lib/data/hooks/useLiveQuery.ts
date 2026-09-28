import * as React from 'react';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { QueryFilter } from '@cyber-eco/types';
import { createDisposer } from '@/lib/disposer';
import { requireStorageAdapter } from '../require-adapter';

export interface UseLiveQueryOptions {
  /** Skips the subscription entirely (no signed-in user yet, etc). Default `true`. */
  enabled?: boolean;
  /** Opts the key into the idb persister (plan B5a: `meta: { persist: true }`, `shouldPersistQuery`). */
  persist?: boolean;
}

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
 * Non-live keys (detail pages) use `repos.*` through a normal `useQuery`
 * instead of this hook.
 */
export function useLiveQuery<T>(queryKey: QueryKey, collection: string, filters: QueryFilter[], options: UseLiveQueryOptions = {}) {
  const { enabled = true, persist = false } = options;
  const queryClient = useQueryClient();
  const queryKeyJson = JSON.stringify(queryKey);
  const filtersJson = JSON.stringify(filters);

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
    const unsubscribe = adapter.subscribeToQuery<T>(collection, JSON.parse(filtersJson) as QueryFilter[], (rows) => {
      queryClient.setQueryData(queryKey, rows);
    });
    disposer.add(unsubscribe);
    return disposer.dispose;
    // `queryKey`/`filters` are plain values rebuilt every render by the
    // caller; their JSON strings are the real identity for this effect (a
    // `$user` transition changes the uid inside both, which is exactly what
    // must tear down the old subscription and open a new one).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, collection, queryKeyJson, filtersJson, queryClient]);

  return query;
}
