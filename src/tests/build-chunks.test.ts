import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Plan B19: the heavy vendor code is isolated into named, cacheable chunks
 * (`vite.build.rollupOptions.output.manualChunks`). Vite otherwise names a
 * shared chunk after whichever module it saw first, so the Supabase client
 * ended up as `client.<hash>.js` next to Astro's React renderer, also
 * `client.<hash>.js`: the bundle report could not tell them apart and a
 * rename of `src/lib/data/client.ts` silently renamed the chunk.
 */
const MOD = pathToFileURL(resolve(__dirname, '../../build.config.mjs')).href;
type Cfg = { manualChunks: (id: string) => string | undefined };
const cfg = async () => (await import(/* @vite-ignore */ MOD)) as Cfg;
const nm = (pkg: string, file = 'index.js') => `/repo/node_modules/${pkg}/dist/${file}`;

describe('manualChunks', () => {
  it('puts the Supabase client and every @supabase sub-package in one `supabase` chunk', async () => {
    const { manualChunks } = await cfg();
    for (const pkg of ['@supabase/supabase-js', '@supabase/auth-js', '@supabase/realtime-js', '@supabase/postgrest-js', '@supabase/storage-js', '@supabase/functions-js', '@supabase/phoenix', 'iceberg-js', '@cyber-eco/supabase']) {
      expect(manualChunks(nm(pkg)), pkg).toBe('supabase');
    }
  });

  it('puts React, ReactDOM and the scheduler in one `react` runtime chunk', async () => {
    const { manualChunks } = await cfg();
    for (const pkg of ['react', 'react-dom', 'scheduler']) expect(manualChunks(nm(pkg)), pkg).toBe('react');
  });

  it('leaves everything else to Rollup, so lazy chunks stay lazy', async () => {
    const { manualChunks } = await cfg();
    expect(manualChunks('/repo/src/components/islands/DashboardIsland.tsx')).toBeUndefined();
    expect(manualChunks(nm('recharts'))).toBeUndefined();
    expect(manualChunks(nm('react-hook-form'))).toBeUndefined();
    // `@cyber-eco/auth` only mounts on app pages (AuthIsland); it must not ride along on /auth/*
    expect(manualChunks(nm('@cyber-eco/auth'))).toBeUndefined();
  });

  it('does not match look-alike package names', async () => {
    const { manualChunks } = await cfg();
    expect(manualChunks(nm('react-day-picker'))).toBeUndefined();
    expect(manualChunks(nm('react-hook-form'))).toBeUndefined();
    expect(manualChunks(nm('@floating-ui/react-dom'))).toBeUndefined();
    expect(manualChunks(nm('@nanostores/react'))).toBeUndefined();
  });
});
