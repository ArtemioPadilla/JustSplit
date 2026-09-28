/**
 * Currency exchange (plan B3). Ported from the legacy Next tree's
 * `src/utils/currencyExchange.ts`, made pure: `fetch` and the rate cache are
 * injected as parameters instead of a module-level singleton + `localStorage`
 * side effect, so this module has no I/O of its own and no React dependency.
 * `useExchangeRate` is **not** ported — it has no caller in the app; islands
 * wrap `getExchangeRate` in `useQuery` instead. The 6-hour cache persisted
 * under `justsplit:rates` is `src/stores/preferences.ts`'s `$rateCache`
 * (plan B5b), which owns the injected `RateCache` instance for the app.
 */

export const DEFAULT_CURRENCY = 'USD';

export interface SupportedCurrency {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: '$', name: 'Brazilian Real' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
  { code: 'NZD', symbol: '$', name: 'New Zealand Dollar' },
];

/**
 * Approximate fallback rates for when the API is unavailable. Format:
 * `'USD_EUR': 0.93`.
 */
export const FALLBACK_RATES: Record<string, number> = {
  USD_EUR: 0.93,
  USD_GBP: 0.79,
  USD_JPY: 149.5,
  USD_CAD: 1.37,
  USD_AUD: 1.52,
  USD_CHF: 0.89,
  USD_CNY: 7.23,
  USD_INR: 83.45,
  USD_MXN: 17.05,
  USD_BRL: 5.05,
  USD_RUB: 91.5,
  USD_KRW: 1345.8,
  USD_SGD: 1.35,
  USD_NZD: 1.64,
  EUR_USD: 1.08,
  EUR_GBP: 0.85,
  EUR_JPY: 161.3,
  EUR_CAD: 1.47,
  EUR_AUD: 1.64,
  EUR_CHF: 0.96,
  EUR_CNY: 7.8,
  EUR_INR: 90.1,
  EUR_MXN: 18.4,
  EUR_BRL: 5.45,
  EUR_RUB: 98.7,
  EUR_KRW: 1453.0,
  EUR_SGD: 1.46,
  EUR_NZD: 1.77,
  GBP_USD: 1.27,
  GBP_EUR: 1.18,
  JPY_USD: 0.0067,
  CAD_USD: 0.73,
};

interface ExchangeRateApiResponse {
  result: string;
  rates: Record<string, number>;
}

export interface RateCacheEntry {
  rates: Record<string, number>;
  timestamp: number;
}

/** Injected, in-memory rate cache — `src/stores/preferences.ts` owns the real instance. */
export type RateCache = Map<string, RateCacheEntry>;

export function createRateCache(): RateCache {
  return new Map();
}

/** 6 hours, matching the cache the legacy app kept in `localStorage`. */
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface ExchangeRateDeps {
  /** Defaults to the global `fetch` — tests inject a mock directly. */
  fetchImpl?: typeof fetch;
  /** Defaults to a fresh, empty cache (i.e. no caching across calls). */
  cache?: RateCache;
  /** Defaults to `Date.now` — tests inject a fixed clock. */
  now?: () => number;
}

function isCacheValid(entry: RateCacheEntry, now: () => number): boolean {
  return now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * The exchange rate from `fromCurrency` to `toCurrency`, cached for 6 hours
 * and falling back to `FALLBACK_RATES` (direct, then inverse, then 1:1) when
 * the API is unavailable.
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  deps: ExchangeRateDeps = {},
): Promise<{ rate: number; isFallback: boolean }> {
  if (fromCurrency === toCurrency) {
    return { rate: 1, isFallback: false };
  }

  const { fetchImpl = fetch, cache = createRateCache(), now = Date.now } = deps;

  const cached = cache.get(fromCurrency);
  if (cached && isCacheValid(cached, now) && cached.rates[toCurrency] != null) {
    return { rate: cached.rates[toCurrency], isFallback: false };
  }

  try {
    const response = await fetchImpl(`https://open.er-api.com/v6/latest/${fromCurrency}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }
    const data = (await response.json()) as ExchangeRateApiResponse;
    if (data.result !== 'success') {
      throw new Error('API returned an error');
    }

    cache.set(fromCurrency, { rates: data.rates, timestamp: now() });

    if (data.rates[toCurrency] != null) {
      return { rate: data.rates[toCurrency], isFallback: false };
    }
    throw new Error(`Rate not found for ${toCurrency}`);
  } catch {
    const directKey = `${fromCurrency}_${toCurrency}`;
    if (FALLBACK_RATES[directKey] != null) {
      return { rate: FALLBACK_RATES[directKey], isFallback: true };
    }

    const inverseKey = `${toCurrency}_${fromCurrency}`;
    if (FALLBACK_RATES[inverseKey] != null) {
      return { rate: 1 / FALLBACK_RATES[inverseKey], isFallback: true };
    }

    return { rate: 1, isFallback: true };
  }
}

/** Convert `amount` from `fromCurrency` to `toCurrency` (see `getExchangeRate`). */
export async function convertCurrency(
  amount: number,
  fromCurrency: string = DEFAULT_CURRENCY,
  toCurrency: string = DEFAULT_CURRENCY,
  deps: ExchangeRateDeps = {},
): Promise<{ convertedAmount: number; isFallback: boolean }> {
  if (fromCurrency === toCurrency) {
    return { convertedAmount: amount, isFallback: false };
  }
  const { rate, isFallback } = await getExchangeRate(fromCurrency, toCurrency, deps);
  return { convertedAmount: amount * rate, isFallback };
}
