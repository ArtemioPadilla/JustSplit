import { describe, expect, it } from 'vitest';
import { ensureCSVExtension } from './fileUtils';

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
