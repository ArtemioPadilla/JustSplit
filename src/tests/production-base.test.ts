import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SITE_ORIGIN } from '../lib/site-meta';
import { withBase } from '../lib/href';

/**
 * Plan B20a (ADR 0016): production is `https://split.cybere.co`, served from the
 * root of its own host, so the deploy base is `/` everywhere. `ASTRO_BASE` stays
 * as a local-experiment variable, and the code keeps supporting a subpath (a fork
 * on GitHub project pages, the documented fallback), which is what the last
 * describe block pins.
 */
const ROOT = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

describe('production origin and base (plan B20a)', () => {
  it('the canonical origin is https://split.cybere.co, in every place that states it', async () => {
    expect(SITE_ORIGIN).toBe('https://split.cybere.co');
    const { SITE_ORIGIN: fromConfig } = await import(/* @vite-ignore */ resolve(ROOT, 'site.config.mjs'));
    expect(fromConfig).toBe('https://split.cybere.co');
    expect(read('public/robots.txt')).toContain('Sitemap: https://split.cybere.co/sitemap-index.xml');
  });

  it('the old github.io origin is gone from the config and the crawler files', () => {
    for (const f of ['site.config.mjs', 'src/lib/site-meta.ts', 'public/robots.txt', 'astro.config.mjs']) {
      expect(read(f), f).not.toMatch(/artemiopadilla\.github\.io/);
    }
  });

  it('astro.config.mjs defaults the base to `/`', () => {
    expect(read('astro.config.mjs')).toMatch(/const BASE = process\.env\.ASTRO_BASE \|\| '\/';/);
  });

  it('no workflow falls back to a subpath', () => {
    const dir = resolve(ROOT, '.github/workflows');
    for (const f of readdirSync(dir)) expect(readFileSync(resolve(dir, f), 'utf8'), f).not.toMatch(/'\/JustSplit'|ASTRO_BASE/);
  });

  it('the offline smoke exercises the production base `/`, with an opt-in override for a subpath', () => {
    const src = read('scripts/offline-smoke.mjs');
    expect(src).toMatch(/const BASE = \(process\.env\.OFFLINE_SMOKE_BASE \|\| '\/'\)\.replace\(\/\\\/\$\/, ''\);/);
    expect(src).not.toMatch(/const BASE = '\/JustSplit'/);
  });

  it('the canonical <link> and the JSON-LD url come from Astro.site (SITE_ORIGIN), never a literal host', () => {
    const layout = read('src/layouts/BaseLayout.astro');
    expect(layout).toMatch(/<link rel="canonical" href=\{canonicalUrl\}/);
    expect(layout).toMatch(/new URL\(Astro\.url\.pathname, Astro\.site\)/);
    expect(layout).not.toMatch(/cybere\.co|github\.io/);
    expect(read('astro.config.mjs')).toMatch(/site:\s*SITE_ORIGIN/);
  });
});

describe('a subpath base still works (the GitHub Pages fallback, spec D2)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('withBase prefixes every internal path with a non-root base', () => {
    vi.stubEnv('BASE_URL', '/JustSplit/');
    expect(withBase('/favicon.svg')).toBe('/JustSplit/favicon.svg');
    expect(withBase('auth/callback/')).toBe('/JustSplit/auth/callback/');
  });

  it('withBase is an identity at the root', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(withBase('/favicon.svg')).toBe('/favicon.svg');
  });
});
