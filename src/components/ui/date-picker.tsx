import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Date Picker + Date Range Picker — a Popover + Calendar composition,
// following shadcn's Base UI date-picker pattern near-verbatim (ROADMAP
// Epic 21). This file owns the whole compound Popover/Calendar state
// internally, so it is safe to hydrate as a single island like any other
// self-contained shadcn primitive (see docs/COMPONENTS.md §4).

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function formatDate(date: Date | undefined): string {
  return date ? dateFormatter.format(date) : '';
}

export interface DatePickerProps {
  value?: Date | undefined;
  defaultValue?: Date | undefined;
  onValueChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Forwarded to the underlying react-day-picker Calendar (e.g. `disabled`, `fromDate`, `toDate`). */
  calendarProps?: Omit<React.ComponentProps<typeof Calendar>, 'mode' | 'selected' | 'onSelect'>;
  /** Forwarded onto the Popover trigger button — e.g. `id`/`aria-describedby`/`aria-invalid` from a `<FormControl>` wrapper (see field-type/form-item.tsx). */
  triggerProps?: React.ComponentPropsWithoutRef<'button'>;
}

/** Single-date picker: Popover trigger showing the formatted date + Calendar in `mode="single"`. */
function DatePicker({
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Pick a date',
  disabled,
  className,
  calendarProps,
  triggerProps,
}: DatePickerProps) {
  const [internalValue, setInternalValue] = React.useState<Date | undefined>(defaultValue);
  const [open, setOpen] = React.useState(false);
  const isControlled = value !== undefined;
  const selected = isControlled ? value : internalValue;

  const handleSelect = React.useCallback(
    (date: Date | undefined) => {
      if (!isControlled) setInternalValue(date);
      onValueChange?.(date);
      setOpen(false); // Auto-close on select — a single day fully completes the choice.
    },
    [isControlled, onValueChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        {...triggerProps}
        render={
          <Button
            variant="outline"
            className={cn(
              'w-[240px] justify-start text-left font-normal',
              !selected && 'text-muted-foreground',
              className,
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 size-4" />
        {selected ? formatDate(selected) : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={selected} onSelect={handleSelect} {...calendarProps} />
      </PopoverContent>
    </Popover>
  );
}
DatePicker.displayName = 'DatePicker';

export interface DateRangePickerProps {
  value?: DateRange | undefined;
  defaultValue?: DateRange | undefined;
  onValueChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  calendarProps?: Omit<React.ComponentProps<typeof Calendar>, 'mode' | 'selected' | 'onSelect'>;
  /** Forwarded onto the Popover trigger button — e.g. `id`/`aria-describedby`/`aria-invalid` from a `<FormControl>` wrapper (see field-type/form-item.tsx). */
  triggerProps?: React.ComponentPropsWithoutRef<'button'>;
}

function formatRange(range: DateRange | undefined): string {
  if (!range?.from) return '';
  if (!range.to) return dateFormatter.format(range.from);
  return `${dateFormatter.format(range.from)} – ${dateFormatter.format(range.to)}`;
}

/** Date-range picker: same trigger/positioning shell, Calendar in `mode="range"`. */
function DateRangePicker({
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Pick a date range',
  disabled,
  className,
  calendarProps,
  triggerProps,
}: DateRangePickerProps) {
  const [internalValue, setInternalValue] = React.useState<DateRange | undefined>(defaultValue);
  const [open, setOpen] = React.useState(false);
  const isControlled = value !== undefined;
  const selected = isControlled ? value : internalValue;

  const handleSelect = React.useCallback(
    (range: DateRange | undefined) => {
      if (!isControlled) setInternalValue(range);
      onValueChange?.(range);
      // Only close once both ends of the range are picked — range mode
      // needs two clicks, unlike the single-date auto-close above.
      if (range?.from && range?.to) setOpen(false);
    },
    [isControlled, onValueChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        {...triggerProps}
        render={
          <Button
            variant="outline"
            className={cn(
              'w-[280px] justify-start text-left font-normal',
              !selected?.from && 'text-muted-foreground',
              className,
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 size-4" />
        {selected?.from ? formatRange(selected) : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  );
}
DateRangePicker.displayName = 'DateRangePicker';

export { DatePicker, DateRangePicker };
