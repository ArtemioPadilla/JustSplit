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

  it('links About and Help in the nav (plan B7)', () => {
    expect(src).toMatch(/withBase\(['"]\/about['"]\)/);
    expect(src).toMatch(/withBase\(['"]\/help['"]\)/);
  });
});

/**
 * Plan B7 / B19 "Header weight": marketing pages (/landing, /about, /help,
 * spec D3) must ship zero React — the shared @astrojs/react client runtime
 * alone is ~66 kB gz (measured in this issue), which already blows the
 * 40 kB layout-JS budget before counting UserMenuIsland's own chunk. Since
 * no route island ever runs on those pages, $user can never leave its
 * initial `null` there anyway (nothing calls AuthBridge), so hydrating
 * UserMenuIsland to react to a change that can't happen is dead weight —
 * SiteHeader accepts a `static` prop that renders the exact same sign-in
 * link markup without mounting the island at all.
 */
describe('SiteHeader.astro static prop (plan B7)', () => {
  it('declares a `static` prop', () => {
    expect(src).toMatch(/static\s*\??:\s*boolean/);
  });

  it('the UserMenuIsland mount is conditional on `static`, not unconditional', () => {
    // Grab the line(s) around the mount and confirm it's inside a
    // conditional block referencing the `static` prop, not rendered bare.
    const mountLine = src.split('\n').find((l) => l.includes('<UserMenuIsland') && l.includes('client:idle'));
    expect(mountLine, 'expected an <UserMenuIsland client:idle mount').toBeTruthy();
    const idx = src.indexOf(mountLine!);
    const before = src.slice(Math.max(0, idx - 200), idx);
    expect(before).toMatch(/static/);
  });

  it('the static branch renders a plain sign-in link via withBase, no island', () => {
    expect(src).toMatch(/withBase\(['"]\/auth\/signin\/['"]\)/);
  });
});
