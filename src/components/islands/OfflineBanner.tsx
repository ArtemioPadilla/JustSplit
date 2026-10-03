import { useStore } from '@nanostores/react';
import { $online } from '@/stores/online';
import ErrorBoundary from './ErrorBoundary';

/**
 * Renders a fixed bottom banner when the browser goes offline.
 *
 * Mounted with `client:idle` in BaseLayout so the event listener is live as
 * soon as the main thread is idle — not gated on visibility. The banner is
 * visually absent until needed, so there is no layout cost when online.
 *
 * Accessibility (plan B19d):
 * - The polite `role="status"` region is ALWAYS rendered, empty while online,
 *   and the message is added to it. A live region that is created already
 *   holding its text is the pattern NVDA and JAWS announce least reliably; one
 *   that exists first and then receives text is announced everywhere. It
 *   announces without interrupting ongoing speech, and the visible pill inside it
 *   is `fixed`, so the empty wrapper takes no space.
 */
function OfflineBannerContent() {
  const online = useStore($online);

  return (
    <div role="status" aria-live="polite">
      {online ? null : (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-destructive/40 bg-destructive/15 px-4 py-2 text-sm font-medium text-destructive shadow-lg backdrop-blur-sm motion-preset-slide-up-md motion-duration-300">
          <span aria-hidden="true">●</span>{' '}
          <span>You're offline — using cached data.</span>
        </div>
      )}
    </div>
  );
}

export default function OfflineBanner() {
  return (
    <ErrorBoundary name="OfflineBanner">
      <OfflineBannerContent />
    </ErrorBoundary>
  );
}
