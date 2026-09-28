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
import { resetLocalData } from '@/lib/data/reset-local';
import { cn } from '@/lib/utils';

export interface ResetLocalDataButtonProps {
  className?: string;
}

/**
 * "Restablecer datos locales" (plan B17b, ADR 0008) — the reusable
 * confirm-dialog trigger for `resetLocalData()`. The WHOLE Dialog
 * composition (trigger + content) lives in this one component (CLAUDE.md
 * compound-component rule), same shape as B9's `DeleteExpenseDialog` / B13's
 * `RemoveFriendDialog`. A confirm step is required because it signs the
 * user out.
 *
 * Two mount sites (neither is this issue's job to wire beyond exporting the
 * component): the profile island's own button (B15) and
 * `ErrorBoundary`'s recovery-action fallback when `QueryProvider` catches a
 * `QueryCacheRestoreError` (this issue, `QueryProvider.tsx`). `/showcase`
 * mounts it directly (`ShowcaseResetLocalDataButton`) so B15 only has to
 * mount the already-built, already-tested component.
 */
export function ResetLocalDataButton({ className }: ResetLocalDataButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  const handleConfirm = React.useCallback(() => {
    setIsPending(true);
    // resetLocalData() never throws (every step is isolated internally) and
    // always ends in a full-page reload — there is no "success" state to
    // return to here; `isPending` intentionally never resets to false.
    void resetLocalData();
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: 'outline' }), className)}>
        Restablecer datos locales
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer datos locales</DialogTitle>
          <DialogDescription>
            This signs you out and clears every expense, group, and preference this browser has
            cached for you, then reloads the app. Use it if something looks stuck or out of date.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose className={cn(buttonVariants({ variant: 'outline' }))}>Cancel</DialogClose>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            aria-busy={isPending}
            className={cn(buttonVariants({ variant: 'destructive' }))}
          >
            Confirm reset
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
