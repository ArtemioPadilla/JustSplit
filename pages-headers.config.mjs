/**
 * Astro integration that writes Cloudflare Pages' `_headers` into the build
 * output once the HTML is final (plan B20a, ADR 0016). It runs on every
 * `astro build`, including the private builds of `check:offline` (`ASTRO_OUT_DIR`)
 * and `test:live` (`--outDir`), because it writes into the directory Astro
 * reports, so every browser smoke runs under the CSP production serves.
 *
 * The Supabase origin comes from PUBLIC_SUPABASE_URL: the real environment
 * first, then the `.env*` files Vite would read for the client bundle (`loadEnv`
 * with the PUBLIC_ prefix), so the CSP always allows exactly the project the
 * bundle was built to talk to.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { buildHeadersFile, collectInlineScriptHashes } from './scripts/lib/pages-headers.mjs';

export function pagesHeaders({ env } = {}) {
  return {
    name: 'justsplit:pages-headers',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const out = fileURLToPath(dir);
        const supabaseUrl = (env ?? loadEnv('production', process.cwd(), 'PUBLIC_')).PUBLIC_SUPABASE_URL;
        const text = buildHeadersFile({ hashes: collectInlineScriptHashes(out), supabaseUrl });
        writeFileSync(`${out.replace(/\/$/, '')}/_headers`, text);
      },
    },
  };
}
