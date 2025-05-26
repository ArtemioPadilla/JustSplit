/**
 * Utility functions for formatting data for display
 */

/**
 * Format a number as currency with the given currency code
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  // Handle edge cases
  if (amount === 0) return `0 ${currency}`;
  if (isNaN(amount)) return `-- ${currency}`;
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if Intl API fails or currency is invalid
    return `${amount.toFixed(2)} ${currency}`;
  }
};

/**
 * Format a date string to a readable format
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format a number as percentage
 */
export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

/**
 * Truncate a long string and add ellipsis
 */
export const truncateText = (text: string, maxLength: number = 30): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};
