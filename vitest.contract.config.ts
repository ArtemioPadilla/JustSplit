import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Plan B5a/B5b: the real-adapter half of the storage-adapter contract suite
 * (`storage-adapter-contract.md` §5) and the live Supabase Storage contract
 * (spec D10 "Images": an upload lands under `receipts/expenses/…` and
 * resolves through a signed URL), both run against `supabase start` with the
 * dbmate migrations applied (`npm run db:start && npm run db:migrate`) —
 * same stack as `vitest.rls.config.ts`, its own file so neither fights over
 * Realtime/actor state.
 * `npm run test:contract:live`; joins the "RLS & contract (supabase start)"
 * CI job, after `npm run test:rls`.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/tests/storage-adapter-contract.live.test.ts', 'src/tests/storage.live.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
