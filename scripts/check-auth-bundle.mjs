#!/usr/bin/env node
// Post-build assertions for plan B4 test (6) and the auth-chunk measurement.
// Chained after check:dist in `npm run check` (package.json) because both
// checks read `dist/` — they cannot be ordinary Vitest unit tests, which run
// before `astro build` in the check pipeline.
//
// 1. Greps every dist/_astro/*.js for the two UNGUARDED process.env reads
//    astro.config.mjs's `vite.define` statically replaces at build time
//    (`process.env.NODE_ENV`, `process.env.NEXT_PUBLIC_HUB_URL`) and asserts
//    zero hits — if either ever appears literally in the output, `define`
//    stopped inlining it and a real browser (no `process` global) would
//    throw a ReferenceError. Guarded reads elsewhere in @cyber-eco/auth
//    (`typeof process !== 'undefined' && process.env...`) are unaffected —
//    that literal `process.env.NODE_ENV`/`process.env.NEXT_PUBLIC_HUB_URL`
//    text still wouldn't appear because `define` replaces it unconditionally,
//    guard or not.
// 2. Measures the gz size of every dist/_astro/*.js chunk reachable from
//    dist/auth/signin/index.html (its astro-island's component-url and
//    renderer-url, plus whatever THEY statically import, transitively) and
//    reports the total plus which chunk(s) carry @supabase/supabase-js
//    and/or @cyber-eco/auth (grepped by a stable literal each ships).
//    Informational: does not fail the build. The number feeds ADR 0003 and
//    lighthouse-budgets.json's `/auth/*` entry (measured, not guessed);
//    Lighthouse CI is the actual budget gate, in its own job.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { basename, join, resolve } from 'node:path';

const DIST = resolve('dist');
const ASTRO_DIR = join(DIST, '_astro');
const failures = [];

// ---- 1. Unguarded process.env reads -------------------------------------
const UNGUARDED_RE = /process\.env\.(NEXT_PUBLIC_HUB_URL|NODE_ENV)/;
if (existsSync(ASTRO_DIR)) {
  for (const name of readdirSync(ASTRO_DIR)) {
    if (!name.endsWith('.js')) continue;
    const src = readFileSync(join(ASTRO_DIR, name), 'utf8');
    if (UNGUARDED_RE.test(src)) {
      failures.push(
        `dist/_astro/${name} contains an unreplaced process.env.NODE_ENV / ` +
          `process.env.NEXT_PUBLIC_HUB_URL read — astro.config.mjs's vite.define stopped inlining it`,
      );
    }
  }
} else {
  failures.push(`${ASTRO_DIR} is missing — run \`astro build\` first`);
}

// ---- 2. Auth-chunk measurement (informational) ---------------------------
function chunkGraph(entryFiles) {
  const seen = new Set();
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const name = queue.pop();
    if (seen.has(name)) continue;
    const path = join(ASTRO_DIR, name);
    if (!existsSync(path)) continue;
    seen.add(name);
    const src = readFileSync(path, 'utf8');
    for (const m of src.matchAll(/from"\.\/([A-Za-z0-9._-]+\.js)"|import\("\.\/([A-Za-z0-9._-]+\.js)"\)/g)) {
      const dep = m[1] ?? m[2];
      if (dep && !seen.has(dep)) queue.push(dep);
    }
  }
  return seen;
}

const signinHtmlPath = join(DIST, 'auth', 'signin', 'index.html');
if (existsSync(signinHtmlPath)) {
  const html = readFileSync(signinHtmlPath, 'utf8');
  const entries = [...html.matchAll(/(?:component-url|renderer-url)="\/_astro\/([A-Za-z0-9._-]+\.js)"/g)].map(
    (m) => m[1],
  );
  if (entries.length === 0) {
    failures.push(`${signinHtmlPath} has no astro-island component-url/renderer-url — did the LoginForm island move?`);
  } else {
    const chunks = chunkGraph(entries);
    let totalGz = 0;
    const rows = [];
    // Stable literals unique to each dependency, chosen so minification can't
    // rename them away: @supabase/supabase-js's GoTrue client class name, and
    // an @cyber-eco/auth ErrorCode enum value.
    const SUPABASE_MARKER = 'GoTrueClient';
    const CYBER_ECO_AUTH_MARKER = 'AUTH_INVALID_CREDENTIALS';
    for (const name of [...chunks].sort()) {
      const src = readFileSync(join(ASTRO_DIR, name), 'utf8');
      const gz = gzipSync(src).length;
      totalGz += gz;
      const tags = [];
      if (src.includes(SUPABASE_MARKER)) tags.push('@supabase/supabase-js');
      if (src.includes(CYBER_ECO_AUTH_MARKER)) tags.push('@cyber-eco/auth');
      rows.push({ name, gz, tags });
    }
    console.log('\ncheck-auth-bundle: /auth/signin/ chunk graph (plan B4 measurement)');
    for (const { name, gz, tags } of rows) {
      const tag = tags.length ? `  [${tags.join(', ')}]` : '';
      console.log(`  ${basename(name).padEnd(28)} ${(gz / 1024).toFixed(2).padStart(7)} kB gz${tag}`);
    }
    console.log(`  ${'TOTAL'.padEnd(28)} ${(totalGz / 1024).toFixed(2).padStart(7)} kB gz`);
    const authChunks = rows.filter((r) => r.tags.length > 0);
    if (authChunks.length === 0) {
      console.log(
        '  (no chunk on this page carries @supabase/supabase-js or @cyber-eco/auth yet — ' +
          'AuthIsland/<AuthProvider> is not mounted by any built route until Phase 2)',
      );
    }
    if (totalGz > 150 * 1024) {
      console.log(
        `  NOTE: ${(totalGz / 1024).toFixed(1)} kB gz exceeds Inceptor's 150 kB script budget — ` +
          'see ADR 0003 for the fallback already applied (stores/auth.ts drives authAdapter/profileStore ' +
          'directly; no <AuthProvider> on this page) and why the remainder (React+ReactDOM, supabase-js, zod) ' +
          "isn't reducible further without dropping client:only React islands.",
      );
    }
  }
} else {
  failures.push(`${signinHtmlPath} is missing — run \`astro build\` first`);
}

if (failures.length) {
  console.error(`\ncheck-auth-bundle failed:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('\ncheck-auth-bundle ok (no unguarded process.env reads)');
