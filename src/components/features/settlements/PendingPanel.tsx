import * as React from 'react';
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/features/profile/UserAvatar';
import { isParty, viewerFirst, type RecordingRoute } from '@/domain/settlements';
import { withBase } from '@/lib/href';
import type { WriteState } from '@/lib/use-can-write';
import { cn } from '@/lib/utils';
import { money, personName } from './labels';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import type { SuggestionsResult } from './useSuggestions';

export interface PendingPanelProps {
  suggestions: SuggestionsResult;
  viewerId: string;
  names: Record<string, string>;
  avatars: Record<string, string | null>;
  displayCurrency: string;
  eventId?: string;
  /**
   * True in the event scope, where suggestions are debt-simplified across the
   * event (every member sees the same rows). The personal view is pairwise: one
   * row per person, no simplification, so this stays false there.
   */
  simplified?: boolean;
  /**
   * Personal view only: how each row can be recorded, keyed by the OTHER person's
   * id (`recordingRoute`). Absent in the event scope, where a party can always
   * record inside the event.
   */
  routes?: Record<string, RecordingRoute>;
  /** Event names by id, for the dialog and the "settle from the event" links; unknown ids read "the event". */
  eventNames?: Record<string, string>;
  /** Focus lands here after a payment is recorded: the row that held the button is about to change. */
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  /** The page's connection state (plan B19c, ADR 0015): "Record payment" on every row is described by the one sentence shown here. */
  write: WriteState;
}

function eventLabel(eventNames: Record<string, string>, id: string): string {
  return eventNames[id] ?? 'the event';
}

/**
 * The Pending tab's panel (plan B14b): the scope's suggested payments, worded
 * "X owes Y <amount>", the viewer's own first. In the personal view every row is
 * pairwise between the viewer and one other person, so the viewer is always a
 * party; in the event scope rows are debt-simplified and may be between two
 * other people. Only a party is offered
 * "Record payment" — the insert policy requires the creator to be one of the
 * two people (UX only; RLS decides). The tab composition itself lives in
 * `SettlementsIsland` (CLAUDE.md compound-component rule); this is its content.
 */
export function PendingPanel({ suggestions, viewerId, names, avatars, displayCurrency, eventId, simplified = false, routes, eventNames = {}, headingRef, write }: PendingPanelProps) {
  // What sits next to a row's amount. Never a button RLS is bound to deny (a dead end): a party is offered "Record payment" only
  // where `settlements_insert` accepts it, otherwise the row says where to go.
  function action(suggestion: { fromUser: string; toUser: string; amount: number }): React.ReactNode {
    const dialog = (dialogEventId: string | undefined) => (
      <RecordPaymentDialog
        suggestion={suggestion}
        displayCurrency={displayCurrency}
        viewerId={viewerId}
        names={names}
        eventId={dialogEventId}
        eventName={dialogEventId ? eventLabel(eventNames, dialogEventId) : undefined}
        returnFocusTo={headingRef}
        write={write}
      />
    );

    if (!routes) {
      // Event scope (simplified rows): fellow members can record inside the event; only a party may.
      if (isParty(suggestion, viewerId)) return dialog(eventId);
      return (
        <span className="text-xs text-muted-foreground">
          Only {personName(suggestion.fromUser, viewerId, names)} and {personName(suggestion.toUser, viewerId, names)} can mark this as paid.
        </span>
      );
    }

    const other = suggestion.fromUser === viewerId ? suggestion.toUser : suggestion.fromUser;
    const route = routes[other];
    if (route?.kind === 'direct') return dialog(undefined);
    if (route?.kind === 'event') return dialog(route.eventId);

    const who = personName(other, viewerId, names);
    const eventIds = route?.kind === 'from-events' ? route.eventIds : [];
    return (
      <span className="text-xs text-muted-foreground">
        {eventIds.length === 0 ? (
          <>
            You and {who} aren&apos;t friends anymore.{' '}
            <a href={withBase('/friends')} className="text-foreground underline underline-offset-2">
              Add them as a friend
            </a>{' '}
            to record this payment.
          </>
        ) : (
          <>
            You and {who} aren&apos;t friends, so settle this from the event:{' '}
            {eventIds.map((id, index) => (
              <React.Fragment key={id}>
                {index > 0 && ', '}
                <a href={withBase(`/settlements?event=${id}`)} className="text-foreground underline underline-offset-2">
                  {eventLabel(eventNames, id)}
                </a>
              </React.Fragment>
            ))}
          </>
        )}
      </span>
    );
  }

  return (
    <section aria-labelledby="pending-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2
          id="pending-heading"
          ref={headingRef}
          tabIndex={-1}
          className="rounded-sm text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Suggested payments
        </h2>
        {simplified ? (
          <>
            <p className="text-sm text-muted-foreground">The fewest payments that would settle everyone up.</p>
            <p className="text-sm text-muted-foreground">
              Suggestions are simplified across the event, so a payment may go to someone other than who paid.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">What you owe each person, and what each person owes you.</p>
        )}
      </div>

      {suggestions.status === 'ready' && suggestions.suggestions.length > 0 && <OfflineWriteNotice write={write} />}

      {suggestions.status === 'loading' ? (
        // Row-shaped blocks, so nothing jumps when the real rows arrive.
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-[4.5rem] w-full" />
          <Skeleton className="h-[4.5rem] w-full" />
        </div>
      ) : suggestions.status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          We couldn&apos;t work out the suggested payments. Reload the page to try again.
        </p>
      ) : suggestions.suggestions.length === 0 ? (
        <EmptyState
          title="You're all settled up."
          description="Nobody owes anybody anything here right now."
          action={
            <a href={withBase(eventId ? `/expenses/new?event=${eventId}` : '/expenses/new')} className={cn(buttonVariants({ variant: 'default' }))}>
              Add an expense
            </a>
          }
        />
      ) : (
        <ul aria-label="Suggested payments" className="flex flex-col gap-3">
          {viewerFirst(suggestions.suggestions, viewerId).map((suggestion) => {
            const from = personName(suggestion.fromUser, viewerId, names, { capitalize: true });
            const to = personName(suggestion.toUser, viewerId, names);
            const viewerOwes = suggestion.fromUser === viewerId;
            return (
              <li
                key={`${suggestion.fromUser}:${suggestion.toUser}`}
                className="flex flex-col gap-3 rounded-md border border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex -space-x-2">
                    <UserAvatar src={avatars[suggestion.fromUser]} name={names[suggestion.fromUser] ?? 'Unknown'} alt="" className="size-8 ring-2 ring-background" />
                    <UserAvatar src={avatars[suggestion.toUser]} name={names[suggestion.toUser] ?? 'Unknown'} alt="" className="size-8 ring-2 ring-background" />
                  </span>
                  <p className="text-foreground">
                    <span className="font-medium">{from}</span> {viewerOwes ? 'owe' : 'owes'} <span className="font-medium">{to}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-base font-semibold text-foreground">{money(suggestion.amount, displayCurrency)}</span>
                  {action(suggestion)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
