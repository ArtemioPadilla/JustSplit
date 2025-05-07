'use client';

import { useState, useEffect } from 'react';
import { SUPPORTED_CURRENCIES, getExchangeRate } from '../../utils/currencyExchange';
import styles from './styles.module.css';

interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  change: number; // Percentage change
  isFallback: boolean; // Flag to indicate if this is fallback data
}

const CurrencyExchangeTicker = ({ baseCurrency = 'USD' }) => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        setLoading(true);
        
        // Get all currencies except the base currency
        const currenciesToFetch = SUPPORTED_CURRENCIES
          .filter(curr => curr.code !== baseCurrency)
          .map(curr => curr.code);
        
        // Fetch rates for each currency
        const ratePromises = currenciesToFetch.map(async (currency) => {
          try {
            const pair = `${baseCurrency}${currency}=X`;
            
            // Use our proxy API
            const response = await fetch(`/api/exchange-rates?pair=${pair}&interval=1d&range=2d`);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch exchange rate: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Extract current rate and calculate change
            const result = data.chart.result[0];
            const currentRate = result.meta.regularMarketPrice;
            
            // Get previous close for calculating change
            const previousClose = result.meta.chartPreviousClose;
            const change = ((currentRate - previousClose) / previousClose) * 100;
            
            return {
              fromCurrency: baseCurrency,
              toCurrency: currency,
              rate: currentRate,
              change,
              isFallback: false
            };
          } catch (err) {
            console.error(`Error fetching ${baseCurrency} to ${currency} rate:`, err);
            
            // Use the utility function to get fallback rate
            const { rate, isFallback } = await getExchangeRate(baseCurrency, currency);
            
            // Return fallback rate with 0% change
            return {
              fromCurrency: baseCurrency,
              toCurrency: currency,
              rate,
              change: 0,
              isFallback: true
            };
          }
        });
        
        const newRates = await Promise.all(ratePromises);
        setRates(newRates);
        
        // Check if any rate is using fallback data
        const anyFallback = newRates.some(rate => rate.isFallback);
        setUsingFallback(anyFallback);
        
        // Only set error to null if we successfully fetched all rates without fallbacks
        if (!anyFallback) {
          setError(null);
        } else {
          setError('Some rates are approximate');
        }
      } catch (err) {
        console.error('Error fetching exchange rates:', err);
        setError('Failed to load exchange rates');
      } finally {
        setLoading(false);
      }
    };
    
    fetchExchangeRates();
    
    // Refresh rates every 5 minutes
    const intervalId = setInterval(fetchExchangeRates, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [baseCurrency]);
  
  if (loading && rates.length === 0) {
    return <div className={styles.loading}>Loading exchange rates...</div>;
  }
  
  if (error && rates.length === 0) {
    return <div className={styles.error}>{error}</div>;
  }
  
  return (
    <div className={styles.tickerContainer}>
      <div className={styles.tickerTitle}>
        <span>Exchange Rates</span>
        {usingFallback && (
          <span className={styles.fallbackIndicator} title="Using approximate rates">*</span>
        )}
      </div>
      
      {usingFallback && (
        <div className={styles.fallbackWarning}>
          * Some rates are using cached or estimated values due to API limitations
        </div>
      )}
      
      <div className={styles.ticker}>
        {rates.length > 0 ? (
          <div className={styles.tickerTrack}>
            {rates.map((rate, index) => (
              <div key={index} className={styles.tickerItem}>
                <span className={styles.currencyPair}>
                  {rate.fromCurrency}/{rate.toCurrency}
                  {rate.isFallback && <span className={styles.fallbackItemIndicator} title="Approximate rate">*</span>}
                </span>
                <span className={styles.rate}>{rate.rate.toFixed(4)}</span>
                <span className={`${styles.change} ${rate.change > 0 ? styles.positive : rate.change < 0 ? styles.negative : ''}`}>
                  {rate.change > 0 ? '▲' : rate.change < 0 ? '▼' : ''}
                  {Math.abs(rate.change).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.fallbackMessage}>Exchange rate data unavailable</div>
        )}
      </div>
    </div>
  );
};

export default CurrencyExchangeTicker;
