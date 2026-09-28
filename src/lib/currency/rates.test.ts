// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanTestStorage, useTestStorageEngine as enableTestPersistentStorage } from '@nanostores/persistent';

/**
 * Plan B16: `fetchExchangeRate` is the single call site every widget in this
 * issue (and every later Phase 2 island) uses instead of reaching for
 * `domain/currency.ts#getExchangeRate` directly. Its whole job is bridging
 * the PURE `getExchangeRate` (which only mutates whatever `cache` Map it is
 * handed) to the persisted `$rateCache` Nano Store (`src/stores/preferences.ts`)
 * — a fresh rate must reach `setRateCacheEntry` (the only thing that survives
 * a reload / notifies subscribers), and a still-valid cached rate must not
 * trigger a network call at all.
 */
enableTestPersistentStorage();

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, statusText: 'error', json: async () => body } as unknown as Response;
}

beforeEach(() => {
  cleanTestStorage();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchExchangeRate', () => {
  it('persists a fresh fetch through setRateCacheEntry', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ result: 'success', rates: { EUR: 0.9 } }));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchExchangeRate } = await import('./rates');
    const { $rateCache } = await import('@/stores/preferences');

    const result = await fetchExchangeRate('USD', 'EUR');

    expect(result).toEqual({ rate: 0.9, isFallback: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const entry = $rateCache.get().get('USD');
    expect(entry?.rates.EUR).toBe(0.9);
  });

  it('does not call fetch when a valid cached entry already covers the pair', async () => {
    const { setRateCacheEntry } = await import('@/stores/preferences');
    setRateCacheEntry('USD', { rates: { EUR: 0.85 }, timestamp: Date.now() });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { fetchExchangeRate } = await import('./rates');
    const result = await fetchExchangeRate('USD', 'EUR');

    expect(result).toEqual({ rate: 0.85, isFallback: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
