import { atom } from 'nanostores';

/**
 * Captured BeforeInstallPromptEvent (Chromium-only API). When present,
 * the app is installable and the consumer can call `.prompt()` to show
 * the native install dialog.
 *
 * Stays null on Safari/Firefox because those browsers never fire the event —
 * the InstallButton island naturally hides itself in those environments.
 */
export const $installPrompt = atom<BeforeInstallPromptEvent | null>(null);

/**
 * Whether a new service worker is waiting to take control. Set when
 * virtual:pwa-register's `onNeedRefresh` fires.
 */
export const $needsRefresh = atom<boolean>(false);

/** Called by the SW registration module to flip the update flag. */
export function markNeedsRefresh(): void {
  $needsRefresh.set(true);
}

/**
 * Activate the waiting SW and reload. `activateAndReload` is provided by
 * virtual:pwa-register — we capture it on registration via `setUpdateActivator`
 * and call it from the UpdateToast button.
 */
let activateAndReload: (() => Promise<void>) | null = null;

export function setUpdateActivator(fn: () => Promise<void>): void {
  activateAndReload = fn;
}

export async function activateUpdate(): Promise<void> {
  if (activateAndReload) {
    await activateAndReload();
  } else {
    // Fallback: a plain reload still picks up the new SW after autoUpdate fires.
    window.location.reload();
  }
}

// Wire up the install prompt events on the client side only.
// We do this at module level (not inside onMount) to capture the event as
// early as possible — before any island hydrates. The event fires once and
// is not re-fired if the listener registers late.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent the default mini-info-bar so we control when the prompt shows.
    e.preventDefault();
    $installPrompt.set(e as BeforeInstallPromptEvent);
  });

  // Clear the prompt after the user has installed (or via OS/browser action).
  window.addEventListener('appinstalled', () => {
    $installPrompt.set(null);
  });
}

// TypeScript: BeforeInstallPromptEvent is not in lib.dom.d.ts (Chromium-only).
// Declaring it here keeps this type alongside the store that uses it, avoiding
// a scatter of ambient declarations across env.d.ts.
declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: ReadonlyArray<string>;
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
  }
}
