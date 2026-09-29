/**
 * Build tuning that has to be readable from plain Node (`astro.config.mjs`
 * runs before Vite starts) and from unit tests (`src/tests/build-chunks.test.ts`).
 * Plan B19.
 */

/** Package name of the innermost `node_modules/<pkg>/` a module id lives in. */
function packageOf(id) {
  const marker = 'node_modules/';
  const at = id.lastIndexOf(marker);
  if (at === -1) return undefined;
  const parts = id.slice(at + marker.length).split('/');
  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}

const SUPABASE = new Set(['iceberg-js', '@cyber-eco/supabase']);
const REACT = new Set(['react', 'react-dom', 'scheduler']);

/**
 * `vite.build.rollupOptions.output.manualChunks`. Two named vendor chunks that
 * every island shares and the browser caches across deploys:
 *
 *  - `supabase`: the client and its sub-packages (auth, realtime, postgrest,
 *    storage, functions) plus `@cyber-eco/supabase`, the adapters over it.
 *    Vite otherwise names this chunk after the first module it saw
 *    (`client.<hash>.js`, clashing with Astro's React renderer of the same name).
 *  - `react`: React, ReactDOM and the scheduler, so no page ever downloads a
 *    second copy and the runtime does not re-download when an island changes.
 *
 * Everything else stays with Rollup's own splitting, so lazy chunks (Recharts,
 * the route views, the dropdown menu) remain lazy. `@cyber-eco/auth` is
 * deliberately NOT in `supabase`: only app pages mount `AuthIsland`, and
 * `/auth/*` must not pay for it.
 */
export function manualChunks(id) {
  const pkg = packageOf(id);
  if (!pkg) return undefined;
  if (pkg.startsWith('@supabase/') || SUPABASE.has(pkg)) return 'supabase';
  if (REACT.has(pkg)) return 'react';
  return undefined;
}
