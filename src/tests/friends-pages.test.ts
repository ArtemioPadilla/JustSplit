import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `/friends` and `/friends/add` (plan B13, ADR 0006). Unlike
 * `/expenses`/`/events`/`/groups`, `/friends` is NOT a redirect-only page —
 * it IS the list shell directly (same shape as `/expenses/list.astro`),
 * matching the legacy tree's own `/friends` page. `/friends/add` is the one
 * redirect page here (the legacy tree's local-only add form, dropped —
 * ADR 0006), following the same redirect pattern as
 * `src/pages/expenses/index.astro`, but targeting `/friends/` instead of a
 * `/<family>/list/` page.
 */
const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

describe('/friends shell (plan B13)', () => {
  const src = read('src/pages/friends/index.astro');

  it('mounts FriendsIsland client-only', () => {
    expect(src).toMatch(/<FriendsIsland\s+client:only="react"/);
  });

  it('has a static skeleton fallback and a no-JS message', () => {
    expect(src).toMatch(/slot="fallback"/);
    expect(src).toMatch(/<noscript>/);
  });

  it('wraps the island in a <main> landmark (axe landmark-one-main/region)', () => {
    expect(src).toMatch(/<main[^>]*>[\s\S]*<FriendsIsland/);
  });
});

describe('/friends/add redirects to /friends/ (plan B13: the local-only add form is dropped)', () => {
  const src = read('src/pages/friends/add.astro');

  it('redirects through withBase to /friends/', () => {
    expect(src).toMatch(/withBase\(['"]\/friends\/?['"]\)/);
    expect(src).toMatch(/http-equiv="refresh"/);
    expect(src).toMatch(/location\.replace/);
    expect(src).toMatch(/noindex/);
  });
});
