/**
 * Asserts that all canonical-origin references stay in sync.
 *
 * Failure here means one of the three sources drifted:
 *   1. SITE_ORIGIN in src/lib/site-meta.ts
 *   2. SITE_ORIGIN in site.config.mjs (consumed by astro.config.mjs)
 *   3. The Sitemap URL in public/robots.txt
 *
 * Re-brand checklist: update all three, run `npm test` to confirm.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

import { SITE_ORIGIN } from '../lib/site-meta';

// Resolve from project root (two levels up from src/tests/)
const ROOT = resolve(__dirname, '../../');

describe('canonical site URL single-source (#185)', () => {
  it('SITE_ORIGIN in site-meta.ts is a valid https URL', () => {
    expect(SITE_ORIGIN).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i);
    expect(SITE_ORIGIN).not.toMatch(/localhost/);
    expect(SITE_ORIGIN).not.toMatch(/example\.com/);
  });

  it('site.config.mjs SITE_ORIGIN matches site-meta.ts SITE_ORIGIN', async () => {
    // Dynamic import so Vitest resolves the .mjs from Node — bypasses Vite
    // transform that would ordinarily handle ?raw imports.
    const siteConfigPath = resolve(ROOT, 'site.config.mjs');
    const { SITE_ORIGIN: mjs } = await import(siteConfigPath);
    expect(mjs).toBe(SITE_ORIGIN);
  });

  it('astro.config.mjs `site` value matches SITE_ORIGIN', () => {
    // Read as raw text to avoid executing the Astro/Vite module graph.
    // The pattern matches: site: SITE_ORIGIN  (after import from site.config.mjs)
    const raw = readFileSync(resolve(ROOT, 'astro.config.mjs'), 'utf-8');
    // Confirm the config uses the variable, not a hardcoded string
    expect(raw).toMatch(/site:\s*SITE_ORIGIN/);
    // Also confirm the import statement is present
    expect(raw).toMatch(/from\s+['"]\.\/site\.config\.mjs['"]/);
  });

  it('robots.txt Sitemap URL starts with SITE_ORIGIN', () => {
    const robots = readFileSync(resolve(ROOT, 'public/robots.txt'), 'utf-8');
    const match = robots.match(/^Sitemap:\s*(.+)$/m);
    expect(match, 'robots.txt must contain a Sitemap: directive').toBeTruthy();
    const sitemapUrl = match![1]!.trim();
    expect(sitemapUrl).toMatch(/^https:\/\//);
    expect(sitemapUrl.startsWith(SITE_ORIGIN)).toBe(true);
  });
});
