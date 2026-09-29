/**
 * Writes require a connection (plan B19c, ADR 0015). This module is the one
 * definition of "offline for the purpose of a write", and it has no imports on
 * purpose: the data layer, the auth store and every write control share it, and
 * a page that only reads must not pay for anything else.
 *
 * `navigator.onLine === false` is reliable (the browser has no network at all);
 * `true` only means "some network", so it proves nothing and never blocks. A
 * missing or unreadable `onLine` (SSR, an odd embed) counts as online: this is a
 * UX and integrity guard, never authorization, and RLS stays the authority
 * (CLAUDE.md rule 8). There is deliberately NO offline write queue: a person
 * must never believe money was recorded when it was not.
 */

/** The one sentence every write surface shows while offline. */
export const OFFLINE_WRITE_MESSAGE = "You're offline. Changes can't be saved until you reconnect.";

/** Thrown by the data layer, before any network call, for a write attempted while offline. */
export class OfflineWriteError extends Error {
  constructor() {
    super(OFFLINE_WRITE_MESSAGE);
    this.name = 'OfflineWriteError';
  }
}

/** True only when the browser reports it has no network. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** First line of every data-layer write: refuse before any read, upload or RPC starts. */
export function assertOnline(): void {
  if (isOffline()) throw new OfflineWriteError();
}

/**
 * For a submit or click handler: cancels the event and returns true while
 * offline. Reads the live connection, not the render's snapshot, so a handler
 * that fires in the same tick as the `offline` event is still refused.
 */
export function refuseIfOffline(event?: { preventDefault(): void }): boolean {
  if (!isOffline()) return false;
  event?.preventDefault();
  return true;
}

/**
 * The text for a failed write: the shared sentence for an `OfflineWriteError`,
 * the surface's own `fallback` for anything else. Never the raw error (an
 * adapter message is database text).
 */
export function writeErrorMessage(error: unknown, fallback: string): string {
  return error instanceof OfflineWriteError ? OFFLINE_WRITE_MESSAGE : fallback;
}
