/**
 * The one static file server for scripts that drive a production build in a
 * browser (`axe-smoke.mjs`, `live-smoke.mjs`; plan A7). No runtime dependency.
 *
 * `build.format: 'directory'` (Astro's default): `/x` and `/x/` both serve
 * `x/index.html`.
 *
 * `notFoundShell` mimics GitHub Pages: a URL with no prerendered page gets
 * `404.html` with status 404 — that is how `/expenses/<id>`, `/events/<id>`…
 * reach `AppRouterIsland` (spec D2). Off by default, where an unknown path is a
 * plain 404 and a smoke check can treat it as a broken link.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';

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

/** Resolves with the listening `http.Server` on a free 127.0.0.1 port. */
export function startStaticServer({ dist, base = '', notFoundShell = false }) {
  const shell = join(dist, '404.html');
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const file = await resolveFile(dist, base, url.pathname);
    if (!file) {
      if (notFoundShell && existsSync(shell)) {
        res.writeHead(404, { 'content-type': MIME['.html'] });
        res.end(await readFile(shell));
        return;
      }
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  });
  return new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => resolvePromise(server));
  });
}
