import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatPercentage, getCurrencySymbol, truncateText } from './formatters';

/** New suite (plan B3): `domain/formatters.ts` had no dedicated Jest suite in the legacy tree. */
describe('formatCurrency (the symbol-based, consolidated implementation)', () => {
  it('formats a USD amount with the $ symbol and two decimals', () => {
    expect(formatCurrency(12.5, 'USD')).toBe('$12.50');
  });

  it('formats a EUR amount with the € symbol', () => {
    expect(formatCurrency(9, 'EUR')).toBe('€9.00');
  });

  it('defaults to USD when no currency is given', () => {
    expect(formatCurrency(1)).toBe('$1.00');
  });

  it('falls back to USD for an unsupported currency code', () => {
    expect(formatCurrency(5, 'ZZZ')).toBe('$5.00');
  });
});

describe('getCurrencySymbol', () => {
  it('returns the symbol for a supported code', () => {
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  it('returns $ for an unsupported code', () => {
    expect(getCurrencySymbol('ZZZ')).toBe('$');
  });
});

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    expect(formatDate('2026-09-28')).toBe('Sep 28, 2026');
  });

  it('passes garbage input through to `Date`\'s own "Invalid Date" string rather than throwing', () => {
    expect(formatDate('not-a-real-date')).toBe('Invalid Date');
  });
});

describe('formatPercentage', () => {
  it('rounds to the nearest whole percent', () => {
    expect(formatPercentage(33.6)).toBe('34%');
    expect(formatPercentage(0)).toBe('0%');
  });
});

describe('truncateText', () => {
  it('returns the original text when shorter than maxLength', () => {
    expect(truncateText('short')).toBe('short');
  });

  it('truncates and appends an ellipsis when longer than maxLength', () => {
    expect(truncateText('a'.repeat(40), 10)).toBe(`${'a'.repeat(10)}...`);
  });

  it('returns an empty string for falsy input', () => {
    expect(truncateText('')).toBe('');
  });
});
