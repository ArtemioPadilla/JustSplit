import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveSupabaseEnv } from './env';

/**
 * The ONLY module that creates a Supabase client (plan B2a; CLAUDE.md rule 7).
 * Islands and stores never import `@supabase/supabase-js`: data goes through
 * `src/lib/data/repos/*` over the StorageAdapter built in `./adapter.ts`.
 *
 * Guarded (Inceptor `docs/recipes/auth-supabase.md` §2): a build without the
 * public config — `ci.yml` on purpose — yields `supabase === null` and
 * `supabaseEnabled === false`; islands then render an `Alert` instead of
 * crashing.
 */
const env = resolveSupabaseEnv({
  PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL as string | undefined,
  PUBLIC_SUPABASE_KEY: import.meta.env.PUBLIC_SUPABASE_KEY as string | undefined,
  PUBLIC_SUPABASE_LOCAL: import.meta.env.PUBLIC_SUPABASE_LOCAL as string | undefined,
  PROD: import.meta.env.PROD,
});

export const supabaseEnabled = env.enabled;

export const supabase: SupabaseClient | null = env.enabled
  ? createClient(env.url, env.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

/** Thrown when data access is attempted in a build without Supabase config. */
export class SupabaseDisabledError extends Error {
  constructor() {
    super('Supabase is not configured for this build (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_KEY).');
    this.name = 'SupabaseDisabledError';
  }
}

/** Returns the client or throws; for code paths that already checked `supabaseEnabled`. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new SupabaseDisabledError();
  return supabase;
}

/**
 * Postgres functions the app may call (defined in plan B2, `SECURITY DEFINER`
 * with a narrow return shape). Keeping the allowlist here keeps every `rpc`
 * call inside this file's import boundary (B5a `repos.profiles`).
 */
export interface PublicProfileRow {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface RpcFunctions {
  /** Exact, confirmed-email lookup on `auth.users` (plan B2 fn 9); authenticated only. */
  find_profile_by_email: { args: { p_email: string }; returns: PublicProfileRow[] };
  /** Names/avatars of users who share a row with the caller (plan B2 fn 10); max 200 ids. */
  find_profiles_by_ids: { args: { ids: string[] }; returns: PublicProfileRow[] };
}

export type RpcName = keyof RpcFunctions;

/** Typed wrapper over `supabase.rpc`; throws the PostgREST error instead of returning it. */
export async function rpc<N extends RpcName>(
  name: N,
  args: RpcFunctions[N]['args'],
  client: SupabaseClient | null = supabase,
): Promise<RpcFunctions[N]['returns']> {
  if (!client) throw new SupabaseDisabledError();
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return (data ?? []) as RpcFunctions[N]['returns'];
}

export interface OAuthRedirectResult {
  error: Error | null;
}

/**
 * The one raw-SDK call `src/stores/auth.ts`'s `signInWithGoogle` needs (plan
 * B4). `AuthAdapter.signInWithProvider` cannot express a per-call
 * `redirectTo`, so Google sign-in bypasses it and calls
 * `client.auth.signInWithOAuth` directly — kept here, not in the store, so
 * `@supabase/supabase-js` is never imported outside `src/lib/data/`
 * (CLAUDE.md rule 7, `src/tests/data-boundary.test.ts`). Never throws: the
 * SDK error is returned, not raised, matching `AuthAdapter`'s own methods.
 */
export async function signInWithOAuthRedirect(
  provider: 'google',
  redirectTo: string,
  client: SupabaseClient | null = supabase,
): Promise<OAuthRedirectResult> {
  if (!client) return { error: new SupabaseDisabledError() };
  const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo } });
  return { error };
}

/**
 * `/auth/reset-password.astro` needs to tell apart "the visitor just landed
 * from the recovery email link" from an ordinary sign-in, to switch from the
 * request form to the update-password form. `AuthAdapter.onAuthStateChanged`
 * (`SupabaseAuthAdapter`) discards the Supabase event type and forwards only
 * the mapped user, so it cannot make that distinction — this calls
 * `client.auth.onAuthStateChange` directly, filtered to `PASSWORD_RECOVERY`,
 * kept here for the same `@supabase/supabase-js`-boundary reason as
 * `signInWithOAuthRedirect` above. A no-op (returns a callable unsubscribe)
 * without a client.
 */
export function onPasswordRecovery(
  callback: () => void,
  client: SupabaseClient | null = supabase,
): () => void {
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') callback();
  });
  return () => data.subscription.unsubscribe();
}
