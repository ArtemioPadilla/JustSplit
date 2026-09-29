#!/usr/bin/env node
// Post-build assertions (plan B2c): runs after `astro build` in `npm run check`.
// dist/404.html must be the app shell, and the redirect pages must be emitted.
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const need = (cond, msg) => cond || failures.push(msg);

const notFound = 'dist/404.html';
need(existsSync(notFound), `${notFound} is missing`);
if (existsSync(notFound)) {
  const html = readFileSync(notFound, 'utf8');
  need(/<astro-island[^>]*component-url="[^"]*AppRouterIsland/.test(html), `${notFound} does not mount AppRouterIsland`);
  need(/client="only"/.test(html), `${notFound}: AppRouterIsland is not client:only`);
  need(/<meta name="robots" content="noindex"/.test(html), `${notFound} is missing robots noindex`);
}

for (const family of ['expenses', 'events', 'groups']) {
  const page = `dist/${family}/index.html`;
  need(existsSync(page), `${page} is missing`);
  if (existsSync(page)) need(/http-equiv="refresh"/.test(readFileSync(page, 'utf8')), `${page} has no meta refresh`);
}

// ---- App navigation (plan B6b) ---------------------------------------------
// Zero-JS server-rendered links on app pages only; marketing/auth/showcase keep
// the small Home/About/Help header. Every page has exactly one Main landmark,
// a skip link, and a #main-content target.
const BASE = (process.env.ASTRO_BASE || '/').replace(/\/$/, '');
const at = (p) => `${BASE}${p}`;
const SECTIONS = ['/', '/expenses/list', '/events/list', '/groups/list', '/friends', '/settlements'];

/** Page file -> the section link that must be `aria-current="page"` at build time (null: none). */
const APP_PAGES = {
  'dist/index.html': '/',
  'dist/expenses/list/index.html': '/expenses/list',
  'dist/expenses/new/index.html': '/expenses/list',
  'dist/events/list/index.html': '/events/list',
  'dist/events/new/index.html': '/events/list',
  'dist/groups/list/index.html': '/groups/list',
  'dist/groups/new/index.html': '/groups/list',
  'dist/friends/index.html': '/friends',
  'dist/settlements/index.html': '/settlements',
  // Profile lives in the account menu; the 404 shell serves the dynamic routes,
  // which a client-side inline script marks (the build cannot know the URL).
  'dist/profile/index.html': null,
  'dist/404.html': null,
};
const NON_APP_PAGES = [
  'dist/landing/index.html',
  'dist/about/index.html',
  'dist/help/index.html',
  'dist/auth/signin/index.html',
  'dist/auth/signup/index.html',
  'dist/showcase/index.html',
];

function mainNav(html) {
  const header = /<header[\s\S]*?<\/header>/.exec(html)?.[0] ?? '';
  return /<nav[^>]*aria-label="Main"[^>]*>([\s\S]*?)<\/nav>/.exec(header)?.[1] ?? null;
}
function navLinks(navHtml) {
  return [...navHtml.matchAll(/<a\b([^>]*)>/g)].map((m) => ({
    href: /href="([^"]*)"/.exec(m[1])?.[1] ?? '',
    current: /aria-current="page"/.test(m[1]),
  }));
}
function commonA11y(page, html) {
  need(/<a[^>]*href="#main-content"/.test(html), `${page}: no skip-to-content link`);
  need(/id="main-content"/.test(html), `${page}: skip link has no #main-content target`);
  need(mainNav(html) !== null, `${page}: no <nav aria-label="Main"> in the header`);
  const landmarks = html.match(/<nav[^>]*aria-label="Main"/g) ?? [];
  need(landmarks.length === 1, `${page}: expected exactly one Main nav landmark, found ${landmarks.length}`);
}

for (const [page, current] of Object.entries(APP_PAGES)) {
  if (!existsSync(page)) {
    failures.push(`${page} is missing`);
    continue;
  }
  const html = readFileSync(page, 'utf8');
  commonA11y(page, html);
  const nav = mainNav(html);
  if (nav === null) continue;
  const links = navLinks(nav);
  need(
    JSON.stringify(links.map((l) => l.href)) === JSON.stringify(SECTIONS.map(at)),
    `${page}: Main nav links are ${JSON.stringify(links.map((l) => l.href))}, expected the six app sections`,
  );
  const marked = links.filter((l) => l.current).map((l) => l.href);
  need(
    JSON.stringify(marked) === JSON.stringify(current === null ? [] : [at(current)]),
    `${page}: aria-current="page" is on ${JSON.stringify(marked)}, expected ${current === null ? 'nothing' : at(current)}`,
  );
}

for (const page of NON_APP_PAGES) {
  if (!existsSync(page)) {
    failures.push(`${page} is missing`);
    continue;
  }
  const html = readFileSync(page, 'utf8');
  commonA11y(page, html);
  const nav = mainNav(html) ?? '';
  const hrefs = navLinks(nav).map((l) => l.href);
  need(
    !hrefs.some((h) => SECTIONS.slice(1).map(at).includes(h)),
    `${page}: shows the signed-in app nav, which belongs on app pages only`,
  );
}

// Marketing pages must stay island-free (B7/B19 header weight): the app nav is plain HTML.
for (const page of ['dist/landing/index.html', 'dist/about/index.html', 'dist/help/index.html']) {
  if (existsSync(page)) need(!/<astro-island/.test(readFileSync(page, 'utf8')), `${page} mounts an island`);
}

// ---- PWA (plan B19) --------------------------------------------------------
// The cheap, base-agnostic half of what scripts/offline-smoke.mjs proves in a real
// browser: the worker exists, its navigation fallback is a URL it precached
// EXACTLY (else createHandlerBoundToURL throws at start-up and no worker ever
// installs), queries do not defeat the precache, Supabase is never cached, and
// every page links the manifest.
const sw = 'dist/sw.js';
need(existsSync(sw), `${sw} is missing (the PWA integration did not run)`);
if (existsSync(sw)) {
  const text = readFileSync(sw, 'utf8');
  const fallback = /createHandlerBoundToURL\("([^"]+)"\)/.exec(text)?.[1];
  need(fallback === at('/404.html'), `${sw}: navigateFallback is ${fallback}, expected ${at('/404.html')}`);
  need(
    /\{url:"404\.html",/.test(text),
    `${sw}: 404.html is not precached under that exact URL, so createHandlerBoundToURL would throw and no worker would install (vite-pwa's directory handler renames it to "404")`,
  );
  need(text.includes('ignoreURLParametersMatching:[/.*/]'), `${sw}: ignoreURLParametersMatching is not [/.*/] (a query string would miss the precache)`);
  need(/NetworkOnly/.test(text) && text.includes('supabase\\.co'), `${sw}: no NetworkOnly route for *.supabase.co`);
  need(!/self\.skipWaiting\(\)\s*,/.test(text), `${sw}: skipWaiting runs unconditionally; an update must wait for the user (UpdateToast)`);
  const precached = [...text.matchAll(/\{url:"([^"]+)"/g)].length;
  need(precached > 100, `${sw}: only ${precached} precache entries (the glob found nothing: a wrong outDir?)`);
}
const manifestPath = 'dist/manifest.webmanifest';
need(existsSync(manifestPath), `${manifestPath} is missing`);
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  need(manifest.name === 'JustSplit', `${manifestPath}: name is ${manifest.name}`);
  need(manifest.start_url === at('/') || manifest.start_url === `${at('')}/`, `${manifestPath}: start_url is ${manifest.start_url}`);
  need(!/inceptor/i.test(JSON.stringify(manifest)), `${manifestPath} still mentions Inceptor`);
}
for (const page of ['dist/index.html', 'dist/landing/index.html', 'dist/auth/signin/index.html', 'dist/404.html']) {
  if (existsSync(page)) {
    need(readFileSync(page, 'utf8').includes(`<link rel="manifest" href="${at('/manifest.webmanifest')}"`), `${page}: does not link the web app manifest`);
  }
}

if (failures.length) {
  console.error(`check:dist failed:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('check:dist ok (404 shell, redirect pages, app nav + skip links, PWA worker + manifest)');
