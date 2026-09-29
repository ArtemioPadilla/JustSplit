import * as React from 'react';
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { buttonVariants } from '@/components/ui/button';
import { LazyDialog } from '@/components/ui/lazy-dialog';
import { useSharedWrite } from '@/lib/use-can-write';
import { cn } from '@/lib/utils';
import type { RemoveFriendDialogProps } from './RemoveFriendDialogImpl';

export type { RemoveFriendDialogProps };

// The dialog (Base UI dialog stack, the mutation hook) loads on first use (plan
// B19b): the friends list shows a plain "Remove" button until it is hovered,
// focused, touched or clicked. `src/tests/lazy-boundaries.test.ts` pins that this
// file never imports the dialog stack statically.
const load = () => import('./RemoveFriendDialogImpl');
const RemoveFriendDialogImpl = React.lazy(() => load().then((m) => ({ default: m.RemoveFriendDialogImpl })));

/**
 * The Friends section's Remove-with-confirm (plan B13): a light shell over
 * `RemoveFriendDialogImpl`, which keeps the whole Dialog composition (trigger +
 * content) in one component (CLAUDE.md compound-component rule).
 */
export function RemoveFriendDialog(props: RemoveFriendDialogProps) {
  // Plan B19c (ADR 0015): a blocked stand-in never loads the dialog. On a page that owns the state
  // (the friends list) there is one sentence for every row; standing alone, this shows its own.
  const { write, owned } = useSharedWrite(props.write);
  return (
    <>
      <LazyDialog
        impl={RemoveFriendDialogImpl}
        load={load}
        implProps={{ ...props, write }}
        triggerProps={{ className: cn(buttonVariants({ variant: 'outline' })), ...write.blocked }}
      >
        Remove
      </LazyDialog>
      {owned && <OfflineWriteNotice write={write} />}
    </>
  );
}
