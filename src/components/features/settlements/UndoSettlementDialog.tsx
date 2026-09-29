import * as React from 'react';
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
import { useRemoveSettlement } from '@/lib/data/hooks/useRemoveSettlement';
import { SettlementDeleteNotAllowedError } from '@/lib/data/repos/settlements';
import { cn } from '@/lib/utils';
import { notifyError, notifySuccess } from '@/stores/notifications';
import { money, personName } from './labels';

export interface UndoSettlementDialogProps {
  settlement: { id: string; fromUserId: string; toUserId: string; amount: number; currency: string };
  /** The signed-in user. The caller renders this only for a settlement the viewer created (RLS deletes are creator-only). */
  viewerId: string;
  names: Record<string, string>;
  /** Where focus goes after a successful undo, because the row it started from is gone. */
  returnFocusTo?: React.RefObject<HTMLElement | null>;
}

const NOT_ALLOWED = 'Only the person who recorded this payment can undo it.';
const FAILED = "We couldn't undo this payment. Check your connection and try again.";

/**
 * "Undo" with a confirm step (plan B14b). Deleting a settlement restores the
 * ledger exactly, since recording one never edits an expense (ADR 0014); the
 * delete is creator-only in RLS, so the trigger is only offered on the
 * viewer's own rows. The whole Dialog composition lives in this file
 * (CLAUDE.md compound-component rule).
 */
export function UndoSettlementDialog({ settlement, viewerId, names, returnFocusTo }: UndoSettlementDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const undoneRef = React.useRef(false);
  const removeSettlement = useRemoveSettlement();

  const from = personName(settlement.fromUserId, viewerId, names);
  const to = personName(settlement.toUserId, viewerId, names);
  const amount = money(settlement.amount, settlement.currency);

  async function handleConfirm() {
    setFailure(null);
    try {
      await removeSettlement.mutateAsync(settlement.id);
      notifySuccess('Payment undone');
      undoneRef.current = true;
      setOpen(false);
    } catch (error) {
      // Never the raw error: `remove()`'s messages are for developers.
      const message = error instanceof SettlementDeleteNotAllowedError ? NOT_ALLOWED : FAILED;
      setFailure(message);
      notifyError(message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          undoneRef.current = false;
          setFailure(null);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger aria-label={`Undo payment from ${from} to ${to}, ${amount}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
        Undo
      </DialogTrigger>
      <DialogContent finalFocus={() => (undoneRef.current && returnFocusTo?.current ? returnFocusTo.current : true)}>
        <DialogHeader>
          <DialogTitle>Undo this payment?</DialogTitle>
          <DialogDescription>
            This removes your note that {from} paid {to} {amount}. Balances go back to what they were before you recorded it.
          </DialogDescription>
        </DialogHeader>
        {failure && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {failure}
          </p>
        )}
        <DialogFooter>
          <DialogClose className={cn(buttonVariants({ variant: 'outline' }))}>Keep it</DialogClose>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={removeSettlement.isPending}
            aria-busy={removeSettlement.isPending}
            className={cn(buttonVariants({ variant: 'destructive' }))}
          >
            Undo payment
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
