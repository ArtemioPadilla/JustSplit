import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Plan B2b: the RLS suite, run against `supabase start` with the dbmate
 * migrations applied (`npm run db:start && npm run db:migrate`).
 * `npm run test:rls`; CI job "RLS & contract (supabase start)".
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/tests/rls/**/*.test.ts'],
    environment: 'node',
    // Each file creates its own users; files still run one at a time so the
    // Realtime assertions are not starved by parallel writers.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
