import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { LazyDatePicker, LazyDateRangePicker } from '@/components/ui/field-type/lazy-date-picker';
import { OptionSelect } from '@/components/ui/field-type/option-select';
import type { Operator } from '@/components/ui/property-filter';
import { Skeleton } from '@/components/ui/skeleton';
import type { FieldType } from '@/lib/field-type';
import { cn } from '@/lib/utils';

const filterControlClass = cn(
  'min-w-[8rem] flex-1 rounded bg-transparent py-1 text-xs outline-none',
  'placeholder:text-muted-foreground',
);

/**
 * (b)'s operator half — the default `Operator` choices offered for a
 * `FilterProperty` that sets `fieldType` but not its own `operators`
 * (ROADMAP Epic 24). Numeric/date-ish types get the full comparison set;
 * closed-choice types (select/status/boolean) only get equality.
 */
export function defaultOperatorsForFieldType(fieldType: FieldType): Operator[] {
  switch (fieldType.type) {
    case 'number':
    case 'money':
    case 'percent':
    case 'date':
    case 'dateRange':
      return ['=', '>', '<', '>=', '<='];
    case 'select':
    case 'status':
    case 'boolean':
      return ['=', '!='];
    case 'text':
    default:
      return ['=', ':'];
  }
}

// dateRange tokens serialize as `from..to` (either half may be empty) so the
// PropertyFilter token contract (FilterToken.value: string) still holds.
function parseRangeValue(value: string): DateRange | undefined {
  if (!value) return undefined;
  const [from, to] = value.split('..');
  return { from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined };
}

function serializeRangeValue(range: DateRange | undefined): string {
  if (!range?.from) return '';
  const from = range.from.toISOString().slice(0, 10);
  const to = range.to ? range.to.toISOString().slice(0, 10) : '';
  return `${from}..${to}`;
}

export interface FieldFilterControlProps {
  fieldType: FieldType;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Called on Enter — PropertyFilter wires this to "add the token", mirroring the plain text-input's behavior. */
  onEnter?: () => void;
}

function enterKeyDown(onEnter: (() => void) | undefined): React.KeyboardEventHandler {
  return (e) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };
}

/**
 * (b) Filter renderer (ROADMAP Epic 24) — given a fieldType, renders the
 * input appropriate for building one `PropertyFilter` token's value.
 * `value`/`onChange` are always plain strings (the `FilterToken` contract in
 * property-filter.tsx) — date/boolean/select widgets serialize to and from
 * string internally so the rest of PropertyFilter never needs to know which
 * widget produced the string.
 */
export function FieldFilterControl({ fieldType, value, onChange, placeholder, onEnter }: FieldFilterControlProps) {
  switch (fieldType.type) {
    case 'select':
      return (
        <OptionSelect
          aria-label="Filter value"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={enterKeyDown(onEnter)}
          className={filterControlClass}
          items={fieldType.options}
          placeholder={placeholder ?? 'Select…'}
        />
      );

    case 'status':
      return (
        <OptionSelect
          aria-label="Filter value"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={enterKeyDown(onEnter)}
          className={filterControlClass}
          items={fieldType.statuses}
          placeholder={placeholder ?? 'Select…'}
        />
      );

    case 'boolean':
      return (
        <OptionSelect
          aria-label="Filter value"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={enterKeyDown(onEnter)}
          className={filterControlClass}
          items={[
            { value: 'true', label: fieldType.trueLabel ?? 'Yes' },
            { value: 'false', label: fieldType.falseLabel ?? 'No' },
          ]}
          placeholder={placeholder ?? 'Select…'}
        />
      );

    case 'number':
    case 'money':
    case 'percent':
      return (
        <input
          type="number"
          aria-label="Filter value"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={enterKeyDown(onEnter)}
          placeholder={placeholder}
          className={filterControlClass}
        />
      );

    case 'date':
      // Lazy — react-day-picker (via DatePicker → Calendar) is only needed
      // by this and the dateRange case below; see lazy-date-picker.tsx.
      return (
        <React.Suspense fallback={<Skeleton className="h-7 w-[9rem]" />}>
          <LazyDatePicker
            value={value ? new Date(value) : undefined}
            onValueChange={(date) => onChange(date ? date.toISOString().slice(0, 10) : '')}
            placeholder={placeholder ?? 'Pick a date'}
            className="h-7 w-auto min-w-[9rem] border-none bg-transparent px-1 py-0 text-xs shadow-none"
          />
        </React.Suspense>
      );

    case 'dateRange':
      return (
        <React.Suspense fallback={<Skeleton className="h-7 w-[11rem]" />}>
          <LazyDateRangePicker
            value={parseRangeValue(value)}
            onValueChange={(range) => onChange(serializeRangeValue(range))}
            placeholder={placeholder ?? 'Pick a date range'}
            className="h-7 w-auto min-w-[11rem] border-none bg-transparent px-1 py-0 text-xs shadow-none"
          />
        </React.Suspense>
      );

    case 'text':
    default:
      return (
        <input
          type="text"
          aria-label="Filter value"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={enterKeyDown(onEnter)}
          placeholder={placeholder}
          className={filterControlClass}
        />
      );
  }
}
