import { registerSW } from 'virtual:pwa-register';
import { markNeedsRefresh, setUpdateActivator } from '@/stores/install';

/**
 * Wire the virtual:pwa-register lifecycle into our Nano Stores.
 *
 * Called once from a module <script> in BaseLayout.astro. Keeping this
 * in its own file (rather than inlining in the layout) gives us a typed
 * import path and a unit-test seam if needed in the future.
 *
 * - onNeedRefresh: a new SW is installed and waiting; flip $needsRefresh
 *   so UpdateToast renders.
 * - onOfflineReady: the app is now offline-capable. No extra UI needed —
 *   OfflineBanner already handles the online/offline transition.
 * - updateSW(true): call this to skip-waiting, activate the new SW,
 *   and reload the page in one step.
 */
export function initPwaRegister(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      markNeedsRefresh();
    },
    onOfflineReady() {
      // Intentionally no-op — OfflineBanner covers the offline state.
    },
  });

  // Capture the activator so the UpdateToast button can trigger it later.
  setUpdateActivator(async () => {
    await updateSW(true);
  });
}

// Type declaration for 'virtual:pwa-register' lives in src/types/vite-pwa.d.ts.
// A file that imports from a module cannot also host a `declare module` block
// for that same module — TypeScript treats inline augmentations in files with
// imports as module augmentation rather than ambient declarations, which causes
// TS2307 / TS2664. The dedicated ambient file has no imports and is picked up
// automatically by TypeScript via tsconfig.json's include glob.
