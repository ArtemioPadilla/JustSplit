/**
 * The one static file server for scripts that drive a production build in a
 * browser (`axe-smoke.mjs`, `live-smoke.mjs`; plan A7). No runtime dependency.
 *
 * `build.format: 'directory'` (Astro's default): `/x` and `/x/` both serve
 * `x/index.html`.
 *
 * `notFoundShell` mimics Cloudflare Pages (and GitHub Pages before it): a URL with
 * no prerendered page gets `404.html` with status 404 — that is how
 * `/expenses/<id>`, `/events/<id>`… reach `AppRouterIsland` (spec D2). Off by
 * default, where an unknown path is a plain 404 and a smoke check can treat it as
 * a broken link.
 *
 * Plan B20a (ADR 0016): the server also behaves like Pages where the smokes care.
 *  - `headers` (default on): the build's `<dist>/_headers` is applied to every
 *    response, 404 shell included, so the browser smokes run under the CSP
 *    production serves and a violation is a console error.
 *  - `redirects` (default on): Pages' canonical-URL 308s (`/x` -> `/x/`,
 *    `/x/index.html` -> `/x/`, `/x.html` -> `/x`), which the service worker's
 *    precache meets in production (it fetches `/404.html`, `/about/index.html`...).
 * Both are tuned off in tests that need the bare behaviour.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { headersFor, parseHeadersFile } from './pages-headers.mjs';

export const MIME = {
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

/**
 * Maps a URL path to a file inside `dist`, or null. `base` is the deploy
 * subpath (Astro's `ASTRO_BASE`, no trailing slash); a request outside `dist`
 * (after percent-decoding) never resolves.
 */
export async function resolveFile(dist, base, urlPath) {
  const withoutBase = base && urlPath.startsWith(base) ? urlPath.slice(base.length) || '/' : urlPath;
  let decoded;
  try {
    decoded = decodeURIComponent(withoutBase);
  } catch {
    return null;
  }
  const clean = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const direct = join(dist, clean);
  if (direct !== dist && !direct.startsWith(dist + sep)) return null;
  const candidates = clean.endsWith('/')
    ? [join(direct, 'index.html')]
    : [direct, `${direct}.html`, join(direct, 'index.html')];
  for (const candidate of candidates) {
    if (existsSync(candidate) && (await stat(candidate)).isFile()) return candidate;
  }
  return null;
}

/** The path below the deploy base (what a root-hosted Pages site would see). */
const belowBase = (base, pathname) => (base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname);

/**
 * The canonical URL Pages redirects `pathname` to, or null. Only for a path that
 * resolves to a file, and never to a protocol-relative target.
 */
async function canonicalPath(dist, base, pathname) {
  const rel = belowBase(base, pathname);
  let target = null;
  if (rel === '/index.html' || rel.endsWith('/index.html')) target = rel.slice(0, -'index.html'.length);
  else if (rel.endsWith('.html')) target = rel.slice(0, -'.html'.length);
  else if (!rel.endsWith('/')) {
    const file = await resolveFile(dist, base, pathname);
    if (file && file.endsWith(`${sep}index.html`) && extname(rel) === '') target = `${rel}/`;
  }
  if (target === null || target.startsWith('//')) return null;
  return (await resolveFile(dist, base, pathname)) ? `${base}${target}` : null;
}

/** Resolves with the listening `http.Server` on a free 127.0.0.1 port. */
export function startStaticServer({ dist, base = '', notFoundShell = false, headers = true, redirects = true }) {
  const shell = join(dist, '404.html');
  const headersPath = join(dist, '_headers');
  const rules = headers && existsSync(headersPath) ? parseHeadersFile(readFileSync(headersPath, 'utf8')) : [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const extra = headersFor(rules, belowBase(base, url.pathname));
    const send = (status, type, body) => {
      res.writeHead(status, { ...extra, 'content-type': type });
      res.end(body);
    };
    if (redirects) {
      const target = await canonicalPath(dist, base, url.pathname);
      if (target !== null) {
        res.writeHead(308, { ...extra, location: `${target}${url.search}` });
        res.end();
        return;
      }
    }
    const file = await resolveFile(dist, base, url.pathname);
    if (!file) {
      if (notFoundShell && existsSync(shell)) return send(404, MIME['.html'], await readFile(shell));
      return send(404, 'text/plain', 'not found');
    }
    return send(200, MIME[extname(file)] ?? 'application/octet-stream', await readFile(file));
  });
  return new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => resolvePromise(server));
  });
}
