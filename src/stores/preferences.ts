import { computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { DEFAULT_CURRENCY, createRateCache, type RateCache, type RateCacheEntry } from '@/domain/currency';
import { $profile } from './session';

/**
 * Cross-island preferences (plan B5b). Nano Stores, never React Context
 * (CLAUDE.md warning 2) — `@nanostores/persistent` guards SSR itself (it
 * falls back to a plain in-memory object when `typeof localStorage ===
 * 'undefined'`, which is the case on the server), so nothing here reads
 * `localStorage` directly.
 */

const PREFERRED_CURRENCY_KEY = 'justsplit:preferredCurrency';
const RATE_CACHE_KEY = 'justsplit:rates';

/**
 * Mirrors the last-known preferred currency for the very first paint —
 * every route island is a fresh React root (spec D2), so a cold navigation
 * has no `$profile` yet. `profiles.preferences.preferredCurrency` is the
 * SOURCE OF TRUTH once `$profile` loads (below); this atom is only ever a
 * cache of it, written by the `$profile.listen` mirror, never the other way
 * around.
 */
const $persistedCurrency = persistentAtom<string>(PREFERRED_CURRENCY_KEY, DEFAULT_CURRENCY);

/**
 * The preferred currency: `$profile.preferences.preferredCurrency` when a
 * profile has loaded, otherwise the persisted mirror (first paint / signed
 * out).
 */
export const $preferredCurrency = computed([$profile, $persistedCurrency], (profile, persisted) => {
  return profile?.preferences?.preferredCurrency ?? persisted;
});

// Keep the first-paint mirror in sync whenever the profile — the source of
// truth — provides a value, so the NEXT cold navigation's first paint has it
// before `$profile` re-hydrates.
$profile.listen((profile) => {
  const currency = profile?.preferences?.preferredCurrency;
  if (currency) $persistedCurrency.set(currency);
});

/**
 * 6-hour exchange-rate cache (`src/domain/currency.ts`'s injectable
 * `RateCache`), persisted under `justsplit:rates`. The 6 h TTL itself is
 * enforced by `currency.ts`'s `isCacheValid` at read time (a stale entry
 * loaded from a previous session is simply treated as a miss) — this store
 * only owns persistence across page loads, not expiry.
 */
export const $rateCache = persistentAtom<RateCache>(RATE_CACHE_KEY, createRateCache(), {
  encode: (cache) => JSON.stringify(Array.from(cache.entries())),
  // Guards a falsy `raw` (bug found writing B8b's `clearRateCache` test):
  // a real browser's `storage` event reports a deleted key as `newValue:
  // null`, which `persistentAtom`'s own listener special-cases to the
  // store's `initial` value WITHOUT calling `decode` at all — but
  // `@nanostores/persistent`'s test engine (`cleanTestStorage`) reports a
  // deleted key as `newValue: undefined` instead, which does NOT match that
  // `=== null` check and falls through to `decode(undefined)`. `JSON.parse`
  // coerces its argument to the string `"undefined"`, which is invalid JSON.
  decode: (raw) => (raw ? new Map(JSON.parse(raw) as [string, RateCacheEntry][]) : createRateCache()),
});

/**
 * Writes one entry and persists the whole cache. `persistentAtom` only
 * writes to storage on `.set()` — mutating the `Map` returned by
 * `$rateCache.get()` (e.g. via `currency.ts`'s `getExchangeRate({ cache })`)
 * updates the in-memory atom (same object reference) but never reaches
 * storage, so callers that want persistence go through this instead.
 */
export function setRateCacheEntry(key: string, entry: RateCacheEntry): void {
  const next = new Map($rateCache.get());
  next.set(key, entry);
  $rateCache.set(next);
}

/**
 * Empties the persisted rate cache (plan B8b: the dashboard's "Refresh
 * rates" button). `fetchExchangeRate` (`src/lib/currency/rates.ts`) always
 * checks the cache first, so a caller that wants a genuinely fresh rate
 * clears it here before re-invoking whatever triggers the next fetch (e.g.
 * `useDisplayConversion`'s `refresh()`).
 */
export function clearRateCache(): void {
  $rateCache.set(createRateCache());
}
