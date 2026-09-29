import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
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
