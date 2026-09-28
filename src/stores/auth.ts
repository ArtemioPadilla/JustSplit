import { atom } from 'nanostores';
import type { AuthUser } from '@cyber-eco/types';
import type { JustSplitProfile } from '@/schemas/profile';

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
