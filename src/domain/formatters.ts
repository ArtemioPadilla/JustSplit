/**
 * Display formatters (plan B3). Consolidates on the symbol-based
 * `formatCurrency` (the one the legacy Next tree's 6 pages + `HoverCard` +
 * `BalanceOverview` used, from `src/utils/currencyExchange.ts`) rather than
 * the `Intl`-based one `FinancialSummary` used — that component's port
 * switches to this one too, so the app has exactly one `formatCurrency`.
 */
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from './currency';
import { parseCalendarDate } from './dates';

/** The currency symbol for a code, or `'$'` if the code is unsupported. */
export const getCurrencySymbol = (currencyCode: string = DEFAULT_CURRENCY): string => {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  return currency ? currency.symbol : '$';
};

/** e.g. `formatCurrency(12.5, 'USD') === '$12.50'`. Falls back to USD for an unsupported code. */
export const formatCurrency = (amount: number, currencyCode: string = DEFAULT_CURRENCY): string => {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  if (!currency) {
    return formatCurrency(amount, DEFAULT_CURRENCY);
  }
  return `${currency.symbol}${amount.toFixed(2)}`;
};

/**
 * e.g. `formatDate('2026-09-28') === 'Sep 28, 2026'`. Uses `parseCalendarDate`
 * (bug fix, B8a review) rather than a bare `new Date(dateString)`: the
 * latter reads a calendar-date string as UTC midnight, which showed the
 * PREVIOUS day for anyone west of UTC (the user base is largely in Mexico,
 * UTC-6). A full ISO timestamp (with a time and/or offset) is unaffected.
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = parseCalendarDate(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Invalid date';
  }
};

/** e.g. `formatPercentage(33.6) === '34%'`. */
export const formatPercentage = (value: number): string => `${Math.round(value)}%`;

/** Truncates `text` to `maxLength` characters, adding an ellipsis when it does. */
export const truncateText = (text: string, maxLength = 30): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};
