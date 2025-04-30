import { getExchangeRate, convertCurrency, SUPPORTED_CURRENCIES } from '../currencyExchange';

// Mock the global fetch function
global.fetch = jest.fn();

describe('Currency Exchange Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      // First call will store in cache
      await getExchangeRate('EUR', 'USD');
      
      // Second call should use cache
      const rate = await getExchangeRate('EUR', 'USD');
      
      // Should only call fetch once (for the first call)
      expect(fetch).toHaveBeenCalledTimes(1);
      
      // Rate should be realistic (using the mock implementation in the actual code)
      expect(rate).toBeGreaterThan(0);
    });
    
    it('should handle API errors gracefully', async () => {
      // Make fetch reject to simulate an API error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      // The implementation should handle the error and return a default rate
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
      // Mock getExchangeRate to return a fixed value
      jest.spyOn(module, 'getExchangeRate').mockResolvedValueOnce(1.5);
      
      const result = await convertCurrency(100, 'EUR', 'USD');
      
      // 100 EUR * 1.5 = 150 USD
      expect(result).toBe(150);
    });
  });
});
