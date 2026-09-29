import * as React from 'react';
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { buttonVariants } from '@/components/ui/button';
import { LazyDialog } from '@/components/ui/lazy-dialog';
import { useSharedWrite, type WriteState } from '@/lib/use-can-write';
import { cn } from '@/lib/utils';
import { personName } from './labels';

// The dialog (Base UI dialog stack) loads on first use (plan B19b): the suggestion
// rows show a plain "Record payment" button until it is hovered, focused, touched
// or clicked, and that also warms the payment form (react-hook-form, the zod
// resolver, the currency selector: plan B19), so opening the dialog is not a
// second wait. `src/tests/lazy-boundaries.test.ts` pins that this file never
// imports the dialog stack or the form statically.
const loadImpl = () => import('./RecordPaymentDialogImpl');
const loadForm = () => import('./RecordPaymentForm');
const load = () => Promise.all([loadImpl(), loadForm()]);
const RecordPaymentDialogImpl = React.lazy(() => loadImpl().then((m) => ({ default: m.RecordPaymentDialogImpl })));

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
  /** The page's connection state (plan B19c, ADR 0015); standing alone, the dialog reads it and shows its own sentence. */
  write?: WriteState;
}

/**
 * "Record payment" for one suggestion (plan B14b): a light shell over
 * `RecordPaymentDialogImpl`, which keeps the whole Dialog composition (trigger +
 * content) in one component (CLAUDE.md compound-component rule). The stand-in
 * carries the same accessible name, which says who pays whom.
 */
export function RecordPaymentDialog(props: RecordPaymentDialogProps) {
  const { suggestion, viewerId, names } = props;
  const from = personName(suggestion.fromUser, viewerId, names);
  const to = personName(suggestion.toUser, viewerId, names);
  // A blocked stand-in never loads the dialog. On a page that owns the state (the settlements list) there
  // is one sentence for every row; standing alone, this shows its own.
  const { write, owned } = useSharedWrite(props.write);
  return (
    <>
      <LazyDialog
        impl={RecordPaymentDialogImpl}
        load={load}
        implProps={{ ...props, write }}
        triggerProps={{
          'aria-label': `Record payment from ${from} to ${to}`,
          className: cn(buttonVariants({ variant: 'default', size: 'sm' })),
          ...write.blocked,
        }}
      >
        Record payment
      </LazyDialog>
      {owned && <OfflineWriteNotice write={write} />}
    </>
  );
}
