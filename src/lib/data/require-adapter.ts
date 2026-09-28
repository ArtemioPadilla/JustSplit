import type { StorageAdapter } from '@cyber-eco/types';
import { storageAdapter } from './adapter';
import { SupabaseDisabledError } from './client';

/**
 * Every `src/lib/data/repos/*` function calls this instead of importing
 * `storageAdapter` directly (plan B5a) — one place to throw the same guarded
 * error every other data-layer entry point throws
 * (`src/stores/auth.ts`'s `requireAuthAdapter`/`requireProfileStore`) when
 * the build has no Supabase config.
 */
export function requireStorageAdapter(): StorageAdapter {
  if (!storageAdapter) throw new SupabaseDisabledError();
  return storageAdapter;
}
