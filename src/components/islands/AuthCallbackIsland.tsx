import * as React from 'react';
import { consumeGoogleNext } from '@/stores/auth';
import { withBase } from '@/lib/href';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from './ErrorBoundary';

/**
 * `/auth/callback.astro` (plan B4). By the time this mounts, supabase-js has
 * already finished the PKCE exchange (`detectSessionInUrl: true`, B2a) and
 * `AuthProvider`'s listener (wherever an `AuthIsland` is mounted next, e.g.
 * the header) will pick up the new session. This island's only job is the
 * `next` hand-off: read back the value `signInWithGoogle` stashed in
 * `sessionStorage` before the redirect (never round-tripped through the
 * OAuth provider itself), validate it (`consumeGoogleNext` runs it through
 * `safeNext`), and navigate.
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
    location.replace(withBase(consumeGoogleNext()));
  }, []);

  return <Skeleton className="h-24 w-full" aria-label="Signing you in…" />;
}
