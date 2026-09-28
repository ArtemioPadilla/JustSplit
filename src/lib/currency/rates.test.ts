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

/**
 * Coalescing (found in B16 review): `CurrencyExchangeTicker` (and every
 * later Phase 2 list island converting many amounts) issues N concurrent
 * `fetchExchangeRate(base, x)` calls for the SAME base against an
 * empty/expired cache. Each call used to copy `$rateCache` and decide to
 * fetch independently — N calls meant N identical `GET .../latest/<base>`
 * requests. ADR 0007 claims "at most once per base currency per 6 hours per
 * browser"; that was only true for sequential calls, never for a fan-out.
 */
describe('fetchExchangeRate (coalescing concurrent calls for the same base)', () => {
  it('shares one fetch across 5 concurrent calls for different currencies against the same base', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      await Promise.resolve(); // a real async gap, like a network round trip
      return jsonResponse({
        result: 'success',
        rates: { EUR: 0.9, GBP: 0.8, JPY: 150, CAD: 1.3, AUD: 1.5 },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const [eur, gbp, jpy, cad, aud] = await Promise.all([
      fetchExchangeRate('USD', 'EUR'),
      fetchExchangeRate('USD', 'GBP'),
      fetchExchangeRate('USD', 'JPY'),
      fetchExchangeRate('USD', 'CAD'),
      fetchExchangeRate('USD', 'AUD'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(eur).toEqual({ rate: 0.9, isFallback: false });
    expect(gbp).toEqual({ rate: 0.8, isFallback: false });
    expect(jpy).toEqual({ rate: 150, isFallback: false });
    expect(cad).toEqual({ rate: 1.3, isFallback: false });
    expect(aud).toEqual({ rate: 1.5, isFallback: false });
  });

  it('resolves every concurrent caller through its own fallback when the shared fetch fails, and a later call retries the network', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    const [eur, gbp, jpy, cad, aud] = await Promise.all([
      fetchExchangeRate('USD', 'EUR'),
      fetchExchangeRate('USD', 'GBP'),
      fetchExchangeRate('USD', 'JPY'),
      fetchExchangeRate('USD', 'CAD'),
      fetchExchangeRate('USD', 'AUD'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(eur).toEqual({ rate: 0.93, isFallback: true });
    expect(gbp).toEqual({ rate: 0.79, isFallback: true });
    expect(jpy).toEqual({ rate: 149.5, isFallback: true });
    expect(cad).toEqual({ rate: 1.37, isFallback: true });
    expect(aud).toEqual({ rate: 1.52, isFallback: true });

    // The failed batch fully settled (and cleared its in-flight bookkeeping)
    // before this next, non-overlapping call — it must retry the network,
    // not be silently coalesced into the earlier failure forever.
    const retry = await fetchExchangeRate('USD', 'EUR');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(retry).toEqual({ rate: 0.93, isFallback: true });
  });
});
