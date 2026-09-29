import * as React from 'react';
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
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { buttonVariants } from '@/components/ui/button';
import { useRemoveFriendship } from '@/lib/data/hooks/useRemoveFriendship';
import { refuseIfOffline, writeErrorMessage } from '@/lib/offline-write';
import { useCanWrite, type WriteState } from '@/lib/use-can-write';
import { notifyError, notifySuccess } from '@/stores/notifications';
import { cn } from '@/lib/utils';

export interface RemoveFriendDialogProps {
  friendshipId: string;
  name: string;
  /** The page's connection state (plan B19c, ADR 0015), for the trigger; the shell always passes one. */
  write?: WriteState;
}


/**
 * The real Remove-with-confirm, loaded on first use by the light shell
 * (`RemoveFriendDialog.tsx`, plan B19b); nothing else imports this file. The Friends section's Remove-with-confirm (plan B13). The whole Dialog
 * composition (trigger + content) lives in this one component (CLAUDE.md
 * compound-component rule), same shape as B9's `DeleteExpenseDialog`.
 * `friendships_delete`'s RLS policy allows EITHER party — deleting the row
 * also frees the pair for a future request (unlike a `status: 'rejected'`
 * row, which the `friendships_pair_uniq` unique index keeps blocking
 * forever; ADR 0006), which is why the confirmation copy below is accurate
 * to say so.
 */
export function RemoveFriendDialogImpl({
  friendshipId,
  name,
  write: triggerWrite,
  defaultOpen = false,
}: RemoveFriendDialogProps & { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  // The trigger follows the page's state (one sentence per page); the dialog has its own, because it
  // can be open when the connection drops and its confirm button must say why it is blocked.
  const inDialog = useCanWrite();
  const ownTrigger = useCanWrite();
  const trigger = triggerWrite ?? ownTrigger;
  const removeFriendship = useRemoveFriendship();
  // The dialog mounts already open (the shell's stand-in asked for it), so Base UI never saw focus on a
  // trigger before opening; name the trigger explicitly so closing still returns focus to it.
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const handleConfirm = React.useCallback(async () => {
    if (refuseIfOffline()) return;
    try {
      await removeFriendship.mutateAsync(friendshipId);
      notifySuccess('Friend removed');
      setOpen(false);
    } catch (error) {
      notifyError(writeErrorMessage(error, 'Could not remove this friend'));
    }
  }, [removeFriendship, friendshipId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && refuseIfOffline()) return;
        setOpen(next);
      }}
    >
      <DialogTrigger ref={triggerRef} className={cn(buttonVariants({ variant: 'outline' }))} {...trigger.blocked}>
        Remove
      </DialogTrigger>
      <DialogContent finalFocus={triggerRef}>
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>
            You&apos;ll no longer be friends with {name} on JustSplit. You can send a new request later.
          </DialogDescription>
        </DialogHeader>
        <OfflineWriteNotice write={inDialog} />
        <DialogFooter>
          <DialogClose className={cn(buttonVariants({ variant: 'outline' }))}>Cancel</DialogClose>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={removeFriendship.isPending}
            aria-busy={removeFriendship.isPending}
            className={cn(buttonVariants({ variant: 'destructive' }))}
            {...inDialog.blocked}
          >
            Remove
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
