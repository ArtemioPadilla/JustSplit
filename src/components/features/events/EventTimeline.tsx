import * as React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/domain/formatters';
import { calculateTimelineProgress, formatTimelineDate, groupNearbyExpenses, type TimelineEventInput } from '@/domain/timeline';

/**
 * `EventTimeline` (plan B11a — legacy `src/components/ui/Timeline` + `HoverCard`
 * port). Named `EventTimeline` (not `Timeline`) to avoid colliding with
 * Inceptor's `ui/timeline.tsx` (a vertical feed with a different `items`
 * shape — its API doesn't fit a percentage-positioned date-range widget
 * without forking it, so this ships as its own widget per the plan's
 * lower-priority alternative note).
 *
 * Purely presentational: no store access, no data hooks, no portal of its
 * own (the `HoverCard` it composes does its own portalling into
 * `document.body`, unchanged from `ui/hover-card.tsx`). `users`,
 * `convert`/`currency` and `onNavigate` are all supplied by the
 * caller (B11b's events islands, via `useProfiles`/`useDisplayConversion`/
 * `withBase`) — this widget never resolves a name, a rate or a route
 * itself.
 *
 * Accessibility (CLAUDE.md a11y rule, "never hover/color alone"):
 *  - Every expense marker is a real `<button>` (via `HoverCardTrigger`'s
 *    `render` prop, not the default `<a>`), with an `aria-label` that
 *    spells out the same info the marker's color conveys.
 *  - `HoverCardTrigger` opens on hover AND on focus (Base UI's
 *    `PreviewCard`, built on `useHover`+`useFocusWithDelay`) — `delay={0}`
 *    here because the default 600ms hover-intent delay is a poor fit for a
 *    keyboard user who just tabbed onto an already-deliberately-interactive
 *    marker (unlike a passive link preview, browsing this timeline via
 *    keyboard IS the primary path for a screen-reader/keyboard user, not an
 *    incidental hover).
 *  - A marker's hover/focus card is a *convenience*, never the only path:
 *    every expense is ALSO listed in an "Expenses in this event" panel at
 *    the bottom, each entry a real button with the same
 *    date/description/amount/status text, wired to the same `onNavigate`.
 *    A screen-reader user (or a `prefers-reduced-motion`/no-JS-hover
 *    environment) never needs to trigger a hover card at all.
 *  - That panel is `sr-only` (Tailwind) until focus lands inside it, then it
 *    becomes a real visible panel (coordinator review, WCAG 2.4.7 Focus
 *    Visible fix): a sighted keyboard user must never tab onto a control
 *    they cannot see. Driven by a plain `onFocus`/`onBlur` state toggle,
 *    not CSS `:focus-within` — deliberately, so it's testable without a
 *    real browser/compiled CSS (jsdom has neither). `onBlur` only closes it
 *    when focus actually LEAVES the panel (`relatedTarget` outside it); a move
 *    between two controls inside it leaves it open. The hover-card popup's
 *    own per-expense buttons are `tabIndex={-1}` (opted OUT of the tab
 *    order): a Base UI `PreviewCard` isn't a reliable container for
 *    interactive content — tabbing out of the trigger closes it — so this
 *    panel is the ONE dependable keyboard path into a same-day grouped
 *    marker's individual expenses; the popup stays a mouse/hover quick
 *    preview only, still clickable, just not tab-reachable.
 *  - Settlement status (settled/unsettled/mixed) and pre-/post-event
 *    placement are each conveyed by an `aria-label` and the legend's text
 *    labels, not by marker color alone.
 *
 * Positioning is 100% delegated to the pure `domain/timeline` helpers
 * (`groupNearbyExpenses`/`calculateTimelineProgress`) — this component only
 * reads `.position` off their output and turns it into a CSS `left`/`width`.
 */

export interface EventTimelineExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  /** Calendar-date string (`YYYY-MM-DD`), per `domain/dates.ts#formatCalendarDate`. */
  date: string;
  paidBy: string;
  /** `null`/`undefined` = unsettled — the project-wide `settledAt == null` convention. */
  settledAt: string | null | undefined;
}

export type EventTimelineEvent = TimelineEventInput;

export interface EventTimelineProps {
  event: EventTimelineEvent;
  expenses: EventTimelineExpense[];
  /** Other users' display names, id → name (caller fills this from `useProfiles`). */
  users: Record<string, string>;
  /** Synchronous conversion into the display currency (e.g. `useDisplayConversion`'s `convert`). */
  convert: (amount: number, currency: string) => number;
  /** The currency code amounts are converted into and displayed in. */
  currency: string;
  /** Called when the caller should navigate to an expense's detail page. */
  onNavigate: (expenseId: string) => void;
  /**
   * Whether markers, legend and labels state a per-expense settled / unsettled
   * status (default `true`). The events islands pass `false` since plan B14a
   * (ADR 0014): settling up is a payment on a ledger, so no per-expense state can
   * be derived honestly, and a widget that called every unpaid expense
   * "unsettled" would contradict the event's own progress figure. Markers are
   * then neutral and nothing claims a settlement state.
   */
  showSettlementStatus?: boolean;
  className?: string;
}

type SettlementStatus = 'settled' | 'unsettled' | 'mixed' | 'neutral';

function isSettled(expense: EventTimelineExpense): boolean {
  return expense.settledAt != null;
}

function groupStatus(expenses: EventTimelineExpense[]): SettlementStatus {
  const settledCount = expenses.filter(isSettled).length;
  if (settledCount === 0) return 'unsettled';
  if (settledCount === expenses.length) return 'settled';
  return 'mixed';
}

const STATUS_LABEL: Record<SettlementStatus, string> = {
  settled: 'settled',
  unsettled: 'unsettled',
  mixed: 'partially settled',
  neutral: '',
};

const STATUS_MARKER_CLASSES: Record<SettlementStatus, string> = {
  settled: 'bg-chart-2',
  unsettled: 'bg-destructive',
  mixed: 'bg-chart-4',
  neutral: 'bg-primary',
};

function paidByName(users: Record<string, string>, paidBy: string): string {
  return users[paidBy] ?? 'Unknown';
}

function expenseAriaLabel(expense: EventTimelineExpense, convert: EventTimelineProps['convert'], currency: string, showStatus: boolean): string {
  const amount = formatCurrency(convert(expense.amount, expense.currency), currency);
  const status = showStatus ? `${isSettled(expense) ? 'Settled' : 'Unsettled'}, ` : '';
  return `View expense: ${expense.description}, ${amount}, ${status}${formatTimelineDate(expense.date)}`;
}

export function EventTimeline({ event, expenses, users, convert, currency, onNavigate, showSettlementStatus = true, className }: EventTimelineProps) {
  const [panelFocused, setPanelFocused] = React.useState(false);
  const startDate = event.startDate ?? event.date;

  if (!startDate) {
    return <p className={cn('text-sm text-muted-foreground', className)}>No dates set for this event.</p>;
  }

  const timelineProgress = calculateTimelineProgress(startDate, event.endDate);
  const groups = groupNearbyExpenses(expenses, event);
  const hasPreEvent = groups.some((group) => group.position < 0);
  const hasPostEvent = groups.some((group) => group.position > 100);
  const hasSettled = showSettlementStatus && expenses.some(isSettled);
  const hasUnsettled = showSettlementStatus && expenses.some((expense) => !isSettled(expense));
  const hasMixedGroup = showSettlementStatus && groups.some((group) => group.expenses.length > 1 && groupStatus(group.expenses) === 'mixed');

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="relative pt-3 pb-1">
        <div className="h-2 w-full rounded-full bg-muted" aria-hidden="true">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${Math.min(100, Math.max(0, timelineProgress))}%` }}
          />
        </div>

        <div className="absolute inset-x-0 top-0 h-2">
          {groups.map((group, index) => {
            const isPreEvent = group.position < 0;
            const isPostEvent = group.position > 100;
            const clampedLeft = isPreEvent ? 0 : isPostEvent ? 100 : group.position;
            const status: SettlementStatus = showSettlementStatus ? groupStatus(group.expenses) : 'neutral';
            const isGrouped = group.expenses.length > 1;

            const placement = isPreEvent ? ', before the event' : isPostEvent ? ', after the event' : '';
            const label = isGrouped
              ? showSettlementStatus
                ? `${group.expenses.length} expenses (${STATUS_LABEL[status]}) — ${group.expenses.filter(isSettled).length} settled, ${
                    group.expenses.filter((e) => !isSettled(e)).length
                  } unsettled${placement}`
                : `${group.expenses.length} expenses${placement}`
              : `${expenseAriaLabel(group.expenses[0], convert, currency, showSettlementStatus)}${
                  isPreEvent ? ' (before the event)' : isPostEvent ? ' (after the event)' : ''
                }`;

            return (
              <HoverCard key={`group-${index}-${group.expenses[0]?.id ?? index}`}>
                <HoverCardTrigger
                  render={<button type="button" />}
                  delay={0}
                  data-testid="timeline-marker"
                  aria-label={label}
                  data-pre-event={isPreEvent || undefined}
                  data-post-event={isPostEvent || undefined}
                  data-status={status}
                  className={cn(
                    'absolute top-1/2 size-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background shadow transition-transform motion-reduce:transition-none hover:scale-125 focus-visible:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    STATUS_MARKER_CLASSES[status],
                    isGrouped && 'ring-2 ring-foreground/40',
                    (isPreEvent || isPostEvent) && 'border-dashed border-foreground',
                  )}
                  style={{ left: `${clampedLeft}%` }}
                />
                <HoverCardContent className="w-72">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-popover-foreground">
                        {isGrouped ? `${group.expenses.length} expenses` : 'Expense details'}
                      </p>
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
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatTimelineDate(startDate)}</span>
        {event.endDate && <span>{formatTimelineDate(event.endDate)}</span>}
      </div>

      {expenses.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {hasSettled && (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', STATUS_MARKER_CLASSES.settled)} aria-hidden="true" />
              Settled
            </span>
          )}
          {hasUnsettled && (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', STATUS_MARKER_CLASSES.unsettled)} aria-hidden="true" />
              Unsettled
            </span>
          )}
          {hasMixedGroup && (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', STATUS_MARKER_CLASSES.mixed)} aria-hidden="true" />
              Mixed settlement
            </span>
          )}
          {hasPreEvent && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full border-2 border-dashed border-foreground" aria-hidden="true" />
              Before the event
            </span>
          )}
          {hasPostEvent && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full border-2 border-dashed border-foreground" aria-hidden="true" />
              After the event
            </span>
          )}
        </div>
      )}

      {expenses.length > 0 && (
        // This div isn't itself interactive (no onClick, no role) — it only
        // tracks whether focus is somewhere inside it (via native
        // focus/blur bubbling to reveal itself, WCAG 2.4.7 fix above) so a
        // sighted keyboard user never tabs onto a control they can't see.
        // The real interactive elements are its child <button>s.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          data-testid="timeline-expenses-panel"
          onFocus={() => setPanelFocused(true)}
          onBlur={(event) => {
            // Focus moving to another control INSIDE the panel is not "leaving":
            // `relatedTarget` is where focus is going (null when it leaves the
            // document), so only a target outside the panel closes it.
            const next = event.relatedTarget;
            if (next instanceof Node && event.currentTarget.contains(next)) return;
            setPanelFocused(false);
          }}
          className={cn(panelFocused ? 'rounded-lg border border-border bg-card p-3' : 'sr-only')}
        >
          <p className="mb-2 text-sm font-medium text-foreground">Expenses in this event</p>
          <ul className="flex flex-col gap-1">
            {expenses.map((expense) => (
              <li key={expense.id}>
                <button
                  type="button"
                  data-testid="timeline-sr-expense"
                  onClick={() => onNavigate(expense.id)}
                  className="w-full rounded-md p-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {expenseAriaLabel(expense, convert, currency, showSettlementStatus)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
