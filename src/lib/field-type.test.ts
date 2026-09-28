import { describe, expect, it } from 'vitest';
import { formatFieldValue, fieldTypeZodSchema, type FieldType } from './field-type';

// Pure-function behavior contracts for the fieldType union (ROADMAP Epic 24).
// These two functions (`formatFieldValue`, `fieldTypeZodSchema`) are the
// framework-agnostic core every surface (DataTable cell, description-list
// row, PropertyFilter widget, Form field) is built on top of — see
// src/components/ui/field-type/*.tsx for the JSX renderers that consume them.

describe('formatFieldValue', () => {
  it('formats a money fieldType using the configured currency', () => {
    const fieldType: FieldType = { type: 'money', label: 'Amount', currency: 'USD' };
    expect(formatFieldValue(fieldType, 1234.5)).toBe('$1,234.50');
  });

  it('formats a percent fieldType as a fraction with the configured decimals', () => {
    const fieldType: FieldType = { type: 'percent', label: 'Rate', decimals: 1 };
    expect(formatFieldValue(fieldType, 0.4256)).toBe('42.6%');
  });

  it('looks up the option label for select/status fieldTypes instead of the raw value', () => {
    const select: FieldType = {
      type: 'select',
      label: 'Category',
      options: [{ label: 'Books', value: 'books' }],
    };
    expect(formatFieldValue(select, 'books')).toBe('Books');

    const status: FieldType = {
      type: 'status',
      label: 'Status',
      statuses: [{ value: 'open', label: 'Open', tone: 'info' }],
    };
    expect(formatFieldValue(status, 'open')).toBe('Open');
  });

  it('formats a boolean fieldType using its configured true/false labels', () => {
    const fieldType: FieldType = {
      type: 'boolean',
      label: 'Active',
      trueLabel: 'Enabled',
      falseLabel: 'Disabled',
    };
    expect(formatFieldValue(fieldType, true)).toBe('Enabled');
    expect(formatFieldValue(fieldType, false)).toBe('Disabled');
  });

  it('renders an em dash for null/undefined values instead of "null"/"undefined"', () => {
    const fieldType: FieldType = { type: 'text', label: 'Note' };
    expect(formatFieldValue(fieldType, undefined)).toBe('—');
    expect(formatFieldValue(fieldType, null)).toBe('—');
  });
});

describe('fieldTypeZodSchema', () => {
  it('derives a Date-compatible schema for the date fieldType (accepts Date, rejects string)', () => {
    const schema = fieldTypeZodSchema({ type: 'date', label: 'Created' });
    expect(schema.safeParse(new Date('2026-01-01')).success).toBe(true);
    expect(schema.safeParse('2026-01-01').success).toBe(false);
  });

  it('derives an enum schema restricted to the select fieldType options', () => {
    const schema = fieldTypeZodSchema({
      type: 'select',
      label: 'Category',
      options: [
        { label: 'Books', value: 'books' },
        { label: 'Music', value: 'music' },
      ],
    });
    expect(schema.safeParse('books').success).toBe(true);
    expect(schema.safeParse('movies').success).toBe(false);
  });

  it('derives a boolean schema for the boolean fieldType', () => {
    const schema = fieldTypeZodSchema({ type: 'boolean', label: 'Active' });
    expect(schema.safeParse(true).success).toBe(true);
    expect(schema.safeParse('true').success).toBe(false);
  });
});
