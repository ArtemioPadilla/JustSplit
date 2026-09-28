#!/usr/bin/env node
/**
 * Accessibility smoke check (plan B6 acceptance: "axe smoke clean").
 *
 * Deliberately NOT wired into `npm run check` (unlike `check:dist`, which is
 * pure static-HTML analysis and needs no browser): launching a real Chromium
 * to compute styles/ARIA is orders of magnitude heavier than the rest of
 * `check` and would make every local `npm run check` — and `ship.sh`'s
 * pre-push gate — depend on a working headless-browser environment. The repo
 * already draws this line once for `test:rls` ("its own CI job; never part
 * of check", CLAUDE.md); this follows the same precedent with its own
 * `npm run check:a11y` script and CI job (`ci.yml`).
 *
 * Requires a production build (`npm run build`) to exist at `dist/`. Serves
 * it with a minimal static file server (no new runtime dependency for that
 * part) and drives the preinstalled Chromium at `/opt/pw-browsers/chromium`
 * via `playwright-core` — no download step, works offline in CI.
 *
 * Pages checked (plan B6): `/`, `/404`, `/auth/signin/`, `/showcase`.
 * `/landing`, `/about`, `/help` join this list in plan B7, which is what
 * builds those pages. `/expenses/list` joins in plan B9, `/expenses/new` in
 * plan B10 (same reasoning as `/`: an authenticated route island,
 * deterministic and accessible in every auth state a CI build without
 * Supabase env vars can reach).
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
// Mirrors astro.config.mjs's BASE derivation — a subpath deploy (ASTRO_BASE
// set) still serves correctly through this same local server.
const BASE = (process.env.ASTRO_BASE || '/').replace(/\/$/, '');

const PAGES = ['/', '/404', '/auth/signin/', '/showcase', '/landing', '/about', '/help', '/expenses/list', '/expenses/new'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

/** Astro's `build.format: 'directory'` default: `/x` and `/x/` both serve `x/index.html`. */
async function resolveFile(urlPath) {
  const withoutBase = BASE && urlPath.startsWith(BASE) ? urlPath.slice(BASE.length) || '/' : urlPath;
  const clean = normalize(withoutBase).replace(/^(\.\.[/\\])+/, '');
  const direct = join(DIST, clean);
  const candidates = clean.endsWith('/')
    ? [join(direct, 'index.html')]
    : [direct, `${direct}.html`, join(direct, 'index.html')];
  for (const candidate of candidates) {
    if (existsSync(candidate) && (await stat(candidate)).isFile()) return candidate;
  }
  return null;
}

function startServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const file = await resolveFile(url.pathname);
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('check:a11y failed: dist/ does not exist — run `npm run build` first.');
    process.exit(1);
  }

  const server = await startServer();
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;

  // Prefer a preinstalled Chromium (this sandbox ships one at
  // /opt/pw-browsers/chromium — no download, works fully offline) but fall
  // back to Playwright's own resolution when it isn't there (CI installs one
  // with `npx playwright-core install chromium --with-deps` first; local
  // dev without either path set gets whatever `playwright-core install`
  // already put in its default cache).
  const sandboxChromium = process.env.PW_CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  const launchOptions = { args: ['--no-sandbox'] };
  if (existsSync(sandboxChromium)) launchOptions.executablePath = sandboxChromium;
  const browser = await chromium.launch(launchOptions);

  const failures = [];
  try {
    const context = await browser.newContext();
    for (const path of PAGES) {
      const page = await context.newPage();
      const target = `${origin}${BASE}${path}`;
      const response = await page.goto(target, { waitUntil: 'networkidle' });
      if (!response || response.status() >= 400) {
        failures.push(`${path}: HTTP ${response ? response.status() : 'no response'} (${target})`);
        await page.close();
        continue;
      }
      const results = await new AxeBuilder({ page }).analyze();
      if (results.violations.length > 0) {
        for (const v of results.violations) {
          failures.push(
            `${path}: [${v.impact ?? 'unknown'}] ${v.id} — ${v.help} (${v.nodes.length} node(s)): ${v.helpUrl}`,
          );
        }
      } else {
        console.log(`check:a11y ok — ${path} (0 violations)`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length > 0) {
    console.error(`check:a11y failed:\n  - ${failures.join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`check:a11y ok — ${PAGES.length} page(s) clean`);
}

main().catch((err) => {
  console.error('check:a11y crashed:', err);
  process.exit(1);
});
