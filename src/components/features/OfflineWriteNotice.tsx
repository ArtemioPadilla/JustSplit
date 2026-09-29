import { OFFLINE_WRITE_MESSAGE } from '@/lib/offline-write';
import type { WriteState } from '@/lib/use-can-write';
import { cn } from '@/lib/utils';

/**
 * The visible half of "writes require a connection" (plan B19c, ADR 0015): the
 * one short sentence a blocked control points at with `aria-describedby`. It
 * renders nothing while writes are possible. No live-region role on purpose: the
 * layout's `OfflineBanner` already announces the change of state politely, and a
 * second announcement per surface would be noise; a screen reader hears this text
 * as the description of the control it is focused on.
 */
export function OfflineWriteNotice({ write, className }: { write: WriteState; className?: string }) {
  if (write.canWrite) return null;
  return (
    <p
      id={write.noticeId}
      data-offline-notice=""
      className={cn('rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground', className)}
    >
      {OFFLINE_WRITE_MESSAGE}
    </p>
  );
}
