import { atom } from 'nanostores';
import type { AuthUser } from '@cyber-eco/types';
import type { AuthProfile, JustSplitProfile } from '@/schemas/profile';
import type { GuardUser } from '@/lib/route-guard';
import { authAdapter, profileStore } from '@/lib/data/adapter';
import { SupabaseDisabledError, signInWithOAuthRedirect, waitForSession } from '@/lib/data/client';
import { safeNext, withBase } from '@/lib/href';

/**
 * Cross-island session state (plan B4, spec D3: Nano Stores, never React
 * Context, for state shared between islands). `AuthBridge` is the only
 * writer of these three; every other island reads them with
 * `useStore(...)` from `@nanostores/react`.
 */

/** The signed-in user, or null. Type from `@cyber-eco/types` (not `@cyber-eco/auth`, which does not export it, and not `HubUser`, the wrong type — plan B4). */
export const $user = atom<AuthUser | null>(null);

/** True once the provider has resolved the initial session (no user, or a user + its profile). */
export const $authReady = atom<boolean>(false);

/** The `profiles` row for `$user`, or null (signed out, or not loaded yet). */
export const $profile = atom<JustSplitProfile | null>(null);

/**
 * Actions below call `authAdapter`/`profileStore` (from `src/lib/data/adapter.ts`)
 * directly rather than `useAuth()` — they must work from any island,
 * including the `/auth/*` form islands, which are NOT mounted inside an
 * `AuthIsland`/`<AuthProvider>` tree (that tree exists to mirror an
 * ALREADY-signed-in session into these stores; signing in for the first time
 * needs no session to mirror yet). Session changes still reach `$user`/
 * `$profile` the normal way: `AuthProvider`'s own `onAuthStateChanged`
 * listener (wherever an `AuthIsland` is mounted, e.g. the header) fires and
 * `AuthBridge` mirrors it.
 */
function requireAuthAdapter() {
  if (!authAdapter) throw new SupabaseDisabledError();
  return authAdapter;
}

function requireProfileStore() {
  if (!profileStore) throw new SupabaseDisabledError();
  return profileStore;
}

export async function signIn(email: string, password: string): Promise<void> {
  await requireAuthAdapter().signIn(email, password);
}

export async function signUp(email: string, password: string, displayName: string): Promise<void> {
  await requireAuthAdapter().signUp(email, password, displayName);
}

export async function signOut(): Promise<void> {
  await requireAuthAdapter().signOut();
}

export async function resetPassword(email: string): Promise<void> {
  const redirectTo = new URL(withBase('/auth/reset-password/'), location.origin).href;
  await requireAuthAdapter().resetPassword(email, { redirectTo });
}

export async function updatePassword(newPassword: string): Promise<void> {
  await requireAuthAdapter().updatePassword(newPassword);
}

export async function updateDisplayProfile(update: { displayName?: string; photoURL?: string }): Promise<void> {
  await requireAuthAdapter().updateDisplayProfile(update);
}

/**
 * Full-profile update: writes the `profiles` row, mirrors `name`/`avatarUrl`
 * into the auth identity (so `currentUser.displayName`/`photoURL` — and
 * hence a freshly-created profile elsewhere — stay in sync), then refreshes
 * `$profile` from the store (plan B4).
 */
export async function updateProfile(partial: Partial<AuthProfile>): Promise<void> {
  const uid = $user.get()?.uid;
  if (!uid) throw new Error('updateProfile: no signed-in user');
  const store = requireProfileStore();
  await store.update(uid, partial);

  const displayUpdate: { displayName?: string; photoURL?: string } = {};
  if (partial.name) displayUpdate.displayName = partial.name;
  if (partial.avatarUrl) displayUpdate.photoURL = partial.avatarUrl;
  if (Object.keys(displayUpdate).length > 0) {
    await requireAuthAdapter().updateDisplayProfile(displayUpdate);
  }

  const refreshed = await store.get(uid);
  if (refreshed) $profile.set(refreshed);
}

const GOOGLE_NEXT_KEY = 'justsplit:auth:next';

/**
 * Google sign-in bypasses `AuthAdapter.signInWithProvider` on purpose (plan
 * B4): it calls `signInWithOAuth({provider:'google'})` with no
 * `options.redirectTo`, which would land the return on the Supabase
 * project's single Site URL — the wrong origin for staging vs production (one
 * shared project) and unusable there anyway, since the PKCE verifier lives in
 * the originating origin's localStorage. `signInWithOAuthRedirect` (in
 * `src/lib/data/client.ts`) calls the client directly with an explicit
 * `redirectTo` on the CURRENT origin instead.
 *
 * `next` is stashed in `sessionStorage` — never passed through the OAuth
 * round-trip — and read back (through `safeNext`) by `/auth/callback.astro`
 * after the redirect. The page unloads on a real redirect, so this promise
 * only ever resolves (or rejects) when Supabase reports an error before
 * navigating away.
 */
export async function signInWithGoogle(next?: string): Promise<void> {
  if (next) {
    try {
      sessionStorage.setItem(GOOGLE_NEXT_KEY, next);
    } catch {
      // Safari private mode / storage disabled — Google sign-in still works,
      // the post-login redirect just falls back to '/'.
    }
  }
  const redirectTo = new URL(withBase('/auth/callback/'), location.origin).href;
  const { error } = await signInWithOAuthRedirect('google', redirectTo);
  if (error) throw error;
}

/** Reads and clears the stashed `next` target, validated through `safeNext`. */
export function consumeGoogleNext(): string {
  let next: string | null = null;
  try {
    next = sessionStorage.getItem(GOOGLE_NEXT_KEY);
    sessionStorage.removeItem(GOOGLE_NEXT_KEY);
  } catch {
    // Storage unavailable — fall through to the safe default.
  }
  return safeNext(next);
}

/**
 * Adapts the session to the ONE gating module's `GuardUser` (CLAUDE.md
 * "Auth gating rules"; `src/lib/route-guard.tsx`). Roles are granted from
 * the session alone — `'user'` for anyone signed in, nothing more — never
 * from the user-writable `profiles` row: `isAdmin`/`permissions` there grant
 * nothing in JustSplit. `profile` is accepted only so callers can pass it
 * through for display data (name, avatar) alongside the guard check; it is
 * not read here.
 */
export function toGuardUser(user: AuthUser | null, _profile: JustSplitProfile | null): GuardUser | null {
  if (!user) return null;
  return { id: user.uid, roles: ['user'], flags: {} };
}

/**
 * `/auth/callback/` (plan B4): waits for supabase-js to finish the PKCE
 * exchange, then returns where to go. On success that is the stashed `next`
 * (through `safeNext`); when the exchange failed it is the sign-in page, so
 * the visitor can try again instead of landing signed-out on a guarded page.
 * The stash is consumed either way.
 */
export async function completeOAuthSignIn(): Promise<string> {
  const { signedIn } = await waitForSession();
  const next = consumeGoogleNext();
  return signedIn ? next : '/auth/signin/';
}
