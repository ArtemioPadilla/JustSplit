import * as React from 'react';
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
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
import { refuseIfOffline, writeErrorMessage } from '@/lib/offline-write';
import { useCanWrite, type WriteState } from '@/lib/use-can-write';
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
  /** The page's connection state (plan B19c, ADR 0015), for the trigger; the shell always passes one. */
  write?: WriteState;
}

const NOT_ALLOWED = 'Only the person who recorded this payment can undo it.';
const FAILED = "We couldn't undo this payment. Check your connection and try again.";

/**
 * The real "Undo" dialog, loaded on first use by the light shell
 * (`UndoSettlementDialog.tsx`, plan B19b); nothing else imports this file.
 * "Undo" with a confirm step (plan B14b). Deleting a settlement restores the
 * ledger exactly, since recording one never edits an expense (ADR 0014); the
 * delete is creator-only in RLS, so the trigger is only offered on the
 * viewer's own rows. The whole Dialog composition lives in this file
 * (CLAUDE.md compound-component rule).
 */
export function UndoSettlementDialogImpl({
  settlement,
  viewerId,
  names,
  returnFocusTo,
  write: triggerWrite,
  defaultOpen = false,
}: UndoSettlementDialogProps & { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  // The trigger follows the page's state (one sentence per page); the dialog has its own, because it can
  // be open when the connection drops and its confirm button must say why it is blocked.
  const inDialog = useCanWrite();
  const ownTrigger = useCanWrite();
  const trigger = triggerWrite ?? ownTrigger;
  const [failure, setFailure] = React.useState<string | null>(null);
  const undoneRef = React.useRef(false);
  const removeSettlement = useRemoveSettlement();
  // The dialog mounts already open (the shell's stand-in asked for it), so Base UI never saw focus on a
  // trigger before opening; name the trigger explicitly so closing still returns focus to it.
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const from = personName(settlement.fromUserId, viewerId, names);
  const to = personName(settlement.toUserId, viewerId, names);
  const amount = money(settlement.amount, settlement.currency);

  async function handleConfirm() {
    if (refuseIfOffline()) return;
    setFailure(null);
    try {
      await removeSettlement.mutateAsync(settlement.id);
      notifySuccess('Payment undone');
      undoneRef.current = true;
      setOpen(false);
    } catch (error) {
      // Never the raw error: `remove()`'s messages are for developers.
      const message = error instanceof SettlementDeleteNotAllowedError ? NOT_ALLOWED : writeErrorMessage(error, FAILED);
      setFailure(message);
      notifyError(message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && refuseIfOffline()) return;
        if (next) {
          undoneRef.current = false;
          setFailure(null);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger
        ref={triggerRef}
        aria-label={`Undo payment from ${from} to ${to}, ${amount}`}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        {...trigger.blocked}
      >
        Undo
      </DialogTrigger>
      <DialogContent finalFocus={() => (undoneRef.current && returnFocusTo?.current ? returnFocusTo.current : (triggerRef.current ?? true))}>
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
        <OfflineWriteNotice write={inDialog} />
        <DialogFooter>
          <DialogClose className={cn(buttonVariants({ variant: 'outline' }))}>Keep it</DialogClose>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={removeSettlement.isPending}
            aria-busy={removeSettlement.isPending}
            className={cn(buttonVariants({ variant: 'destructive' }))}
            {...inDialog.blocked}
          >
            Undo payment
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
