import { getExchangeRate } from '@/domain/currency';
import { $rateCache, setRateCacheEntry } from '@/stores/preferences';

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
 */
export async function fetchExchangeRate(
  from: string,
  to: string,
): Promise<{ rate: number; isFallback: boolean }> {
  const cache = new Map($rateCache.get());
  const before = cache.get(from);

  const result = await getExchangeRate(from, to, { cache });

  const after = cache.get(from);
  if (after && after !== before) {
    setRateCacheEntry(from, after);
  }

  return result;
}
