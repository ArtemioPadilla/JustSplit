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
        
        const newRates: ExchangeRate[] = [];
        let anyFallback = false;
        
        // First, check if we already have rates in the exchangeRateCache
        for (const currency of currenciesToFetch) {
          try {
            // Use our utility function which already handles caching
            const { rate, isFallback } = await getExchangeRate(baseCurrency, currency);
            
            // If any rate is using fallback data, flag it
            if (isFallback) {
              anyFallback = true;
            }
            
            newRates.push({
              fromCurrency: baseCurrency,
              toCurrency: currency,
              rate,
              change: 0, // We don't have historical data from the cache
              isFallback
            });
          } catch (err) {
            console.error(`Error getting rate for ${baseCurrency} to ${currency}:`, err);
            // Continue with other currencies even if one fails
          }
        }
        
        setRates(newRates);
        setUsingFallback(anyFallback);
        
        // Only set error to null if we successfully fetched all rates without fallbacks
        if (!anyFallback && newRates.length === currenciesToFetch.length) {
          setError(null);
        } else if (newRates.length < currenciesToFetch.length) {
          setError('Some rates could not be loaded');
        } else if (anyFallback) {
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
    
    // Refresh rates every 30 minutes instead of 5
    const intervalId = setInterval(fetchExchangeRates, 30 * 60 * 1000);
    
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
      <div className={styles.attribution}>
          <a href="https://exchangerate-api.com" target="_blank" rel="noopener noreferrer">Rates By Exchange Rate API</a>
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
                {rate.change !== 0 ? (
                  <span className={`${styles.change} ${rate.change > 0 ? styles.positive : rate.change < 0 ? styles.negative : ''}`}>
                    {rate.change > 0 ? '▲' : rate.change < 0 ? '▼' : ''}
                    {Math.abs(rate.change).toFixed(2)}%
                  </span>
                ) : (
                  <span className={styles.changeNeutral}>--</span>
                )}
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
