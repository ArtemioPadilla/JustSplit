import { getExchangeRate } from '@/domain/currency';
import { $rateCache, setRateCacheEntry } from '@/stores/preferences';

/**
 * Forces `getExchangeRate`'s own catch-block fallback path for a follower
 * (below) without a second network round trip: `getExchangeRate` always
 * checks the cache FIRST, so this is only ever reached when the leader's
 * attempt didn't leave a valid, `to`-covering entry behind (it failed, or
 * it succeeded but the response didn't include this follower's currency)
 * — in either case, a second real fetch a moment after the first is
 * pointless, and the exact same fallback computation applies regardless of
 * which of those two reasons caused it.
 */
const FOLLOWER_FETCH = (async () => {
  throw new Error('fetchExchangeRate: a concurrent request for this base is already in flight');
}) as unknown as typeof fetch;

/**
 * One in-flight leader promise per base currency (`from`). Concurrent
 * `fetchExchangeRate` calls for the same base share it instead of each
 * independently deciding to fetch (ADR 0007's "at most once per base
 * currency per 6 hours per browser" claim — see the file doc comment
 * below). Cleared once the leader settles, so a LATER, non-overlapping
 * call retries the network normally.
 */
const inFlightRefresh = new Map<string, Promise<void>>();

/**
 * The single call site every B16 widget — and every later Phase 2 island
 * that shows a converted amount — uses instead of `domain/currency.ts`'s
 * `getExchangeRate` directly.
 *
 * `getExchangeRate` is pure: it only *mutates the Map it is handed*, never
 * touches `$rateCache` itself (plan B3 kept it framework-free). Mutating
 * `$rateCache`'s own Map in place would neither notify subscribers nor
 * persist (persistentAtom only writes to storage on `.set()` — see
 * `src/stores/preferences.ts`'s `setRateCacheEntry` doc comment), so this
 * helper hands `getExchangeRate` a COPY of the current cache, then diffs
 * the copy against the pre-call snapshot to detect whether a fresh entry
 * was written (a cache hit leaves the copy untouched) and, if so, persists
 * it through `setRateCacheEntry`.
 *
 * Concurrent calls for the SAME base (`from`) — e.g. `CurrencyExchangeTicker`
 * fanning out one call per other supported currency — coalesce into a
 * single network attempt: the first caller ("the leader") registers itself
 * in `inFlightRefresh`; every other caller that arrives before it settles
 * ("a follower") awaits it, then resolves its own `to` from whatever the
 * leader's attempt left in `$rateCache` (a fresh, full rates table on
 * success) without ever calling `fetch` itself — see `FOLLOWER_FETCH`.
 */
export async function fetchExchangeRate(
  from: string,
  to: string,
): Promise<{ rate: number; isFallback: boolean }> {
  const isFollower = inFlightRefresh.has(from);
  if (isFollower) {
    // Wait for the leader's attempt to settle (success or failure) and, on
    // success, land in $rateCache — before reading it just below.
    await inFlightRefresh.get(from);
  }

  const cache = new Map($rateCache.get());
  const before = cache.get(from);

  const resolve = async (): Promise<{ rate: number; isFallback: boolean }> => {
    const result = await getExchangeRate(from, to, {
      cache,
      ...(isFollower ? { fetchImpl: FOLLOWER_FETCH } : {}),
    });

    const after = cache.get(from);
    if (after && after !== before) {
      setRateCacheEntry(from, after);
    }

    return result;
  };

  if (isFollower) {
    return resolve();
  }

  const leaderSettled = resolve();
  // Tracked as a same-shape void promise: followers only need to know WHEN
  // this settles, never its value (each resolves its own `to` independently
  // above) — and `getExchangeRate` never actually rejects, but this stays
  // correct if that ever changes, since an unhandled rejection here would
  // otherwise surface as a console warning unrelated to any caller's own
  // awaited promise.
  inFlightRefresh.set(
    from,
    leaderSettled.then(
      () => undefined,
      () => undefined,
    ),
  );
  try {
    return await leaderSettled;
  } finally {
    inFlightRefresh.delete(from);
  }
}
