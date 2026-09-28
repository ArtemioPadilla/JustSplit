import { createAuthContext } from '@cyber-eco/auth';
import type { AuthUser } from '@cyber-eco/types';
import type { JustSplitProfile } from '@/schemas/profile';
import { $profile } from '@/stores/auth';

/**
 * `createAuthContext<T>()`'s `T` must extend `BaseUserConstraint`
 * (`{ id: string; name: string; … }` — `name` non-nullable). The persisted
 * `profiles` row (`src/schemas/profile.ts`) allows a nullable `name` because
 * it describes what a row CAN contain (partial upserts, pre-existing rows),
 * which is wider than what the auth context ever produces:
 * `createJustSplitProfile` below always stamps a `name`. `AuthProfile`
 * narrows just that one field so the generic constraint is satisfied without
 * loosening the storage-layer schema; it is structurally a `JustSplitProfile`
 * (assignable to `$profile`'s wider type) with a guaranteed `name`.
 */
/**
 * An intersection, not `Omit<JustSplitProfile, 'name'>`: the schema's
 * `.loose()` gives it an index signature, and `Omit`/`Pick` over a type with
 * an index signature collapses to the index signature itself, dropping every
 * other named property (a known TS quirk). Intersecting the narrower field
 * types instead keeps the rest of `JustSplitProfile` untouched — every one
 * of `BaseUserConstraint`'s optional fields is `string | null | undefined` on
 * the storage row (nullable DB columns) but `string | undefined` on the
 * constraint (no `null`); `T & U` drops `null` without an unsafe cast.
 */
export type AuthProfile = JustSplitProfile & {
  name: string;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

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
