/**
 * Currency Exchange Module
 * 
 * This module provides functionality for currency conversion and exchange rates.
 * It includes caching mechanisms to reduce API calls and fallback rates for when
 * the API is unavailable.
 */
import { useEffect, useState } from 'react';

/**
 * List of supported currencies in the application
 * Each currency has a code (e.g., 'USD'), symbol (e.g., '$'), and full name
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
];

/**
 * Cache for storing exchange rates to avoid unnecessary API calls
 * Format: { 'USD-EUR': { rate: 0.85, timestamp: 1620000000000 } }
 */
export const exchangeRateCache: {
  [key: string]: { rate: number; timestamp: number };
} = {};

/**
 * Cache validity period in milliseconds (1 hour)
 * After this period, cached rates are considered stale and will be refreshed
 */
const CACHE_VALIDITY = 60 * 60 * 1000;

/**
 * Default fallback rates to use when API calls fail
 * These are approximate and should only be used temporarily when the API is unavailable
 * The outer key is the 'from' currency, inner key is the 'to' currency
 */
const DEFAULT_FALLBACK_RATES: { [key: string]: { [key: string]: number } } = {
  'USD': { 'EUR': 0.85, 'GBP': 0.75, 'JPY': 110, 'CAD': 1.25 },
  'EUR': { 'USD': 1.17, 'GBP': 0.88, 'JPY': 130, 'CAD': 1.47 },
  'GBP': { 'USD': 1.33, 'EUR': 1.13, 'JPY': 147, 'CAD': 1.67 },
  'JPY': { 'USD': 0.009, 'EUR': 0.0077, 'GBP': 0.0068, 'CAD': 0.011 },
  'CAD': { 'USD': 0.8, 'EUR': 0.68, 'GBP': 0.6, 'JPY': 88 }
};

/**
 * Map to store pending promises for exchange rates
 * This prevents multiple simultaneous API calls for the same currency pair
 */
const pendingPromises: {
  [key: string]: Promise<number>;
} = {};

/**
 * Gets a fallback exchange rate when API calls fail
 * 
 * @param fromCurrency - The currency to convert from
 * @param toCurrency - The currency to convert to
 * @returns The approximate exchange rate to use as fallback
 */
const getFallbackRate = (fromCurrency: string, toCurrency: string): number => {
  // Same currency always has a rate of 1
  if (fromCurrency === toCurrency) return 1;
  
  // Direct lookup in fallback rates
  if (DEFAULT_FALLBACK_RATES[fromCurrency]?.[toCurrency]) {
    return DEFAULT_FALLBACK_RATES[fromCurrency][toCurrency];
  }
  
  // Inverse lookup (e.g., if we need EUR->CAD but only have CAD->EUR)
  if (DEFAULT_FALLBACK_RATES[toCurrency]?.[fromCurrency]) {
    return 1 / DEFAULT_FALLBACK_RATES[toCurrency][fromCurrency];
  }
  
  // Default fallback if no specific rate is found
  return 1;
};

/**
 * Gets the exchange rate between two currencies
 * 
 * This function will:
 * 1. Check the cache for a recent rate
 * 2. If not available, fetch from API
 * 3. If API fails, use fallback rates
 * 4. Cache the result for future use
 * 
 * @param fromCurrency - The currency to convert from (e.g., 'USD')
 * @param toCurrency - The currency to convert to (e.g., 'EUR')
 * @returns A promise that resolves to the exchange rate (e.g., 0.85 for USD to EUR)
 * @throws Error if currency parameters are invalid
 */
// Define as normal function (not arrow function) to allow proper mocking in tests
export function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  // Validate inputs
  if (!fromCurrency || !toCurrency) {
    console.error(`Invalid currency parameters: fromCurrency=${fromCurrency}, toCurrency=${toCurrency}`);
    throw new Error('Invalid currency parameters');
  }

  // Same currency conversion is always 1:1
  if (fromCurrency === toCurrency) {
    return Promise.resolve(1);
  }

  // Check cache first to avoid unnecessary API calls
  const cacheKey = `${fromCurrency}-${toCurrency}`;
  const cachedData = exchangeRateCache[cacheKey];
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_VALIDITY) {
    return Promise.resolve(cachedData.rate);
  }

  // If this currency pair is already being fetched, return that promise
  // to prevent duplicate API calls
  if (!pendingPromises[cacheKey]) {
    pendingPromises[cacheKey] = (async () => {
      try {
        const url = `/api/exchange-rates?base=${fromCurrency}&symbols=${toCurrency}`;
        let response;
        
        // Fetch from API with error handling
        try {
          response = await fetch(url);
        } catch (fetchError) {
          console.error(`Network error fetching exchange rate: ${fetchError}`);
          // Use fallback rate when network errors occur
          const fallbackRate = getFallbackRate(fromCurrency, toCurrency);
          exchangeRateCache[cacheKey] = {
            rate: fallbackRate,
            timestamp: Date.now(),
          };
          return fallbackRate;
        }

        // Handle HTTP errors (non-200 responses)
        if (!response || !response.ok) {
          console.error(`Failed to fetch exchange rate: ${response?.status}. URL: ${url}`);
          const fallbackRate = getFallbackRate(fromCurrency, toCurrency);
          exchangeRateCache[cacheKey] = {
            rate: fallbackRate,
            // Use shorter cache time for fallbacks so we retry sooner
            timestamp: Date.now() - CACHE_VALIDITY / 2,
          };
          return fallbackRate;
        }

        // Parse response and extract rate
        const data = await response.json();
        if (!data || !data.rates || !data.rates[toCurrency]) {
          console.error(`Exchange rate not found in response: ${JSON.stringify(data)}`);
          const fallbackRate = getFallbackRate(fromCurrency, toCurrency);
          exchangeRateCache[cacheKey] = {
            rate: fallbackRate,
            timestamp: Date.now() - CACHE_VALIDITY / 2,
          };
          return fallbackRate;
        }

        // Successfully got rate from API, cache it
        const rate = data.rates[toCurrency];
        exchangeRateCache[cacheKey] = {
          rate,
          timestamp: Date.now(),
        };

        return rate;
      } catch (error) {
        // Catch any other errors that might occur
        console.error('Error getting exchange rate:', error);
        // Use fallback rate instead of throwing
        const fallbackRate = getFallbackRate(fromCurrency, toCurrency);
        exchangeRateCache[cacheKey] = {
          rate: fallbackRate,
          timestamp: Date.now() - CACHE_VALIDITY / 2,
        };
        return fallbackRate;
      } finally {
        // Clean up the pending promise
        delete pendingPromises[cacheKey];
      }
    })();
  }

  return pendingPromises[cacheKey];
};

/**
 * React hook for getting exchange rates
 * 
 * This hook fetches and provides the exchange rate between two currencies,
 * along with loading and error states for UI feedback.
 * 
 * @param fromCurrency - The currency to convert from
 * @param toCurrency - The currency to convert to
 * @returns Object containing the rate, loading state, and any error
 */
export function useExchangeRate(fromCurrency: string, toCurrency: string) {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRate = async () => {
      try {
        setLoading(true);
        const newRate = await getExchangeRate(fromCurrency, toCurrency);

        if (isMounted) {
          setRate(newRate);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch exchange rate');
          // Use fallback rate when there's an error
          const fallbackRate = getFallbackRate(fromCurrency, toCurrency);
          setRate(fallbackRate);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRate();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [fromCurrency, toCurrency]); // Re-run effect when currencies change

  return { rate, loading, error };
};

/**
 * Converts an amount from one currency to another
 * 
 * @param amount - The amount to convert
 * @param fromCurrency - The currency of the amount
 * @param toCurrency - The target currency to convert to
 * @returns A promise that resolves to the converted amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  // Same currency requires no conversion
  if (fromCurrency === toCurrency) {
    return Promise.resolve(amount);
  }

  return getExchangeRate(fromCurrency, toCurrency).then(rate => amount * rate);
};

// For backward compatibility
export default {
  SUPPORTED_CURRENCIES,
  exchangeRateCache,
  getExchangeRate,
  useExchangeRate,
  convertCurrency
};
