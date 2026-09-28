import { createAuthContext } from '@cyber-eco/auth';
import type { AuthUser } from '@cyber-eco/types';
import type { AuthProfile } from '@/schemas/profile';
import { $profile } from '@/stores/auth';

export type { AuthProfile };

const { AuthProvider, useAuth } = createAuthContext<AuthProfile>();
export { AuthProvider, useAuth };

/**
 * `createUserProfile` passed to `<AuthProvider>` (plan B4). Runs exactly
 * once per user, on the first authenticated `onAuthStateChanged` when
 * `profileStore.get(uid)` finds nothing yet. Module-level (not an inline
 * arrow): the provider's onAuthStateChanged effect lists this function in
 * its dependency array, so a fresh identity on every render would
 * re-subscribe the adapter listener and race the profile bootstrap.
 */
export const createJustSplitProfile = (u: AuthUser): AuthProfile => {
  const now = new Date().toISOString();
  return {
    id: u.uid,
    name: u.displayName ?? 'User',
    email: u.email ?? undefined,
    avatarUrl: u.photoURL ?? undefined,
    apps: ['justsplit'],
    permissions: [],
    preferences: { preferredCurrency: 'USD' },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
};

/**
 * `onUserProfileLoaded` passed to `<AuthProvider>`. Same module-level-identity
 * requirement as `createJustSplitProfile` above. `AuthBridge` also mirrors
 * `userProfile` into `$profile` on every render (covers updates the provider
 * makes outside this callback); the two writes are idempotent.
 */
export const onProfileLoaded = (p: AuthProfile): void => {
  $profile.set(p);
};
