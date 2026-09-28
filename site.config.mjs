/**
 * Single source of truth for the canonical production origin.
 *
 * WHY a plain .mjs module, not site-meta.ts: astro.config.mjs runs in Node
 * before Vite starts and cannot import TypeScript that uses import.meta.env.
 * src/lib/site-meta.ts re-exports the same value; src/tests/site-meta.test.ts
 * asserts both stay in sync.
 *
 * Spec D2: GitHub Pages. Until a custom domain is configured the site lives at
 * https://artemiopadilla.github.io/JustSplit/ (base '/JustSplit', set at build
 * time via ASTRO_BASE in .github/workflows/deploy.yml). With a custom domain:
 * change SITE_ORIGIN here + in site-meta.ts + public/robots.txt, and set the
 * repository variable ASTRO_BASE to '/'.
 */
export const SITE_ORIGIN = 'https://artemiopadilla.github.io';

/** Canonical URL for the site root (origin + base subpath). */
export function canonicalUrl(base = '/') {
  return `${SITE_ORIGIN}${base === '/' ? '' : base.replace(/\/$/, '')}`;
}
