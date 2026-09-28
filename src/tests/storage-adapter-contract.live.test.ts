import { afterAll, beforeAll } from 'vitest';
import { RelationalSupabaseAdapter } from '@/lib/data/relational-adapter';
import { schemaMap } from '@/lib/data/schema-map';
import { admin, cast, type Actor } from './rls/fixtures';
import { runStorageAdapterContractSuite, type ContractHarness } from './storage-adapter-contract.shared';

/**
 * Plan B5a: the real-adapter half of the contract suite. Runs ONLY against
 * `supabase start` (`npm run test:contract:live`; CI job "RLS & contract
 * (supabase start)", B2b/B5a) — excluded from `npm run test`/`npm run check`
 * (see `vitest.config.ts`), the same way the RLS suite is.
 *
 * Reuses `src/tests/rls/fixtures.ts` (the pre-existing exception to "nothing
 * outside src/lib/data/ imports @supabase/supabase-js/@cyber-eco/supabase")
 * for the authenticated actor client, instead of importing the SDK again
 * here. Every case is scoped to a single actor's own expense (`memberIds:
 * [actor.id]`), so the RLS membership mirror holds trivially (no friend or
 * group setup needed) — spec D10's insert policy for `expenses` with a null
 * `group_id` only requires every OTHER member to be an accepted friend, and
 * there is no other member here.
 */
let actor: Actor;
let cleanupCast: () => Promise<void>;

beforeAll(async () => {
  const c = await cast();
  actor = c.A;
  cleanupCast = c.cleanup;
});

afterAll(async () => {
  await cleanupCast();
});

function liveHarness(): ContractHarness {
  const adapter = new RelationalSupabaseAdapter(() => actor.db, { schemaMap });
  return {
    adapter,
    collection: 'expenses',
    makeExpense: (overrides = {}) => ({
      description: 'Tacos',
      amount: 100,
      currency: 'MXN',
      paidBy: actor.id,
      splitType: 'equal',
      splits: [{ userId: actor.id, amount: 100 }],
      date: '2026-09-28',
      memberIds: [actor.id],
      createdBy: actor.id,
      // No explicit createdAt: the live case proves the DB's own
      // `default now()` rehydrates as ISO, unlike the memory harness which
      // must simulate it with `adapter.serverTimestamp()`.
      ...overrides,
    }),
    // Every case's row is `created_by = actor.id` — the service-role client
    // can delete them all in one shot after each case (mirrors
    // src/tests/rls/fixtures.ts's own cleanup-by-filter pattern).
    cleanup: async () => {
      await admin.from('expenses').delete().eq('created_by', actor.id);
    },
  };
}

runStorageAdapterContractSuite('real relational adapter (supabase start)', liveHarness);
