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
import { useDeleteExpense } from '@/lib/data/hooks/useDeleteExpense';
import { withBase } from '@/lib/href';
import { notifyError, notifySuccess } from '@/stores/notifications';
import { cn } from '@/lib/utils';

export interface DeleteExpenseDialogProps {
  id: string;
  description: string;
}

/**
 * The expense detail island's delete-with-confirm (plan B9). The WHOLE
 * Dialog composition (trigger + content) lives in this one component —
 * CLAUDE.md's compound-component rule: `Dialog`/`DialogContent` cannot span
 * separate `client:*` boundaries, so it is composed here, inside whichever
 * single island renders it (`ExpenseDetailView`), never mounted separately.
 *
 * `repos.expenses.remove`'s own preflight (ADR 0005 amendment) still denies
 * a non-creator/payer BEFORE touching storage — this dialog is shown only
 * to the creator/payer in the first place (UX only; RLS is the authority),
 * but a denial here still surfaces as the same generic failure toast.
 */
export function DeleteExpenseDialog({ id, description }: DeleteExpenseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const deleteExpense = useDeleteExpense();

  const handleConfirm = React.useCallback(async () => {
    try {
      await deleteExpense.mutateAsync(id);
      // afterNavigation: true — location.assign() below is a full page
      // load in this static MPA that would otherwise discard this toast
      // before it renders (plan B17b amendment, ADR 0008).
      notifySuccess('Expense deleted', { afterNavigation: true });
      setOpen(false);
      window.location.assign(withBase('/expenses/list'));
    } catch {
      // Generic on purpose (CLAUDE.md: never raw error/SQL/policy text) —
      // covers both the typed ExpenseDeleteNotAllowedError/ExpenseNotFoundError
      // preflight failures and a genuine network/RLS failure alike.
      notifyError('Could not delete this expense');
    }
  }, [deleteExpense, id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: 'destructive' }))}>Delete expense</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{description}&rdquo;?</DialogTitle>
          <DialogDescription>
            This permanently deletes the expense and its receipts. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose className={cn(buttonVariants({ variant: 'outline' }))}>Cancel</DialogClose>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleteExpense.isPending}
            aria-busy={deleteExpense.isPending}
            className={cn(buttonVariants({ variant: 'destructive' }))}
          >
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
