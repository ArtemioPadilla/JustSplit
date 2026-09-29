import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  formatDate,
  formatRange,
  triggerClass,
  type DatePickerProps,
  type DateRangePickerProps,
} from '@/components/ui/date-picker-shared';

// The real Popover + Calendar pickers. Loaded on first use by the light shell
// (`date-picker.tsx`, plan B19); nothing else imports this file. `defaultOpen` is
// how the shell hands over the click that asked for it: the picker mounts open.
//
// Date Picker + Date Range Picker — a Popover + Calendar composition,
// following shadcn's Base UI date-picker pattern near-verbatim (ROADMAP
// Epic 21). This file owns the whole compound Popover/Calendar state
// internally, so it is safe to hydrate as a single island like any other
// self-contained shadcn primitive (see docs/COMPONENTS.md §4).

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
  defaultOpen = false,
}: DatePickerProps & { defaultOpen?: boolean }) {
  const [internalValue, setInternalValue] = React.useState<Date | undefined>(defaultValue);
  const [open, setOpen] = React.useState(defaultOpen);
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
          <Button variant="outline" className={triggerClass('w-[240px]', Boolean(selected), className)} />
        }
      >
        <CalendarIcon className="mr-2 size-4" />
        {selected ? formatDate(selected) : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        {/* Open on the selected date's month (today's when nothing is selected, since an
            undefined defaultMonth means today). `calendarProps` comes last so a caller can still choose. */}
        <Calendar mode="single" selected={selected} defaultMonth={selected} onSelect={handleSelect} {...calendarProps} />
      </PopoverContent>
    </Popover>
  );
}
DatePicker.displayName = 'DatePicker';

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
  defaultOpen = false,
}: DateRangePickerProps & { defaultOpen?: boolean }) {
  const [internalValue, setInternalValue] = React.useState<DateRange | undefined>(defaultValue);
  const [open, setOpen] = React.useState(defaultOpen);
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
          <Button variant="outline" className={triggerClass('w-[280px]', Boolean(selected?.from), className)} />
        }
      >
        <CalendarIcon className="mr-2 size-4" />
        {selected?.from ? formatRange(selected) : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="range"
          selected={selected}
          defaultMonth={selected?.from}
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
