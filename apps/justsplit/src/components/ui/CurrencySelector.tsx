import React from 'react';
import { SUPPORTED_CURRENCIES } from '../../utils/currencyExchange';
import styles from './CurrencySelector.module.css';

interface CurrencySelectorProps {
  value?: string;
  onChange?: (currency: string) => void;
  label?: string;
  showRefreshButton?: boolean;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  compact?: boolean;
}

/**
 * A reusable currency selector component that can be used throughout the app
 * It will use the global app context for currency if no value/onChange props are provided
 */
const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value = 'USD',
  onChange,
  label = 'Currency:',
  showRefreshButton = false,
  onRefresh,
  isRefreshing = false,
  disabled = false,
  id = 'currency-selector',
  className = '',
  compact = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      await onRefresh();
    }
  };

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''} ${className}`} data-testid="currency-selector-container">
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.selectorWrapper}>
        <select
          id={id}
          value={value}
          onChange={handleChange}
          disabled={disabled || isRefreshing}
          className={styles.select}
        >
          {SUPPORTED_CURRENCIES.map(currency => (
            <option key={currency.code} value={currency.code}>
              {`${currency.code} (${currency.symbol})`}
            </option>
          ))}
        </select>
        
        {showRefreshButton && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || disabled}
            title="Refresh exchange rates"
            className={styles.refreshButton}
          >
            {isRefreshing ? '↻' : '↻'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CurrencySelector;
