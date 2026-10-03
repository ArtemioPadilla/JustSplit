import * as React from 'react';
import { useStore } from '@nanostores/react';
import { createDisposer, type Disposer } from '@/lib/disposer';
import { $online } from '@/stores/online';
import ErrorBoundary from './ErrorBoundary';

/** How long "You're back online." stays on screen (and in the live region) before it clears. */
const BACK_ONLINE_MS = 4000;

/**
 * Renders a fixed bottom banner when the browser goes offline, and a short
 * "You're back online." when it returns.
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
 * - Reconnecting is announced too (WCAG 4.1.3: a status change is announced, and
 *   offline/online are symmetric): "You're back online." goes into the same region,
 *   ONLY on a real offline -> online transition (never on a first load that is
 *   already online), and clears after ~4 s. A flap (offline, online, offline) drops the
 *   pending clear and the message, so nothing stale is left and nothing is said twice.
 * - Motion only under `motion-safe:`: with prefers-reduced-motion the pills just appear.
 */
function OfflineBannerContent() {
  const online = useStore($online);
  const [backOnline, setBackOnline] = React.useState(false);

  React.useEffect(() => {
    const d = createDisposer();
    // A page that loaded offline has already seen the outage: its reconnect is a real transition.
    let wasOffline = !$online.get();
    let clearTimer: Disposer | null = null;
    const cancelClear = () => {
      clearTimer?.dispose();
      clearTimer = null;
    };
    d.add(cancelClear);
    // A store listener, not state set in the effect body: it only fires on a real change.
    d.add(
      $online.listen((isOnline) => {
        cancelClear();
        if (!isOnline) {
          wasOffline = true;
          setBackOnline(false);
          return;
        }
        if (!wasOffline) return;
        wasOffline = false;
        setBackOnline(true);
        clearTimer = createDisposer();
        clearTimer.timeout(BACK_ONLINE_MS, () => setBackOnline(false));
      }),
    );
    return d.dispose;
  }, []);

  return (
    <div role="status" aria-live="polite">
      {!online ? (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-destructive/40 bg-destructive/15 px-4 py-2 text-sm font-medium text-destructive shadow-lg backdrop-blur-sm motion-safe:motion-preset-slide-up-md motion-safe:motion-duration-300">
          <span aria-hidden="true">●</span>{' '}
          <span>You're offline — using cached data.</span>
        </div>
      ) : backOnline ? (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground shadow-lg backdrop-blur-sm motion-safe:motion-preset-slide-up-md motion-safe:motion-duration-300">
          <span aria-hidden="true" className="text-emerald-500">
            ●
          </span>{' '}
          <span>You're back online.</span>
        </div>
      ) : null}
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
