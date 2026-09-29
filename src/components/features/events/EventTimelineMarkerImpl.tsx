import * as React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { formatCurrency } from '@/domain/formatters';
import { formatTimelineDate } from '@/domain/timeline';
import { expenseAriaLabel, isSettled, paidByName, type EventTimelineExpense } from './event-timeline-shared';

// The real marker (a Base UI hover card: trigger + popup), loaded on first use by
// the light timeline (`EventTimeline.tsx`, plan B19b); nothing else imports this
// file. It renders the SAME `<button>` the plain marker rendered (`markerProps`), as
// the hover-card trigger, so the swap changes no pixel and no accessible name.

/** Attributes the marker button carries: its name, position, status and look. Shared by the plain and the real marker. */
export interface MarkerButtonProps {
  'data-testid': string;
  'aria-label': string;
  'data-pre-event': true | undefined;
  'data-post-event': true | undefined;
  'data-status': string;
  className: string;
  style: React.CSSProperties;
}

/** What the popup lists: one group of same-day expenses and how to word and navigate them. */
export interface TimelineMarkerCard {
  group: { position: number; expenses: EventTimelineExpense[] };
  users: Record<string, string>;
  convert: (amount: number, currency: string) => number;
  currency: string;
  onNavigate: (expenseId: string) => void;
  showSettlementStatus: boolean;
}

export interface EventTimelineMarkerImplProps {
  markerProps: MarkerButtonProps;
  card: TimelineMarkerCard;
  /** The pointer or focus was already on the plain marker when this arrived: open at once instead of waiting for the next event. */
  defaultOpen?: boolean;
  /** The plain marker had keyboard focus: this one takes it over so the keyboard user is not dropped on `<body>`. */
  focusOnMount?: boolean;
}

export function EventTimelineMarkerImpl({ markerProps, card, defaultOpen = false, focusOnMount = false }: EventTimelineMarkerImplProps) {
  const { group, users, convert, currency, onNavigate, showSettlementStatus } = card;
  const isGrouped = group.expenses.length > 1;
  // Base UI types the trigger's ref as an anchor even when `render` makes it a button; only `.focus()` is used.
  const triggerRef = React.useRef<HTMLAnchorElement>(null);

  // Layout effect: before paint, so focus never visibly leaves the marker.
  React.useLayoutEffect(() => {
    if (focusOnMount) triggerRef.current?.focus({ preventScroll: true });
  }, [focusOnMount]);

  return (
    <HoverCard defaultOpen={defaultOpen}>
      <HoverCardTrigger ref={triggerRef} render={<button type="button" />} delay={0} {...markerProps} />
      <HoverCardContent className="w-72">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-popover-foreground">{isGrouped ? `${group.expenses.length} expenses` : 'Expense details'}</p>
            {isGrouped && showSettlementStatus && (
              <p className="text-xs text-muted-foreground">
                {group.expenses.filter(isSettled).length} settled, {group.expenses.filter((e) => !isSettled(e)).length} unsettled
              </p>
            )}
          </div>
          <ul className="flex flex-col gap-1">
            {group.expenses.map((expense) => (
              <li key={expense.id}>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => onNavigate(expense.id)}
                  aria-label={expenseAriaLabel(expense, convert, currency, showSettlementStatus)}
                  className="flex w-full flex-col gap-0.5 rounded-md p-2 text-left text-xs hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <span className="flex items-center justify-between gap-2 font-medium text-popover-foreground">
                    <span>{expense.description}</span>
                    {showSettlementStatus && <span>{isSettled(expense) ? 'Settled' : 'Unsettled'}</span>}
                  </span>
                  <span className="flex items-center justify-between gap-2 text-muted-foreground">
                    <span>{formatTimelineDate(expense.date)}</span>
                    <span>{formatCurrency(convert(expense.amount, expense.currency), currency)}</span>
                  </span>
                  <span className="text-muted-foreground">Paid by {paidByName(users, expense.paidBy)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
