import { describe, expect, it } from 'vitest';

/**
 * Spec D2: the site is served under a subpath on GitHub Pages ('/JustSplit')
 * until a custom domain exists, and the staging site is a subpath too. Every
 * internal link and asset reference must therefore go through withBase() —
 * a bare href="/…" or src="/…" 404s on the subpath deploy.
 *
 * Matches `href="/x"` / `src="/x"` / `href='/x'` literal attributes in source.
 * Allowed: protocol-relative or absolute URLs (`//`, `https://`), anchors,
 * and lines that call withBase(). Test files are excluded.
 */
const sources = import.meta.glob('../**/*.{astro,tsx,ts}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const files = Object.entries(sources).filter(([p]) => !/\.(test|behavior\.test)\.[tj]sx?$/.test(p) && !p.includes('/tests/'));

const BARE = /\b(href|src)=["']\/(?!\/)[^"']*["']/;

describe('internal links go through withBase() (spec D2)', () => {
  it.each(files)('%s has no bare root-relative href/src', (_path, src) => {
    const offenders = src
      .split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => BARE.test(line) && !line.includes('withBase('));
    expect(offenders.map((o) => `${o.n}: ${o.line.trim()}`), 'use withBase()').toEqual([]);
  });
});
