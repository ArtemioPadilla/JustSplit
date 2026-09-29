import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import {
  formatDate,
  formatRange,
  triggerClass,
  type DatePickerProps,
  type DateRangePickerProps,
} from '@/components/ui/date-picker-shared';

// The light shell of the Date Picker + Date Range Picker (ROADMAP Epic 21).
//
// A picker is a Popover (floating-ui, popup state, backdrop, safe polygon) plus a
// Calendar (react-day-picker, date-fns, @date-fns/tz): ~55 kB gz that only an
// opened picker needs, on a page (/expenses/new) whose date field is one of many.
// So the shell renders a plain trigger button, identical to the real one and
// showing the same text, and loads `date-picker-impl.tsx` on the first click
// (plan B19). The impl then mounts already open, so the click is not lost.
// Hover, focus and touch warm the chunk, so it is usually there before the click
// lands. `src/tests/lazy-boundaries.test.ts` pins that this file never imports
// the Popover or the Calendar statically.
//
// The whole compound Popover/Calendar state stays inside the impl, so this is
// still safe to hydrate as a single island (docs/COMPONENTS.md §4).
const loadImpl = () => import('@/components/ui/date-picker-impl');
const DatePickerImpl = React.lazy(() => loadImpl().then((m) => ({ default: m.DatePicker })));
const DateRangePickerImpl = React.lazy(() => loadImpl().then((m) => ({ default: m.DateRangePicker })));

export type { DatePickerProps, DateRangePickerProps };

interface StandInProps {
  text: string;
  placeholder: string;
  width: 'w-[240px]' | 'w-[280px]';
  disabled?: boolean;
  className?: string;
  triggerProps?: React.ComponentPropsWithoutRef<'button'>;
  busy: boolean;
  onRequest: () => void;
}

/** Looks and reads like the real trigger; asks for the real picker when used. */
function StandIn({ text, placeholder, width, disabled, className, triggerProps, busy, onRequest }: StandInProps) {
  const warm = () => void loadImpl();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      {...triggerProps}
      aria-haspopup="dialog"
      aria-expanded="false"
      aria-busy={busy || undefined}
      className={triggerClass(width, Boolean(text), className)}
      onClick={(event) => {
        triggerProps?.onClick?.(event);
        onRequest();
      }}
      onPointerEnter={(event) => {
        warm();
        triggerProps?.onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        warm();
        triggerProps?.onFocus?.(event);
      }}
      onTouchStart={(event) => {
        warm();
        triggerProps?.onTouchStart?.(event);
      }}
    >
      <CalendarIcon className="mr-2 size-4" />
      {text ? text : <span>{placeholder}</span>}
    </Button>
  );
}

/** Single-date picker: Popover trigger showing the formatted date + Calendar in `mode="single"`. */
function DatePicker(props: DatePickerProps) {
  const { value, defaultValue, placeholder = 'Pick a date', disabled, className, triggerProps } = props;
  // Set by the first click: from then on the real picker mounts already open.
  const [requested, setRequested] = React.useState(false);
  const standIn = (busy: boolean) => (
    <StandIn
      text={formatDate(value !== undefined ? value : defaultValue)}
      placeholder={placeholder}
      width="w-[240px]"
      disabled={disabled}
      className={className}
      triggerProps={triggerProps}
      busy={busy}
      onRequest={() => setRequested(true)}
    />
  );
  if (!requested) return standIn(false);
  return (
    <React.Suspense fallback={standIn(true)}>
      <DatePickerImpl {...props} defaultOpen />
    </React.Suspense>
  );
}
DatePicker.displayName = 'DatePicker';

/** Date-range picker: same trigger/positioning shell, Calendar in `mode="range"`. */
function DateRangePicker(props: DateRangePickerProps) {
  const { value, defaultValue, placeholder = 'Pick a date range', disabled, className, triggerProps } = props;
  const [requested, setRequested] = React.useState(false);
  const selected: DateRange | undefined = value !== undefined ? value : defaultValue;
  const standIn = (busy: boolean) => (
    <StandIn
      text={formatRange(selected)}
      placeholder={placeholder}
      width="w-[280px]"
      disabled={disabled}
      className={className}
      triggerProps={triggerProps}
      busy={busy}
      onRequest={() => setRequested(true)}
    />
  );
  if (!requested) return standIn(false);
  return (
    <React.Suspense fallback={standIn(true)}>
      <DateRangePickerImpl {...props} defaultOpen />
    </React.Suspense>
  );
}
DateRangePicker.displayName = 'DateRangePicker';

export { DatePicker, DateRangePicker };
