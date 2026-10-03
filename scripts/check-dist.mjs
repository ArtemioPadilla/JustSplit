#!/usr/bin/env node
// Post-build assertions (plan B2c): runs after `astro build` in `npm run check`.
// dist/404.html must be the app shell, and the redirect pages must be emitted.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_ORIGIN } from '../site.config.mjs';
import { collectInlineScriptHashes, headersFor, parseHeadersFile, supabaseOrigins } from './lib/pages-headers.mjs';

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

  // App icons (plan B20b): every manifest icon is a real file in dist/ whose PNG
  // header matches the size the manifest declares, so a missing or wrongly sized
  // render fails the build rather than shipping a broken install prompt.
  for (const icon of manifest.icons ?? []) {
    const file = join('dist', icon.src.startsWith(`${at('')}/`) ? icon.src.slice(at('').length) : icon.src);
    if (!existsSync(file)) {
      failures.push(`${manifestPath}: icon ${icon.src} is not in dist/ (${file})`);
      continue;
    }
    if (icon.type === 'image/png') {
      const bytes = readFileSync(file);
      const size = `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
      need(size === icon.sizes, `${file}: is ${size} but the manifest declares ${icon.sizes}`);
    } else if (icon.type === 'image/svg+xml') {
      need(!/<image\b|base64/i.test(readFileSync(file, 'utf8')), `${file}: the vector icon embeds a raster`);
    }
  }
  for (const file of ['dist/favicon.svg', 'dist/favicon.ico', 'dist/apple-touch-icon.png']) {
    need(existsSync(file), `${file} is missing`);
  }
  if (existsSync('dist/apple-touch-icon.png')) {
    // 180x180, colour type 2 (no alpha): iOS paints transparency black.
    const bytes = readFileSync('dist/apple-touch-icon.png');
    need(bytes.readUInt32BE(16) === 180 && bytes.readUInt32BE(20) === 180 && bytes[25] === 2, 'dist/apple-touch-icon.png is not an opaque 180x180 PNG');
  }
}
for (const page of ['dist/index.html', 'dist/landing/index.html', 'dist/auth/signin/index.html', 'dist/404.html']) {
  if (existsSync(page)) {
    need(readFileSync(page, 'utf8').includes(`<link rel="manifest" href="${at('/manifest.webmanifest')}"`), `${page}: does not link the web app manifest`);
  }
}

// ---- Cloudflare Pages: _headers, CSP, canonical origin (plan B20a, ADR 0016) --
// `dist/_headers` is written by the pages-headers integration from the finished
// HTML. Re-derive the inline-script hashes here, independently of the integration's
// own run, so a script that slips past it (or a template change after it) fails the
// build instead of shipping a page the CSP would silently block.
const headersPath = 'dist/_headers';
need(existsSync(headersPath), `${headersPath} is missing (the pages-headers integration did not run)`);
if (existsSync(headersPath)) {
  const rules = parseHeadersFile(readFileSync(headersPath, 'utf8'));
  const all = headersFor(rules, '/');
  const csp = all['content-security-policy'] ?? '';
  const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src ')) ?? '';
  const missing = collectInlineScriptHashes('dist').filter((hash) => !scriptSrc.includes(hash));
  need(missing.length === 0, `${headersPath}: script-src lacks the hash of ${missing.length} inline script(s) (${missing[0] ?? ''}); that page would be blocked`);
  need(csp !== '', `${headersPath}: no Content-Security-Policy on /`);
  need(!/unsafe-eval/.test(csp), `${headersPath}: the CSP allows unsafe-eval`);
  need(!/unsafe-inline/.test(scriptSrc), `${headersPath}: script-src allows unsafe-inline`);
  need(/frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp), `${headersPath}: frame-ancestors / object-src are not 'none'`);
  need(/^max-age=31536000; includeSubDomains$/.test(all['strict-transport-security'] ?? ''), `${headersPath}: HSTS is not max-age=31536000; includeSubDomains`);
  need(headersFor(rules, '/_astro/x.js')['cache-control'] === 'public, max-age=31536000, immutable', `${headersPath}: /_astro/* is not immutable`);
  for (const path of ['/', '/sw.js', '/manifest.webmanifest']) {
    need(headersFor(rules, path)['cache-control'] === 'no-cache', `${headersPath}: ${path} is not no-cache`);
  }
  const project = supabaseOrigins(process.env.PUBLIC_SUPABASE_URL);
  if (project) need(csp.includes(project.http) && csp.includes(project.ws), `${headersPath}: connect-src does not name the configured Supabase project`);
}

// The canonical <link> and the sitemap only ever name the canonical origin; the
// justsplit.cybere.co redirect host and *.pages.dev previews must never leak in.
function htmlPages(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? htmlPages(path) : name.endsWith('.html') ? [path] : [];
  });
}
for (const page of htmlPages('dist')) {
  const html = readFileSync(page, 'utf8');
  if (/<meta name="robots" content="noindex"/.test(html)) continue;
  const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
  need(canonical !== undefined, `${page}: no <link rel="canonical">`);
  if (canonical) need(canonical.startsWith(`${SITE_ORIGIN}/`), `${page}: canonical is ${canonical}, expected the ${SITE_ORIGIN} origin`);
}
for (const sitemap of ['dist/sitemap-0.xml', 'dist/sitemap-index.xml']) {
  if (!existsSync(sitemap)) {
    failures.push(`${sitemap} is missing`);
    continue;
  }
  const locs = [...readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  need(locs.length > 0, `${sitemap} lists no URL`);
  const foreign = locs.filter((loc) => !loc.startsWith(`${SITE_ORIGIN}/`));
  need(foreign.length === 0, `${sitemap}: ${foreign.length} URL(s) outside ${SITE_ORIGIN}, first: ${foreign[0]}`);
}

// ---- Google sign-in flag (plan B20a) ---------------------------------------
// PUBLIC_AUTH_GOOGLE is off unless it is exactly 'true'. Off: the static help page
// (the only server-rendered copy that could name the provider) must not mention it,
// and the Google button's copy must not be shipped in any chunk (the flag is a
// build-time constant, so the branch is dead code).
if (process.env.PUBLIC_AUTH_GOOGLE !== 'true') {
  need(!/\bGoogle\b/.test(readFileSync('dist/help/index.html', 'utf8').replace(/<link[^>]*>/g, '')), 'dist/help/index.html mentions Google sign-in while PUBLIC_AUTH_GOOGLE is off');
  const chunks = readdirSync('dist/_astro').filter((f) => f.endsWith('.js'));
  const leaking = chunks.filter((f) => /Continue with Google/.test(readFileSync(join('dist/_astro', f), 'utf8')));
  need(leaking.length === 0, `Google sign-in copy is still bundled while PUBLIC_AUTH_GOOGLE is off: ${leaking.join(', ')}`);
}

if (failures.length) {
  console.error(`check:dist failed:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('check:dist ok (404 shell, redirect pages, app nav + skip links, PWA worker + manifest, _headers + CSP hashes, canonical origin)');
