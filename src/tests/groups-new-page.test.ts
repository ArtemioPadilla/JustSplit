import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `/groups/new` shell (plan B12, spec D2 pattern — same as `/expenses/new`'s
 * `expenses-new-page.test.ts`): a static skeleton in the island's
 * `slot="fallback"`, `<GroupFormIsland client:only="react" />`.
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/pages/groups/new.astro'), 'utf8');

describe('/groups/new shell (plan B12)', () => {
  it('mounts GroupFormIsland client-only', () => {
    expect(src).toMatch(/<GroupFormIsland\s+client:only="react"/);
  });

  it('has a static skeleton fallback and a no-JS message', () => {
    expect(src).toMatch(/slot="fallback"/);
    expect(src).toMatch(/<noscript>/);
  });

  it('wraps the island in a <main> landmark (axe landmark-one-main/region)', () => {
    expect(src).toMatch(/<main[^>]*>[\s\S]*<GroupFormIsland/);
  });
});
