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

  it('links Home, About and Help in the header of non-app pages (plan B7)', () => {
    expect(src).toMatch(/href:\s*['"]\/['"]/);
    expect(src).toMatch(/href:\s*['"]\/about['"]/);
    expect(src).toMatch(/href:\s*['"]\/help['"]/);
  });

  it('no longer carries the "dead links until Phase 2" comment: the pages exist (plan B6b)', () => {
    expect(src).not.toMatch(/dead links/i);
    expect(src).not.toMatch(/until Phase 2/i);
  });
});

/**
 * Plan B6b: signed-in app navigation. Server-rendered plain links on app pages
 * (option (a)): the site is static, so SSR cannot know the session, but the
 * links are harmless to a signed-out visitor because AuthGate redirects every
 * app page to /landing. No island, no JS, no SSR/CSR branch to mismatch.
 */
describe('SiteHeader.astro app navigation (plan B6b)', () => {
  it('takes an `appNav` prop, and never combines it with the static marketing header', () => {
    expect(src).toMatch(/appNav\s*\??:\s*boolean/);
    expect(src).toMatch(/appNav\s*&&\s*!\s*staticHeader|!\s*staticHeader\s*&&\s*appNav/);
  });

  it('renders the six sections from APP_NAV through withBase, in one Main landmark', () => {
    expect(src).toMatch(/import\s*\{[^}]*APP_NAV[^}]*\}\s*from\s*['"]@\/lib\/app-nav['"]/);
    expect(src).toMatch(/<nav\b[^>]*aria-label="Main"/);
    expect(src).toMatch(/withBase\(\s*(n|item|link)\.href\s*\)/);
  });

  it('marks the active section with aria-current="page", computed at build time from Astro.url.pathname', () => {
    expect(src).toMatch(/activeNavItem\(\s*Astro\.url\.pathname/);
    expect(src).toMatch(/aria-current=\{[^}]*"page"|aria-current=\{[^}]*'page'/);
  });

  it('emits each link\'s section for the client-side marker of dynamic routes', () => {
    expect(src).toMatch(/data-section=\{/);
  });

  it('keeps the app nav plain HTML: the only client code is the one inline script, and it is not an island', () => {
    expect(src).toMatch(/<script is:inline data-app-nav-script>/);
    // Exactly one hydrated component in the header, and it is UserMenuIsland.
    const hydrated = src.match(/<[A-Z][A-Za-z]*\b[^>]*\sclient:\w+/g) ?? [];
    expect(hydrated).toHaveLength(1);
    expect(hydrated[0]).toMatch(/UserMenuIsland/);
  });

  it('has 44px tap targets on phones and a visible, unclipped focus ring', () => {
    expect(src).toMatch(/min-h-11/);
    // ring-inset: the row scrolls (overflow-x-auto), which would clip an outer ring.
    expect(src).toMatch(/focus-visible:ring-2/);
    expect(src).toMatch(/focus-visible:ring-inset/);
  });

  it('scrolls horizontally on a phone instead of overflowing the page', () => {
    expect(src).toMatch(/overflow-x-auto/);
  });

  it('makes the phone row as wide as the viewport: -mx-5 needs an explicit width, not basis-full', () => {
    // Live check at 375px: `basis-full` + `-mx-5` left the row 335px wide (the padded container),
    // so the last link sat under the right edge and focusing it did not bring it into view.
    expect(src).toMatch(/-mx-5/);
    expect(src).toMatch(/w-\[calc\(100%\+2\.5rem\)\]/);
    expect(src).not.toMatch(/basis-full/);
    expect(src).toMatch(/md:w-auto/);
  });

  it('leaves a gutter when focus scrolls a link into the row (scroll padding matches the row padding)', () => {
    expect(src).toMatch(/scroll-px-5/);
    expect(src).toMatch(/md:scroll-px-0/);
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
