import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * Plan B20a (ADR 0016): the Cloudflare Pages `_headers` file (HSTS, an ENFORCED
 * CSP, cache rules) is generated from the finished `dist/` by a build integration,
 * so the sha256 of every inline script can never drift from the HTML it protects.
 * `scripts/check-dist.mjs` re-verifies the real build on every `npm run check`;
 * these tests pin the generator itself on fixtures (and on `dist/` when it exists).
 */
const LIB = pathToFileURL(resolve(__dirname, '../../scripts/lib/pages-headers.mjs')).href;
const CONFIG = pathToFileURL(resolve(__dirname, '../../pages-headers.config.mjs')).href;
type Lib = {
  inlineScriptHashes: (html: string) => string[];
  collectInlineScriptHashes: (dir: string) => string[];
  supabaseOrigins: (url: string | undefined) => { http: string; ws: string } | null;
  buildCsp: (options: { hashes: string[]; supabaseUrl?: string }) => string;
  buildHeadersFile: (options: { hashes: string[]; supabaseUrl?: string }) => string;
  parseHeadersFile: (text: string) => { pattern: string; set: [string, string][]; unset: string[] }[];
  headersFor: (rules: ReturnType<Lib['parseHeadersFile']>, pathname: string) => Record<string, string>;
};
const load = () => import(/* @vite-ignore */ LIB) as Promise<Lib>;
const sha = (body: string) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
const directive = (csp: string, name: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `) || d === name);

describe('inlineScriptHashes (plan B20a)', () => {
  it('hashes the exact bytes of every executable inline script, classic and module', async () => {
    const { inlineScriptHashes } = await load();
    const a = '\n  (function () { document.documentElement.className = "x"; })();\n';
    const b = 'import "/x.js";';
    const html = `<head><script>${a}</script><script type="module">${b}</script><script is:inline>nope</script></head>`;
    expect(inlineScriptHashes(html)).toEqual([sha(a), sha(b), sha('nope')].sort());
  });

  it('ignores external scripts and data blocks (JSON-LD is parsed, not executed: it needs no hash)', async () => {
    const { inlineScriptHashes } = await load();
    const html = [
      '<script type="module" src="/_astro/x.js"></script>',
      '<script src="/a.js"></script>',
      '<script type="application/ld+json">{"@context":"https://schema.org"}</script>',
      '<script type="application/json">{}</script>',
      '<script type="module"></script>',
    ].join('');
    expect(inlineScriptHashes(html)).toEqual([]);
  });

  it('hashes an inline import map, which CSP governs like a script', async () => {
    const { inlineScriptHashes } = await load();
    const body = '{"imports":{"a":"/a.js"}}';
    expect(inlineScriptHashes(`<script type="importmap">${body}</script>`)).toEqual([sha(body)]);
  });

  it('returns each distinct script once, sorted (the same script on 19 pages is one hash)', async () => {
    const { inlineScriptHashes } = await load();
    const s = '<script>var a=1</script>';
    expect(inlineScriptHashes(s + s + '<script>var b=2</script>')).toEqual([sha('var a=1'), sha('var b=2')].sort());
  });

  it('collectInlineScriptHashes walks every .html under a directory, nested and the 404 shell included', async () => {
    const { collectInlineScriptHashes } = await load();
    const dir = mkdtempSync(join(tmpdir(), 'hashes-'));
    try {
      mkdirSync(join(dir, 'a', 'b'), { recursive: true });
      writeFileSync(join(dir, 'index.html'), '<script>one()</script>');
      writeFileSync(join(dir, 'a', 'b', 'index.html'), '<script>two()</script>');
      writeFileSync(join(dir, '404.html'), '<script>three()</script>');
      writeFileSync(join(dir, 'a', 'x.js'), 'not html');
      expect(collectInlineScriptHashes(dir)).toEqual([sha('one()'), sha('two()'), sha('three()')].sort());
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('supabaseOrigins', () => {
  it('derives the https and wss origins of a hosted project, dropping any path', async () => {
    const { supabaseOrigins } = await load();
    expect(supabaseOrigins('https://abcd.supabase.co/')).toEqual({ http: 'https://abcd.supabase.co', ws: 'wss://abcd.supabase.co' });
    expect(supabaseOrigins('https://abcd.supabase.co/rest/v1')).toEqual({ http: 'https://abcd.supabase.co', ws: 'wss://abcd.supabase.co' });
  });

  it('derives http and ws for the local stack (the live smoke builds against it)', async () => {
    const { supabaseOrigins } = await load();
    expect(supabaseOrigins('http://127.0.0.1:54321')).toEqual({ http: 'http://127.0.0.1:54321', ws: 'ws://127.0.0.1:54321' });
  });

  it('is null when no project is configured, and throws on anything that is not an http(s) URL', async () => {
    const { supabaseOrigins } = await load();
    expect(supabaseOrigins(undefined)).toBeNull();
    expect(supabaseOrigins('')).toBeNull();
    expect(() => supabaseOrigins('not a url')).toThrow(/PUBLIC_SUPABASE_URL/);
    expect(() => supabaseOrigins("javascript:alert(1)")).toThrow(/PUBLIC_SUPABASE_URL/);
    // a value that would smuggle a directive into the header
    expect(() => supabaseOrigins("https://a.supabase.co'; script-src *")).toThrow(/PUBLIC_SUPABASE_URL/);
  });
});

describe('buildCsp (plan B20a, ADR 0016)', () => {
  const hashes = [sha('one()'), sha('two()')];
  const csp = async (supabaseUrl?: string) => (await load()).buildCsp({ hashes, supabaseUrl });

  it('has every required directive, enforced as a header (never report-only)', async () => {
    const value = await csp('https://abcd.supabase.co');
    for (const name of ['default-src', 'script-src', 'style-src', 'font-src', 'img-src', 'connect-src', 'worker-src', 'manifest-src', 'base-uri', 'form-action', 'object-src', 'frame-ancestors']) {
      expect(directive(value, name), name).toBeTruthy();
    }
    expect(directive(value, 'default-src')).toBe("default-src 'self'");
    expect(directive(value, 'object-src')).toBe("object-src 'none'");
    expect(directive(value, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(value, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(value, 'form-action')).toBe("form-action 'self'");
    expect(directive(value, 'worker-src')).toBe("worker-src 'self'");
    expect(directive(value, 'manifest-src')).toBe("manifest-src 'self'");
  });

  it("script-src is 'self' plus the hashes: no 'unsafe-inline', no 'unsafe-eval', no host", async () => {
    const value = await csp('https://abcd.supabase.co');
    expect(directive(value, 'script-src')).toBe(`script-src 'self' ${hashes.join(' ')}`);
    expect(value).not.toMatch(/unsafe-eval/);
    expect(value).not.toMatch(/wasm-unsafe-eval/);
    expect(directive(value, 'script-src')).not.toMatch(/unsafe-inline/);
    expect(value).not.toMatch(/\bhttps?:(?=\s|;|$)/); // no scheme-only source
    expect(value).not.toMatch(/\*(?!\.googleusercontent)/); // no wildcard but the Google avatar hosts
  });

  it("style-src keeps 'unsafe-inline' (server-rendered style attributes and Astro's inlined <style>) and Google Fonts only", async () => {
    const value = await csp();
    expect(directive(value, 'style-src')).toBe("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(directive(value, 'font-src')).toBe("font-src 'self' https://fonts.gstatic.com");
  });

  it('img-src: self, data:, blob:, the project (signed storage URLs) and Google avatars', async () => {
    const value = await csp('https://abcd.supabase.co');
    expect(directive(value, 'img-src')).toBe("img-src 'self' data: blob: https://abcd.supabase.co https://*.googleusercontent.com");
  });

  it('connect-src: self, the project over https and wss, and the exchange-rate API', async () => {
    const value = await csp('https://abcd.supabase.co');
    expect(directive(value, 'connect-src')).toBe("connect-src 'self' https://abcd.supabase.co wss://abcd.supabase.co https://open.er-api.com");
  });

  it('without a project configured the CSP names no Supabase host (the guarded, disabled build)', async () => {
    const value = await csp();
    expect(value).not.toMatch(/supabase/);
    expect(directive(value, 'connect-src')).toBe("connect-src 'self' https://open.er-api.com");
    expect(directive(value, 'img-src')).toBe("img-src 'self' data: blob: https://*.googleusercontent.com");
  });

  it('the local stack gets http/ws origins', async () => {
    const value = await csp('http://127.0.0.1:54321');
    expect(directive(value, 'connect-src')).toContain('http://127.0.0.1:54321 ws://127.0.0.1:54321');
  });
});

describe('buildHeadersFile (plan B20a)', () => {
  const hashes = [sha('one()'), sha('two()')];
  const build = async (supabaseUrl = 'https://abcd.supabase.co') => (await load()).buildHeadersFile({ hashes, supabaseUrl });
  const allHeaders = async (path: string) => {
    const lib = await load();
    return lib.headersFor(lib.parseHeadersFile(await build()), path);
  };

  it('security headers on every path, HSTS without preload', async () => {
    const h = await allHeaders('/expenses/list/');
    expect(h['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(JSON.stringify(h)).not.toMatch(/preload/i);
  });

  it('applies to the 404 shell, the service worker and the manifest too', async () => {
    for (const path of ['/404.html', '/404', '/sw.js', '/manifest.webmanifest', '/']) {
      expect((await allHeaders(path))['content-security-policy'], path).toBeTruthy();
    }
  });

  it('Permissions-Policy turns everything off: nothing in the app uses the camera (file inputs only, no capture/getUserMedia)', async () => {
    const policy = (await allHeaders('/'))['permissions-policy']!;
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb', 'midi', 'gyroscope', 'accelerometer', 'display-capture']) {
      expect(policy, feature).toContain(`${feature}=()`);
    }
    expect(policy).not.toMatch(/=\(\s*(self|\*)/);
  });

  it('hashed assets are immutable for a year; HTML, the worker and the manifest always revalidate', async () => {
    expect((await allHeaders('/_astro/index.AbC123.js'))['cache-control']).toBe('public, max-age=31536000, immutable');
    for (const path of ['/', '/about/', '/404.html', '/sw.js', '/manifest.webmanifest', '/workbox-abeb32eb.js']) {
      expect((await allHeaders(path))['cache-control'], path).toBe('no-cache');
    }
  });

  it('fits Cloudflare Pages: at most 100 rules and 2000 characters per line', async () => {
    const text = await build();
    expect(text.split('\n').every((line) => line.length <= 2000)).toBe(true);
    expect(text.split('\n').filter((line) => /^\S/.test(line) && !line.startsWith('#')).length).toBeLessThanOrEqual(100);
    // a realistic 14-hash CSP still fits
    const lib = await load();
    const many = Array.from({ length: 14 }, (_, i) => sha(`script ${i}`));
    expect(Math.max(...lib.buildHeadersFile({ hashes: many, supabaseUrl: 'https://abcd.supabase.co' }).split('\n').map((l) => l.length))).toBeLessThanOrEqual(2000);
  });

  it('is deterministic', async () => {
    expect(await build()).toBe(await build());
  });
});

describe('_headers parsing and matching (Cloudflare Pages semantics)', () => {
  it('a splat matches any suffix, placeholders one segment, patterns are anchored', async () => {
    const lib = await load();
    const rules = lib.parseHeadersFile('/_astro/*\n  X-A: 1\n/blog/:slug\n  X-B: 2\n/exact\n  X-C: 3\n');
    expect(lib.headersFor(rules, '/_astro/a/b.js')).toEqual({ 'x-a': '1' });
    expect(lib.headersFor(rules, '/blog/hello')).toEqual({ 'x-b': '2' });
    expect(lib.headersFor(rules, '/blog/a/b')).toEqual({});
    expect(lib.headersFor(rules, '/exact')).toEqual({ 'x-c': '3' });
    expect(lib.headersFor(rules, '/exact/more')).toEqual({});
  });

  it('the same header from several matching rules is joined with a comma, and `! Name` detaches it first', async () => {
    const lib = await load();
    const rules = lib.parseHeadersFile('/*\n  X-A: one\n  Cache-Control: no-cache\n/p/*\n  X-A: two\n/_astro/*\n  ! Cache-Control\n  Cache-Control: immutable\n');
    expect(lib.headersFor(rules, '/p/x')).toEqual({ 'x-a': 'one, two', 'cache-control': 'no-cache' });
    expect(lib.headersFor(rules, '/_astro/x')).toEqual({ 'x-a': 'one', 'cache-control': 'immutable' });
  });

  it('ignores comments and blank lines', async () => {
    const lib = await load();
    expect(lib.parseHeadersFile('# note\n\n/*\n  # inner\n  X-A: 1\n')).toEqual([{ pattern: '/*', set: [['X-A', '1']], unset: [] }]);
  });
});

describe('the pages-headers build integration', () => {
  it('writes _headers into the output directory after the build (so every private build has it)', async () => {
    const { pagesHeaders } = (await import(/* @vite-ignore */ CONFIG)) as {
      pagesHeaders: (options?: { env?: Record<string, string | undefined> }) => {
        name: string;
        hooks: Record<string, (args: { dir: URL }) => Promise<void> | void>;
      };
    };
    const dir = mkdtempSync(join(tmpdir(), 'pages-headers-'));
    try {
      writeFileSync(join(dir, 'index.html'), '<script>boot()</script>');
      const integration = pagesHeaders({ env: { PUBLIC_SUPABASE_URL: 'https://abcd.supabase.co' } });
      expect(integration.name).toBe('justsplit:pages-headers');
      await integration.hooks['astro:build:done']!({ dir: pathToFileURL(`${dir}/`) });
      const written = readFileSync(join(dir, '_headers'), 'utf8');
      expect(written).toContain(sha('boot()'));
      expect(written).toContain('wss://abcd.supabase.co');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe.skipIf(!existsSync(resolve(__dirname, '../../dist/_headers')))('the real build (dist/, when it exists)', () => {
  const dist = resolve(__dirname, '../../dist');
  const headers = () => readFileSync(join(dist, '_headers'), 'utf8');
  afterAll(() => undefined);

  it('the CSP carries the sha256 of every executable inline script in every page', async () => {
    const lib = await load();
    const csp = lib.headersFor(lib.parseHeadersFile(headers()), '/')['content-security-policy']!;
    const scriptSrc = directive(csp, 'script-src')!;
    for (const hash of lib.collectInlineScriptHashes(dist)) expect(scriptSrc).toContain(hash);
    expect(csp).not.toMatch(/unsafe-eval/);
  });
});
