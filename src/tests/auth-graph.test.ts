import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Rollup } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';
import { astroVite } from './bundle';

/**
 * Plan B19: the sign-in, sign-up and reset-password islands (and the header)
 * import `@/stores/auth`. That module must bring in the auth adapter, and
 * no TanStack Query: only signOut clears the persisted cache, and the sign-in
 * page has none. Bundling the module for real is the only honest way to test that,
 * because it depends on tree-shaking, not just on import statements. The bundle
 * has a second, app-page entry (AuthGate + the repos' adapter guard) because
 * Rollup keeps a module whole once ANY entry needs it: a module the sign-in
 * page uses one function of, but data pages use all of, ships whole to sign-in
 * unless the import is lazy. That is exactly the case being pinned.
 *
 * Not pinned, on purpose: the relational storage adapter and SchemaMap still
 * ride along in `adapter.ts` (about 3 kB gz). Splitting that file would break
 * the boundary rule that `adapter.ts` is the one place adapters are built
 * (CLAUDE.md rule 7, `data-boundary.test.ts`), for less than 2% of the page.
 *
 * Markers are string literals the minifier cannot rename (kept unminified here
 * anyway).
 */
const SRC = fileURLToPath(new URL('..', import.meta.url));
const MARKERS = {
  'the TanStack Query persister (src/lib/queryClient.ts)': 'Failed to restore the persisted query cache.',
} as const;

let code = '';
let dynamicChunks: string[] = [];

beforeAll(async () => {
  const authEntry = '\0auth-graph-entry';
  const appEntry = '\0app-graph-entry';
  const { build } = await astroVite();
  const result = (await build({
    configFile: false,
    logLevel: 'silent',
    root: resolve(SRC, '..'),
    resolve: { alias: { '@': SRC } },
    define: { 'import.meta.env.PUBLIC_SUPABASE_URL': '"http://127.0.0.1:54321"', 'import.meta.env.PUBLIC_SUPABASE_KEY': '"k"' },
    plugins: [
      {
        name: 'auth-graph-entry',
        resolveId: (id) => (id === authEntry || id === appEntry ? id : null),
        load: (id) => {
          // What LoginForm / SignUpForm / ResetPasswordIsland / UserMenuIsland reach.
          if (id === authEntry) {
            return `import { signIn, signUp, resetPassword } from '@/stores/auth'; globalThis.__auth = [signIn, signUp, resetPassword];`;
          }
          // What every data page reaches: the auth gate (QueryProvider, persister) and the repos' adapter.
          if (id === appEntry) {
            return `import AuthGate from '@/components/islands/AuthGate'; import { requireStorageAdapter } from '@/lib/data/require-adapter'; globalThis.__app = [AuthGate, requireStorageAdapter];`;
          }
          return null;
        },
      },
    ],
    build: { write: false, minify: false, target: 'es2022', rollupOptions: { input: { auth: authEntry, app: appEntry } } },
  })) as Rollup.RollupOutput | Rollup.RollupOutput[];
  const output = (Array.isArray(result) ? result[0] : result).output;
  const chunks = output.filter((o): o is Rollup.OutputChunk => o.type === 'chunk');
  // Everything statically reachable from the entry chunk is what a page loads up front.
  const entryChunk = chunks.find((c) => c.isEntry && c.name === 'auth')!;
  const staticNames = new Set<string>();
  const visit = (chunk: Rollup.OutputChunk) => {
    if (staticNames.has(chunk.fileName)) return;
    staticNames.add(chunk.fileName);
    for (const dep of chunk.imports) visit(chunks.find((c) => c.fileName === dep)!);
  };
  visit(entryChunk);
  code = chunks.filter((c) => staticNames.has(c.fileName)).map((c) => c.code).join('\n');
  dynamicChunks = chunks.filter((c) => !staticNames.has(c.fileName)).map((c) => c.code);
}, 60_000);

describe('the @/stores/auth graph (what the /auth/* pages load)', () => {
  it('still contains the Supabase auth adapter (guards against a vacuous pass)', () => {
    expect(code).toContain('SupabaseAuthAdapter');
  });

  for (const [what, marker] of Object.entries(MARKERS)) {
    it(`does not statically include ${what}`, () => {
      expect(code).not.toContain(marker);
    });
  }

  it('still reaches the query cache clearing, lazily, for signOut', () => {
    expect(dynamicChunks.some((c) => c.includes('Failed to restore the persisted query cache.'))).toBe(true);
  });
});
