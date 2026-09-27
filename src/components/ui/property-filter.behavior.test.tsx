// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { PropertyFilter, filterByTokens, type FilterToken, type FilterProperty } from './property-filter';
import type { FieldType } from '@/lib/field-type';

interface Row extends Record<string, unknown> {
  name: string;
  role: string;
  score: number;
}
const rows: Row[] = [
  { name: 'Alice', role: 'admin', score: 90 },
  { name: 'Bob', role: 'viewer', score: 40 },
  { name: 'Carol', role: 'admin', score: 75 },
];
const properties: FilterProperty[] = [
  { key: 'name', label: 'Name', operators: ['=', ':'] },
  { key: 'role', label: 'Role', operators: ['=', '!='] },
  { key: 'score', label: 'Score', operators: ['>', '<', '>=', '<='] },
];

describe('filterByTokens (pure predicate)', () => {
  it('returns all rows for no tokens', () => {
    expect(filterByTokens(rows, [])).toHaveLength(3);
  });
  it('AND-combines tokens', () => {
    const t: FilterToken[] = [
      { property: 'role', operator: '=', value: 'admin' },
      { property: 'score', operator: '>=', value: '80' },
    ];
    expect(filterByTokens(rows, t).map((r) => r.name)).toEqual(['Alice']);
  });
  it('contains (:) is case-insensitive substring', () => {
    expect(filterByTokens(rows, [{ property: 'name', operator: ':', value: 'a' }]).map((r) => r.name)).toEqual([
      'Alice',
      'Carol',
    ]);
  });
  it('!= excludes matches', () => {
    expect(filterByTokens(rows, [{ property: 'role', operator: '!=', value: 'admin' }]).map((r) => r.name)).toEqual([
      'Bob',
    ]);
  });
  it('numeric ops coerce; non-numeric value yields no match', () => {
    expect(filterByTokens(rows, [{ property: 'score', operator: '<', value: '50' }]).map((r) => r.name)).toEqual([
      'Bob',
    ]);
    expect(filterByTokens(rows, [{ property: 'score', operator: '>', value: 'x' }])).toHaveLength(0);
  });
});

describe('<PropertyFilter>', () => {
  it('adds a token via the builder and reports it', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PropertyFilter properties={properties} tokens={[]} onChange={onChange} />);
    await user.type(screen.getByLabelText('Filter value'), 'admin');
    await user.click(screen.getByLabelText('Add filter'));
    expect(onChange).toHaveBeenCalledWith([{ property: 'name', operator: '=', value: 'admin' }]);
  });
  it('renders existing tokens as removable chips', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PropertyFilter
        properties={properties}
        tokens={[{ property: 'role', operator: '=', value: 'admin' }]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByLabelText(/Remove filter Role/));
    expect(onChange).toHaveBeenCalledWith([]);
  });
  it('Add is disabled with an empty value', () => {
    render(<PropertyFilter properties={properties} tokens={[]} onChange={() => {}} />);
    expect(screen.getByLabelText('Add filter')).toBeDisabled();
  });
});

describe('<PropertyFilter> fieldType integration (ROADMAP Epic 24)', () => {
  const statusFieldType: FieldType = {
    type: 'status',
    label: 'Status',
    statuses: [
      { value: 'open', label: 'Open', tone: 'info' },
      { value: 'closed', label: 'Closed', tone: 'success' },
    ],
  };
  const propertiesWithFieldType: FilterProperty[] = [
    { key: 'status', label: 'Status', fieldType: statusFieldType },
  ];

  it('renders a <select> populated from fieldType.statuses instead of the plain text input', () => {
    render(<PropertyFilter properties={propertiesWithFieldType} tokens={[]} onChange={vi.fn()} />);
    const valueControl = screen.getByLabelText('Filter value');
    expect(valueControl.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Closed' })).toBeInTheDocument();
  });

  it('derives the operator choices from the fieldType when the property specifies none', () => {
    render(<PropertyFilter properties={propertiesWithFieldType} tokens={[]} onChange={vi.fn()} />);
    const opSelect = screen.getByLabelText('Filter operator') as HTMLSelectElement;
    const optionValues = Array.from(opSelect.options).map((o) => o.value);
    // 'status' fieldTypes default to equality-style operators only.
    expect(optionValues).toEqual(['=', '!=']);
  });
});
