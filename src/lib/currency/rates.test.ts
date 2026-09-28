// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTestStorageEngine as enableTestPersistentStorage } from '@nanostores/persistent';
import { createRateCache } from '@/domain/currency';
import { $rateCache, setRateCacheEntry } from '@/stores/preferences';
import { fetchExchangeRate } from './rates';

/**
 * Plan B16: `fetchExchangeRate` is the single call site every widget in this
 * issue (and every later Phase 2 island) uses instead of reaching for
 * `domain/currency.ts#getExchangeRate` directly. Its whole job is bridging
 * the PURE `getExchangeRate` (which only mutates whatever `cache` Map it is
 * handed) to the persisted `$rateCache` Nano Store (`src/stores/preferences.ts`)
 * — a fresh rate must reach `setRateCacheEntry` (the only thing that survives
 * a reload / notifies subscribers), and a still-valid cached rate must not
 * trigger a network call at all.
 *
 * NOTE: this deliberately does NOT use `@nanostores/persistent`'s
 * `cleanTestStorage()` between tests. `$rateCache.get()` (called by
 * `fetchExchangeRate` itself) is a flash subscribe/unsubscribe
 * (`atom.get()` momentarily mounts the store when it has no listener yet —
 * `nanostores/atom`), and a mounted `persistentAtom`'s real unmount (which
 * detaches its storage-event listener) is deferred by nanostores'
 * `STORE_UNMOUNT_DELAY` (1000ms real wall-clock time, not fake-timer
 * driven). `cleanTestStorage()` synchronously replays a `newValue:
 * undefined` storage event to every still-attached listener — including one
 * from a previous test's not-yet-unmounted flash subscribe — which crashes
 * `$rateCache`'s custom `decode` (`JSON.parse(undefined)`). Resetting the
 * atom directly with `.set()` (a real, supported store API) sidesteps the
 * storage-event replay entirely.
 */
enableTestPersistentStorage();

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, statusText: 'error', json: async () => body } as unknown as Response;
}

beforeEach(() => {
  $rateCache.set(createRateCache());
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchExchangeRate', () => {
  it('persists a fresh fetch through setRateCacheEntry', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ result: 'success', rates: { EUR: 0.9 } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchExchangeRate('USD', 'EUR');

    expect(result).toEqual({ rate: 0.9, isFallback: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const entry = $rateCache.get().get('USD');
    expect(entry?.rates.EUR).toBe(0.9);
  });

  it('does not call fetch when a valid cached entry already covers the pair', async () => {
    setRateCacheEntry('USD', { rates: { EUR: 0.85 }, timestamp: Date.now() });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchExchangeRate('USD', 'EUR');

    expect(result).toEqual({ rate: 0.85, isFallback: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
