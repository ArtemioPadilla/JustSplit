import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `/settlements` shell (plan B14b, spec D2 pattern — same shape as
 * `profile-page.test.ts`): a static skeleton in the island's
 * `slot="fallback"`, `<SettlementsIsland client:only="react">`. The page is a
 * real Astro page (`dist/settlements/index.html`), so `?event=`/`?group=` reach
 * the island through `location.search` and are never part of a build.
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/pages/settlements.astro'), 'utf8');
const axe = readFileSync(resolve(ROOT, 'scripts/axe-smoke.mjs'), 'utf8');

describe('/settlements shell (plan B14b)', () => {
  it('mounts SettlementsIsland client-only', () => {
    expect(src).toMatch(/<SettlementsIsland\s+client:only="react"/);
  });

  it('has a static skeleton fallback and a no-JS message', () => {
    expect(src).toMatch(/slot="fallback"/);
    expect(src).toMatch(/<noscript>/);
  });

  it('wraps the island in a <main> landmark (axe landmark-one-main/region)', () => {
    expect(src).toMatch(/<main[^>]*>[\s\S]*<SettlementsIsland/);
  });

  it('is part of the axe smoke run', () => {
    expect(axe).toMatch(/'\/settlements'/);
  });
});
