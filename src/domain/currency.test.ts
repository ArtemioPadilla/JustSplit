import { describe, expect, it, vi } from 'vitest';
import { convertCurrency, createRateCache, getExchangeRate, SUPPORTED_CURRENCIES } from './currency';

/**
 * Ported from the legacy Next tree's `src/utils/__tests__/currencyExchange.test.ts`
 * (plan B3). `domain/currency.ts` is pure (spec: fetch/cache injected as
 * parameters), so the port drops `jest.mock('../currencyExchange')` /
 * `global.fetch = jest.fn()` entirely: each test injects its own mock
 * `fetchImpl` and a fresh `createRateCache()` directly, with no shared
 * module-level state between tests.
 */

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, statusText: 'error', json: async () => body } as unknown as Response;
}

describe('SUPPORTED_CURRENCIES', () => {
  it('defines a non-empty list with code/symbol/name', () => {
    expect(Array.isArray(SUPPORTED_CURRENCIES)).toBe(true);
    expect(SUPPORTED_CURRENCIES.length).toBeGreaterThan(0);
    SUPPORTED_CURRENCIES.forEach((currency) => {
      expect(currency).toHaveProperty('code');
      expect(currency).toHaveProperty('symbol');
      expect(currency).toHaveProperty('name');
    });
  });

  it('includes the major currencies', () => {
    const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
    expect(codes).toContain('USD');
    expect(codes).toContain('EUR');
    expect(codes).toContain('GBP');
  });
});

describe('getExchangeRate', () => {
  it('returns 1 (not a fallback) when the currencies are the same', async () => {
    const result = await getExchangeRate('USD', 'USD');
    expect(result).toEqual({ rate: 1, isFallback: false });
  });

  it('caches a rate and does not re-fetch on the second call', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ result: 'success', rates: { USD: 1.2, GBP: 0.85 } }));
    const cache = createRateCache();

    await getExchangeRate('EUR', 'USD', { fetchImpl, cache });
    const result = await getExchangeRate('EUR', 'USD', { fetchImpl, cache });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ rate: 1.2, isFallback: false });
  });

  it('re-fetches once the cache entry has expired', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ result: 'success', rates: { USD: 1.2 } }));
    const cache = createRateCache();
    let now = 0;

    await getExchangeRate('EUR', 'USD', { fetchImpl, cache, now: () => now });
    now += 7 * 60 * 60 * 1000; // past the 6h TTL
    await getExchangeRate('EUR', 'USD', { fetchImpl, cache, now: () => now });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('falls back to a positive rate when the API call rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('API Error'));
    const result = await getExchangeRate('EUR', 'USD', { fetchImpl });
    expect(result.rate).toBeGreaterThan(0);
    expect(result.isFallback).toBe(true);
  });

  it('falls back to the inverse rate when only USD_AUD (not AUD_USD) is known', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('API Error'));
    const result = await getExchangeRate('AUD', 'USD', { fetchImpl });
    expect(result.isFallback).toBe(true);
    expect(result.rate).toBeCloseTo(1 / 1.52, 5);
  });

  it('falls back to 1:1 when no fallback rate exists in either direction', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('API Error'));
    const result = await getExchangeRate('XXX', 'YYY', { fetchImpl });
    expect(result).toEqual({ rate: 1, isFallback: true });
  });
});

describe('convertCurrency', () => {
  it('returns the original amount when the currencies are the same', async () => {
    const result = await convertCurrency(100, 'USD', 'USD');
    expect(result).toEqual({ convertedAmount: 100, isFallback: false });
  });

  it('converts using the fetched rate', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ result: 'success', rates: { USD: 1.5, GBP: 0.85 } }));
    const result = await convertCurrency(100, 'EUR', 'USD', { fetchImpl });

    expect(result).toEqual({ convertedAmount: 150, isFallback: false });
    expect(fetchImpl).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/EUR');
  });

  it('uses a fallback rate when the API call fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('Network Error'));
    const result = await convertCurrency(100, 'EUR', 'USD', { fetchImpl });
    expect(result.convertedAmount).toBeGreaterThan(0);
    expect(result.isFallback).toBe(true);
  });
});
