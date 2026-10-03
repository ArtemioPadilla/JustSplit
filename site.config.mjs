/**
 * Single source of truth for the canonical production origin.
 *
 * WHY a plain .mjs module, not site-meta.ts: astro.config.mjs runs in Node
 * before Vite starts and cannot import TypeScript that uses import.meta.env.
 * src/lib/site-meta.ts re-exports the same value; src/tests/site-meta.test.ts
 * asserts both stay in sync.
 *
 * ADR 0016 (supersedes spec D2's GitHub Pages): production is Cloudflare Pages at
 * https://split.cybere.co, served from the root of its own host (base '/').
 * `justsplit.cybere.co` is only a zone redirect to this origin; it never serves
 * a page, so no canonical link, sitemap or JSON-LD may ever name it. Changing the
 * origin: here + src/lib/site-meta.ts + public/robots.txt.
 */
export const SITE_ORIGIN = 'https://split.cybere.co';

/** Canonical URL for the site root (origin + base subpath). */
export function canonicalUrl(base = '/') {
  return `${SITE_ORIGIN}${base === '/' ? '' : base.replace(/\/$/, '')}`;
}
