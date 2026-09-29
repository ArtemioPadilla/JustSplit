import * as React from 'react';
import { buttonVariants } from '@/components/ui/button';
import { LazyDialog } from '@/components/ui/lazy-dialog';
import { cn } from '@/lib/utils';

export interface ResetLocalDataButtonProps {
  className?: string;
}

// The dialog (Base UI dialog stack, `resetLocalData()` and everything it clears)
// loads on first use (plan B19b): /profile shows a plain button until it is
// hovered, focused, touched or clicked. `src/tests/lazy-boundaries.test.ts` pins
// that this file never imports the dialog stack statically.
const load = () => import('./ResetLocalDataButtonImpl');
const ResetLocalDataButtonImpl = React.lazy(() => load().then((m) => ({ default: m.ResetLocalDataButtonImpl })));

/**
 * "Reset local data" (plan B17b, ADR 0008): a light shell over
 * `ResetLocalDataButtonImpl`, which keeps the whole Dialog composition (trigger +
 * content) in one component (CLAUDE.md compound-component rule). A confirm step
 * is required because it signs the user out.
 *
 * Mount sites: the profile island's account settings (B15) and `ErrorBoundary`'s
 * recovery action when `QueryProvider` catches a `QueryCacheRestoreError` (which
 * itself loads this shell lazily); `/showcase` mounts it directly
 * (`ShowcaseResetLocalDataButton`).
 */
export function ResetLocalDataButton({ className }: ResetLocalDataButtonProps) {
  return (
    <LazyDialog
      impl={ResetLocalDataButtonImpl}
      load={load}
      implProps={{ className }}
      triggerProps={{ className: cn(buttonVariants({ variant: 'outline' }), className) }}
    >
      Reset local data
    </LazyDialog>
  );
}
