'use client';

import { useState, useEffect } from 'react';
import { SUPPORTED_CURRENCIES } from '../../utils/currencyExchange';
import styles from './styles.module.css';

interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  change: number; // Percentage change
}

const CurrencyExchangeTicker = ({ baseCurrency = 'USD' }) => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
            change
          };
        });
        
        const newRates = await Promise.all(ratePromises);
        setRates(newRates);
        setError(null);
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
      </div>
      
      <div className={styles.ticker}>
        {rates.length > 0 ? (
          <div className={styles.tickerTrack}>
            {rates.map((rate, index) => (
              <div key={index} className={styles.tickerItem}>
                <span className={styles.currencyPair}>
                  {rate.fromCurrency}/{rate.toCurrency}
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
