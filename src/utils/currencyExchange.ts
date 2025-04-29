// Cache for storing exchange rates to avoid unnecessary API calls
interface ExchangeRateCache {
  [key: string]: {
    rate: number;
    timestamp: number;
  };
}

const exchangeRateCache: ExchangeRateCache = {};
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetches the exchange rate between two currencies using Yahoo Finance API
 * @param fromCurrency The currency to convert from
 * @param toCurrency The currency to convert to
 * @returns The exchange rate as a number
 */
export const getExchangeRate = async (fromCurrency: string, toCurrency: string): Promise<number> => {
  // If currencies are the same, return 1
  if (fromCurrency === toCurrency) return 1;
  
  // Check if we have a cached rate that's still valid
  const cacheKey = `${fromCurrency}-${toCurrency}`;
  const cachedRate = exchangeRateCache[cacheKey];
  
  if (cachedRate && (Date.now() - cachedRate.timestamp) < CACHE_EXPIRY) {
    return cachedRate.rate;
  }
  
  try {
    // Form the Yahoo Finance currency pair
    const pair = `${fromCurrency}${toCurrency}=X`;
    
    // Use our proxy API instead of directly calling Yahoo Finance
    const response = await fetch(`/api/exchange-rates?pair=${pair}&interval=1d&range=2d`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the current exchange rate from the response
    const rate = data.chart.result[0].meta.regularMarketPrice;
    
    // Cache the result
    exchangeRateCache[cacheKey] = {
      rate,
      timestamp: Date.now()
    };
    
    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    // Fallback to cached rate even if expired, or return 1 if no cache
    return cachedRate ? cachedRate.rate : 1;
  }
};

/**
 * Converts an amount from one currency to another
 * @param amount The amount to convert
 * @param fromCurrency The currency of the amount
 * @param toCurrency The target currency
 * @returns The converted amount
 */
export const convertCurrency = async (
  amount: number, 
  fromCurrency: string, 
  toCurrency: string
): Promise<number> => {
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
};

// List of supported currencies
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' }
];
