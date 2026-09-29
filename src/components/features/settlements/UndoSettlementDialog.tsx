import * as React from 'react';
import { buttonVariants } from '@/components/ui/button';
import { LazyDialog } from '@/components/ui/lazy-dialog';
import { cn } from '@/lib/utils';
import { money, personName } from './labels';
import type { UndoSettlementDialogProps } from './UndoSettlementDialogImpl';

export type { UndoSettlementDialogProps };

// The dialog (Base UI dialog stack, the remove mutation) loads on first use (plan
// B19b): the payment history shows a plain "Undo" button until it is hovered,
// focused, touched or clicked. `src/tests/lazy-boundaries.test.ts` pins that this
// file never imports the dialog stack statically.
const load = () => import('./UndoSettlementDialogImpl');
const UndoSettlementDialogImpl = React.lazy(() => load().then((m) => ({ default: m.UndoSettlementDialogImpl })));

/**
 * "Undo" with a confirm step (plan B14b): a light shell over
 * `UndoSettlementDialogImpl`, which keeps the whole Dialog composition in one
 * component (CLAUDE.md compound-component rule). The stand-in carries the same
 * accessible name, which says which payment.
 */
export function UndoSettlementDialog(props: UndoSettlementDialogProps) {
  const { settlement, viewerId, names } = props;
  const from = personName(settlement.fromUserId, viewerId, names);
  const to = personName(settlement.toUserId, viewerId, names);
  const amount = money(settlement.amount, settlement.currency);
  return (
    <LazyDialog
      impl={UndoSettlementDialogImpl}
      load={load}
      implProps={props}
      triggerProps={{
        'aria-label': `Undo payment from ${from} to ${to}, ${amount}`,
        className: cn(buttonVariants({ variant: 'outline', size: 'sm' })),
      }}
    >
      Undo
    </LazyDialog>
  );
}
