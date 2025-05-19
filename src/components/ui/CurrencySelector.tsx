import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { SUPPORTED_CURRENCIES } from '../../utils/currencyExchange';
import styles from './CurrencySelector.module.css';
import Button from '../ui/Button';

interface CurrencySelectorProps {
  value?: string;
  onChange?: (currency: string) => void;
  showRefreshButton?: boolean;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
  label?: string;
}

/**
 * A reusable currency selector component that can be used throughout the app
 * It will use the global app context for currency if no value/onChange props are provided
 */
const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value: propValue,
  onChange: propOnChange,
  showRefreshButton = false,
  onRefresh,
  isRefreshing = false,
  compact = false,
  className = '',
  disabled = false,
  id = 'currency-selector',
  label = 'Currency:',
}) => {
  // Try to get values from context if not provided as props
  let contextValues;
  try {
    contextValues = useAppContext();
  } catch (error) {
    // Silently ignore - this might happen in tests without a provider
    contextValues = null;
  }

  // Use props if provided, otherwise fall back to context values
  const currency = propValue !== undefined ? propValue : contextValues?.preferredCurrency;
  const handleChange = propOnChange || contextValues?.setPreferredCurrency;

  // Handle refreshing rates
  const handleRefresh = async () => {
    if (onRefresh) {
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
          value={currency}
          onChange={(e) => handleChange?.(e.target.value)}
          className={styles.select}
          disabled={disabled || isRefreshing}
        >
          {SUPPORTED_CURRENCIES.map(currency => (
            <option key={currency.code} value={currency.code}>
              {compact 
                ? `${currency.code} (${currency.symbol})` 
                : `${currency.code} (${currency.symbol}) - ${currency.name}`}
            </option>
          ))}
        </select>
        
        {showRefreshButton && (
          <Button
            onClick={handleRefresh}
            variant="secondarylight"
            title="Refresh exchange rates"
            disabled={isRefreshing || disabled}
            data-testid="refresh-rates-button"
          >
            {isRefreshing ? '⟳' : '🔄'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CurrencySelector;
