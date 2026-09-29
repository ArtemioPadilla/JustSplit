import * as React from 'react';
import { buttonVariants } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { EventTimeline } from '@/components/features/events/EventTimeline';
import { UserAvatar } from '@/components/features/profile/UserAvatar';
import { parseCalendarDate } from '@/domain/dates';
import { eventStartDate, eventStats, settlementProgressPercent } from '@/domain/events';
import { withBase } from '@/lib/href';
import { cn } from '@/lib/utils';
import type { Event } from '@/schemas/event';
import type { Expense } from '@/schemas/expense';
import type { Settlement } from '@/schemas/settlement';

export interface EventCardProps {
  event: Event;
  /** Exactly this event's expenses (ADR 0013: all of them, whoever is looking). */
  expenses: Expense[];
  /** Exactly this event's settlements (`eventId == event.id`); a payment in another event, or in none, is not part of it. */
  settlements: Settlement[];
  /** id -> display name; a member with no entry reads "Unknown". */
  names: Record<string, string>;
  avatars: Record<string, string | null>;
  /** The currency every amount is shown in. */
  displayCurrency: string;
  convert: (amount: number, currency: string) => number;
  /** False until every needed rate resolved: amounts and the timeline are then skeletons, never unconverted numbers. */
  ready: boolean;
}

function localDate(calendarDate: string): string {
  return parseCalendarDate(calendarDate).toLocaleDateString();
}

function dateRange(event: Event): string {
  const start = eventStartDate(event);
  if (!start) return 'No dates set';
  return event.endDate ? `${localDate(start)} – ${localDate(event.endDate)}` : localDate(start);
}

/**
 * One event on `/events/list` (plan B11b): name, dates, description, timeline,
 * total / participants / still owed, settlement progress (settled over
 * settled plus still owed — ADR 0014, no per-expense flag), a participants
 * disclosure and the link to the detail page. Purely presentational — the
 * island owns the data, the display currency and the rates.
 */
export function EventCard({ event, expenses, settlements, names, avatars, displayCurrency, convert, ready }: EventCardProps) {
  const [showParticipants, setShowParticipants] = React.useState(false);
  const headingId = React.useId();
  const participantsId = React.useId();

  const stats = React.useMemo(() => eventStats(expenses, settlements, convert), [expenses, settlements, convert]);
  const progressPercent = settlementProgressPercent(stats);
  const money = (amount: number) => `${displayCurrency} ${amount.toFixed(2)}`;
  const participantCount = event.memberIds.length;

  const timelineExpenses = React.useMemo(
    () =>
      expenses.map((expense) => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date,
        paidBy: expense.paidBy,
        settledAt: expense.settledAt,
      })),
    [expenses],
  );

  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="font-display text-xl font-semibold text-foreground">
          <a href={withBase(`/events/${event.id}`)} className="underline-offset-2 hover:underline">
            {event.name}
          </a>
        </h2>
        <span className="text-sm text-muted-foreground">{dateRange(event)}</span>
      </div>

      {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}

      {ready ? (
        <EventTimeline
          event={{ startDate: event.startDate, date: event.date, endDate: event.endDate }}
          expenses={timelineExpenses}
          users={names}
          convert={convert}
          currency={displayCurrency}
          showSettlementStatus={false}
          onNavigate={(expenseId) => window.location.assign(withBase(`/expenses/${expenseId}`))}
        />
      ) : (
        // Not the timeline yet: its hover cards would show unconverted amounts labelled with the display currency.
        <Skeleton className="h-16 w-full" />
      )}

      <dl className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Total</dt>
          <dd className="font-semibold text-foreground">{ready ? money(stats.total) : <Skeleton className="h-5 w-24" />}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Participants</dt>
          <dd className="font-semibold text-foreground">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Still owed</dt>
          <dd className="font-semibold text-foreground">{ready ? money(stats.outstanding) : <Skeleton className="h-5 w-24" />}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Settlement progress</span>
          {/* Not 0% and not 100% when there is nothing to settle: that would claim something happened. */}
          <span className="text-foreground">
            {!ready ? <Skeleton className="h-4 w-20" /> : progressPercent === null ? 'Nothing to settle' : progressPercent === 100 ? 'Settled up' : `${progressPercent}% settled`}
          </span>
        </div>
        {ready && progressPercent !== null && <ProgressBar value={progressPercent} label="Settlement progress" />}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-expanded={showParticipants}
          aria-controls={participantsId}
          aria-label={`${showParticipants ? 'Hide' : 'Show'} participants for ${event.name}`}
          onClick={() => setShowParticipants((open) => !open)}
          className="self-start rounded-md text-sm font-medium text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {showParticipants ? 'Hide participants' : 'Show participants'}
        </button>
        <ul id={participantsId} hidden={!showParticipants} className="flex flex-col gap-2">
          {event.memberIds.map((memberId) => {
            const name = names[memberId] ?? 'Unknown';
            return (
              <li key={memberId} className="flex items-center gap-2 text-sm text-foreground">
                <UserAvatar src={avatars[memberId]} name={name} alt="" className="size-6" />
                {name}
              </li>
            );
          })}
        </ul>
      </div>

      <a href={withBase(`/events/${event.id}`)} className={cn(buttonVariants({ variant: 'outline' }), 'self-start')}>
        View details
        <span className="sr-only"> for {event.name}</span>
      </a>
    </article>
  );
}
