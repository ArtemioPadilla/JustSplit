import * as currencyExchangeModule from '../currencyExchange';
import { getExchangeRate, convertCurrency, SUPPORTED_CURRENCIES } from '../currencyExchange';

// Mock the global fetch function
global.fetch = jest.fn();

describe('Currency Exchange Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the cache before each test
    Object.keys(currencyExchangeModule.exchangeRateCache).forEach(key => {
      delete currencyExchangeModule.exchangeRateCache[key];
    });
  });
  
  describe('SUPPORTED_CURRENCIES', () => {
    it('should define a list of supported currencies', () => {
      expect(SUPPORTED_CURRENCIES).toBeDefined();
      expect(Array.isArray(SUPPORTED_CURRENCIES)).toBe(true);
      expect(SUPPORTED_CURRENCIES.length).toBeGreaterThan(0);
      
      // Check if currencies have the expected structure
      SUPPORTED_CURRENCIES.forEach(currency => {
        expect(currency).toHaveProperty('code');
        expect(currency).toHaveProperty('symbol');
        expect(currency).toHaveProperty('name');
      });
    });
    
    it('should include major currencies', () => {
      const currencyCodes = SUPPORTED_CURRENCIES.map(c => c.code);
      expect(currencyCodes).toContain('USD');
      expect(currencyCodes).toContain('EUR');
      expect(currencyCodes).toContain('GBP');
    });
  });
  
  describe('getExchangeRate', () => {
    it('should return 1 when currencies are the same', async () => {
      const rate = await getExchangeRate('USD', 'USD');
      expect(rate).toBe(1);
    });
    
    it('should return cached rates if available and not expired', async () => {
      // Set up the mock to return a valid response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ rates: { USD: 1.2 } })
      });
      
      // First call will store in cache
      await getExchangeRate('EUR', 'USD');
      
      // Second call should use cache
      const rate = await getExchangeRate('EUR', 'USD');
      
      // Should only call fetch once (for the first call)
      expect(fetch).toHaveBeenCalledTimes(1);
      
      // Rate should match the mocked response
      expect(rate).toBe(1.2);
    });
    
    it('should handle API errors gracefully', async () => {
      // Make fetch reject to simulate an API error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      // The implementation should handle the error and return a fallback rate
      const rate = await getExchangeRate('EUR', 'USD');
      
      // The function shouldn't throw and should return a positive number
      expect(rate).toBeGreaterThan(0);
    });
  });
  
  describe('convertCurrency', () => {
    it('should return the same amount when currencies are the same', async () => {
      const result = await convertCurrency(100, 'USD', 'USD');
      expect(result).toBe(100);
    });
    
    it('should convert amount using exchange rate', async () => {
      // Mock a successful API response with a specific exchange rate
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ rates: { USD: 1.5 } })
      });
      
      // Clear any cached rates for EUR-USD
      Object.keys(currencyExchangeModule.exchangeRateCache).forEach(key => {
        if (key.includes('EUR-USD')) {
          delete currencyExchangeModule.exchangeRateCache[key];
        }
      });
      
      // Now the API call should return our mocked rate of 1.5
      const result = await convertCurrency(100, 'EUR', 'USD');
      
      // 100 EUR * 1.5 = 150 USD
      expect(result).toBe(150);
      
      // Verify the fetch was called correctly
      expect(fetch).toHaveBeenCalled();
      const fetchUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('base=EUR');
      expect(fetchUrl).toContain('symbols=USD');
    });
  });
});
