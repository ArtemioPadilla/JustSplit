import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import type { Control, ControllerRenderProps, FieldPath, FieldValues } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LazyDatePicker, LazyDateRangePicker } from '@/components/ui/field-type/lazy-date-picker';
import { OptionSelect } from '@/components/ui/field-type/option-select';
import { NumberField } from '@/components/ui/number-field';
import { Skeleton } from '@/components/ui/skeleton';
import type { FieldType } from '@/lib/field-type';
import { cn } from '@/lib/utils';

const selectClass = cn(
  'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm',
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

// react-hook-form's Controller `field` render-prop object is generic over
// the whole form's field values; FieldEditControl only needs the handful of
// members every widget below actually uses, and `unknown` is deliberate
// here (this is the one place a fieldType's runtime value type genuinely
// isn't statically knowable from the discriminated union).
type EditableField = Pick<
  ControllerRenderProps<FieldValues, string>,
  'name' | 'onChange' | 'onBlur' | 'value' | 'disabled' | 'ref'
>;

// Wraps DatePicker/DateRangePicker (plain function components, no
// forwardRef) in a ref-able <div> so FormControl's React.cloneElement can
// attach its ref without React's "function components cannot be given
// refs" dev warning — see form.tsx's FormControl doc comment. The a11y
// props FormControl injects (id/aria-describedby/aria-invalid, see A11yProps
// above) land on this wrapper too, and forward onto DatePicker's real
// trigger button — not the div — so a screen reader announces them on the
// actual interactive element, not an inert wrapper.
//
// DatePicker/DateRangePicker are lazy (lazy-date-picker.tsx) — react-day-picker
// is a real dependency only the 'date'/'dateRange' fieldType cases need, so
// every other fieldType-driven FieldFormItem consumer shouldn't pay for it.
// Suspense's fallback is a same-sized Skeleton so the layout doesn't jump
// once the chunk resolves (near-instant after the first date field on a
// page, since the chunk is then cached).
const DateFieldControl = React.forwardRef<
  HTMLDivElement,
  {
    value: Date | undefined;
    onChange: (date: Date | undefined) => void;
    minDate?: Date;
    maxDate?: Date;
  } & A11yProps
>(({ value, onChange, minDate, maxDate, ...a11y }, ref) => {
  // react-day-picker v9's min/max bound is a `disabled` Matcher, not
  // fromDate/toDate (that was v8's API) — see calendar.tsx's own DayPicker
  // wrapping for the same convention.
  const disabled = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];
  return (
    <div ref={ref}>
      <React.Suspense fallback={<Skeleton className="h-10 w-[240px]" />}>
        <LazyDatePicker
          value={value}
          onValueChange={onChange}
          calendarProps={disabled.length > 0 ? { disabled } : undefined}
          triggerProps={a11y}
        />
      </React.Suspense>
    </div>
  );
});
DateFieldControl.displayName = 'DateFieldControl';

const DateRangeFieldControl = React.forwardRef<
  HTMLDivElement,
  { value: DateRange | undefined; onChange: (range: DateRange | undefined) => void } & A11yProps
>(({ value, onChange, ...a11y }, ref) => (
  <div ref={ref}>
    <React.Suspense fallback={<Skeleton className="h-10 w-[280px]" />}>
      <LazyDateRangePicker value={value} onValueChange={onChange} triggerProps={a11y} />
    </React.Suspense>
  </div>
));
DateRangeFieldControl.displayName = 'DateRangeFieldControl';

// The subset of DOM a11y attributes FormControl injects via cloneElement
// (see form.tsx) — FieldEditControl is FormControl's direct child, but it's
// a switch/render component, not a DOM element or a props-forwarding
// wrapper, so those injected props land on FieldEditControl's own props and
// go no further unless explicitly threaded down to whichever real widget it
// renders. Without this, every fieldType-driven form field silently loses
// its id/aria-describedby/aria-invalid — the same class of bug a real
// axe-core "select-name" failure caught in CI on ShowcaseFieldType's demo.
interface A11yProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/**
 * (c)'s widget half — given a fieldType and react-hook-form's Controller
 * `field` object, renders the appropriate input, wired to `field.onChange`.
 * Not exported: FieldFormItem is the public surface (it also owns the
 * FormLabel/FormControl/FormMessage wiring around whichever widget this
 * returns).
 */
function FieldEditControl({
  fieldType,
  field,
  ...a11y
}: { fieldType: FieldType; field: EditableField } & A11yProps) {
  switch (fieldType.type) {
    case 'text':
      return (
        <Input
          name={field.name}
          onBlur={field.onBlur}
          onChange={(e) => field.onChange(e.target.value)}
          value={(field.value as string | undefined) ?? ''}
          disabled={field.disabled}
          placeholder={fieldType.placeholder}
          {...a11y}
        />
      );

    case 'number':
    case 'money':
    case 'percent':
      return (
        <NumberField
          value={typeof field.value === 'number' ? field.value : null}
          onValueChange={(next) => field.onChange(next ?? undefined)}
          min={fieldType.min}
          max={fieldType.max}
          step={'step' in fieldType ? fieldType.step : undefined}
          {...a11y}
        />
      );

    case 'boolean':
      return (
        <Checkbox
          checked={Boolean(field.value)}
          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
          disabled={field.disabled}
          {...a11y}
        />
      );

    case 'select':
      return (
        <OptionSelect
          name={field.name}
          onBlur={field.onBlur}
          onChange={(e) => field.onChange(e.target.value)}
          value={(field.value as string | undefined) ?? ''}
          disabled={field.disabled}
          className={selectClass}
          {...a11y}
          items={fieldType.options}
          placeholder="Select…"
          placeholderDisabled
        />
      );

    case 'status':
      return (
        <OptionSelect
          name={field.name}
          onBlur={field.onBlur}
          onChange={(e) => field.onChange(e.target.value)}
          value={(field.value as string | undefined) ?? ''}
          disabled={field.disabled}
          className={selectClass}
          {...a11y}
          items={fieldType.statuses}
          placeholder="Select…"
          placeholderDisabled
        />
      );

    case 'date':
      return (
        <DateFieldControl
          value={field.value as Date | undefined}
          onChange={field.onChange}
          minDate={fieldType.minDate}
          maxDate={fieldType.maxDate}
          {...a11y}
        />
      );

    case 'dateRange':
      return (
        <DateRangeFieldControl
          value={field.value as DateRange | undefined}
          onChange={field.onChange}
          {...a11y}
        />
      );
  }
}

export interface FieldFormItemProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  /** The unified fieldType definition driving this field (ROADMAP Epic 24, src/lib/field-type.ts). */
  fieldType: FieldType;
  /** Overrides fieldType.label for this specific usage. Defaults to fieldType.label. */
  label?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

/**
 * (c) Edit/form renderer (ROADMAP Epic 24) — one fieldType definition
 * drives the right react-hook-form-`Controller`-wired input, wrapped in the
 * existing Form compound-component pieces (FormItem/FormLabel/FormControl/
 * FormMessage — see form.tsx). Purely additive: full manual
 * `<FormField control={...} name={...} render={...}>` usage is unaffected
 * and still the right tool when a field needs custom rendering.
 *
 * Must live inside the same island as its surrounding `<Form>` — the
 * compound-component gotcha (CLAUDE.md) applies here exactly as it does to
 * every other `<Form>` usage.
 */
export function FieldFormItem<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, fieldType, label, description, className }: FieldFormItemProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label ?? fieldType.label}</FormLabel>
          <FormControl>
            <FieldEditControl fieldType={fieldType} field={field as unknown as EditableField} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
