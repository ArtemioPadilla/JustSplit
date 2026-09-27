import * as React from 'react';
import { XIcon, PlusIcon } from 'lucide-react';
import { FieldFilterControl, defaultOperatorsForFieldType } from '@/components/ui/field-type/filter-control';
import type { FieldType } from '@/lib/field-type';
import { cn } from '@/lib/utils';

/**
 * PropertyFilter — token-based structured filtering (Cloudscape gap roadmap
 * Epic D, the single most-missed Cloudscape collection control).
 *
 * The user composes a query out of `{ property, operator, value }` tokens
 * shown as removable chips, instead of one fuzzy text box. The pure
 * `filterByTokens` predicate is the testable core; the component is the
 * builder UI around it.
 */
export type Operator = '=' | '!=' | ':' | '>' | '<' | '>=' | '<=';

export interface FilterProperty {
  /** Row key this token filters on. */
  key: string;
  label: string;
  /**
   * Operators offered for this property. Defaults to `['=', ':']`, or to
   * `defaultOperatorsForFieldType(fieldType)` when `fieldType` is set and
   * this is omitted.
   */
  operators?: Operator[];
  /**
   * A unified fieldType definition (ROADMAP Epic 24, `src/lib/field-type.ts`)
   * — when set, PropertyFilter derives the token-value builder's input
   * widget from it (a `<select>` for select/status/boolean, a date picker
   * for date/dateRange, a number input for money/number/percent) instead of
   * the plain text `<input>`, and falls back to
   * `defaultOperatorsForFieldType` for `operators` when the property doesn't
   * specify its own. Fully additive — properties without `fieldType` behave
   * exactly as before.
   */
  fieldType?: FieldType;
}

export interface FilterToken {
  property: string;
  operator: Operator;
  value: string;
}

const OP_LABEL: Record<Operator, string> = {
  '=': 'is',
  '!=': 'is not',
  ':': 'contains',
  '>': '>',
  '<': '<',
  '>=': '≥',
  '<=': '≤',
};

/** Apply one token to one row value. Numeric ops coerce; string ops don't. */
function matchOne(raw: unknown, op: Operator, value: string): boolean {
  const s = String(raw ?? '').toLowerCase();
  const v = value.toLowerCase();
  switch (op) {
    case '=':
      return s === v;
    case '!=':
      return s !== v;
    case ':':
      return s.includes(v);
    case '>':
    case '<':
    case '>=':
    case '<=': {
      const a = Number(raw);
      const b = Number(value);
      if (Number.isNaN(a) || Number.isNaN(b)) return false;
      return op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : a <= b;
    }
  }
}

/** Pure predicate: a row matches when it satisfies EVERY token (AND semantics). */
export function filterByTokens<T extends object>(rows: T[], tokens: FilterToken[]): T[] {
  if (tokens.length === 0) return rows;
  return rows.filter((row) =>
    tokens.every((t) => matchOne((row as Record<string, unknown>)[t.property], t.operator, t.value)),
  );
}

export interface PropertyFilterProps {
  properties: FilterProperty[];
  tokens: FilterToken[];
  onChange: (tokens: FilterToken[]) => void;
  className?: string;
  placeholder?: string;
}

export function PropertyFilter({
  properties,
  tokens,
  onChange,
  className,
  placeholder = 'Add a filter…',
}: PropertyFilterProps) {
  const [prop, setProp] = React.useState(properties[0]?.key ?? '');
  const current = properties.find((p) => p.key === prop) ?? properties[0];
  const ops =
    current?.operators ??
    (current?.fieldType ? defaultOperatorsForFieldType(current.fieldType) : (['=', ':'] as Operator[]));
  const [op, setOp] = React.useState<Operator>(ops[0] ?? '=');
  const [value, setValue] = React.useState('');

  // Keep operator valid when the property changes.
  React.useEffect(() => {
    if (!ops.includes(op)) setOp(ops[0] ?? '=');
  }, [prop]); // eslint-disable-line react-hooks/exhaustive-deps -- ops derives from prop

  function addToken() {
    if (!current || value.trim() === '') return;
    onChange([...tokens, { property: current.key, operator: op, value: value.trim() }]);
    setValue('');
  }

  function removeToken(i: number) {
    onChange(tokens.filter((_, idx) => idx !== i));
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring"
        role="group"
        aria-label="Property filter"
      >
        {tokens.map((t, i) => {
          const label = properties.find((p) => p.key === t.property)?.label ?? t.property;
          return (
            <span
              key={`${t.property}-${t.operator}-${t.value}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground">{OP_LABEL[t.operator]}</span>
              <span>{t.value}</span>
              <button
                type="button"
                aria-label={`Remove filter ${label} ${OP_LABEL[t.operator]} ${t.value}`}
                onClick={() => removeToken(i)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <div className="flex flex-1 items-center gap-1.5">
          <select
            aria-label="Filter property"
            value={prop}
            onChange={(e) => setProp(e.target.value)}
            className="rounded bg-transparent py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {properties.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter operator"
            value={op}
            onChange={(e) => setOp(e.target.value as Operator)}
            className="rounded bg-transparent py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ops.map((o) => (
              <option key={o} value={o}>
                {OP_LABEL[o]}
              </option>
            ))}
          </select>
          {current?.fieldType ? (
            // A fieldType-driven widget (select/date-picker/number input) is
            // itself a real interactive control, so the Enter-to-add
            // shortcut is wired inside FieldFilterControl's own elements
            // rather than a synthetic keydown wrapper here (which would
            // need its own role+tabIndex to stay accessible — simpler to
            // not introduce one).
            <div className="flex flex-1 items-center">
              <FieldFilterControl
                fieldType={current.fieldType}
                value={value}
                onChange={setValue}
                placeholder={placeholder}
                onEnter={addToken}
              />
            </div>
          ) : (
            <input
              aria-label="Filter value"
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addToken();
                }
              }}
              className="min-w-[8rem] flex-1 bg-transparent py-1 text-xs outline-none placeholder:text-muted-foreground"
            />
          )}
          <button
            type="button"
            aria-label="Add filter"
            onClick={addToken}
            disabled={value.trim() === ''}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {tokens.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
