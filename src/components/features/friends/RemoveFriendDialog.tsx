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
import { buttonVariants } from '@/components/ui/button';
import { useRemoveFriendship } from '@/lib/data/hooks/useRemoveFriendship';
import { notifyError, notifySuccess } from '@/stores/notifications';
import { cn } from '@/lib/utils';

export interface RemoveFriendDialogProps {
  friendshipId: string;
  name: string;
}

/**
 * The Friends section's Remove-with-confirm (plan B13). The whole Dialog
 * composition (trigger + content) lives in this one component (CLAUDE.md
 * compound-component rule), same shape as B9's `DeleteExpenseDialog`.
 * `friendships_delete`'s RLS policy allows EITHER party — deleting the row
 * also frees the pair for a future request (unlike a `status: 'rejected'`
 * row, which the `friendships_pair_uniq` unique index keeps blocking
 * forever; ADR 0006), which is why the confirmation copy below is accurate
 * to say so.
 */
export function RemoveFriendDialog({ friendshipId, name }: RemoveFriendDialogProps) {
  const [open, setOpen] = React.useState(false);
  const removeFriendship = useRemoveFriendship();

  const handleConfirm = React.useCallback(async () => {
    try {
      await removeFriendship.mutateAsync(friendshipId);
      notifySuccess('Friend removed');
      setOpen(false);
    } catch {
      notifyError('Could not remove this friend');
    }
  }, [removeFriendship, friendshipId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: 'outline' }))}>Remove</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>
            You&apos;ll no longer be friends with {name} on JustSplit. You can send a new request later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose className={cn(buttonVariants({ variant: 'outline' }))}>Cancel</DialogClose>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={removeFriendship.isPending}
            aria-busy={removeFriendship.isPending}
            className={cn(buttonVariants({ variant: 'destructive' }))}
          >
            Remove
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
