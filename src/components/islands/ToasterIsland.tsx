import * as React from 'react';
import { Toaster } from '@/components/ui/toast';
import { drainPendingToasts } from '@/stores/notifications';
import ErrorBoundary from './ErrorBoundary';

/**
 * The single layout-level Toaster (plan B17b, ADR 0008). Mounted once by
 * `BaseLayout.astro` with `client:idle` on every non-marketing page — every
 * other island (a route island, a form dialog, `UpdateToast`'s sibling
 * `InstallButton`, ...) only ever fires the imperative `toast()`/`notify*`
 * helpers (`src/stores/notifications.ts`) from its OWN, independent React
 * root; none of them render a `<Toaster/>` of their own.
 *
 * This works because Base UI's `createToastManager()` (`ui/toast.tsx`'s
 * `toastManager`) is a plain module-level singleton object — every island
 * that imports `ui/toast.tsx` shares the SAME manager instance as long as
 * the build puts it in one shared chunk (verified against the production
 * build in ADR 0008; not just this unit-test-level module identity). A
 * toast fired before this island has hydrated is queued by `toast()`
 * itself and flushed the moment `<Toaster/>` mounts (see that file's doc
 * comment) — so a `client:only` route island racing ahead of this
 * `client:idle` mount never loses a toast.
 *
 * `client:idle` (not `client:load`): the Toaster is never itself the thing
 * a page is waiting to interact with, so it must not compete with
 * first-paint/first-interaction work (CLAUDE.md: "never client:idle` /
 * `client:visible` for non-critical islands" — this is the canonical
 * non-critical layout island).
 *
 * Cross-navigation toasts (plan B17b amendment, ADR 0008): `drainPendingToasts()`
 * (`stores/notifications.ts`) runs once on mount, firing anything queued
 * by a `{ afterNavigation: true }` call on the page THIS ONE navigated away
 * from (a `location.assign`/`reload()` in this static MPA is a full page
 * load — `sessionStorage` is the only thing that survives it within the
 * same tab). This effect is defined on `ToasterIsland` itself — an
 * ANCESTOR of `<Toaster/>` — so React's bottom-up effect-commit order on
 * mount runs `Toaster`'s own flush effect (and `BaseToast.Provider`'s
 * subscribe effect, a descendant of that) first; the manager already has a
 * listener by the time this drain fires, so a drained toast renders
 * immediately without even needing `toast()`'s own pre-hydration queue as
 * a fallback.
 */
export default function ToasterIsland() {
  React.useEffect(() => {
    drainPendingToasts();
  }, []);

  return (
    <ErrorBoundary name="ToasterIsland">
      <Toaster />
    </ErrorBoundary>
  );
}
