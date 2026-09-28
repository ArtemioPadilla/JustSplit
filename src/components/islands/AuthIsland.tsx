import * as React from 'react';
import { AuthProvider, createJustSplitProfile, onProfileLoaded } from '@/lib/auth-context';
import { authAdapter, profileStore } from '@/lib/data/adapter';
import { Alert } from '@/components/ui/alert';
import AuthBridge from './AuthBridge';

export interface AuthIslandProps {
  children: React.ReactNode;
}

/**
 * `<AuthProvider>` (from `@cyber-eco/auth`, via `src/lib/auth-context.ts`) +
 * `<AuthBridge>` (plan B4). Because `AuthProvider` is React Context — never
 * shared across islands (CLAUDE.md rule 2) — every route island that needs
 * auth renders its OWN `AuthIsland` at its own root:
 * `ErrorBoundary > AuthIsland > AuthGate > Content`. Layout islands
 * (`UserMenuIsland`) read `src/stores/auth.ts` only, never mount this.
 *
 * Guarded like the rest of `src/lib/data/` (CLAUDE.md rule 7): a build
 * without `PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_KEY` (`ci.yml`, on purpose)
 * has `authAdapter`/`profileStore` as `null`; rendering an `Alert` instead
 * of constructing `<AuthProvider>` with a null adapter avoids a runtime
 * crash the moment this island mounts.
 */
export default function AuthIsland({ children }: AuthIslandProps): React.ReactNode {
  if (!authAdapter || !profileStore) {
    return (
      <Alert variant="destructive">Sign-in is not configured for this build.</Alert>
    );
  }

  return (
    <AuthProvider
      config={{ adapter: authAdapter, profileStore }}
      createUserProfile={createJustSplitProfile}
      onUserProfileLoaded={onProfileLoaded}
    >
      <AuthBridge />
      {children}
    </AuthProvider>
  );
}
