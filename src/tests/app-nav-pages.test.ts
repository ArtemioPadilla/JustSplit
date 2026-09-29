import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Which pages show the signed-in app nav (plan B6b): every page that hosts an
 * authenticated route island, and no other. Derived from the sources, so a
 * new app page that forgets `appNav` fails here instead of shipping without
 * navigation.
 */
const PAGES_DIR = resolve(__dirname, '..', 'pages');

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? pageFiles(path) : name.endsWith('.astro') ? [path] : [];
  });
}

const pages = pageFiles(PAGES_DIR).map((path) => ({
  name: relative(PAGES_DIR, path),
  src: readFileSync(path, 'utf8'),
}));
const usesLayout = pages.filter((p) => /<BaseLayout\b/.test(p.src));
// Public and auth pages, and the showcase, host islands but are not the signed-in app.
const isApp = (p: { name: string; src: string }) =>
  /client:only/.test(p.src) && !p.name.startsWith('auth/') && p.name !== 'showcase.astro';

describe('app nav on pages (plan B6b)', () => {
  it('finds the app pages it expects', () => {
    expect(usesLayout.filter(isApp).map((p) => p.name).sort()).toEqual([
      '404.astro',
      'events/list.astro',
      'events/new.astro',
      'expenses/list.astro',
      'expenses/new.astro',
      'friends/index.astro',
      'groups/list.astro',
      'groups/new.astro',
      'index.astro',
      'profile.astro',
      'settlements.astro',
    ]);
  });

  it.each(usesLayout.filter(isApp).map((p) => [p.name, p.src]))('%s passes appNav to BaseLayout', (_n, src) => {
    expect(src).toMatch(/<BaseLayout\b[^>]*\sappNav\b/);
  });

  it.each(usesLayout.filter((p) => !isApp(p)).map((p) => [p.name, p.src]))(
    '%s does not show the app nav',
    (_n, src) => {
      expect(src).not.toMatch(/<BaseLayout\b[^>]*\sappNav\b/);
    },
  );

  it.each(usesLayout.map((p) => [p.name, p.src]))('%s has the #main-content skip-link target', (_n, src) => {
    expect(src).toMatch(/id="main-content"/);
  });
});
