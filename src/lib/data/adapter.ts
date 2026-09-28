import { SupabaseAuthAdapter, SupabaseProfileStore } from '@cyber-eco/supabase';
import type { StorageAdapter } from '@cyber-eco/types';
import type { AuthProfile } from '@/schemas/profile';
import { supabase } from './client';

/**
 * The single place that constructs data-layer adapters (plan B2a, spec D1/D3).
 * Nothing outside `src/lib/data/` imports `@cyber-eco/supabase`
 * (enforced by `src/tests/data-boundary.test.ts`).
 *
 * Storage: the upstream `SupabaseStorageAdapter` is document mode only
 * (`public.documents`, owner-only RLS), which spec D1 forbids for shared
 * data. Until the hub publishes relational mode (plan H2) this exports the
 * contingency `RelationalSupabaseAdapter` (wired in B5a); afterwards it
 * becomes `new SupabaseStorageAdapter(() => client, { schemaMap })`. The
 * boundary test fails if the upstream adapter is ever constructed here
 * without a `schemaMap`.
 */
export const storageAdapter: StorageAdapter | null = null; // B5a wires the relational adapter.

/** Auth for `@cyber-eco/auth`'s `<AuthProvider>` (plan B4). */
export const authAdapter: SupabaseAuthAdapter | null = supabase ? new SupabaseAuthAdapter(supabase) : null;

/**
 * Public profile rows (`public.profiles`, plan B2); never a source of
 * identity. Typed `AuthProfile` (not the wider `JustSplitProfile`) because
 * this is the exact instance handed to `<AuthProvider>`'s `config`
 * (`AuthConfig<AuthProfile>` — see `src/lib/auth-context.ts`); every row it
 * reads or writes went through `createJustSplitProfile`, which always stamps
 * a `name`.
 */
export const profileStore: SupabaseProfileStore<AuthProfile> | null = supabase
  ? new SupabaseProfileStore<AuthProfile>(supabase, 'profiles')
  : null;
