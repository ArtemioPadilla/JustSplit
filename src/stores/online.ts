import { atom, onMount } from 'nanostores';

/**
 * Cross-island connectivity state. The store mirrors `navigator.onLine`
 * and listens for online/offline events. Initial value is `true` so SSR
 * and pre-hydration paint don't flash an offline banner.
 *
 * The event-based approach (rather than polling) gives sub-second latency
 * because browsers fire these events within ~1 s of a network state change.
 */
export const $online = atom<boolean>(true);

if (typeof window !== 'undefined') {
  onMount($online, () => {
    // Sync to the real value immediately once the component mounts so any
    // discrepancy (e.g. page loaded while already offline) is corrected.
    $online.set(navigator.onLine);

    const onOnline = () => $online.set(true);
    const onOffline = () => $online.set(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  });
}
