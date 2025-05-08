/**
 * Currency Exchange Module
 * 
 * This module provides functionality for currency conversion and exchange rates.
 * It includes caching mechanisms to reduce API calls and fallback rates for when
 * the API is unavailable.
 */
import { useEffect, useState } from 'react';

// Default currency to use when none is specified
export const DEFAULT_CURRENCY = 'USD';

// Local storage key for application data
const APP_DATA_STORAGE_KEY = 'justSplitData';

/**
 * List of supported currencies in the application
 * Each currency has a code (e.g., 'USD'), symbol (e.g., '$'), and full name
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
];

/**
 * Cache for exchange rates to reduce API calls.
 * Format: { 'USD_EUR': { rate: 0.85, timestamp: 1633028114462, isFallback: false } }
 */
interface RateCache {
  [key: string]: {
    rate: number;
    timestamp: number;
    isFallback: boolean;  // Flag to indicate if this rate is from fallback data
  };
}

/**
 * Fallback exchange rates to use when the API is unavailable.
 * These are approximate rates that may not be current but can serve as a fallback.
 * Format: { 'USD_EUR': 0.85 }
 */
const FALLBACK_RATES: { [key: string]: number } = {
  // Base USD to other currencies
  'USD_EUR': 0.93,
  'USD_GBP': 0.79,
  'USD_JPY': 149.5,
  'USD_CAD': 1.37,
  'USD_AUD': 1.52,
  'USD_CHF': 0.89,
  'USD_CNY': 7.23,
  'USD_INR': 83.45,
  'USD_MXN': 17.05,
  'USD_BRL': 5.05,
  'USD_RUB': 91.5,
  'USD_KRW': 1345.8,
  'USD_SGD': 1.35,
  'USD_NZD': 1.64,
  
  // Base EUR to other currencies
  'EUR_USD': 1.08,
  'EUR_GBP': 0.85,
  'EUR_JPY': 161.3,
  'EUR_CAD': 1.47,
  'EUR_AUD': 1.64,
  'EUR_CHF': 0.96,
  'EUR_CNY': 7.8,
  'EUR_INR': 90.1,
  'EUR_MXN': 18.4,
  'EUR_BRL': 5.45,
  'EUR_RUB': 98.7,
  'EUR_KRW': 1453.0,
  'EUR_SGD': 1.46,
  'EUR_NZD': 1.77,
  
  // Add more fallback rates as needed based on common currency pairs
  'GBP_USD': 1.27,
  'GBP_EUR': 1.18,
  'JPY_USD': 0.0067,
  'CAD_USD': 0.73,
};

// Initialize the exchange rate cache
export const exchangeRateCache: RateCache = (() => {
  // Try to load cached rates from localStorage
  if (typeof window !== 'undefined') {
    try {
      const savedData = localStorage.getItem(APP_DATA_STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.exchange_rates) {
          return parsedData.exchange_rates;
        }
      }
    } catch (error) {
      console.warn('Failed to load exchange rate cache from localStorage:', error);
    }
  }
  return {};
})();

// Cache expiration time in milliseconds (1 hour)
const CACHE_EXPIRATION = 60 * 60 * 1000;

/**
 * Save exchange rates to localStorage as part of the app data
 */
const saveExchangeRatesToStorage = (): void => {
  if (typeof window === 'undefined') return; // Skip on server-side rendering
  
  try {
    const savedData = localStorage.getItem(APP_DATA_STORAGE_KEY);
    let appData = savedData ? JSON.parse(savedData) : {};
    
    // Update exchange_rates in the app data
    appData.exchange_rates = exchangeRateCache;
    
    // Save the updated app data back to localStorage
    localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(appData));
  } catch (error) {
    console.error('Error saving exchange rates to localStorage:', error);
  }
};

// Load cached rates from local storage on module initialization
if (typeof window !== 'undefined') {
  // The loading is already handled in the IIFE that initializes exchangeRateCache
}

/**
 * Checks if a cached exchange rate is still valid
 * @param timestamp The time when the rate was cached
 * @returns Whether the cached rate is still valid or should be refreshed
 */
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_EXPIRATION;
};

/**
 * Get the exchange rate between two currencies
 * @param fromCurrency The source currency code
 * @param toCurrency The target currency code
 * @returns An object containing the exchange rate and whether it's a fallback rate
 */
export const getExchangeRate = async (
  fromCurrency: string,
  toCurrency: string
): Promise<{ rate: number; isFallback: boolean }> => {
  // If currencies are the same, return 1:1 rate
  if (fromCurrency === toCurrency) {
    return { rate: 1, isFallback: false };
  }
  
  const cacheKey = `${fromCurrency}_${toCurrency}`;

  // Check if we have a valid cached rate in memory
  if (
    exchangeRateCache[cacheKey] &&
    isCacheValid(exchangeRateCache[cacheKey].timestamp)
  ) {
    console.log(`Using cached rate from memory for ${cacheKey}: ${exchangeRateCache[cacheKey].rate}`);
    return {
      rate: exchangeRateCache[cacheKey].rate,
      isFallback: exchangeRateCache[cacheKey].isFallback
    };
  }
  
  try {
    // Format for Yahoo Finance API: USDEUR=X
    const pair = `${fromCurrency}${toCurrency}=X`;
    
    // Use our server-side proxy to fetch the data
    const response = await fetch(`/api/exchange-rates?pair=${pair}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the current rate from the response
    const result = data.chart.result[0];
    const rate = result.meta.regularMarketPrice;
    
    // Check if this is fallback data by examining the symbol
    // The API returns "FALLBACK_DATA" when using fallback rates
    const isFallback = result.meta.symbol === "FALLBACK_DATA";
    
    // Cache the rate in memory
    exchangeRateCache[cacheKey] = {
      rate,
      timestamp: Date.now(),
      isFallback
    };
    
    // Save to localStorage
    saveExchangeRatesToStorage();
    
    return { rate, isFallback };
  } catch (error) {
    console.error(
      `Error fetching exchange rate from ${fromCurrency} to ${toCurrency}:`,
      error
    );
    
    // Try to use fallback rate
    if (FALLBACK_RATES[cacheKey]) {
      const rate = FALLBACK_RATES[cacheKey];
      
      // Cache the fallback rate but with a shorter expiration
      exchangeRateCache[cacheKey] = {
        rate,
        timestamp: Date.now() - (CACHE_EXPIRATION / 2), // Expire sooner for fallback rates
        isFallback: true
      };
      
      // Save to localStorage
      saveExchangeRatesToStorage();
      
      console.log(`Using fallback rate for ${cacheKey}: ${rate}`);
      return { rate, isFallback: true };
    }
    
    // Try to calculate an inverse rate as another fallback option
    const inverseKey = `${toCurrency}_${fromCurrency}`;
    if (FALLBACK_RATES[inverseKey]) {
      const inverseRate = FALLBACK_RATES[inverseKey];
      const rate = 1 / inverseRate;
      
      // Cache the calculated fallback rate
      exchangeRateCache[cacheKey] = {
        rate,
        timestamp: Date.now() - (CACHE_EXPIRATION / 2), // Expire sooner for fallback rates
        isFallback: true
      };
      
      // Save to localStorage
      saveExchangeRatesToStorage();
      
      console.log(`Using calculated inverse fallback rate for ${cacheKey}: ${rate}`);
      return { rate, isFallback: true };
    }
    
    // As a last resort, return 1:1 rate if no fallback is available
    console.warn(`No fallback rate available for ${cacheKey}, using 1:1`);
    return { rate: 1, isFallback: true };
  }
};

/**
 * React hook to get and automatically refresh an exchange rate
 * @param fromCurrency The source currency code
 * @param toCurrency The target currency code
 * @returns An object containing the exchange rate, loading state, any error, and whether it's a fallback rate
 */
export const useExchangeRate = (fromCurrency: string, toCurrency: string) => {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  
  useEffect(() => {
    const fetchRate = async () => {
      try {
        setLoading(true);
        const { rate, isFallback } = await getExchangeRate(fromCurrency, toCurrency);
        setRate(rate);
        setIsFallback(isFallback);
        setError(null);
      } catch (err) {
        console.error('Error in useExchangeRate:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRate();
    
    // Refresh rate every hour
    const intervalId = setInterval(fetchRate, CACHE_EXPIRATION);
    
    return () => clearInterval(intervalId);
  }, [fromCurrency, toCurrency]);
  
  return { rate, loading, error, isFallback };
};

/**
 * Convert an amount from one currency to another
 * @param amount The amount to convert
 * @param fromCurrency The source currency code
 * @param toCurrency The target currency code
 * @returns An object containing the converted amount and whether it's a fallback rate
 */
export const convertCurrency = async (
  amount: number,
  fromCurrency: string = DEFAULT_CURRENCY,
  toCurrency: string = DEFAULT_CURRENCY
): Promise<{ convertedAmount: number; isFallback: boolean }> => {
  // If currencies are the same, return the original amount
  if (fromCurrency === toCurrency) {
    return { convertedAmount: amount, isFallback: false };
  }
  
  try {
    const { rate, isFallback } = await getExchangeRate(fromCurrency, toCurrency);
    return { convertedAmount: amount * rate, isFallback };
  } catch (error) {
    console.error('Error converting currency:', error);

    // Use fallback conversion logic in case of API failure
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    if (FALLBACK_RATES[cacheKey]) {
      return { 
        convertedAmount: amount * FALLBACK_RATES[cacheKey], 
        isFallback: true 
      };
    }
    
    // Try inverse conversion rate if direct rate isn't available
    const inverseKey = `${toCurrency}_${fromCurrency}`;
    if (FALLBACK_RATES[inverseKey]) {
      return { 
        convertedAmount: amount * (1 / FALLBACK_RATES[inverseKey]), 
        isFallback: true 
      };
    }
    
    // For USD-MXN pair specifically, use hardcoded rate as final fallback
    if (fromCurrency === 'USD' && toCurrency === 'MXN') {
      return { convertedAmount: amount * 17.05, isFallback: true };
    }
    
    if (fromCurrency === 'MXN' && toCurrency === 'USD') {
      return { convertedAmount: amount / 17.05, isFallback: true };
    }
    
    // If all else fails, return original amount
    return { convertedAmount: amount, isFallback: true };
  }
};

/**
 * Format a currency amount for display
 * @param amount The amount to format
 * @param currencyCode The currency code (e.g., 'USD')
 * @returns A formatted string with the amount and currency symbol
 */
export const formatCurrency = (
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY
): string => {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  
  if (!currency) {
    console.warn(`Currency code not found: ${currencyCode}, falling back to ${DEFAULT_CURRENCY}`);
    return formatCurrency(amount, DEFAULT_CURRENCY);
  }
  
  return `${currency.symbol}${amount.toFixed(2)}`;
};

/**
 * Get the currency symbol for a given currency code
 * @param currencyCode The currency code to look up
 * @returns The currency symbol or '$' if not found
 */
export const getCurrencySymbol = (currencyCode: string = DEFAULT_CURRENCY): string => {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency ? currency.symbol : '$';
};

/**
 * Clear exchange rate cache (useful for testing or when rates are stale)
 */
export const clearExchangeRateCache = (): void => {
  Object.keys(exchangeRateCache).forEach(key => {
    delete exchangeRateCache[key];
  });
  
  // Update localStorage
  if (typeof window !== 'undefined') {
    try {
      const savedData = localStorage.getItem(APP_DATA_STORAGE_KEY);
      if (savedData) {
        const appData = JSON.parse(savedData);
        appData.exchange_rates = {};
        localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(appData));
      }
    } catch (error) {
      console.error('Error clearing exchange rate cache in localStorage:', error);
    }
  }
};
