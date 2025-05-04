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

/**
 * Cache for storing exchange rates to avoid unnecessary API calls
 */
export const exchangeRateCache: {
  [key: string]: { rate: number; timestamp: number };
} = {};

/**
 * Cache validity period in milliseconds (1 hour)
 */
const CACHE_VALIDITY = 60 * 60 * 1000;

/**
 * Map to store pending promises for exchange rates
 */
const pendingPromises: {
  [key: string]: Promise<number>;
} = {};

/**
 * Get exchange rate between two currencies
 */
export const getExchangeRate = async (
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  if (!fromCurrency || !toCurrency) {
    console.error(`Invalid currency parameters: fromCurrency=${fromCurrency}, toCurrency=${toCurrency}`);
    throw new Error('Invalid currency parameters');
  }

  // If currencies are the same, return 1
  if (fromCurrency === toCurrency) {
    return 1;
  }

  // Create cache key
  const cacheKey = `${fromCurrency}-${toCurrency}`;

  // Check if we have a valid cached rate
  const cachedData = exchangeRateCache[cacheKey];
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_VALIDITY) {
    return cachedData.rate;
  }

  // Check if there's already a pending promise for this currency pair
  if (pendingPromises[cacheKey]) {
    return pendingPromises[cacheKey];
  }

  if (!pendingPromises[cacheKey]) {
    // Fetch current exchange rates from API
    // If a request for the same currency pair is already in progress, 
    // it will reuse the existing promise to avoid duplicate API calls.
    pendingPromises[cacheKey] = (async () => {
        try {
          const url = `/api/exchange-rates?base=${fromCurrency}&symbols=${toCurrency}`;
          const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`Failed to fetch exchange rate: ${response.status}. URL: ${url}`);
          throw new Error(`Failed to fetch exchange rate: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.rates || !data.rates[toCurrency]) {
          console.error(`Exchange rate not found in response: ${JSON.stringify(data)}`);
          throw new Error('Exchange rate not found in response');
        }
        
        const rate = data.rates[toCurrency];
        
        // Cache the result
        exchangeRateCache[cacheKey] = {
          rate,
          timestamp: Date.now(),
        };
        
        return rate;
      } catch (error) {
        console.error('Error getting exchange rate:', error);
        throw error;
      } finally {
        // Remove the pending promise once resolved or rejected
        delete pendingPromises[cacheKey];
      }
    })();
  }

  return pendingPromises[cacheKey];
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
 * Convert an amount from one currency to another
 */
export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
};
