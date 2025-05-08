import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for exchange rates
// Format: { pairKey: { data: object, timestamp: number } }
const rateCache: Record<string, { data: any; timestamp: number }> = {};

// Cache validity in milliseconds (30 minutes)
const CACHE_VALIDITY = 30 * 60 * 1000;

// Backoff settings for rate limiting
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

/**
 * Fetches data with exponential backoff retry for rate limiting
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 0): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // If rate limited (429) and we have retries left, attempt a retry with backoff
    if (response.status === 429 && retries < MAX_RETRIES) {
      const backoff = INITIAL_BACKOFF * Math.pow(2, retries);
      console.log(`Rate limited. Retrying in ${backoff}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries + 1);
    }
    
    return response;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      const backoff = INITIAL_BACKOFF * Math.pow(2, retries);
      console.log(`Fetch error. Retrying in ${backoff}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries + 1);
    }
    
    throw error;
  }
}

/**
 * Creates fallback data for when the API is unavailable
 * Using common exchange rates as a fallback
 */
function createFallbackData(pair: string) {
  // Extract base currency and target currency from pair
  // Example: USDEUR=X -> USD and EUR
  const baseCurrency = pair.substring(0, 3);
  const targetCurrency = pair.substring(3, 6);
  
  // Common approximate rates (these are just reasonable defaults)
  const commonRates: Record<string, Record<string, number>> = {
    'USD': { 
      'EUR': 0.93, 'GBP': 0.79, 'JPY': 149.5, 'CAD': 1.37, 
      'AUD': 1.52, 'CHF': 0.89, 'CNY': 7.23, 'INR': 83.45,
      'MXN': 17.05, 'BRL': 5.05, 'RUB': 91.5, 'KRW': 1345.8,
      'SGD': 1.35, 'NZD': 1.64
    },
    'EUR': { 
      'USD': 1.08, 'GBP': 0.85, 'JPY': 161.3, 'CAD': 1.47, 
      'AUD': 1.64, 'CHF': 0.96, 'CNY': 7.8, 'INR': 90.1, 
      'MXN': 18.4, 'BRL': 5.45, 'RUB': 98.7, 'KRW': 1453.0, 
      'SGD': 1.46, 'NZD': 1.77
    },
    'GBP': { 
      'USD': 1.27, 'EUR': 1.18, 'JPY': 190.2, 'CAD': 1.73, 
      'AUD': 1.92, 'CHF': 1.13, 'CNY': 9.15, 'INR': 105.8
    },
    'JPY': {
      'USD': 0.0067, 'EUR': 0.0062, 'GBP': 0.0053
    },
    'CAD': {
      'USD': 0.73, 'EUR': 0.68, 'GBP': 0.58
    },
    // Add more as needed
  };
  
  // If same currency, rate is 1
  if (baseCurrency === targetCurrency) {
    return createMockResponse(1);
  }
  
  // Try direct lookup
  if (commonRates[baseCurrency]?.[targetCurrency]) {
    return createMockResponse(commonRates[baseCurrency][targetCurrency]);
  }
  
  // Try inverse lookup
  if (commonRates[targetCurrency]?.[baseCurrency]) {
    return createMockResponse(1 / commonRates[targetCurrency][baseCurrency]);
  }
  
  // Try transitive rates through USD if USD is not one of the currencies
  if (baseCurrency !== 'USD' && targetCurrency !== 'USD') {
    if (commonRates['USD']?.[targetCurrency] && commonRates[baseCurrency]?.['USD']) {
      // Convert to USD first, then to target currency
      const baseToUsd = commonRates[baseCurrency]['USD'];
      const usdToTarget = commonRates['USD'][targetCurrency];
      return createMockResponse(baseToUsd * usdToTarget);
    } else if (commonRates['USD']?.[baseCurrency] && commonRates['USD']?.[targetCurrency]) {
      // Use USD as base for both conversions
      const usdToBase = commonRates['USD'][baseCurrency];
      const usdToTarget = commonRates['USD'][targetCurrency];
      return createMockResponse(usdToTarget / usdToBase);
    }
  }
  
  // If all else fails, default to 1 with a console warning
  console.warn(`No fallback rate available for ${baseCurrency} to ${targetCurrency}, using 1:1`);
  return createMockResponse(1);
}

/**
 * Create a mock response object similar to Yahoo Finance API format
 */
function createMockResponse(rate: number) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  return {
    chart: {
      result: [
        {
          meta: {
            regularMarketPrice: rate,
            symbol: "FALLBACK_DATA",
          },
          timestamp: [timestamp - 86400, timestamp],
          indicators: {
            quote: [
              {
                close: [rate, rate],
                open: [rate, rate],
                high: [rate, rate],
                low: [rate, rate],
                volume: [0, 0],
              },
            ],
          },
        },
      ],
      error: null,
    },
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pair = searchParams.get('pair');
  const base = searchParams.get('base');
  const symbols = searchParams.get('symbols');
  const interval = searchParams.get('interval') || '1d';
  const range = searchParams.get('range') || '2d';
  
  // Handle multiple API formats
  let currencyPair = pair;
  
  // If using the base/symbols format (compatible with other exchange rate APIs)
  if (base && symbols) {
    currencyPair = `${base}${symbols}=X`;
  }
  
  if (!currencyPair) {
    return NextResponse.json(
      { error: 'Currency pair parameters are required (either pair or base+symbols)' },
      { status: 400 }
    );
  }
  
  // Check cache first
  const cacheKey = `${currencyPair}_${interval}_${range}`;
  const cachedData = rateCache[cacheKey];
  
  if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_VALIDITY) {
    // Return cached data
    return NextResponse.json(cachedData.data);
  }
  
  try {
    // Yahoo Finance API URL
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${currencyPair}?interval=${interval}&range=${range}`;
    
    // Use a more browser-like User-Agent to avoid API restrictions
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com/'
      }
    });
    
    if (!response.ok) {
      console.warn(`Yahoo Finance API returned ${response.status}: ${response.statusText}`);
      
      // Use fallback data instead of throwing error
      const fallbackData = createFallbackData(currencyPair);
      
      // Cache the fallback data for a shorter period
      rateCache[cacheKey] = { 
        data: fallbackData, 
        timestamp: Date.now() - (CACHE_VALIDITY / 2) // Shorter cache lifetime for fallbacks
      };
      
      // Format response for compatibility with expected API structure
      if (base && symbols) {
        const rate = fallbackData.chart.result[0].meta.regularMarketPrice;
        return NextResponse.json({
          base,
          rates: { [symbols]: rate },
          timestamp: Math.floor(Date.now() / 1000)
        });
      }
      
      return NextResponse.json(fallbackData);
    }
    
    // Get the response data
    const data = await response.json();
    
    // Cache the successful response
    rateCache[cacheKey] = { data, timestamp: Date.now() };
    
    // Format response for compatibility with expected API structure
    if (base && symbols) {
      try {
        const rate = data.chart.result[0].meta.regularMarketPrice;
        return NextResponse.json({
          base,
          rates: { [symbols]: rate },
          timestamp: Math.floor(Date.now() / 1000)
        });
      } catch (e) {
        // If we can't parse the response format correctly, return the raw data
        return NextResponse.json(data);
      }
    }
    
    // Return the Yahoo Finance data format
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    // Use fallback data
    const fallbackData = createFallbackData(currencyPair);
    
    // Format response for compatibility with expected API structure
    if (base && symbols) {
      const rate = fallbackData.chart.result[0].meta.regularMarketPrice;
      return NextResponse.json({
        base,
        rates: { [symbols]: rate },
        timestamp: Math.floor(Date.now() / 1000)
      });
    }
    
    return NextResponse.json(fallbackData);
  }
}