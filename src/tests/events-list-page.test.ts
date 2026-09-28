import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `/events/list` shell (plan B11b, spec D2 pattern — same as `/groups/list`'s
 * `groups-list-page.test.ts`): a static skeleton in the island's
 * `slot="fallback"`, `<EventsListIsland client:only="react" />`.
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/pages/events/list.astro'), 'utf8');

describe('/events/list shell (plan B11b)', () => {
  it('mounts EventsListIsland client-only', () => {
    expect(src).toMatch(/<EventsListIsland\s+client:only="react"/);
  });

  it('has a static skeleton fallback and a no-JS message', () => {
    expect(src).toMatch(/slot="fallback"/);
    expect(src).toMatch(/<noscript>/);
  });

  it('wraps the island in a <main> landmark (axe landmark-one-main/region)', () => {
    expect(src).toMatch(/<main[^>]*>[\s\S]*<EventsListIsland/);
  });
});
