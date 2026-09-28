import * as React from 'react';
import { completeOAuthSignIn } from '@/stores/auth';
import { withBase } from '@/lib/href';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from './ErrorBoundary';

/**
 * `/auth/callback.astro` (plan B4). When this mounts, supabase-js has started
 * the PKCE exchange (`detectSessionInUrl: true`, B2a), and
 * `AuthProvider`'s listener (wherever an `AuthIsland` is mounted next, e.g.
 * the header) will pick up the new session. This island waits for that
 * exchange to finish (`completeOAuthSignIn`), then hands off to `next`: the
 * value `signInWithGoogle` stashed in `sessionStorage` before the redirect
 * (never round-tripped through the OAuth provider), validated by `safeNext`.
 * A failed exchange goes back to the sign-in page.
 */
export default function AuthCallbackIsland() {
  return (
    <ErrorBoundary name="AuthCallbackIsland">
      <AuthCallbackInner />
    </ErrorBoundary>
  );
}

function AuthCallbackInner() {
  React.useEffect(() => {
    let cancelled = false;
    // Navigate only once supabase-js has finished the PKCE exchange; leaving
    // earlier aborts the token request and the sign-in is lost.
    void completeOAuthSignIn().then((target) => {
      if (!cancelled) location.replace(withBase(target));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <Skeleton className="h-24 w-full" aria-label="Signing you in…" />;
}
