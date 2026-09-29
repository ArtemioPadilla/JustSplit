import { del, keys } from 'idb-keyval';
import { signOut } from '@/stores/auth';
import { notifyError, notifySuccess } from '@/stores/notifications';
import { withBase } from '@/lib/href';
import { JUSTSPLIT_QUERY_IDB_KEY } from '@/lib/queryClient';

/** Every localStorage/idb-keyval key this app ever namespaces under. */
const JUSTSPLIT_PREFIX = 'justsplit:';
/** Inceptor's own un-namespaced persister default key (queryClient.ts's `IDB_PERSIST_KEY`) — cleared defensively in case a build ever ran without the JustSplit-specific idbKey. */
const INCEPTOR_DEFAULT_IDB_KEY = 'tanstack-query-cache';
/** supabase-js's default localStorage key prefix when no custom `storageKey` is configured (`src/lib/data/client.ts` sets none). */
const SUPABASE_SESSION_STORAGE_PREFIX = 'sb-';

export interface ResetLocalDataFailure {
  /** A short, stable identifier for which step failed — asserted on in tests, not shown to the user verbatim. */
  step: string;
  error: unknown;
}

export interface ResetLocalDataResult {
  /** True only if every step succeeded — never claim a full reset otherwise. */
  ok: boolean;
  failures: ResetLocalDataFailure[];
}

export interface ResetLocalDataOptions {
  /** Injectable for tests; defaults to a real full-page navigation. */
  reload?: (url: string) => void;
}

/** Runs one step in isolation — a rejection is recorded, never thrown, so the remaining steps still run (plan B17b: "one failing step must not skip the others"). */
async function runStep(step: string, fn: () => Promise<void>, failures: ResetLocalDataFailure[]): Promise<void> {
  try {
    await fn();
  } catch (error) {
    failures.push({ step, error });
  }
}

function clearLocalStorageByPrefix(prefix: string): void {
  if (typeof localStorage === 'undefined') return;
  const targets: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) targets.push(key);
  }
  targets.forEach((key) => localStorage.removeItem(key));
}

/**
 * "Reset local data" (plan B17b, ADR 0008) — the local-cache-reset
 * flow that replaces the legacy Firestore IndexedDB corruption-recovery
 * dance (no equivalent need here: the Query cache is disposable and a
 * failed hydration falls straight back to the network, see
 * `QueryCacheRestoreError`/`QueryProvider`). Wipes every trace of the
 * signed-in user's data from THIS device:
 *
 *   1. Sign out (via `stores/auth`'s `signOut`, the same path every other
 *      sign-out UI uses — never a direct `@supabase/supabase-js` import
 *      outside `src/lib/data/`). Already clears the idb `justsplit:query`
 *      persister key as a side effect (`stores/auth.ts`); step 2 below is
 *      deliberately redundant/defensive, not a bet that side effect held.
 *   2. idb-keyval: the shared persister key, Inceptor's own un-namespaced
 *      default key, and every `justsplit:*` key `keys()` finds — three
 *      independent sub-steps so one `keys()` failure doesn't skip the
 *      explicit, known keys.
 *   3. `localStorage` keys under `justsplit:*`.
 *   4. supabase-js's session storage (`sb-*` keys), defensively — step 1
 *      should already have cleared it; this covers a `signOut()` that
 *      itself failed or only partially completed.
 *   5. Unregisters every service worker registration (guarded when
 *      unsupported).
 *   6. Reloads to `withBase('/')` — always, whether or not every step
 *      above succeeded (a partial reset still leaves the app in a stale
 *      state a fresh load recovers from better than staying put).
 *
 * Idempotent and resilient: each step is isolated by `runStep`, so ONE
 * failing step never skips the rest. Never claims a full reset when part
 * failed — fires `notifyError` naming how many steps failed instead of a
 * blanket `notifySuccess` (the returned `failures` array is also there for
 * a caller, e.g. a future audit log, that needs the detail).
 */
export async function resetLocalData(options: ResetLocalDataOptions = {}): Promise<ResetLocalDataResult> {
  const failures: ResetLocalDataFailure[] = [];
  const reload = options.reload ?? ((url: string) => window.location.assign(url));

  await runStep('sign-out', () => signOut(), failures);

  await runStep('idb-query-cache', () => del(JUSTSPLIT_QUERY_IDB_KEY), failures);
  await runStep('idb-inceptor-default', () => del(INCEPTOR_DEFAULT_IDB_KEY), failures);
  await runStep(
    'idb-justsplit-keys',
    async () => {
      const allKeys = await keys();
      const targets = allKeys.filter((key): key is string => typeof key === 'string' && key.startsWith(JUSTSPLIT_PREFIX));
      await Promise.all(targets.map((key) => del(key)));
    },
    failures,
  );

  await runStep('local-storage', async () => clearLocalStorageByPrefix(JUSTSPLIT_PREFIX), failures);
  await runStep('supabase-session-storage', async () => clearLocalStorageByPrefix(SUPABASE_SESSION_STORAGE_PREFIX), failures);

  await runStep(
    'service-worker',
    async () => {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    },
    failures,
  );

  const ok = failures.length === 0;
  // { afterNavigation: true }: `reload()` right below is a full page load
  // in this static MPA, which would otherwise discard this toast before it
  // ever renders (plan B17b amendment, ADR 0008 "cross-navigation
  // toasts"). Queued in sessionStorage — untouched by the localStorage
  // clearing steps above, so it survives even a resetLocalData() call that
  // failed partway through.
  if (ok) {
    notifySuccess('Local data reset', {
      description: 'Signed out and cleared cached data on this device.',
      afterNavigation: true,
    });
  } else {
    notifyError('Local data reset finished with errors', {
      description: `${failures.length} step(s) could not complete — try again, or use a private window.`,
      afterNavigation: true,
    });
  }

  reload(withBase('/'));

  return { ok, failures };
}
