import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { CurrencySelector } from '@/components/features/currency/CurrencySelector';
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { buttonVariants } from '@/components/ui/button';
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { formatCalendarDate } from '@/domain/dates';
import { round2 } from '@/domain/ledger';
import { exceedsOwed } from '@/domain/settlements';
import { useDisplayConversion } from '@/lib/currency/useDisplayConversion';
import { useSettleUp } from '@/lib/data/hooks/useSettleUp';
import { refuseIfOffline } from '@/lib/offline-write';
import { useCanWrite } from '@/lib/use-can-write';
import { cn } from '@/lib/utils';
import {
  RecordPaymentFormSchema,
  paymentAmountToNumber,
  type RecordPaymentFormValues,
} from '@/schemas/settlement-form';
import { notifyError, notifySuccess } from '@/stores/notifications';
import type { RecordPaymentDialogProps } from './RecordPaymentDialog';
import { paymentFailureMessage } from './payment-errors';
import { money, personName } from './labels';

/**
 * The form inside "Record payment" (plan B14b). Its own module so
 * `RecordPaymentDialog` can load it when the dialog opens (plan B19):
 * react-hook-form, the zod resolver and the currency selector are ~20 kB gz that
 * `/settlements` does not need until someone records a payment. It mounts only
 * while the dialog is open, so it starts from the current suggestion every time.
 */
export interface RecordPaymentFormProps extends Omit<RecordPaymentDialogProps, 'returnFocusTo' | 'write'> {
  onSaved: () => void;
}

export default function RecordPaymentForm({ suggestion, displayCurrency, viewerId, names, eventId, eventName, onSaved }: RecordPaymentFormProps) {
  const settleUp = useSettleUp();
  // Plan B19c (ADR 0015): the form can be open when the connection drops; Save says why it is blocked.
  const write = useCanWrite();
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
          Mark that {from} paid {to}. JustSplit doesn&apos;t move money or check it: this is a note, and others will see it as
          &quot;Marked as paid by {names[viewerId] ?? 'you'}&quot;.
          {eventId && <> Recorded in {eventName ?? 'the event'}.</>}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={(event) => {
            if (refuseIfOffline(event)) return;
            return form.handleSubmit(onSubmit)(event);
          }}
          noValidate
          className="grid gap-4"
        >
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

          <OfflineWriteNotice write={write} />

          <DialogFooter>
            <DialogClose className={cn(buttonVariants({ variant: 'outline' }))}>Cancel</DialogClose>
            <button type="submit" disabled={saving} aria-busy={saving} className={cn(buttonVariants({ variant: 'default' }))} {...write.blocked}>
              {saving ? 'Saving…' : 'Save payment'}
            </button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
