import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DYNAMIC_ROUTES } from '../lib/app-routes';

/**
 * Plan B2c / spec D2: client-only dynamic routes are served by the 404 shell.
 * Build-output assertions (dist/404.html carries the shell) run after the
 * build in `npm run check` through scripts/check-dist.mjs, because the unit
 * tests run before the build.
 */
const ROOT = resolve(__dirname, '../..');
const PAGES = resolve(ROOT, 'src/pages');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = resolve(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('404 app shell (spec D2)', () => {
  const shell = read('src/pages/404.astro');

  it('mounts AppRouterIsland client-only, inside an ErrorBoundary-aware island', () => {
    expect(shell).toMatch(/<AppRouterIsland\s+client:only="react"/);
  });

  it('has a no-JS fallback and asks crawlers not to index it', () => {
    expect(shell).toMatch(/slot="fallback"/);
    expect(shell).toMatch(/noindex/);
  });

  it('every dynamic route family is routed by the matcher', () => {
    const families = DYNAMIC_ROUTES.map((r) => `/${r.prefix.join('/')}/:id`).sort();
    expect(families).toEqual(
      ['/events/:id', '/events/edit/:id', '/expenses/:id', '/expenses/edit/:id', '/friends/:id', '/groups/:id'].sort(),
    );
  });

  it('no dynamic route family is shadowed by a prerendered page', () => {
    const dynamicPages = walk(PAGES).filter((f) => /\[[^\]]+\]/.test(relative(PAGES, f)));
    expect(dynamicPages.map((f) => relative(ROOT, f))).toEqual([]);
  });
});

describe('redirect pages', () => {
  it.each(['expenses', 'events', 'groups'])('/%s redirects to its list page through withBase()', (family) => {
    const page = `src/pages/${family}/index.astro`;
    expect(existsSync(resolve(ROOT, page)), page).toBe(true);
    const src = read(page);
    expect(src).toMatch(new RegExp(`withBase\\(['"]/${family}/list/?['"]\\)`));
    expect(src).toMatch(/http-equiv="refresh"/);
    expect(src).toMatch(/location\.replace/);
    expect(src).toMatch(/noindex/);
  });
});

describe('Supabase auth path', () => {
  it('no page lives under /auth/v1 (GoTrue’s path on the project origin)', () => {
    expect(existsSync(resolve(PAGES, 'auth/v1'))).toBe(false);
    const collisions = walk(PAGES).filter((f) => relative(PAGES, f).startsWith('auth/v1'));
    expect(collisions).toEqual([]);
  });
});
