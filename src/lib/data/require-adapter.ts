import type { StorageAdapter } from '@cyber-eco/types';
import { storageAdapter } from './adapter';
import { SupabaseDisabledError } from './client';
import { $user } from '@/stores/session';

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

/** Thrown by `requireUid()` — should never happen behind `AuthGate`, which never renders protected content before `$user` is set. */
export class NotSignedInError extends Error {
  constructor() {
    super('This action requires a signed-in user.');
    this.name = 'NotSignedInError';
  }
}

/**
 * The signed-in uid, read from the session store (plan B9,
 * `repos.expenses.remove`'s delete-ordering preflight — ADR 0005
 * amendment). A repo function that needs to know "who is calling" reads
 * `$user` here rather than accepting a `uid` argument a caller could get
 * wrong — the same identity-source rule CLAUDE.md's auth-gating section
 * applies to UI components (`toGuardUser` reading the session, never a prop
 * or query param), extended to this side of the data-layer boundary. This
 * is a client-side safety preflight against a destructive PARTIAL
 * operation, never authorization: RLS is still the only real enforcement
 * (CLAUDE.md rule 8).
 */
export function requireUid(): string {
  const uid = $user.get()?.uid;
  if (!uid) throw new NotSignedInError();
  return uid;
}
