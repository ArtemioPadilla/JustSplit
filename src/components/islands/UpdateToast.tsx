import { useStore } from '@nanostores/react';
import { $needsRefresh, activateUpdate } from '@/stores/install';

/**
 * Toast that appears when a new service worker is waiting to activate.
 * `$needsRefresh` is set true by the pwa-register module's `onNeedRefresh`
 * callback, which fires after a successful SW update download.
 *
 * Clicking "Reload" calls `activateUpdate()` which skip-waits the new SW
 * and reloads the page — the user immediately gets the updated app.
 *
 * Accessibility:
 * - role="status" + aria-live="polite" announces the message without
 *   interrupting ongoing screen-reader speech.
 */
export default function UpdateToast() {
  const needs = useStore($needsRefresh);
  if (!needs) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-border bg-card text-card-foreground px-4 py-3 shadow-lg motion-preset-slide-down-md motion-duration-300"
    >
      <p className="text-sm font-medium">Update available</p>
      <p className="mt-1 text-xs text-muted-foreground">A new version is ready.</p>
      <button
        type="button"
        onClick={() => activateUpdate()}
        className="mt-2 inline-flex items-center rounded-md border border-primary/40 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Reload
      </button>
    </div>
  );
}
