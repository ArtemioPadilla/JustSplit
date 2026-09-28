import { atom } from 'nanostores';
import type { AuthUser } from '@cyber-eco/types';
import type { JustSplitProfile } from '@/schemas/profile';

/**
 * The session atoms (plan B4, spec D3), with no dependency on the data layer.
 * Layout islands on every page (`UserMenuIsland` in the header) read these
 * without pulling `@supabase/supabase-js` into public pages; the actions that
 * need the SDK live in `./auth.ts`, which re-exports these atoms, so
 * `AuthBridge` stays their only writer.
 */

/** The signed-in user, or null. Type from `@cyber-eco/types` (not `@cyber-eco/auth`, which does not export it, and not `HubUser`, the wrong type — plan B4). */
export const $user = atom<AuthUser | null>(null);

/** True once the provider has resolved the initial session (no user, or a user + its profile). */
export const $authReady = atom<boolean>(false);

/** The `profiles` row for `$user`, or null (signed out, or not loaded yet). */
export const $profile = atom<JustSplitProfile | null>(null);
