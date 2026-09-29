import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { UserAvatar } from '@/components/features/profile/UserAvatar';
import { parseCalendarDate } from '@/domain/dates';
import { newestFirst } from '@/domain/settlements';
import type { Settlement } from '@/schemas/settlement';
import { money, personName } from './labels';
import { UndoSettlementDialog } from './UndoSettlementDialog';

export interface HistoryPanelProps {
  /** The scope's settlements, in any order. */
  settlements: Settlement[];
  viewerId: string;
  names: Record<string, string>;
  avatars: Record<string, string | null>;
  displayCurrency: string;
  convert: (amount: number, currency: string) => number;
  ready: boolean;
  /** Focus lands here after an undo: the row that held the button is gone. */
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}

/**
 * The History tab's panel (plan B14b): every settlement in scope, both
 * directions, newest first, each in its own currency. Trust statement (ADR
 * 0002 / 0014): a settlement is an attestation by whoever created it, never a
 * verified payment, so a row says "Marked as paid by <name>" and nothing here
 * says "paid" as a fact. "Undo" is offered only on the viewer's own rows
 * (`settlements_delete` is creator-only in RLS).
 */
export function HistoryPanel({ settlements, viewerId, names, avatars, displayCurrency, convert, ready, headingRef }: HistoryPanelProps) {
  return (
    <section aria-labelledby="history-heading" className="flex flex-col gap-4">
      <h2
        id="history-heading"
        ref={headingRef}
        tabIndex={-1}
        className="rounded-sm text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Payment history
      </h2>

      {settlements.length === 0 ? (
        <EmptyState title="No payments recorded yet." description="Payments you record will show up here." />
      ) : (
        <ul aria-label="Payment history" className="flex flex-col gap-3">
          {newestFirst(settlements).map((settlement) => {
            const from = personName(settlement.fromUserId, viewerId, names, { capitalize: true });
            const to = personName(settlement.toUserId, viewerId, names, { capitalize: true });
            const foreign = settlement.currency !== displayCurrency;
            return (
              <li
                key={settlement.id}
                className="flex flex-col gap-3 rounded-md border border-border px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="flex -space-x-2">
                      <UserAvatar src={avatars[settlement.fromUserId]} name={names[settlement.fromUserId] ?? 'Unknown'} alt="" className="size-7 ring-2 ring-background" />
                      <UserAvatar src={avatars[settlement.toUserId]} name={names[settlement.toUserId] ?? 'Unknown'} alt="" className="size-7 ring-2 ring-background" />
                    </span>
                    <span className="font-medium text-foreground">
                      {from} → {to}
                    </span>
                  </div>
                  <span className="text-muted-foreground">Marked as paid by {personName(settlement.createdBy, viewerId, names)}</span>
                  <span className="text-muted-foreground">{parseCalendarDate(settlement.date).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span className="text-base font-semibold text-foreground">{money(settlement.amount, settlement.currency)}</span>
                  {foreign &&
                    (ready ? (
                      <span className="text-xs text-muted-foreground">≈ {money(convert(settlement.amount, settlement.currency), displayCurrency)}</span>
                    ) : (
                      <Skeleton className="h-4 w-20" />
                    ))}
                  {settlement.createdBy === viewerId && (
                    <UndoSettlementDialog
                      settlement={settlement}
                      viewerId={viewerId}
                      names={names}
                      returnFocusTo={headingRef}
                    />
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
