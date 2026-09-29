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

const AUTH_SCHEMAS_START = 'import { z } from "zod";';
const AUTH_SCHEMAS_END = 'function validate(';

/**
 * Marks the zod constructions in `@cyber-eco/auth`'s validation section
 * `/* @__PURE__ *\/`, so a schema nobody uses is tree-shaken away and, once none
 * is left, zod v3 with it.
 *
 * Why every call, not just the outer one: Rollup drops a pure-annotated call
 * whose result is unused, but still evaluates its ARGUMENTS, so
 * `z.object({ email: emailSchema, password: z.string().min(1) })` is kept unless
 * the nested `z.string()` is annotated too. The bounded region (from the zod
 * import to the first helper function) is all schema definitions.
 *
 * Idempotent, and a no-op when the region is not found (a different package
 * version): `src/tests/cybereco-auth-schemas.test.ts` bundles the real package
 * and fails if the workaround stops working.
 */
export function annotateAuthSchemas(code) {
  const start = code.indexOf(AUTH_SCHEMAS_START);
  if (start === -1) return code;
  const end = code.indexOf(AUTH_SCHEMAS_END, start);
  if (end === -1) return code;
  const region = code
    .slice(start, end)
    // `z.string()` etc., only where `z` starts an expression (not inside a regex class like `[a-z.]`)
    .replace(/(?<!\*\/ )(?<=[\s(:,=[])z\.(?=[a-z])/g, '/* @__PURE__ */ z.')
    // `displayNameSchema.optional()`: a method call on an earlier schema
    .replace(/(?<!\*\/ )(?<=[\s(:,=[])(\w+Schema)\.(?=\w+\()/g, '/* @__PURE__ */ $1.');
  return code.slice(0, start) + region + code.slice(end);
}

const AUTH_PACKAGE_ENTRY = /[\\/]node_modules[\\/]@cyber-eco[\\/]auth[\\/]dist[\\/]index\.mjs(?:\?.*)?$/;

/**
 * Vite plugin applying `annotateAuthSchemas` to the installed
 * `@cyber-eco/auth` entry. A workaround for the vendored package (hub
 * follow-up H2: `sideEffects: false` or no zod in the client entry): delete it
 * when the bumped package is tree-shakeable.
 */
export function pureCyberEcoAuthSchemas() {
  return {
    name: 'justsplit:pure-cybereco-auth-schemas',
    transform(code, id) {
      if (!AUTH_PACKAGE_ENTRY.test(id)) return null;
      return { code: annotateAuthSchemas(code), map: null };
    },
  };
}
