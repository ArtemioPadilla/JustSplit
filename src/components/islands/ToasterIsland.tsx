import { Toaster } from '@/components/ui/toast';
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
 */
export default function ToasterIsland() {
  return (
    <ErrorBoundary name="ToasterIsland">
      <Toaster />
    </ErrorBoundary>
  );
}
