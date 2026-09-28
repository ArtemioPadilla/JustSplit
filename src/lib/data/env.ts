/**
 * Resolves the browser-public Supabase config (plan B2a, spec D1).
 *
 * Pure so it can be unit-tested without `import.meta.env`. Both values are
 * public by design (project URL + anon/publishable key); authorization is
 * Postgres RLS, never the client (CLAUDE.md rule 8). No key is ever hardcoded
 * here, not even the local stack's: copy it from `npx supabase status` into
 * `.env.local` (plan B2 adds a script for it).
 */
export interface SupabaseEnvInput {
  PUBLIC_SUPABASE_URL?: string | undefined;
  PUBLIC_SUPABASE_KEY?: string | undefined;
  PUBLIC_SUPABASE_LOCAL?: string | undefined;
  /** `import.meta.env.PROD` — the local-stack switch is ignored in production builds. */
  PROD?: boolean | undefined;
}

export interface SupabaseEnv {
  enabled: boolean;
  url: string;
  key: string;
  local: boolean;
}

/** `supabase start` API URL (Supabase CLI default port). */
export const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';

export function resolveSupabaseEnv(env: SupabaseEnvInput): SupabaseEnv {
  const local = env.PUBLIC_SUPABASE_LOCAL?.trim() === 'true' && env.PROD !== true;
  const url = (env.PUBLIC_SUPABASE_URL ?? '').trim() || (local ? LOCAL_SUPABASE_URL : '');
  const key = (env.PUBLIC_SUPABASE_KEY ?? '').trim();
  return { enabled: url.length > 0 && key.length > 0, url, key, local };
}
