#!/usr/bin/env node
/**
 * Offline shell smoke (plan B19): a production build served under the staging
 * base path (`/JustSplit`), driven in a real Chromium with service workers
 * ALLOWED, then taken offline.
 *
 * Why a browser: the Workbox configuration is unit-tested as pure config
 * (`src/tests/pwa-config.test.ts`), but whether a service worker installs at all,
 * and what it answers offline, is only known by running one. It is a separate
 * script from `test:live` on purpose: that smoke blocks service workers (a worker
 * would answer from cache and hide real network behaviour), and this one needs
 * no Supabase stack, so it runs in the main CI job next to `check:a11y`.
 *
 * Like `check:a11y` it is NOT part of `npm run check` (needs a real browser).
 * `OFFLINE_SMOKE_DIST=<dir>` reuses a build made with ASTRO_BASE=/JustSplit
 * (local iteration only).
 *
 * What it asserts, offline, after the worker has installed and taken control:
 *   /expenses/abc                 -> the 404 app shell (AppRouterIsland), spec D2
 *   /settlements/?event=x         -> the settlements page, not the shell
 *   /auth/callback/?code=x        -> the callback page, not the shell (Google sign-in)
 *   /settlements  (no slash)      -> the settlements page (the nav links carry no slash)
 *   /landing/                     -> the precached static page
 *   /nope/deeper/path             -> the shell
 *   /rest/v1/..., /auth/v1/...    -> untouched: the network error, never the shell
 *   fetch('https://x.supabase.co/rest/v1/...') -> a network error, nothing cached
 */
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchChromium } from './lib/browser.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const BASE = '/JustSplit';
const failures = [];
const fail = (where, message) => failures.push(`${where}: ${message}`);
const log = (message) => console.log(`offline-smoke ${message}`);

// A private build next to `dist/` (never over it: `npm run check` and check:a11y
// use that one, built without a base). astro.config.mjs's ASTRO_OUT_DIR must be
// project-relative; see the comment there.
const OUT_DIR = './dist-offline';

function build() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  execFileSync('npx', ['astro', 'build'], {
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, ASTRO_BASE: BASE, ASTRO_OUT_DIR: OUT_DIR },
  });
  return resolve(OUT_DIR);
}

/** Island names a served document mounts: `SettlementsIsland.Ab12.js` -> `SettlementsIsland`. */
const islandsOf = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('astro-island')].map((el) => (el.getAttribute('component-url') ?? '').replace(/^.*\/_astro\//, '').replace(/\..*$/, '')),
  );

async function main() {
  const reuse = process.env.OFFLINE_SMOKE_DIST;
  const dist = reuse || build();
  const server = await startStaticServer({ dist, base: BASE, notFoundShell: true });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await launchChromium();
  try {
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    const page = await context.newPage();

    // 1. First visit: the worker installs (precaching the whole build) and takes control.
    await page.goto(`${origin}${BASE}/landing/`);
    const controlled = await page
      .evaluate(async () => {
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline) {
          if (navigator.serviceWorker.controller) return navigator.serviceWorker.controller.scriptURL;
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        return null;
      })
      .catch(() => null);
    if (!controlled) {
      fail('install', 'no service worker took control of the page within 30 s (it never registered, or failed to install/evaluate)');
    } else {
      log(`ok  service worker in control: ${controlled.replace(origin, '')}`);
    }

    const manifestHref = await page.evaluate(() => document.querySelector('link[rel="manifest"]')?.getAttribute('href') ?? null);
    if (manifestHref !== `${BASE}/manifest.webmanifest`) fail('manifest', `<link rel="manifest"> is ${manifestHref}, expected ${BASE}/manifest.webmanifest`);
    else log('ok  <link rel="manifest"> present');

    if (!controlled) return report();

    // 2. Offline.
    await context.setOffline(true);

    const expectIslands = async (path, wanted, unwanted = []) => {
      const p = await context.newPage();
      try {
        const res = await p.goto(`${origin}${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 10_000 });
        const islands = await islandsOf(p);
        const missing = wanted.filter((name) => !islands.includes(name));
        const extra = unwanted.filter((name) => islands.includes(name));
        if (res?.status() !== 200) fail(path, `status ${res?.status()}, expected 200 from the worker`);
        else if (missing.length) fail(path, `served a page mounting [${islands.join(', ') || 'no islands'}], expected ${missing.join(', ')}`);
        else if (extra.length) fail(path, `served the wrong page: mounts ${extra.join(', ')}`);
        else log(`ok  ${path}  ->  ${wanted[0] ?? 'static page'}`);
      } catch (error) {
        fail(path, `offline navigation failed: ${String(error).split('\n')[0]}`);
      } finally {
        await p.close();
      }
    };

    await expectIslands('/expenses/abc', ['AppRouterIsland']);
    await expectIslands('/settlements/?event=x', ['SettlementsIsland'], ['AppRouterIsland']);
    await expectIslands('/auth/callback/?code=x', ['AuthCallbackIsland'], ['AppRouterIsland']);
    await expectIslands('/settlements', ['SettlementsIsland'], ['AppRouterIsland']);
    await expectIslands('/landing/', [], ['AppRouterIsland']);
    await expectIslands('/nope/deeper/path', ['AppRouterIsland']);

    for (const path of ['/rest/v1/expenses?select=*', '/auth/v1/token', '/storage/v1/object/x', '/realtime/v1/websocket']) {
      const p = await context.newPage();
      try {
        const res = await p.goto(`${origin}${BASE}${path}`, { timeout: 10_000 });
        fail(path, `the worker answered a Supabase path (status ${res?.status()}); it must be left to the network`);
      } catch (error) {
        if (/ERR_INTERNET_DISCONNECTED/.test(String(error))) log(`ok  ${path}  ->  untouched (network error)`);
        else fail(path, `unexpected error: ${String(error).split('\n')[0]}`);
      } finally {
        await p.close();
      }
    }

    const crossOrigin = await page.evaluate(async () => {
      const url = 'https://abcd.supabase.co/rest/v1/expenses?select=*';
      const outcome = await fetch(url).then(
        () => 'resolved',
        (error) => `rejected:${error.name}`,
      );
      return { outcome, cached: Boolean(await caches.match(url)) };
    });
    if (crossOrigin.outcome !== 'rejected:TypeError' || crossOrigin.cached) {
      fail('supabase.co fetch', `expected a network error and nothing cached, got ${JSON.stringify(crossOrigin)}`);
    } else {
      log('ok  fetch(*.supabase.co) -> network error, nothing cached');
    }
  } finally {
    await browser.close();
    server.close();
    if (!reuse) rmSync(dist, { recursive: true, force: true });
  }
  report();
}

function report() {
  if (failures.length) {
    console.error(`\noffline-smoke failed:\n  - ${failures.join('\n  - ')}`);
    process.exit(1);
  }
  console.log('\noffline-smoke ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
