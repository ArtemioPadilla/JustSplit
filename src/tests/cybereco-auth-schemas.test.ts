import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Rollup } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';
import { astroVite } from './bundle';

/**
 * Plan B19: `@cyber-eco/auth` 0.2.1 ships one bundled `dist/index.mjs` with no
 * `sideEffects: false` and a `zod@3` dependency. Its module-level validation
 * schemas (`signInSchema`, `passwordSchema`, ...) are never used by
 * `<AuthProvider>`, but each is an un-annotated `z.object(...)` call, so
 * Rollup must keep it, and with it the WHOLE zod v3 library: a second copy of
 * zod (~12 kB gz on every app page) next to the app's own zod v4.
 *
 * `annotateAuthSchemas` marks those constructions `/* @__PURE__ *\/` at build time
 * so an unused one is dropped. It is a workaround for the upstream package
 * (hub follow-up H2: `sideEffects: false`, or no zod in the client entry);
 * delete it when the bumped package no longer needs it. These tests bundle the
 * real package with the real plugin, so a package bump that changes its shape
 * shows up here instead of as a silent bundle-size regression.
 */
const MOD = pathToFileURL(resolve(__dirname, '../../build.config.mjs')).href;
type Cfg = {
  annotateAuthSchemas: (code: string) => string;
  pureCyberEcoAuthSchemas: () => { name: string; transform: (code: string, id: string) => { code: string } | null };
};
const cfg = async () => (await import(/* @vite-ignore */ MOD)) as Cfg;

// Literal messages from the package's own schemas, and its provider's own error text.
const ZOD_V3_SCHEMA_MARKER = 'Invalid email format';
const PROVIDER_MARKER = 'useAuth must be used within an AuthProvider';

const PKG = resolve(__dirname, '../../node_modules/@cyber-eco/auth/dist/index.mjs');

describe('annotateAuthSchemas', () => {
  it('marks every zod call in the schema section as pure and leaves the rest of the file alone', async () => {
    const { annotateAuthSchemas } = await cfg();
    const before = [
      'const keep = z.string();',
      'import { z } from "zod";',
      'var emailSchema = z.string().email("x");',
      'var signInSchema = z.object({ email: emailSchema, remember: z.boolean().optional(), name: displayNameSchema.optional() });',
      'function validate(schema, data) { return z.string(); }',
    ].join('\n');
    const after = annotateAuthSchemas(before);
    const lines = after.split('\n');
    expect(lines[0]).toBe('const keep = z.string();');
    expect(lines[2]).toBe('var emailSchema = /* @__PURE__ */ z.string().email("x");');
    expect(lines[3]).toBe(
      'var signInSchema = /* @__PURE__ */ z.object({ email: emailSchema, remember: /* @__PURE__ */ z.boolean().optional(), name: /* @__PURE__ */ displayNameSchema.optional() });',
    );
    expect(lines[4]).toBe('function validate(schema, data) { return z.string(); }');
  });

  it('is idempotent and a no-op on a file without the schema section', async () => {
    const { annotateAuthSchemas } = await cfg();
    const src = 'import { z } from "zod";\nvar a = z.string();\nfunction validate() {}';
    expect(annotateAuthSchemas(annotateAuthSchemas(src))).toBe(annotateAuthSchemas(src));
    expect(annotateAuthSchemas('export const x = 1;')).toBe('export const x = 1;');
  });

  it('only transforms @cyber-eco/auth/dist/index.mjs', async () => {
    const { pureCyberEcoAuthSchemas } = await cfg();
    const plugin = pureCyberEcoAuthSchemas();
    const src = readFileSync(PKG, 'utf8');
    expect(plugin.transform(src, '/repo/node_modules/@cyber-eco/auth/dist/index.mjs')?.code).toContain('/* @__PURE__ */ z.');
    expect(plugin.transform(src, '/repo/node_modules/@cyber-eco/auth/dist/index.mjs?v=1')?.code).toContain('/* @__PURE__ */ z.');
    expect(plugin.transform(src, '/repo/node_modules/@cyber-eco/supabase/dist/index.mjs')).toBeNull();
    expect(plugin.transform(src, '/repo/src/lib/auth-context.ts')).toBeNull();
  });
});

describe('bundling @cyber-eco/auth (what every app page loads through AuthIsland)', () => {
  async function bundle(withPlugin: boolean): Promise<string> {
    const { build } = await astroVite();
    const { pureCyberEcoAuthSchemas } = await cfg();
    const entry = '\0auth-schemas-entry';
    const result = (await build({
      configFile: false,
      logLevel: 'silent',
      root: resolve(__dirname, '../..'),
      define: { 'process.env.NODE_ENV': '"production"' },
      plugins: [
        {
          name: 'entry',
          resolveId: (id) => (id === entry ? id : null),
          // The exact call src/lib/auth-context.ts makes.
          load: (id) => (id === entry ? `import { createAuthContext } from '@cyber-eco/auth'; globalThis.__ctx = createAuthContext();` : null),
        },
        ...(withPlugin ? [pureCyberEcoAuthSchemas() as never] : []),
      ],
      build: { write: false, minify: false, target: 'es2022', rollupOptions: { input: entry } },
    })) as Rollup.RollupOutput | Rollup.RollupOutput[];
    return (Array.isArray(result) ? result[0] : result).output
      .filter((o): o is Rollup.OutputChunk => o.type === 'chunk')
      .map((c) => c.code)
      .join('\n');
  }

  let plain = '';
  let annotated = '';
  beforeAll(async () => {
    plain = await bundle(false);
    annotated = await bundle(true);
  }, 120_000);

  it('without the plugin the unused schemas (and zod v3 with them) are bundled: the problem is real', () => {
    expect(plain).toContain(PROVIDER_MARKER);
    expect(plain).toContain(ZOD_V3_SCHEMA_MARKER);
  });

  it('with the plugin the provider is intact and the unused schemas are gone', () => {
    expect(annotated).toContain(PROVIDER_MARKER);
    expect(annotated).not.toContain(ZOD_V3_SCHEMA_MARKER);
    expect(annotated.length).toBeLessThan(plain.length * 0.85);
  });
});
