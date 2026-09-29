import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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

  /**
   * Bug fix (found in B8a review): a calendar-date string (`YYYY-MM-DD`)
   * parsed with plain `new Date(...)` is UTC midnight, which reads back as
   * the PREVIOUS local day west of UTC — the user base is largely in Mexico
   * (UTC-6). Pinned to America/Mexico_City so this fails for the right
   * reason regardless of where/when the suite runs.
   */
  describe('timezone-safe calendar-date parsing (bug fix)', () => {
    let originalTZ: string | undefined;

    beforeAll(() => {
      originalTZ = process.env.TZ;
      process.env.TZ = 'America/Mexico_City';
    });

    afterAll(() => {
      // Unset stays unset: assigning undefined would leave the string "undefined" (plan A7).
      if (originalTZ === undefined) delete process.env.TZ;
      else process.env.TZ = originalTZ;
    });

    it('shows the 1st for a 2026-03-01 calendar-date string, not the last day of February', () => {
      expect(formatDate('2026-03-01')).toBe('Mar 1, 2026');
    });
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
