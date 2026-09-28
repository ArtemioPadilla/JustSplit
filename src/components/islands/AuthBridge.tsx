import * as React from 'react';
import { useAuth } from '@/lib/auth-context';
import { $authReady, $profile, $user } from '@/stores/auth';

/**
 * Mirrors `useAuth()` into the cross-island Nano Stores (plan B4). Renders
 * nothing; mounted as a child of `<AuthProvider>` inside `AuthIsland`.
 *
 * Never subscribes to `adapter.onAuthStateChanged` itself — the provider
 * already owns that listener and the `profileStore.get → set` bootstrap. A
 * second listener here would double the `INITIAL_SESSION` callbacks and race
 * the profile creation (plan B4).
 */
export default function AuthBridge(): null {
  const { currentUser, userProfile, isLoading } = useAuth();

  React.useEffect(() => {
    $user.set(currentUser);
  }, [currentUser]);

  React.useEffect(() => {
    $profile.set(userProfile);
  }, [userProfile]);

  React.useEffect(() => {
    $authReady.set(!isLoading);
  }, [isLoading]);

  return null;
}
