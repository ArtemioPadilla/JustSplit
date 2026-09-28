import { useStore } from '@nanostores/react';
import { $online } from '@/stores/online';

/**
 * Renders a fixed bottom banner when the browser goes offline.
 *
 * Mounted with `client:idle` in BaseLayout so the event listener is live as
 * soon as the main thread is idle — not gated on visibility. The banner is
 * visually absent until needed, so there is no layout cost when online.
 *
 * Accessibility:
 * - role="status" + aria-live="polite" announces the message to screen readers
 *   without interrupting ongoing speech.
 */
export default function OfflineBanner() {
  const online = useStore($online);
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-destructive/40 bg-destructive/15 px-4 py-2 text-sm font-medium text-destructive shadow-lg backdrop-blur-sm motion-preset-slide-up-md motion-duration-300"
    >
      <span aria-hidden="true">●</span>{' '}
      <span>You're offline — using cached data.</span>
    </div>
  );
}
