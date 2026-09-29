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
import { useDeleteGroup } from '@/lib/data/hooks/useDeleteGroup';
import { GroupDeleteNotAllowedError, GroupDeleteVerificationFailedError } from '@/lib/data/repos/groups';
import { withBase } from '@/lib/href';
import { refuseIfOffline, writeErrorMessage } from '@/lib/offline-write';
import { useCanWrite, useSharedWrite, type WriteState } from '@/lib/use-can-write';
import { notifyError, notifySuccess } from '@/stores/notifications';
import { cn } from '@/lib/utils';

export interface DeleteGroupDialogProps {
  groupId: string;
  name: string;
  /** The page's connection state (plan B19c, ADR 0015); standing alone, the dialog reads it and shows its own sentence. */
  write?: WriteState;
}

/**
 * Maps `repos.groups.remove`'s typed preflight/verification errors to an
 * honest, SPECIFIC message each (plan B12, ADR 0002 amendment) — never one
 * generic string for every case, unlike `DeleteExpenseDialog`'s single
 * catch-all (that dialog's only failure mode is a denial its own UI
 * already prevents by only showing Delete to the creator/payer; this one
 * has two DIFFERENT, user-actionable failure reasons worth naming).
 */
function messageFor(error: unknown): string {
  if (error instanceof GroupDeleteVerificationFailedError) {
    return 'This group could not be deleted. Please try again.';
  }
  if (error instanceof GroupDeleteNotAllowedError) {
    return 'Only a group admin can delete this group.';
  }
  return writeErrorMessage(error, 'Could not delete this group');
}

/**
 * The group detail island's delete-with-confirm (plan B12, risk:high). The
 * whole Dialog composition lives here (CLAUDE.md compound-component rule),
 * same shape as `DeleteExpenseDialog`. `repos.groups.remove`'s own checks
 * (admin-only; honest post-delete verification) run underneath — this dialog is
 * shown only to admins in the first place (UX only; `expense_groups_delete`
 * RLS is the authority). The group's rows are ungrouped by the database (ADR
 * 0013), not by this dialog.
 */
export function DeleteGroupDialog({ groupId, name, write: pageWrite }: DeleteGroupDialogProps) {
  const [open, setOpen] = React.useState(false);
  // The trigger follows the page's state (one sentence per page); the dialog has its own, because it
  // can be open when the connection drops and its confirm button must say why it is blocked.
  const { write, owned } = useSharedWrite(pageWrite);
  const inDialog = useCanWrite();
  const deleteGroup = useDeleteGroup();

  const handleConfirm = React.useCallback(async () => {
    if (refuseIfOffline()) return;
    try {
      await deleteGroup.mutateAsync(groupId);
      // afterNavigation: true — location.assign() below is a full page
      // load in this static MPA that would otherwise discard this toast
      // before it renders (plan B17b amendment, ADR 0008).
      notifySuccess('Group deleted', { afterNavigation: true });
      setOpen(false);
      window.location.assign(withBase('/groups/list'));
    } catch (error) {
      notifyError(messageFor(error));
    }
  }, [deleteGroup, groupId]);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next && refuseIfOffline()) return;
          setOpen(next);
        }}
      >
        <DialogTrigger className={cn(buttonVariants({ variant: 'destructive' }))} {...write.blocked}>
          Delete group
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This ungroups every expense and event in this group (they are kept, just no longer grouped) and permanently deletes the
              group itself. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <OfflineWriteNotice write={inDialog} />
          <DialogFooter>
            <DialogClose className={cn(buttonVariants({ variant: 'outline' }))}>Cancel</DialogClose>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={deleteGroup.isPending}
              aria-busy={deleteGroup.isPending}
              className={cn(buttonVariants({ variant: 'destructive' }))}
              {...inDialog.blocked}
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {owned && <OfflineWriteNotice write={write} />}
    </>
  );
}
