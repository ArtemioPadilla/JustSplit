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

// Stable literals unique to each dependency, chosen so minification can't
// rename them away: @supabase/supabase-js's GoTrue client class name, and
// an @cyber-eco/auth ErrorCode enum value. Shared by the /auth/signin/
// measurement (section 2), the public-pages check (section 3) and the
// marketing-pages check (section 4, plan B7).
const SUPABASE_MARKER = 'GoTrueClient';
const CYBER_ECO_AUTH_MARKER = 'AUTH_INVALID_CREDENTIALS';

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

// ---- 3. Public pages must not load the Supabase SDK up front ------------
// The header's UserMenuIsland is on every page. It reads Nano Stores only and
// loads the auth actions (and with them @supabase/supabase-js, ~48 kB gz)
// through a dynamic import on sign-out. Only STATIC imports count here: a
// lazily imported chunk is fetched on demand, not on page load. Plan B7 adds
// the marketing pages (/landing, /about, /help) to this list.
//
// `index.html` ('/') left this list in plan B8b: it now mounts
// `DashboardIsland` (`ErrorBoundary > AuthIsland > AuthGate > Content`), the
// first AUTHENTICATED route island — like `/auth/signin/` (measured, not
// gated, in section 2 above), it is expected to load @supabase/supabase-js
// up front. `404.html` stays in this list: today's `AppRouterIsland` only
// ever mounts `RouteStub`, a placeholder with no data-layer import; it moves
// out once a Phase-2 dynamic route (B9+) actually reaches the adapter.
const PUBLIC_PAGES = ['404.html', 'landing/index.html', 'about/index.html', 'help/index.html'];
function staticGraph(entryFiles) {
  const seen = new Set();
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const name = queue.pop();
    if (seen.has(name)) continue;
    const path = join(ASTRO_DIR, name);
    if (!existsSync(path)) continue;
    seen.add(name);
    const src = readFileSync(path, 'utf8');
    for (const m of src.matchAll(/(?:from|import)\s*"\.\/([A-Za-z0-9._-]+\.js)"/g)) {
      if (!seen.has(m[1])) queue.push(m[1]);
    }
  }
  return seen;
}
// Every chunk a page directly references from its built HTML: astro-island
// component-url/renderer-url (hydrated islands) AND a plain
// `<script type="module" src="...">` tag (e.g. ThemeToggle's hoisted inline
// script — it's not an island, so it never appears as an astro-island).
function directEntries(html) {
  const island = [...html.matchAll(/(?:component-url|renderer-url)="[^"]*\/_astro\/([A-Za-z0-9._-]+\.js)"/g)];
  const script = [...html.matchAll(/<script[^>]+src="[^"]*\/_astro\/([A-Za-z0-9._-]+\.js)"/g)];
  return [...new Set([...island, ...script].map((m) => m[1]))];
}
for (const page of PUBLIC_PAGES) {
  const htmlPath = join(DIST, page);
  if (!existsSync(htmlPath)) {
    failures.push(`${htmlPath} is missing — run \`astro build\` first`);
    continue;
  }
  const html = readFileSync(htmlPath, 'utf8');
  const entries = directEntries(html);
  const heavy = [...staticGraph(entries)].filter((name) => readFileSync(join(ASTRO_DIR, name), 'utf8').includes(SUPABASE_MARKER));
  if (heavy.length > 0) {
    failures.push(`dist/${page} statically loads @supabase/supabase-js (${heavy.join(', ')}) — public pages must not`);
  } else {
    console.log(`check-auth-bundle: dist/${page} loads no @supabase/supabase-js chunk up front`);
  }
}

// ---- 4. Marketing pages: no route island, no Supabase/@cyber-eco chunk, ---
// ---- layout JS statically loaded is <= 40 kB gz (plan B7, spec D3) --------
// /landing, /about, /help never mount a route island (BaseLayout's
// `marketing` prop renders SiteHeader's static sign-in link and skips
// HydrationCanary — see src/layouts/BaseLayout.astro), so there should be
// zero <astro-island> elements at all on these pages. Any island showing up
// here would be a route island the marketing pages must never carry.
const MARKETING_PAGES = ['landing/index.html', 'about/index.html', 'help/index.html'];
const MARKETING_LAYOUT_BUDGET_BYTES = 40 * 1024;
for (const page of MARKETING_PAGES) {
  const htmlPath = join(DIST, page);
  if (!existsSync(htmlPath)) {
    failures.push(`${htmlPath} is missing — run \`astro build\` first`);
    continue;
  }
  const html = readFileSync(htmlPath, 'utf8');
  const islandCount = [...html.matchAll(/<astro-island\b/g)].length;
  if (islandCount > 0) {
    failures.push(`dist/${page} mounts ${islandCount} <astro-island> element(s) — marketing pages must have no route island`);
  }

  const entries = directEntries(html);
  const graph = staticGraph(entries);
  let totalGz = 0;
  const offenders = [];
  for (const name of graph) {
    const src = readFileSync(join(ASTRO_DIR, name), 'utf8');
    totalGz += gzipSync(src).length;
    if (src.includes(SUPABASE_MARKER) || src.includes(CYBER_ECO_AUTH_MARKER)) offenders.push(name);
  }
  if (offenders.length > 0) {
    failures.push(`dist/${page} statically loads a Supabase/@cyber-eco chunk (${offenders.join(', ')})`);
  }
  console.log(
    `check-auth-bundle: dist/${page} layout JS = ${(totalGz / 1024).toFixed(2)} kB gz ` +
      `(budget ${(MARKETING_LAYOUT_BUDGET_BYTES / 1024).toFixed(0)} kB, plan B7)`,
  );
  if (totalGz > MARKETING_LAYOUT_BUDGET_BYTES) {
    failures.push(
      `dist/${page} layout JS is ${(totalGz / 1024).toFixed(2)} kB gz — over the ` +
        `${(MARKETING_LAYOUT_BUDGET_BYTES / 1024).toFixed(0)} kB budget (plan B7)`,
    );
  }
}

if (failures.length) {
  console.error(`\ncheck-auth-bundle failed:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('\ncheck-auth-bundle ok (no unguarded process.env reads)');
