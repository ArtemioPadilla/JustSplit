import * as React from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { personName } from './labels';
import type { RecordPaymentDialogProps } from './RecordPaymentDialog';

// The real dialog, loaded on first use by the light shell (`RecordPaymentDialog.tsx`,
// plan B19b); nothing else imports this file. The form (react-hook-form, the zod
// resolver, the currency selector) loads when the dialog opens (plan B19);
// `src/tests/lazy-boundaries.test.ts` pins that this file never imports it
// statically. The shell warms both chunks on hover/focus/touch of its stand-in.
const loadForm = () => import('./RecordPaymentForm');
const RecordPaymentForm = React.lazy(loadForm);

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
export function RecordPaymentDialogImpl({
  suggestion,
  displayCurrency,
  viewerId,
  names,
  eventId,
  eventName,
  returnFocusTo,
  defaultOpen = false,
}: RecordPaymentDialogProps & { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const savedRef = React.useRef(false);
  // The dialog mounts already open (the shell's stand-in asked for it), so Base UI never saw focus on a
  // trigger before opening; name the trigger explicitly so closing still returns focus to it.
  const triggerRef = React.useRef<HTMLButtonElement>(null);

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
        ref={triggerRef}
        aria-label={`Record payment from ${from} to ${to}`}
        className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
        onPointerEnter={() => void loadForm()}
        onFocus={() => void loadForm()}
        onTouchStart={() => void loadForm()}
      >
        Record payment
      </DialogTrigger>
      <DialogContent
        finalFocus={() => (savedRef.current && returnFocusTo?.current ? returnFocusTo.current : (triggerRef.current ?? true))}
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
