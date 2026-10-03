/**
 * Single source of this site's machine-readable identity: /llms.txt,
 * /llms-full.txt, the JSON-LD blocks and the default <meta name="description">.
 */

/**
 * Canonical production origin — must match SITE_ORIGIN in /site.config.mjs
 * (astro.config.mjs cannot import this file; src/tests/site-meta.test.ts keeps
 * the two in sync). ADR 0016: Cloudflare Pages at split.cybere.co, base `/`.
 */
export const SITE_ORIGIN = 'https://split.cybere.co';

export const SITE = {
  /** Product name as it should appear to agents and search engines. */
  name: 'JustSplit',
  /** One-line positioning (used as the default meta description). */
  description:
    'Fair expense splitting, made simple: track, divide and settle shared expenses ' +
    'for couples, friends, households, trips and projects — multi-currency, offline-friendly, open source.',
  /** owner/repo on GitHub. */
  repoSlug: (import.meta.env.PUBLIC_REPO_SLUG as string | undefined) ?? 'ArtemioPadilla/JustSplit',
  /** SPDX license id of the codebase. The LICENSE file is an owner decision (SETUP.md §4). */
  license: 'license pending',
  /** Languages an agent should expect in the source. */
  programmingLanguages: ['TypeScript', 'Astro', 'CSS', 'SQL'],
} as const;

/** Absolute repo URL derived from the slug. */
export const REPO_URL = `https://github.com/${SITE.repoSlug}`;

/** Absolute site origin + base (e.g. https://split.cybere.co, or a subpath on a fork). */
export function siteUrl(site: URL | undefined, base: string): string {
  const origin = (site ?? new URL('https://localhost')).origin;
  return `${origin}${base.replace(/\/$/, '')}`;
}
