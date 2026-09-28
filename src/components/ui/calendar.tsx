import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { DayPicker, type ChevronProps } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

// Calendar wraps react-day-picker's DayPicker (MIT). We deliberately do NOT
// import "react-day-picker/style.css" — every element is styled via the
// `classNames` prop below, mapped to Inceptor's existing CSS-var tokens, so
// dark mode and the shadcn visual language apply automatically.
type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: 'w-fit',
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'flex flex-col gap-4',
        nav: 'flex items-center justify-between absolute inset-x-0 top-0 px-1',
        month_caption: 'flex h-9 items-center justify-center text-sm font-medium',
        caption_label: 'text-sm font-medium text-foreground',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'size-7 bg-transparent p-0 text-muted-foreground hover:text-foreground',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'size-7 bg-transparent p-0 text-muted-foreground hover:text-foreground',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-center text-[0.8rem] font-normal text-muted-foreground',
        week: 'mt-2 flex w-full',
        day: 'relative size-9 p-0 text-center text-sm focus-within:relative focus-within:z-20',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-9 rounded-md p-0 font-normal text-foreground aria-selected:opacity-100',
        ),
        range_start: 'rounded-l-md bg-accent',
        range_middle: 'rounded-none bg-accent',
        range_end: 'rounded-r-md bg-accent',
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        today: '[&>button]:bg-accent [&>button]:text-accent-foreground',
        outside: 'text-muted-foreground opacity-50 aria-selected:opacity-30',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }: ChevronProps) =>
          orientation === 'left' ? (
            <ChevronLeftIcon className="size-4" {...chevronProps} />
          ) : (
            <ChevronRightIcon className="size-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
