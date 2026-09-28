import { z } from 'zod';

/**
 * A toast queued in `sessionStorage` to survive a full-page navigation
 * (plan B17b amendment — "cross-navigation toasts", ADR 0008). This is the
 * wire shape for the `justsplit:pending-toasts` storage key — a storage
 * boundary, so per CLAUDE.md rule 8 it is a Zod schema, never a bare
 * TypeScript `interface`: a malformed or tampered entry (garbage JSON, a
 * future/older schema version, a hand-edited devtools value) must be
 * dropped by `drainPendingToasts()` instead of crashing `ToasterIsland`'s
 * mount-time drain.
 */
export const PendingToastSchema = z.object({
  kind: z.enum(['success', 'error', 'info']),
  title: z.string().min(1),
  description: z.string().optional(),
});
export type PendingToast = z.infer<typeof PendingToastSchema>;

/** Bounded — `notifications.ts` never lets the queue grow past this many entries (oldest dropped first). */
export const MAX_PENDING_TOASTS = 5;

export const PendingToastQueueSchema = z.array(PendingToastSchema).max(MAX_PENDING_TOASTS);
export type PendingToastQueue = z.infer<typeof PendingToastQueueSchema>;
