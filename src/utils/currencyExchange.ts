import { useEffect, useState } from 'react';

// Define supported currencies with their codes, symbols, and names
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

// Cache for storing exchange rates to minimize API calls
const exchangeRateCache: {
  [key: string]: { rate: number; timestamp: number };
} = {};

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 3600000;

/**
 * Get exchange rate between two currencies
 * 
 * @param fromCurrency The currency to convert from
 * @param toCurrency The currency to convert to
 * @returns Promise with the exchange rate
 */
export const getExchangeRate = async (
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  // If currencies are the same, rate is 1
  if (fromCurrency === toCurrency) {
    return 1;
  }

  // Check if we have a cached rate that's still valid
  const cacheKey = `${fromCurrency}-${toCurrency}`;
  const cachedRate = exchangeRateCache[cacheKey];
  
  const now = Date.now();
  if (cachedRate && now - cachedRate.timestamp < CACHE_DURATION) {
    return cachedRate.rate;
  }

  try {
    // In a real app, you'd use an API like Open Exchange Rates, Fixer.io, etc.
    // For simplicity in this demo, we'll use a mock implementation
    
    // Mock implementation with reasonable approximations of exchange rates
    const mockRates: Record<string, Record<string, number>> = {
      'USD': { 'EUR': 0.85, 'GBP': 0.75, 'JPY': 110, 'CAD': 1.25, 'AUD': 1.35, 'INR': 75 },
      'EUR': { 'USD': 1.18, 'GBP': 0.88, 'JPY': 130, 'CAD': 1.47, 'AUD': 1.59, 'INR': 88 },
      'GBP': { 'USD': 1.33, 'EUR': 1.13, 'JPY': 147, 'CAD': 1.67, 'AUD': 1.81, 'INR': 100 },
      'JPY': { 'USD': 0.009, 'EUR': 0.0077, 'GBP': 0.0068, 'CAD': 0.011, 'AUD': 0.012, 'INR': 0.68 },
      'CAD': { 'USD': 0.80, 'EUR': 0.68, 'GBP': 0.60, 'JPY': 88, 'AUD': 1.08, 'INR': 60 },
      'AUD': { 'USD': 0.74, 'EUR': 0.63, 'GBP': 0.55, 'JPY': 81, 'CAD': 0.93, 'INR': 55 },
      'INR': { 'USD': 0.013, 'EUR': 0.011, 'GBP': 0.010, 'JPY': 1.47, 'CAD': 0.017, 'AUD': 0.018 }
    };

    // Try to get direct rate
    let rate: number;
    if (mockRates[fromCurrency] && mockRates[fromCurrency][toCurrency]) {
      rate = mockRates[fromCurrency][toCurrency];
    } 
    // Try inverse rate
    else if (mockRates[toCurrency] && mockRates[toCurrency][fromCurrency]) {
      rate = 1 / mockRates[toCurrency][fromCurrency];
    }
    // Use USD as intermediary if available
    else if (fromCurrency !== 'USD' && toCurrency !== 'USD' && 
             mockRates[fromCurrency]?.['USD'] && mockRates['USD']?.[toCurrency]) {
      const fromToUSD = mockRates[fromCurrency]['USD'];
      const usdToTarget = mockRates['USD'][toCurrency];
      rate = fromToUSD * usdToTarget;
    } else {
      // Fallback to 1:1 rate if no conversion available
      console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      rate = 1;
    }

    // Cache the result
    exchangeRateCache[cacheKey] = { 
      rate, 
      timestamp: Date.now() 
    };
    
    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    // Return 1:1 as fallback on error
    return 1;
  }
};

/**
 * React hook to get the current exchange rate between two currencies
 */
export const useExchangeRate = (fromCurrency: string, toCurrency: string) => {
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
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRate();

    return () => {
      isMounted = false;
    };
  }, [fromCurrency, toCurrency]);

  return { rate, loading, error };
};

/**
 * Utility function to convert an amount from one currency to another
 */
export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
};
