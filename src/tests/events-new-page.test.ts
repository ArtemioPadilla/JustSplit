import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `/events/new` shell (plan B11b, spec D2 pattern — same as `/groups/new`'s
 * `groups-new-page.test.ts`): a static skeleton in the island's
 * `slot="fallback"`, `<EventFormIsland client:only="react" />`.
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/pages/events/new.astro'), 'utf8');

describe('/events/new shell (plan B11b)', () => {
  it('mounts EventFormIsland client-only', () => {
    expect(src).toMatch(/<EventFormIsland\s+client:only="react"/);
  });

  it('has a static skeleton fallback and a no-JS message', () => {
    expect(src).toMatch(/slot="fallback"/);
    expect(src).toMatch(/<noscript>/);
  });

  it('wraps the island in a <main> landmark (axe landmark-one-main/region)', () => {
    expect(src).toMatch(/<main[^>]*>[\s\S]*<EventFormIsland/);
  });
});
