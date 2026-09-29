import * as React from 'react';
import type { ReadableAtom } from 'nanostores';
// This island is in the header of every page, public ones included. It reads
// the session atoms from @/stores/session (no SDK) and imports the auth
// actions, which pull @supabase/supabase-js, only when the user signs out.
// scripts/check-auth-bundle.mjs fails the build if a public page loads the
// SDK up front.
import { $authReady, $profile, $user } from '@/stores/session';
import { withBase } from '@/lib/href';
import { useClientPreference } from '@/lib/use-client-preference';
import ErrorBoundary from './ErrorBoundary';

// The dropdown menu + avatar (Base UI's Menu + Avatar primitives) are ~48.6
// kB gz (plan B6/B19 "Header weight") and only ever render for a signed-in
// user — every signed-out visitor (most page loads: anonymous traffic, and
// every load of a page with no route island to populate $user at all) never
// needs this chunk. `React.lazy` + this dynamic import() is what gets Vite
// to code-split it out of UserMenuIsland's own chunk (see
// src/components/ui/field-type/lazy-date-picker.tsx for the same pattern).
const UserAccountMenu = React.lazy(() => import('./UserAccountMenu'));

/**
 * UserMenuIsland — layout island mounted from `SiteHeader.astro` on every
 * page (plan B6, spec D3). A LAYOUT island reads Nano Stores only: it never
 * mounts `AuthIsland`/`<AuthProvider>` (that tree lives inside whichever
 * route island the page happens to render — see `AuthIsland.tsx`) and never
 * mounts `QueryProvider` (guarded by
 * `src/tests/query-provider-boundary.test.ts`, which names this file
 * explicitly). That means this component only ever reflects a session an
 * ALREADY-mounted route island's `AuthBridge` mirrored into these stores; on
 * a page with no such island (e.g. a page with no auth-gated route island
 * yet) it renders the signed-out state, which is also exactly what it must
 * render when Supabase isn't configured for the build at all
 * (`supabaseEnabled === false` — `ci.yml` builds every PR that way) since
 * `$user` simply never leaves its default `null`.
 */
export default function UserMenuIsland() {
  return (
    <ErrorBoundary name="UserMenuIsland">
      <UserMenuInner />
    </ErrorBoundary>
  );
}

/**
 * Reads a session atom hydration-safely (plan B6b, React error #418).
 *
 * This island is SSR'd into every app page and the site is static, so the
 * server HTML is always the signed-out state. `client:idle` hydrates whenever
 * the browser is idle, though, and the page's `client:only` route island
 * (`AuthBridge`) has usually filled `$user`/`$profile`/`$authReady` by then.
 * `useStore` from `@nanostores/react` reuses the LIVE store value as its
 * server snapshot, so the hydration render was already the signed-in markup
 * and disagreed with the server's "Sign in" link, on exactly the signed-in
 * loads that lost that race. `useClientPreference` (useSyncExternalStore with
 * a fixed server snapshot) hydrates against the signed-out default, then
 * switches to the store value in a follow-up render.
 */
function useSessionAtom<T>(store: ReadableAtom<T>, serverDefault: T): T {
  // `subscribe`/`getSnapshot` must keep their identity across renders, or
  // useSyncExternalStore would resubscribe every render.
  const subscribe = React.useCallback((onChange: () => void) => store.listen(onChange), [store]);
  const getSnapshot = React.useCallback(() => store.get(), [store]);
  return useClientPreference(getSnapshot, serverDefault, subscribe);
}

function UserMenuInner() {
  const user = useSessionAtom($user, null);
  const profile = useSessionAtom($profile, null);
  const authReady = useSessionAtom($authReady, false);

  if (!authReady || !user) {
    return (
      <a
        href={withBase('/auth/signin/')}
        className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-primary"
      >
        Sign in
      </a>
    );
  }

  const name = profile?.name || user.displayName || user.email || 'Account';
  const avatarUrl = profile?.avatarUrl || user.photoURL || undefined;

  return (
    <React.Suspense fallback={<AccountMenuFallback name={name} />}>
      <UserAccountMenu name={name} avatarUrl={avatarUrl} />
    </React.Suspense>
  );
}

/**
 * Suspense fallback while the lazy dropdown chunk loads — a non-jumping
 * placeholder the same size/shape as UserAccountMenu's real trigger. The
 * name is real, accessible text (not aria-hidden): it's already known
 * synchronously from $profile/$user, so there's no reason to hide it while
 * only the avatar image and dropdown behavior are still loading.
 * `aria-busy` tells assistive tech the control isn't interactive yet.
 */
function AccountMenuFallback({ name }: { name: string }) {
  return (
    <span
      className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-foreground"
      aria-busy="true"
    >
      <span className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-muted" aria-hidden="true" />
      <span className="hidden max-w-[10rem] truncate sm:inline">{name}</span>
    </span>
  );
}
