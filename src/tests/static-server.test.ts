import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Plan B20a: the server also behaves like Cloudflare Pages where it matters to the
 * smokes: it applies the build's `_headers` (CSP and all) and answers the canonical-URL
 * redirects Pages does (`/x` -> `/x/`, `/x/index.html` -> `/x/`, `/404.html` -> `/404`),
 * so the service worker's precache is exercised through redirects like in production.
 *
 * Plan A7: `scripts/axe-smoke.mjs` and `scripts/live-smoke.mjs` serve a
 * production build through ONE static server (`scripts/lib/static-server.mjs`),
 * not two copies. The live smoke drives `/expenses/<id>`-style dynamic routes,
 * which only exist through the 404 app shell (spec D2), so the server can
 * mimic GitHub Pages: an unknown path gets `404.html` WITH status 404.
 */
const LIB = pathToFileURL(resolve(__dirname, '../../scripts/lib/static-server.mjs')).href;

let dist: string;
beforeAll(() => {
  dist = mkdtempSync(join(tmpdir(), 'static-server-'));
  writeFileSync(join(dist, 'index.html'), '<p>home</p>');
  writeFileSync(join(dist, '404.html'), '<p>shell</p>');
  mkdirSync(join(dist, 'about'));
  writeFileSync(join(dist, 'about', 'index.html'), '<p>about</p>');
  mkdirSync(join(dist, 'sub'));
  writeFileSync(join(dist, 'sub', 'index.html'), '<p>sub home</p>');
  writeFileSync(join(dist, 'app.js'), 'export {}');
});
afterAll(() => rmSync(dist, { recursive: true, force: true }));

async function withServer<T>(options: Record<string, unknown>, run: (origin: string) => Promise<T>): Promise<T> {
  const { startStaticServer } = await import(/* @vite-ignore */ LIB);
  const server = await startStaticServer({ dist, ...options });
  try {
    return await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    server.close();
  }
}

describe('startStaticServer (plan A7)', () => {
  it('serves files, directory indexes and extensionless paths with the right content type', async () => {
    await withServer({}, async (origin) => {
      const home = await fetch(`${origin}/`);
      expect(home.status).toBe(200);
      expect(await home.text()).toBe('<p>home</p>');
      expect(await (await fetch(`${origin}/about`)).text()).toBe('<p>about</p>');
      expect(await (await fetch(`${origin}/about/`)).text()).toBe('<p>about</p>');
      const js = await fetch(`${origin}/app.js`);
      expect(js.headers.get('content-type')).toMatch(/text\/javascript/);
    });
  });

  it('answers an unknown path with a plain 404 by default (what axe-smoke relies on)', async () => {
    await withServer({}, async (origin) => {
      const res = await fetch(`${origin}/expenses/abc`);
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('not found');
    });
  });

  it('serves the 404.html app shell with status 404 for an unknown path when notFoundShell is set', async () => {
    await withServer({ notFoundShell: true }, async (origin) => {
      const res = await fetch(`${origin}/expenses/abc`);
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toMatch(/text\/html/);
      expect(await res.text()).toBe('<p>shell</p>');
      // a real page is unaffected
      expect((await fetch(`${origin}/about/`)).status).toBe(200);
    });
  });

  it('honours a base path prefix', async () => {
    await withServer({ base: '/JustSplit' }, async (origin) => {
      expect(await (await fetch(`${origin}/JustSplit/sub/`)).text()).toBe('<p>sub home</p>');
    });
  });

  it('never serves a file outside dist', async () => {
    await withServer({ notFoundShell: true }, async (origin) => {
      const res = await fetch(`${origin}/..%2f..%2fetc/passwd`);
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('<p>shell</p>');
    });
  });
});

describe('startStaticServer as Cloudflare Pages (plan B20a)', () => {
  it('applies _headers: patterns, merged values, detach, also on the 404 shell', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'static-headers-'));
    try {
      writeFileSync(join(dir, 'index.html'), '<p>home</p>');
      writeFileSync(join(dir, '404.html'), '<p>shell</p>');
      mkdirSync(join(dir, '_astro'));
      writeFileSync(join(dir, '_astro', 'a.js'), 'export {}');
      writeFileSync(
        join(dir, '_headers'),
        '/*\n  Content-Security-Policy: default-src \'self\'\n  Cache-Control: no-cache\n/_astro/*\n  ! Cache-Control\n  Cache-Control: public, max-age=31536000, immutable\n',
      );
      const { startStaticServer } = await import(/* @vite-ignore */ LIB);
      const server = await startStaticServer({ dist: dir, notFoundShell: true });
      try {
        const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        const home = await fetch(`${origin}/`);
        expect(home.headers.get('content-security-policy')).toBe("default-src 'self'");
        expect(home.headers.get('cache-control')).toBe('no-cache');
        expect(home.headers.get('content-type')).toMatch(/text\/html/);
        const asset = await fetch(`${origin}/_astro/a.js`);
        expect(asset.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
        const shell = await fetch(`${origin}/expenses/abc`);
        expect(shell.status).toBe(404);
        expect(shell.headers.get('content-security-policy')).toBe("default-src 'self'");
      } finally {
        server.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('answers a dist without _headers with no extra headers', async () => {
    await withServer({}, async (origin) => {
      expect((await fetch(`${origin}/`)).headers.get('content-security-policy')).toBeNull();
    });
  });

  it('redirects to the canonical URL with a 308, keeping the query, like Pages', async () => {
    await withServer({}, async (origin) => {
      const at = async (path: string) => {
        const res = await fetch(`${origin}${path}`, { redirect: 'manual' });
        return [res.status, res.headers.get('location')] as const;
      };
      expect(await at('/about')).toEqual([308, '/about/']);
      expect(await at('/about?x=1')).toEqual([308, '/about/?x=1']);
      expect(await at('/about/index.html')).toEqual([308, '/about/']);
      expect(await at('/index.html')).toEqual([308, '/']);
      expect(await at('/404.html')).toEqual([308, '/404']);
      expect((await at('/about/'))[0]).toBe(200);
      expect((await at('/404'))[0]).toBe(200); // Pages serves 404.html at /404 with 200
      expect((await at('/app.js'))[0]).toBe(200);
    });
  });

  it('keeps the base path in a redirect target', async () => {
    await withServer({ base: '/JustSplit' }, async (origin) => {
      const res = await fetch(`${origin}/JustSplit/sub`, { redirect: 'manual' });
      expect([res.status, res.headers.get('location')]).toEqual([308, '/JustSplit/sub/']);
    });
  });
});
