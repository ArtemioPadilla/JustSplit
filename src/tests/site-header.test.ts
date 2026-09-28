import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * SiteHeader.astro (plan B6): mounts UserMenuIsland — a layout island, per
 * spec D3 and CLAUDE.md rule 3 ("never wrap the whole app in one
 * `client:load` island"). `client:idle` is Inceptor's own convention for
 * this exact kind of always-on-every-page, non-blocking header widget (see
 * `GlobalSearch` in `SiteHeader.astro` there); `client:load` and
 * `client:only` are both wrong here — `client:only` would mean no SSR HTML
 * at all for a component that's supposed to render server-side and just
 * hydrate (`HydrationCanary`'s target list explicitly names it as one of
 * "the SSR'd islands").
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/components/common/SiteHeader.astro'), 'utf8');

describe('SiteHeader.astro (plan B6)', () => {
  it('imports and mounts UserMenuIsland with client:idle (never client:load or client:only)', () => {
    expect(src).toMatch(/import\s+UserMenuIsland\s+from\s+['"][^'"]*UserMenuIsland['"]/);
    expect(src).toMatch(/<UserMenuIsland\s+client:idle/);
    expect(src).not.toMatch(/<UserMenuIsland\s+client:load/);
    expect(src).not.toMatch(/<UserMenuIsland\s+client:only/);
  });

  it('has a Home nav link', () => {
    expect(src).toMatch(/withBase\(['"]\/['"]\)/);
  });
});
