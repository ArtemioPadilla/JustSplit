import * as React from 'react';
import { buttonVariants } from '@/components/ui/button';
import { LazyDialog } from '@/components/ui/lazy-dialog';
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
  return (
    <LazyDialog impl={RemoveFriendDialogImpl} load={load} implProps={props} triggerProps={{ className: cn(buttonVariants({ variant: 'outline' })) }}>
      Remove
    </LazyDialog>
  );
}
