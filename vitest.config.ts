import { configDefaults, defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    // The RLS suite needs `supabase start`; it runs through `npm run test:rls`
    // (vitest.rls.config.ts) in its own CI job, never inside `npm run check`.
    // Same for the real-adapter half of the storage-adapter contract suite
    // (plan B5a): `npm run test:contract:live` (vitest.contract.config.ts).
    exclude: [
      ...configDefaults.exclude,
      'src/tests/rls/**',
      'src/tests/storage-adapter-contract.live.test.ts',
      'src/tests/storage.live.test.ts',
    ],
    // Globals: true gives RTL automatic afterEach cleanup (it hooks via
    // global `afterEach`). Without this, multiple `render()` calls in the
    // same test file leak DOM into each other.
    globals: true,
    // Default to node for the source-text + schema tests (fast, no DOM).
    // RTL render tests opt in to jsdom via a `// @vitest-environment jsdom`
    // pragma at the top of the file (see button.test.tsx, ErrorBoundary.test.tsx).
    // NOTE: vitest 4 removed `environmentMatchGlobs` — the per-file pragma is
    // now the only supported way to switch environment per test file.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
