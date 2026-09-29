import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { CurrencySelector } from '@/components/features/currency/CurrencySelector';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { formatCalendarDate } from '@/domain/dates';
import { round2 } from '@/domain/ledger';
import { exceedsOwed } from '@/domain/settlements';
import { useDisplayConversion } from '@/lib/currency/useDisplayConversion';
import { useSettleUp } from '@/lib/data/hooks/useSettleUp';
import { cn } from '@/lib/utils';
import {
  RecordPaymentFormSchema,
  paymentAmountToNumber,
  type RecordPaymentFormValues,
} from '@/schemas/settlement-form';
import { notifyError, notifySuccess } from '@/stores/notifications';
import { paymentFailureMessage } from './payment-errors';
import { money, personName } from './labels';

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
      >
        Record payment
      </DialogTrigger>
      <DialogContent
        finalFocus={() => (savedRef.current && returnFocusTo?.current ? returnFocusTo.current : true)}
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
      </DialogContent>
    </Dialog>
  );
}

interface RecordPaymentFormProps extends Omit<RecordPaymentDialogProps, 'returnFocusTo'> {
  onSaved: () => void;
}

function RecordPaymentForm({ suggestion, displayCurrency, viewerId, names, eventId, eventName, onSaved }: RecordPaymentFormProps) {
  const settleUp = useSettleUp();
  const [failure, setFailure] = React.useState<string | null>(null);

  const owed = round2(suggestion.amount);
  const form = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(RecordPaymentFormSchema),
    // Today, as the user's own calendar date (never `toISOString()`, which is UTC).
    defaultValues: { amount: owed.toFixed(2), currency: displayCurrency, date: formatCalendarDate(new Date()) },
  });

  const amountText = useWatch({ control: form.control, name: 'amount' });
  const currency = useWatch({ control: form.control, name: 'currency' });
  // Only this dialog's own currency needs a rate beyond the page's: the overpayment check compares in the display currency.
  const { convert, ready } = useDisplayConversion([currency], displayCurrency);
  const parsedAmount = RecordPaymentFormSchema.shape.amount.safeParse(amountText);
  const overpays = parsedAmount.success && ready && exceedsOwed(convert(paymentAmountToNumber(parsedAmount.data), currency), owed);

  const viewerPays = suggestion.fromUser === viewerId;
  const from = personName(suggestion.fromUser, viewerId, names);
  const to = personName(suggestion.toUser, viewerId, names);
  // The other party, seen from the viewer: the difference is owed back to whoever paid too much.
  const overpayNotice = viewerPays
    ? 'This is more than you owe. The difference will show as owed back to you.'
    : `This is more than ${from} owes you. The difference will show as owed back to ${from}.`;

  async function onSubmit(values: RecordPaymentFormValues) {
    setFailure(null);
    try {
      await settleUp.mutateAsync({
        fromUserId: suggestion.fromUser,
        toUserId: suggestion.toUser,
        amount: paymentAmountToNumber(values.amount),
        currency: values.currency,
        date: values.date,
        ...(eventId ? { eventId } : {}),
      });
      notifySuccess('Payment recorded');
      onSaved();
    } catch (error) {
      // Never the raw error: the adapter's text is a database message.
      const message = paymentFailureMessage(error);
      setFailure(message);
      notifyError(message);
    }
  }

  const saving = form.formState.isSubmitting || settleUp.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record payment</DialogTitle>
        <DialogDescription>
          Mark that {from} paid {to}. JustSplit doesn&apos;t move money or check it: this is a note that everyone who can see it will read as
          &quot;Marked as paid by {personName(viewerId, viewerId, names)}&quot;.
          {eventId && <> Recorded in {eventName ?? 'the event'}.</>}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" autoComplete="off" {...field} />
                </FormControl>
                <FormDescription>Suggested: {money(owed, displayCurrency)}. You can pay part of it.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <CurrencySelector value={field.value} onChange={field.onChange} label="Payment currency" id="record-payment-currency" />
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* A polite live region that is always mounted, so the notice is announced when it appears. Never blocks Save. */}
          <div role="status" className="min-h-0 text-sm text-foreground">
            {overpays && <p className="rounded-md border border-border bg-muted px-3 py-2">{overpayNotice}</p>}
          </div>

          {failure && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {failure}
            </p>
          )}

          <DialogFooter>
            <DialogClose className={cn(buttonVariants({ variant: 'outline' }))}>Cancel</DialogClose>
            <button type="submit" disabled={saving} aria-busy={saving} className={cn(buttonVariants({ variant: 'default' }))}>
              {saving ? 'Saving…' : 'Save payment'}
            </button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
