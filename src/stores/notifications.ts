import { toast } from '@/components/ui/toast';
import { PendingToastQueueSchema, MAX_PENDING_TOASTS, type PendingToast } from '@/schemas/pending-toast';

/**
 * Thin wrapper over Inceptor's imperative `toast()` (`src/components/ui/toast.tsx`,
 * built on Base UI's Toast — plan B5b). Feature islands (B8-B16) fire
 * toasts through this module ONLY, never `toast()` directly, so the
 * topology decision in B17b (ADR 0008: toast topology and cache reset) can
 * change the underlying mechanism without touching every island.
 *
 * Cross-navigation toasts (plan B17b amendment, ADR 0008 "cross-navigation
 * toasts" section): this is a static MPA (spec D2) — every
 * `window.location.assign`/`.replace`/`reload()` is a full page load, which
 * discards any toast fired synchronously just before it (Base UI's toast
 * manager lives in the JS heap of the page being torn down). Call sites
 * that notify and then navigate (B9/B12 delete dialogs, B10's expense
 * save incl. its partial-failure-receipt-upload honesty message, B12
 * group create, `resetLocalData`, ...) pass `{ afterNavigation: true }`
 * instead, which queues the toast in `sessionStorage` under
 * `justsplit:pending-toasts` (a bounded array, `MAX_PENDING_TOASTS`
 * entries, oldest dropped first — validated on both write and read via
 * `PendingToastSchema`, a storage-boundary Zod schema per CLAUDE.md rule
 * 8) instead of firing it immediately. `drainPendingToasts()` is called
 * once by `ToasterIsland` on mount (after the navigation lands) and fires
 * each queued entry through THIS module's own `notifySuccess`/`notifyError`/
 * `notifyInfo`, so an error drained from the queue still gets the same
 * assertive/persistent treatment as one fired live.
 *
 * `sessionStorage` (not `localStorage`): it's per-tab and clears itself
 * when the tab closes — a queued toast has no reason to survive longer
 * than the navigation it's bridging, and no reason to leak into a
 * different tab. Only toast TEXT is stored, never anything else about the
 * action that triggered it.
 *
 * A marketing page (no `ToasterIsland` mounted, spec D3) never drains the
 * queue — it's left in place for the next page that has one, since
 * `sessionStorage` persists across same-tab navigations regardless of
 * which page reads it.
 */

const PENDING_TOASTS_KEY = 'justsplit:pending-toasts';

export interface NotifyOptions {
  description?: string;
  /**
   * Queues the toast in `sessionStorage` instead of firing it immediately —
   * for a call site that navigates (a full page load in this static MPA)
   * right after notifying, which would otherwise discard a toast fired
   * synchronously before it. Falls back to firing immediately if
   * `sessionStorage` is unavailable (private-browsing storage limits,
   * quota exceeded, etc.) — never silently drops the toast.
   */
  afterNavigation?: boolean;
}

type ToastKind = PendingToast['kind'];

/** The actual `toast()` call for each kind — shared by the immediate-fire path and `drainPendingToasts()`, so a drained toast gets identical treatment to a live one. */
function fireNow(kind: ToastKind, title: string, description?: string): string {
  if (kind === 'error') {
    return toast({ title, description, type: 'error', data: { variant: 'destructive' }, priority: 'high', timeout: 0 });
  }
  return toast({ title, description, type: kind });
}

/** Reads + Zod-validates the current queue; anything malformed (bad JSON, wrong shape) becomes an empty queue rather than throwing. */
function readQueue(): PendingToast[] {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(PENDING_TOASTS_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return [];
  }
  const result = PendingToastQueueSchema.safeParse(parsedJson);
  return result.success ? result.data : [];
}

function queueForAfterNavigation(kind: ToastKind, title: string, description?: string): void {
  const entry: PendingToast = description === undefined ? { kind, title } : { kind, title, description };
  try {
    const queue = readQueue();
    queue.push(entry);
    // Bounded: keep only the MOST RECENT MAX_PENDING_TOASTS entries.
    const bounded = queue.slice(-MAX_PENDING_TOASTS);
    sessionStorage.setItem(PENDING_TOASTS_KEY, JSON.stringify(bounded));
  } catch {
    // sessionStorage unavailable/full — never silently drop the toast.
    fireNow(kind, title, description);
  }
}

function notify(kind: ToastKind, title: string, options: NotifyOptions): string | undefined {
  if (options.afterNavigation) {
    queueForAfterNavigation(kind, title, options.description);
    return undefined;
  }
  return fireNow(kind, title, options.description);
}

/** Success — e.g. "Expense saved." */
export function notifySuccess(title: string, options: NotifyOptions = {}): string | undefined {
  return notify('success', title, options);
}

/**
 * Error — destructive-variant toast, e.g. a failed save or network error.
 *
 * `priority: 'high'` asks Base UI's Toast to announce it assertively
 * (WCAG's expectation for an error, vs the default polite announcement
 * every other toast gets); `timeout: 0` disables the default 5s auto-
 * dismiss so an error persists until the user closes it — WCAG 2.2.1
 * (Timing Adjustable): a failure the user didn't get to read before it
 * vanished is effectively invisible.
 */
export function notifyError(title: string, options: NotifyOptions = {}): string | undefined {
  return notify('error', title, options);
}

/** Informational — neither success nor failure, e.g. "You're offline." */
export function notifyInfo(title: string, options: NotifyOptions = {}): string | undefined {
  return notify('info', title, options);
}

/**
 * Drains the `sessionStorage` pending-toast queue and fires each entry
 * through the normal immediate-fire path, in order, then clears the key.
 * Called once by `ToasterIsland` on mount.
 *
 * Idempotent by construction: the queue is read and the storage key
 * removed BEFORE anything is fired, so a second call — whether from a
 * genuinely re-fired mount, React StrictMode's dev-only double effect
 * invocation, or (defensively) two `ToasterIsland`s mounted at once —
 * finds nothing left to drain. All of this is synchronous (no `await`
 * between the read and the removal), so there is no async gap a second
 * call could race into even in principle.
 */
export function drainPendingToasts(): void {
  const queue = readQueue();
  try {
    sessionStorage.removeItem(PENDING_TOASTS_KEY);
  } catch {
    // If we can't even remove it, we also couldn't have read it above
    // (same storage) — nothing left to do.
  }
  for (const entry of queue) {
    fireNow(entry.kind, entry.title, entry.description);
  }
}
