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
 * plan B10, `/friends` in plan B13, `/groups/list` and `/groups/new` in
 * plan B12, `/events/list` and `/events/new` in plan B11b, `/profile` in plan B15, `/settlements` in plan B14b (same reasoning as `/`: an authenticated
 * route island, deterministic and accessible in every auth state a CI build
 * without Supabase env vars can reach).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { CONFIGS } from './lib/a11y-configs.mjs';
import { launchChromium } from './lib/browser.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
// Mirrors astro.config.mjs's BASE derivation — a subpath deploy (ASTRO_BASE
// set) still serves correctly through this same local server.
const BASE = (process.env.ASTRO_BASE || '/').replace(/\/$/, '');

const PAGES = [
  '/',
  '/404',
  '/auth/signin/',
  '/showcase',
  '/landing',
  '/about',
  '/help',
  '/expenses/list',
  '/expenses/new',
  '/friends',
  '/groups/list',
  '/groups/new',
  '/events/list',
  '/events/new',
  '/profile',
  '/settlements',
];

async function main() {
  if (!existsSync(DIST)) {
    console.error('check:a11y failed: dist/ does not exist — run `npm run build` first.');
    process.exit(1);
  }

  const server = await startStaticServer({ dist: DIST, base: BASE });
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;

  const browser = await launchChromium();

  const failures = [];
  try {
    // Every page in three configurations (plan B6b): the default light desktop
    // view, the dark theme (BaseLayout's head script follows
    // prefers-color-scheme when no theme is stored), and a 375px phone, where
    // the header's app nav must not push the page sideways.
    for (const config of CONFIGS) {
      const context = await browser.newContext(config.contextOptions);
      for (const path of PAGES) {
        const label = `${path} [${config.name}]`;
        const page = await context.newPage();
        const target = `${origin}${BASE}${path}`;
        const response = await page.goto(target, { waitUntil: 'networkidle' });
        if (!response || response.status() >= 400) {
          failures.push(`${label}: HTTP ${response ? response.status() : 'no response'} (${target})`);
          await page.close();
          continue;
        }
        // preload: false: see scripts/lib/live-audit.mjs (axe would XHR the Google Fonts stylesheet,
        // which the production CSP's connect-src refuses; nothing the rules check reads it).
        const results = await new AxeBuilder({ page }).options({ preload: false }).analyze();
        if (results.violations.length > 0) {
          for (const v of results.violations) {
            failures.push(
              `${label}: [${v.impact ?? 'unknown'}] ${v.id} — ${v.help} (${v.nodes.length} node(s)): ${v.helpUrl}`,
            );
          }
        } else {
          console.log(`check:a11y ok — ${label} (0 violations)`);
        }
        if (config.checkOverflow) {
          const { scrollWidth, clientWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          }));
          if (scrollWidth > clientWidth) {
            failures.push(`${label}: page overflows horizontally (${scrollWidth}px > ${clientWidth}px)`);
          }
        }
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length > 0) {
    console.error(`check:a11y failed:\n  - ${failures.join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`check:a11y ok — ${PAGES.length} page(s) x ${CONFIGS.length} configurations clean`);
}

main().catch((err) => {
  console.error('check:a11y crashed:', err);
  process.exit(1);
});
