import * as React from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { personName } from './labels';

// The form (react-hook-form, the zod resolver, the currency selector) loads when
// the dialog opens (plan B19); `src/tests/lazy-boundaries.test.ts` pins that this
// file never imports it statically. The trigger warms the chunk on hover/focus/touch.
const loadForm = () => import('./RecordPaymentForm');
const RecordPaymentForm = React.lazy(loadForm);

export interface RecordPaymentDialogProps {
  /** One suggested payment, its amount in `displayCurrency`. */
  suggestion: { fromUser: string; toUser: string; amount: number };
  displayCurrency: string;
  /** The signed-in user. Only ever a party of the suggestion: the caller decides whether to render this at all. */
  viewerId: string;
  names: Record<string, string>;
  /** Set in the event scope; written on the settlement so migration 015 lets non-friend co-members record it. */
  eventId?: string;
  /** The event's name, for "Recorded in <name>"; unknown names read "the event". */
  eventName?: string;
  /**
   * Where focus goes after a SAVE. The suggestion's row is about to shrink or
   * disappear, so returning to its trigger would drop focus on `<body>`. Cancel
   * and Escape still return to the trigger.
   */
  returnFocusTo?: React.RefObject<HTMLElement | null>;
}

/**
 * "Record payment" for one suggestion (plan B14b): the whole Dialog
 * composition (trigger + content) in this one file (CLAUDE.md compound-component
 * rule), same shape as `RemoveFriendDialog`. The form lives in
 * `RecordPaymentForm`, which mounts only while the dialog is open, so it starts
 * from the current suggestion every time.
 *
 * Trust statement (ADR 0002 / 0014): what is saved is an attestation by the
 * person recording it, not a verified payment, and the copy says so.
 */
export function RecordPaymentDialog({ suggestion, displayCurrency, viewerId, names, eventId, eventName, returnFocusTo }: RecordPaymentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const savedRef = React.useRef(false);

  const from = personName(suggestion.fromUser, viewerId, names);
  const to = personName(suggestion.toUser, viewerId, names);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) savedRef.current = false;
        setOpen(next);
      }}
    >
      <DialogTrigger
        aria-label={`Record payment from ${from} to ${to}`}
        className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
        onPointerEnter={() => void loadForm()}
        onFocus={() => void loadForm()}
        onTouchStart={() => void loadForm()}
      >
        Record payment
      </DialogTrigger>
      <DialogContent
        finalFocus={() => (savedRef.current && returnFocusTo?.current ? returnFocusTo.current : true)}
      >
        {/* Named from the first frame: the title is part of the fallback, so the dialog is never nameless while the form loads. */}
        <React.Suspense
          fallback={
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>Loading the payment form…</DialogDescription>
            </DialogHeader>
          }
        >
          <RecordPaymentForm
            suggestion={suggestion}
            displayCurrency={displayCurrency}
            viewerId={viewerId}
            names={names}
            eventId={eventId}
            eventName={eventName}
            onSaved={() => {
              savedRef.current = true;
              setOpen(false);
            }}
          />
        </React.Suspense>
      </DialogContent>
    </Dialog>
  );
}
