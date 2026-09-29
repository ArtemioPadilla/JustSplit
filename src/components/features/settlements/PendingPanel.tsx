import * as React from 'react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/features/profile/UserAvatar';
import { isParty, viewerFirst } from '@/domain/settlements';
import { withBase } from '@/lib/href';
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
  /** Focus lands here after a payment is recorded: the row that held the button is about to change. */
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}

/**
 * The Pending tab's panel (plan B14b): the scope's suggested payments, worded
 * "X owes Y <amount>", the viewer's own first. Only a party is offered
 * "Record payment" — the insert policy requires the creator to be one of the
 * two people (UX only; RLS decides). The tab composition itself lives in
 * `SettlementsIsland` (CLAUDE.md compound-component rule); this is its content.
 */
export function PendingPanel({ suggestions, viewerId, names, avatars, displayCurrency, eventId, headingRef }: PendingPanelProps) {
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
        <p className="text-sm text-muted-foreground">The fewest payments that would settle everyone up.</p>
      </div>

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
                  {isParty(suggestion, viewerId) ? (
                    <RecordPaymentDialog
                      suggestion={suggestion}
                      displayCurrency={displayCurrency}
                      viewerId={viewerId}
                      names={names}
                      eventId={eventId}
                      returnFocusTo={headingRef}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Only {personName(suggestion.fromUser, viewerId, names)} and {personName(suggestion.toUser, viewerId, names)} can mark this as paid.
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
