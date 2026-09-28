import * as React from 'react';

// DatePicker/DateRangePicker (date-picker.tsx) statically import Calendar
// (calendar.tsx), which statically imports react-day-picker's DayPicker — a
// real, non-trivial dependency that only 2 of the 7 fieldType.type cases
// (`date`/`dateRange`) ever need. filter-control.tsx and form-item.tsx each
// drive a switch over every fieldType case, so a static top-level import of
// DatePicker/DateRangePicker would make every consumer of either file pay
// for react-day-picker even when it never configures a date fieldType.
//
// `React.lazy` + a dynamic `import()` here is what actually gets Vite to
// split react-day-picker into its own chunk (React.lazy alone doesn't
// guarantee code-splitting — it's the dynamic `import()` call Vite's bundler
// recognizes as a split point; React.lazy just knows how to await whatever
// that import() resolves to). Verified via `npm run build`: a dedicated
// `date-picker` chunk appears in `dist/`, separate from the chunks that
// import filter-control.tsx/form-item.tsx.
export const LazyDatePicker = React.lazy(() =>
  import('@/components/ui/date-picker').then((m) => ({ default: m.DatePicker })),
);

export const LazyDateRangePicker = React.lazy(() =>
  import('@/components/ui/date-picker').then((m) => ({ default: m.DateRangePicker })),
);
