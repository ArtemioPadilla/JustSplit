/**
 * `fieldType` — the unified field-data-type abstraction (ROADMAP Epic 24).
 *
 * Inspired by Ant Design ProComponents' `ProField` `valueType` system: one
 * data-type definition (money, date, select-with-options, status-badge…)
 * drives FOUR surfaces that were previously wired independently:
 *
 *   1. DataTable cell rendering       — `FieldDisplay` (src/components/ui/field-type/display.tsx)
 *   2. PropertyFilter/filter inputs   — `FieldFilterControl` (src/components/ui/field-type/filter-control.tsx)
 *   3. Form fields (react-hook-form)  — `FieldFormItem` (src/components/ui/field-type/form-item.tsx)
 *   4. description-list rows         — `FieldDisplay`, wired directly into `<DescriptionItem fieldType value />`
 *
 * This module is the framework-agnostic core all four depend on: the
 * discriminated union itself, a pure string formatter (`formatFieldValue`),
 * and a per-type Zod schema derivation (`fieldTypeZodSchema`) — Spec-DD's
 * "Zod is the source of truth" rule (docs/PRINCIPLES.md §3) applies here
 * too, so form validation for a `fieldType`-declared field is never a
 * hand-written interface.
 *
 * Deliberately has NO JSX — the renderer *components* live under
 * `src/components/ui/field-type/` since they need react-hook-form's
 * `Controller` pattern, Base UI primitives, and the date-picker components.
 * Keeping the type/format/schema layer JSX-free means it's trivially unit
 * testable and reusable from non-React contexts (e.g. a CSV export).
 */
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import { formatDate } from '@/lib/format-date';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface SelectOption {
  label: string;
  value: string;
}

export interface StatusOption {
  value: string;
  label: string;
  tone: StatusTone;
}

interface FieldTypeBase {
  /** Human-readable label — default Form field label / description-list term when the caller doesn't override it. */
  label: string;
}

export interface TextFieldType extends FieldTypeBase {
  type: 'text';
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
}

export interface NumberFieldType extends FieldTypeBase {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

export interface MoneyFieldType extends FieldTypeBase {
  type: 'money';
  /** ISO 4217 currency code, e.g. 'USD'. */
  currency: string;
  /** BCP 47 locale tag. Defaults to 'en-US'. */
  locale?: string;
  min?: number;
  max?: number;
}

export interface PercentFieldType extends FieldTypeBase {
  type: 'percent';
  /** Decimal places shown. Defaults to 0. Value is a fraction (0.42 -> "42%"), not 42. */
  decimals?: number;
  min?: number;
  max?: number;
}

export interface DateFieldType extends FieldTypeBase {
  type: 'date';
  minDate?: Date;
  maxDate?: Date;
}

export interface DateRangeFieldType extends FieldTypeBase {
  type: 'dateRange';
}

export interface SelectFieldType extends FieldTypeBase {
  type: 'select';
  options: SelectOption[];
}

export interface StatusFieldType extends FieldTypeBase {
  type: 'status';
  statuses: StatusOption[];
}

export interface BooleanFieldType extends FieldTypeBase {
  type: 'boolean';
  trueLabel?: string;
  falseLabel?: string;
}

/**
 * The discriminated union. `type` is the discriminant every renderer
 * switches on. Add a new field type here + a `case` in each of
 * `formatFieldValue`, `fieldTypeZodSchema`, `FieldDisplay`,
 * `FieldFilterControl`, and `FieldEditControl` (form-item.tsx) to extend.
 */
export type FieldType =
  | TextFieldType
  | NumberFieldType
  | MoneyFieldType
  | PercentFieldType
  | DateFieldType
  | DateRangeFieldType
  | SelectFieldType
  | StatusFieldType
  | BooleanFieldType;

/** Coerce an unknown value to a finite number, or undefined if it isn't one. */
function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Coerce an unknown value to a Date, or undefined if it isn't a valid one. */
function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

const EMPTY = '—';

/**
 * (a) The read/display renderer's pure core — given a fieldType and a raw
 * value, return the correctly formatted string. `FieldDisplay`
 * (src/components/ui/field-type/display.tsx) wraps this for JSX contexts
 * (adding a colored `<Badge>` for 'status'); everything else can call this
 * directly (CSV export, plain-text contexts, etc).
 */
export function formatFieldValue(fieldType: FieldType, value: unknown): string {
  switch (fieldType.type) {
    case 'text':
      return value == null || value === '' ? EMPTY : String(value);

    case 'number': {
      const n = toNumber(value);
      return n === undefined ? EMPTY : n.toLocaleString('en-US');
    }

    case 'money': {
      const n = toNumber(value);
      if (n === undefined) return EMPTY;
      return new Intl.NumberFormat(fieldType.locale ?? 'en-US', {
        style: 'currency',
        currency: fieldType.currency,
      }).format(n);
    }

    case 'percent': {
      const n = toNumber(value);
      if (n === undefined) return EMPTY;
      const decimals = fieldType.decimals ?? 0;
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n);
    }

    case 'date': {
      const d = toDate(value);
      return d ? formatDate(d) : EMPTY;
    }

    case 'dateRange': {
      const range = value as DateRange | null | undefined;
      if (!range?.from) return EMPTY;
      if (!range.to) return formatDate(range.from);
      return `${formatDate(range.from)} – ${formatDate(range.to)}`;
    }

    case 'select': {
      const opt = fieldType.options.find((o) => o.value === String(value));
      if (opt) return opt.label;
      return value == null || value === '' ? EMPTY : String(value);
    }

    case 'status': {
      const opt = fieldType.statuses.find((o) => o.value === String(value));
      if (opt) return opt.label;
      return value == null || value === '' ? EMPTY : String(value);
    }

    case 'boolean':
      return value ? (fieldType.trueLabel ?? 'Yes') : (fieldType.falseLabel ?? 'No');
  }
}

/**
 * (c)'s validation half — derives a Zod schema per fieldType (Spec-DD,
 * docs/PRINCIPLES.md §3: cross-boundary types are Zod schemas, never
 * hand-written interfaces). Compose these into a form schema with
 * `z.object({ amount: fieldTypeZodSchema(fieldDefs.amount), ... })`, or let
 * `FieldFormItem` build a single-field schema on the fly when no external
 * resolver is supplied.
 */
export function fieldTypeZodSchema(fieldType: FieldType): z.ZodTypeAny {
  switch (fieldType.type) {
    case 'text': {
      let schema = z.string();
      if (fieldType.minLength !== undefined) schema = schema.min(fieldType.minLength);
      if (fieldType.maxLength !== undefined) schema = schema.max(fieldType.maxLength);
      return schema;
    }

    case 'number':
    case 'money':
    case 'percent': {
      let schema = z.number();
      if (fieldType.min !== undefined) schema = schema.min(fieldType.min);
      if (fieldType.max !== undefined) schema = schema.max(fieldType.max);
      return schema;
    }

    case 'date': {
      let schema = z.date();
      if (fieldType.minDate) schema = schema.min(fieldType.minDate);
      if (fieldType.maxDate) schema = schema.max(fieldType.maxDate);
      return schema;
    }

    case 'dateRange':
      return z.object({ from: z.date().optional(), to: z.date().optional() });

    case 'select': {
      const values = fieldType.options.map((o) => o.value);
      return values.length > 0 ? z.enum(values as [string, ...string[]]) : z.string();
    }

    case 'status': {
      const values = fieldType.statuses.map((o) => o.value);
      return values.length > 0 ? z.enum(values as [string, ...string[]]) : z.string();
    }

    case 'boolean':
      return z.boolean();
  }
}
