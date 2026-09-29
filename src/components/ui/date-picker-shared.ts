import type { DateRange } from 'react-day-picker';
import type { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

/**
 * What the light shell (`date-picker.tsx`) and the real picker
 * (`date-picker-impl.tsx`) share: the value formatting, the trigger's look and the
 * prop types. No Popover, no Calendar and no react-day-picker RUNTIME import
 * (only types), so the shell can use it without pulling them in (plan B19).
 */
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function formatDate(date: Date | undefined): string {
  return date ? dateFormatter.format(date) : '';
}

export function formatRange(range: DateRange | undefined): string {
  if (!range?.from) return '';
  if (!range.to) return dateFormatter.format(range.from);
  return `${dateFormatter.format(range.from)} – ${dateFormatter.format(range.to)}`;
}

/** The trigger button's classes; the stand-in and the real trigger use the same, so the swap changes no pixel. */
export function triggerClass(width: 'w-[240px]' | 'w-[280px]', hasValue: boolean, className?: string): string {
  return cn(width + ' justify-start text-left font-normal', !hasValue && 'text-muted-foreground', className);
}

type CalendarProps = React.ComponentProps<typeof Calendar>;

export interface DatePickerProps {
  value?: Date | undefined;
  defaultValue?: Date | undefined;
  onValueChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Forwarded to the underlying react-day-picker Calendar (e.g. `disabled`, `fromDate`, `toDate`). */
  calendarProps?: Omit<CalendarProps, 'mode' | 'selected' | 'onSelect'>;
  /** Forwarded onto the Popover trigger button — e.g. `id`/`aria-describedby`/`aria-invalid` from a `<FormControl>` wrapper (see field-type/form-item.tsx). */
  triggerProps?: React.ComponentPropsWithoutRef<'button'>;
}

export interface DateRangePickerProps {
  value?: DateRange | undefined;
  defaultValue?: DateRange | undefined;
  onValueChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  calendarProps?: Omit<CalendarProps, 'mode' | 'selected' | 'onSelect'>;
  /** Forwarded onto the Popover trigger button — e.g. `id`/`aria-describedby`/`aria-invalid` from a `<FormControl>` wrapper (see field-type/form-item.tsx). */
  triggerProps?: React.ComponentPropsWithoutRef<'button'>;
}
