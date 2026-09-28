import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `/profile` shell (plan B15, spec D2 pattern — same shape as
 * `groups-new-page.test.ts`/`expenses-new-page.test.ts`): a static skeleton
 * in the island's `slot="fallback"`, `<ProfileIsland client:only="react" />`.
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/pages/profile.astro'), 'utf8');

describe('/profile shell (plan B15)', () => {
  it('mounts ProfileIsland client-only', () => {
    expect(src).toMatch(/<ProfileIsland\s+client:only="react"/);
  });

  it('has a static skeleton fallback and a no-JS message', () => {
    expect(src).toMatch(/slot="fallback"/);
    expect(src).toMatch(/<noscript>/);
  });

  it('wraps the island in a <main> landmark (axe landmark-one-main/region)', () => {
    expect(src).toMatch(/<main[^>]*>[\s\S]*<ProfileIsland/);
  });
});
