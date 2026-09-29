import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Plan B19: the Workbox configuration, tested as pure config. Nothing here starts
 * a service worker (`scripts/offline-smoke.mjs` does that in a real browser).
 * Instead the real config is fed to `workbox-build`'s generateSW over a synthetic
 * `dist/`, the emitted worker's precache manifest and routes are read back, and
 * Workbox's OWN matching code (URL variations for the precache route,
 * NavigationRoute's allow/deny lists) decides what each request would get, in the
 * order the generated worker registers its routes: precache, navigation shell,
 * runtime routes.
 */
const MOD = pathToFileURL(resolve(__dirname, '../../pwa.config.mjs')).href;

interface PwaOptions {
  registerType: string;
  workbox: Record<string, unknown>;
  manifest: {
    name: string;
    short_name: string;
    description: string;
    theme_color: string;
    background_color: string;
    display: string;
    start_url: string;
    scope: string;
    id: string;
    lang: string;
    icons: { src: string; sizes: string; purpose?: string }[];
    shortcuts: { name: string; url: string }[];
  };
}
type Cfg = { pwaOptions: (base: string) => PwaOptions; assetUrl: (base: string, path: string) => string };
const cfg = async () => (await import(/* @vite-ignore */ MOD)) as Cfg;

const ORIGIN = 'https://example.test';

type Decision =
  | { kind: 'precache'; key: string }
  | { kind: 'shell'; shell: string }
  | { kind: 'network-only' }
  | { kind: 'network' };

interface ParsedSw {
  manifest: { url: string; revision: string | null }[];
  precacheOptions: { directoryIndex?: string; ignoreURLParametersMatching?: RegExp[]; cleanURLs?: boolean };
  shell: string | null;
  navigation: { allowlist?: RegExp[]; denylist?: RegExp[] };
  runtime: { matcher: RegExp | ((ctx: { url: URL; request: { mode: string } }) => boolean); strategy: string }[];
  text: string;
}

/** Evaluates a JS literal (arrays, objects, regexes) copied out of the generated worker. */
const literal = (text: string) => new Function(`return (${text})`)();

/** Text of the balanced (...) or [...] group starting at `open`. */
function balanced(text: string, open: number): string {
  const closer = { '(': ')', '[': ']', '{': '}' }[text[open] as '(' | '[' | '{'];
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === text[open]) depth++;
    else if (ch === closer && --depth === 0) return text.slice(open, i + 1);
  }
  throw new Error('unbalanced group in generated service worker');
}

function parseSw(text: string): ParsedSw {
  const at = text.indexOf('precacheAndRoute(') + 'precacheAndRoute'.length;
  const args = balanced(text, at);
  const manifestText = balanced(args, 1);
  const manifest = literal(manifestText);
  const optionsText = args.slice(1 + manifestText.length).replace(/^,/, '').replace(/\)$/, '') || '{}';
  const precacheOptions = literal(optionsText);

  const nav = text.indexOf('NavigationRoute(');
  const navArgs = nav === -1 ? '' : balanced(text, nav + 'NavigationRoute'.length);
  const shell = /createHandlerBoundToURL\("([^"]+)"\)/.exec(navArgs)?.[1] ?? null;
  const navOptionsAt = navArgs.indexOf('{', navArgs.indexOf(')') );
  const navigation = navOptionsAt === -1 ? {} : literal(balanced(navArgs, navOptionsAt));

  const runtime: ParsedSw['runtime'] = [];
  const after = nav === -1 ? text : text.slice(nav + navArgs.length);
  let from = 0;
  for (;;) {
    const found = after.indexOf('registerRoute(', from);
    if (found === -1) break;
    const group = balanced(after, found + 'registerRoute'.length);
    // registerRoute(<matcher>,new s.<Strategy>(...),"GET")
    const inner = group.slice(1, -1);
    const strategy = /new [a-z]\.([A-Za-z]+)/.exec(inner)?.[1] ?? 'unknown';
    const matcherText = inner.slice(0, inner.indexOf(',new '));
    runtime.push({ matcher: literal(matcherText), strategy });
    from = found + group.length;
  }
  return { manifest, precacheOptions, shell, navigation, runtime, text };
}

let workDir: string;
const built = new Map<string, ParsedSw>();

async function buildFor(base: string): Promise<ParsedSw> {
  const cached = built.get(base);
  if (cached) return cached;
  const { generateSW } = await import('workbox-build');
  const { pwaOptions } = await cfg();
  const dist = join(workDir, base.replace(/\W/g, '_') || 'root');
  const put = (rel: string, body: string) => {
    mkdirSync(join(dist, rel, '..'), { recursive: true });
    writeFileSync(join(dist, rel), body);
  };
  for (const page of ['index.html', '404.html', 'landing/index.html', 'settlements/index.html', 'auth/callback/index.html', 'auth/signin/index.html', 'expenses/index.html', 'expenses/list/index.html', 'expenses/new/index.html', 'profile/index.html']) {
    put(page, `<html>${page}</html>`);
  }
  put('_astro/app.AbC123.js', 'export{}');
  put('_astro/site.AbC123.css', 'a{}');
  put('favicon.svg', '<svg/>');
  put('icons/pwa-192.png', 'png');
  const workbox = pwaOptions(base).workbox;
  await generateSW({
    ...(workbox as object),
    globDirectory: dist,
    swDest: join(dist, 'sw.js'),
    // what @vite-pwa/astro adds around the user's options
    dontCacheBustURLsMatching: /_astro\//,
  } as never);
  const parsed = parseSw(readFileSync(join(dist, 'sw.js'), 'utf8'));
  built.set(base, parsed);
  return parsed;
}

/** What the generated worker would do with a request, using Workbox's own matching code. */
async function decide(base: string, path: string, opts: { navigate?: boolean; origin?: string } = {}): Promise<Decision> {
  const { navigate = true, origin = ORIGIN } = opts;
  const sw = await buildFor(base);
  const swUrl = `${ORIGIN}${base === '/' ? '' : base}/sw.js`;
  const g = globalThis as unknown as Record<string, unknown>;
  g.self ??= globalThis;
  Object.defineProperty(globalThis, 'location', { value: new URL(swUrl), configurable: true });
  const { generateURLVariations } = await import('workbox-precaching/utils/generateURLVariations.js');
  const { NavigationRoute } = await import('workbox-routing');

  const url = new URL(path, origin);
  const keys = new Map(sw.manifest.map((entry) => [new URL(entry.url, swUrl).href, entry.url]));

  // 1. precacheAndRoute: same-origin GET only
  if (url.origin === ORIGIN) {
    for (const variation of generateURLVariations(url.href, {
      directoryIndex: sw.precacheOptions.directoryIndex,
      ignoreURLParametersMatching: sw.precacheOptions.ignoreURLParametersMatching ?? [/^utm_/, /^fbclid$/],
      cleanURLs: sw.precacheOptions.cleanURLs ?? true,
    } as never)) {
      const hit = keys.get(variation);
      if (hit !== undefined) return { kind: 'precache', key: hit };
    }
  }

  // 2. NavigationRoute -> the shell
  if (sw.shell) {
    const route = new NavigationRoute(() => Promise.resolve(new Response('')), sw.navigation);
    const matched = route.match({
      url,
      request: { mode: navigate ? 'navigate' : 'cors' } as Request,
      event: {} as never,
      sameOrigin: url.origin === ORIGIN,
    });
    if (matched) return { kind: 'shell', shell: sw.shell };
  }

  // 3. runtime routes
  for (const route of sw.runtime) {
    const ctx = { url, request: { mode: navigate ? 'navigate' : 'cors' } };
    const hit = route.matcher instanceof RegExp ? route.matcher.test(url.href) : route.matcher(ctx);
    if (hit) return route.strategy === 'NetworkOnly' ? { kind: 'network-only' } : { kind: 'network' };
  }
  return { kind: 'network' };
}

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), 'pwa-config-'));
});
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

describe.each(['/JustSplit', '/'])('service worker for base %s', (base) => {
  const p = (path: string) => `${base === '/' ? '' : base}${path}`;
  // manifest URLs are relative to the worker, whatever the base
  const key = (path: string) => path.replace(/^\//, '');

  it('navigateFallback is a precached URL: createHandlerBoundToURL throws at start-up otherwise, and no worker installs', async () => {
    const sw = await buildFor(base);
    const swUrl = `${ORIGIN}${base === '/' ? '' : base}/sw.js`;
    expect(sw.shell).toBe(p('/404.html'));
    const precached = new Set(sw.manifest.map((entry) => new URL(entry.url, swUrl).pathname));
    expect(precached.has(sw.shell!)).toBe(true);
  });

  it('answers /expenses/abc offline with the app shell (spec D2)', async () => {
    expect(await decide(base, p('/expenses/abc'))).toEqual({ kind: 'shell', shell: p('/404.html') });
    expect(await decide(base, p('/groups/g1/edit'))).toEqual({ kind: 'shell', shell: p('/404.html') });
    expect(await decide(base, p('/nope/deeper/path'))).toEqual({ kind: 'shell', shell: p('/404.html') });
  });

  it('answers /settlements/?event=x with the settlements page, not the shell', async () => {
    const d = await decide(base, p('/settlements/?event=x'));
    expect(d).toEqual({ kind: 'precache', key: key('/settlements/index.html') });
  });

  it('answers /auth/callback/?code=x with the callback page, not the shell (Google sign-in on the second visit)', async () => {
    expect(await decide(base, p('/auth/callback/?code=x'))).toEqual({ kind: 'precache', key: key('/auth/callback/index.html') });
    expect(await decide(base, p('/auth/callback/?code=abc&state=def&next=%2Fexpenses'))).toMatchObject({ kind: 'precache' });
  });

  it('answers any query string on a static page from the precache (?next=, ?group=, table URL state)', async () => {
    expect(await decide(base, p('/auth/signin/?next=%2Fsettlements'))).toMatchObject({ kind: 'precache' });
    expect(await decide(base, p('/expenses/new?group=g1'))).toMatchObject({ kind: 'precache' });
    expect(await decide(base, p('/expenses/list/?sort=date.desc&filter=coffee'))).toMatchObject({ kind: 'precache' });
    expect(await decide(base, p('/profile?utm_source=x&anything=1'))).toMatchObject({ kind: 'precache' });
  });

  it('answers the no-trailing-slash form of a page, which is what the navigation links carry', async () => {
    expect(await decide(base, p('/settlements'))).toMatchObject({ kind: 'precache' });
    expect(await decide(base, p('/expenses/list'))).toMatchObject({ kind: 'precache' });
  });

  it('answers the root, with and without a trailing slash', async () => {
    expect(await decide(base, p('/'))).toMatchObject({ kind: 'precache' });
    expect(await decide(base, base === '/' ? '/' : base)).toMatchObject({ kind: 'precache' });
  });

  it('leaves Supabase paths on the same host untouched: never the shell, never the precache', async () => {
    for (const path of ['/rest/v1/expenses?select=*', '/auth/v1/token?grant_type=pkce', '/storage/v1/object/receipts/x.png', '/realtime/v1/websocket']) {
      expect(await decide(base, p(path)), path).toEqual({ kind: 'network' });
    }
  });

  it('does not mistake the app\'s own /auth/* pages for Supabase\'s /auth/v1/', async () => {
    expect(await decide(base, p('/auth/signin/'))).toMatchObject({ kind: 'precache' });
    expect(await decide(base, p('/auth/callback/?code=x'))).toMatchObject({ kind: 'precache' });
  });

  it('sends *.supabase.co to the network only, never cached', async () => {
    const d = await decide(base, 'https://abcd.supabase.co/rest/v1/expenses?select=*', { navigate: false, origin: 'https://abcd.supabase.co' });
    expect(d).toEqual({ kind: 'network-only' });
    expect(await decide(base, 'https://abcd.supabase.co/storage/v1/object/sign/receipts/x', { navigate: false, origin: 'https://abcd.supabase.co' })).toEqual({ kind: 'network-only' });
    // and does not swallow other cross-origin requests
    expect(await decide(base, 'https://api.exchangerate.host/latest', { navigate: false, origin: 'https://api.exchangerate.host' })).toEqual({ kind: 'network' });
    expect(await decide(base, 'https://evil.example/x.supabase.co/y', { navigate: false, origin: 'https://evil.example' })).toEqual({ kind: 'network' });
  });

  it('does not serve the shell for file-like navigations (llms.txt, sitemap, robots)', async () => {
    for (const path of ['/llms.txt', '/robots.txt', '/sitemap-index.xml', '/site.webmanifest']) {
      expect((await decide(base, p(path))).kind, path).not.toBe('shell');
    }
  });

  it('clients are claimed on first install, and a waiting update is NOT forced (an auto-reload could drop a half-filled expense form)', async () => {
    const { pwaOptions } = await cfg();
    const options = pwaOptions(base);
    expect(options.registerType).toBe('prompt');
    expect(options.workbox.clientsClaim).toBe(true);
    expect(options.workbox.skipWaiting).toBe(false);
    const sw = await buildFor(base);
    // skipWaiting only on the page's explicit SKIP_WAITING message (UpdateToast's Reload), never unconditionally
    expect(sw.text).toMatch(/"SKIP_WAITING"===\w+\.data\.type&&self\.skipWaiting\(\)/);
    expect(sw.text).not.toMatch(/self\.skipWaiting\(\)\s*,/);
  });
});

describe('assetUrl', () => {
  it('joins the base and a path with exactly one slash, for every base shape', async () => {
    const { assetUrl } = await cfg();
    expect(assetUrl('/JustSplit', '404.html')).toBe('/JustSplit/404.html');
    expect(assetUrl('/JustSplit/', '/404.html')).toBe('/JustSplit/404.html');
    expect(assetUrl('/', '404.html')).toBe('/404.html');
    expect(assetUrl('/', '/icons/pwa-192.png')).toBe('/icons/pwa-192.png');
  });
});

describe('web app manifest', () => {
  it('is JustSplit, not the Inceptor scaffold', async () => {
    const { pwaOptions } = await cfg();
    const { manifest } = pwaOptions('/JustSplit');
    expect(manifest.name).toBe('JustSplit');
    expect(manifest.short_name).toBe('JustSplit');
    expect(manifest.description).toMatch(/expense/i);
    expect(JSON.stringify(manifest)).not.toMatch(/inceptor/i);
    expect(manifest.theme_color).toBe('#124d8c'); // --color-primary-600, the layout's <meta name="theme-color">
    expect(manifest.background_color).toBe('#ffffff'); // --color-background, light
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('en');
  });

  it('starts and scopes at the directory URL under the base, so the start page is a precached URL', async () => {
    const { pwaOptions } = await cfg();
    const sub = pwaOptions('/JustSplit').manifest;
    expect([sub.start_url, sub.scope, sub.id]).toEqual(['/JustSplit/', '/JustSplit/', '/JustSplit/']);
    const root = pwaOptions('/').manifest;
    expect([root.start_url, root.scope, root.id]).toEqual(['/', '/', '/']);
  });

  it('prefixes every icon and shortcut with the base', async () => {
    const { pwaOptions } = await cfg();
    const { manifest } = pwaOptions('/JustSplit');
    for (const icon of manifest.icons) expect(icon.src).toMatch(/^\/JustSplit\/icons\//);
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    expect(manifest.shortcuts.map((s) => s.url)).toEqual(['/JustSplit/expenses/new/', '/JustSplit/settlements/']);
  });
});
