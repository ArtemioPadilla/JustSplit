import * as React from 'react';
import { useStore } from '@nanostores/react';
import { RouteGuard } from '@/lib/route-guard';
import { withBase } from '@/lib/href';
import { JUSTSPLIT_QUERY_IDB_KEY } from '@/lib/queryClient';
import { $authReady, $profile, $user, toGuardUser } from '@/stores/auth';
import { Skeleton } from '@/components/ui/skeleton';
import QueryProvider from './QueryProvider';

export interface AuthGateProps {
  /** Roles allowed through (RouteGuard's explicit allowlist). Defaults to any signed-in user. */
  allow?: readonly string[];
  /** Rendered by RouteGuard when signed in but not allowed. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Readiness/navigation wrapper ONLY (plan B4) — every allow/deny decision
 * stays in `RouteGuard`, the one gating module (CLAUDE.md "Auth gating
 * rules"). Composition for a protected route island:
 * `ErrorBoundary > AuthIsland > AuthGate > Content`.
 *
 * - `!$authReady` → a Skeleton (the provider hasn't resolved the initial
 *   session yet; never redirect from here, that would bounce a signed-in
 *   user on every hard refresh).
 * - `$authReady && !$user` → `location.replace('/landing/')` (parity with
 *   the frozen Next tree's `ProtectedRoute`; `/landing` doesn't exist until
 *   Phase 2, which is fine — nothing currently renders `AuthGate` on a
 *   shipped route).
 * - Otherwise: `<RouteGuard>` with the session-derived `GuardUser`, around a
 *   `QueryProvider`: this is where signed-in content begins, so it is the one
 *   spot that gives every route island its page's single `QueryClient` (spec D3
 *   / ADR 0004: one provider per page, shared idb key `justsplit:query`) —
 *   and only once a user is known and allowed, so an anonymous or denied
 *   visitor never has the device cache restored. Without it every data hook
 *   throws "No QueryClient set" (no island mounted one; their unit tests mock
 *   the hooks, which hid it). Layout islands still never mount it.
 */
export default function AuthGate({ allow = ['user'], fallback = null, children }: AuthGateProps): React.ReactNode {
  const user = useStore($user);
  const profile = useStore($profile);
  const authReady = useStore($authReady);

  React.useEffect(() => {
    if (authReady && !user) {
      window.location.replace(withBase('/landing/'));
    }
  }, [authReady, user]);

  if (!authReady) return <Skeleton className="h-40 w-full" aria-label="Loading" />;
  // The effect above is navigating away; render nothing in the meantime.
  if (!user) return null;

  return (
    <RouteGuard user={toGuardUser(user, profile)} allow={allow} fallback={fallback}>
      <QueryProvider idbKey={JUSTSPLIT_QUERY_IDB_KEY}>{children}</QueryProvider>
    </RouteGuard>
  );
}
