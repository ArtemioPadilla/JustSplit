import { describe, expect, it } from 'vitest';
import { ensureCSVExtension, sanitizeFilename } from './fileUtils';

/** New suite (plan B3): `domain/fileUtils.ts` had no dedicated Jest suite in the legacy tree. */
describe('ensureCSVExtension', () => {
  it('appends .csv when missing', () => {
    expect(ensureCSVExtension('expenses')).toBe('expenses.csv');
  });

  it('leaves a filename that already ends with .csv unchanged', () => {
    expect(ensureCSVExtension('expenses.csv')).toBe('expenses.csv');
  });

  it('is case-insensitive when checking the existing extension', () => {
    expect(ensureCSVExtension('expenses.CSV')).toBe('expenses.CSV');
  });

  it('does not confuse a .csv-like substring in the middle of the name', () => {
    expect(ensureCSVExtension('csv-export')).toBe('csv-export.csv');
  });
});

/**
 * New helper (plan B17a): `ExportCsvButton`'s callers build filenames from
 * user-controlled event names (`<event.name>-expenses.csv`) — strip
 * path-/OS-hostile characters and control characters before they ever reach
 * `download-trigger.tsx`'s `anchor.download`.
 */
describe('sanitizeFilename', () => {
  it('strips path- and OS-hostile characters', () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe('abcdefghij');
  });

  it('strips control characters', () => {
    expect(sanitizeFilename('Trip\x00Report')).toBe('TripReport');
  });

  it('collapses internal whitespace runs into a single space', () => {
    expect(sanitizeFilename('Summer   Trip')).toBe('Summer Trip');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeFilename('  Summer Trip  ')).toBe('Summer Trip');
  });

  it('leaves a benign filename unchanged', () => {
    expect(sanitizeFilename('Summer Trip 2026')).toBe('Summer Trip 2026');
  });

  it('falls back to "expenses.csv" when sanitizing empties the name', () => {
    expect(sanitizeFilename('///')).toBe('expenses.csv');
  });

  it('falls back to "expenses.csv" for an empty string', () => {
    expect(sanitizeFilename('')).toBe('expenses.csv');
  });
});
