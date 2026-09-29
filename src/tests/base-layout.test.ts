import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * BaseLayout.astro re-brand (plan B6): title/description default to
 * src/lib/site-meta.ts (not the Inceptor scaffold's generic strings), a
 * `WebApplication` JSON-LD block is emitted through the existing
 * `src/lib/json-ld.ts` `jsonLd()` escaper (its own doc comment flags
 * BaseLayout as the file that still needs to adopt it), and HydrationCanary
 * is mounted here (and only here — CLAUDE.md "Island lifecycle discipline"
 * exemplar) with client:idle.
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/layouts/BaseLayout.astro'), 'utf8');

describe('BaseLayout.astro re-brand (plan B6)', () => {
  it('defaults title/description from src/lib/site-meta.ts', () => {
    expect(src).toMatch(/import\s*\{[^}]*SITE[^}]*\}\s*from\s*['"][^'"]*site-meta['"]/);
    expect(src).toMatch(/title\s*=\s*SITE\.name/);
    expect(src).toMatch(/description\s*=\s*SITE\.description/);
  });

  it('emits a WebApplication JSON-LD block through the jsonLd() escaper', () => {
    expect(src).toMatch(/import\s*\{[^}]*jsonLd[^}]*\}\s*from\s*['"][^'"]*json-ld['"]/);
    expect(src).toMatch(/application\/ld\+json/);
    expect(src).toMatch(/WebApplication/);
  });

  it('mounts HydrationCanary with client:idle', () => {
    expect(src).toMatch(/import\s+HydrationCanary\s+from\s+['"][^'"]*HydrationCanary['"]/);
    expect(src).toMatch(/<HydrationCanary\s+client:idle/);
  });
});

/**
 * Plan B7 / B19 "Header weight": marketing pages (/landing, /about, /help,
 * spec D3) get a `marketing` prop that (a) tells SiteHeader to render its
 * `static` (unhydrated) header and (b) skips HydrationCanary — with zero
 * React islands on the page there is no hydration to mismatch, so the
 * detector has nothing to detect; mounting it anyway would drag in the
 * ~66 kB gz @astrojs/react client runtime for no benefit, blowing the
 * 40 kB layout-JS budget on its own.
 */
describe('BaseLayout.astro marketing prop (plan B7)', () => {
  it('declares a `marketing` prop', () => {
    expect(src).toMatch(/marketing\s*\??:\s*boolean/);
  });

  it('passes `static` through to SiteHeader when marketing is set', () => {
    expect(src).toMatch(/<SiteHeader[^>]*static[^>]*\/?>/);
  });

  it('the HydrationCanary mount is conditional on `marketing`, not unconditional', () => {
    const mountLine = src.split('\n').find((l) => l.includes('<HydrationCanary') && l.includes('client:idle'));
    expect(mountLine, 'expected an <HydrationCanary client:idle mount').toBeTruthy();
    const idx = src.indexOf(mountLine!);
    const before = src.slice(Math.max(0, idx - 200), idx);
    expect(before).toMatch(/marketing/);
  });
});

/**
 * Plan B17b, ADR 0008: the single layout-level Toaster. Same
 * marketing-conditional shape as HydrationCanary above — marketing pages
 * mount no route island and fire no toasts (spec D3), and
 * check-auth-bundle.mjs fails the build if a marketing page ships ANY
 * `<astro-island>` at all.
 */
describe('BaseLayout.astro ToasterIsland mount (plan B17b)', () => {
  it('mounts ToasterIsland with client:idle', () => {
    expect(src).toMatch(/import\s+ToasterIsland\s+from\s+['"][^'"]*ToasterIsland['"]/);
    expect(src).toMatch(/<ToasterIsland\s+client:idle/);
  });

  it('the ToasterIsland mount is conditional on `marketing`, not unconditional', () => {
    const mountLine = src.split('\n').find((l) => l.includes('<ToasterIsland') && l.includes('client:idle'));
    expect(mountLine, 'expected a <ToasterIsland client:idle mount').toBeTruthy();
    const idx = src.indexOf(mountLine!);
    const before = src.slice(Math.max(0, idx - 400), idx);
    expect(before).toMatch(/marketing/);
  });
});

/**
 * Plan B6b: signed-in app navigation + skip link. `appNav` is opt-in per page
 * (app pages pass it; marketing, auth and showcase never do), and every page
 * gets a skip-to-content link as the first focusable element.
 */
describe('BaseLayout.astro app nav and skip link (plan B6b)', () => {
  it('declares an `appNav` prop and hands it to SiteHeader', () => {
    expect(src).toMatch(/appNav\s*\??:\s*boolean/);
    expect(src).toMatch(/<SiteHeader[^>]*appNav=\{[^}]*appNav[^}]*\}/);
  });

  it('never shows the app nav on a marketing page, even if a page passes both', () => {
    expect(src).toMatch(/appNav=\{\s*!\s*marketing\s*&&\s*appNav\s*\}|appNav=\{\s*appNav\s*&&\s*!\s*marketing\s*\}/);
  });

  it('starts <body> with a skip link to #main-content, before the header', () => {
    const skip = src.indexOf('href="#main-content"');
    expect(skip, 'expected a skip link').toBeGreaterThan(-1);
    expect(skip).toBeLessThan(src.indexOf('<SiteHeader'));
    expect(src).toMatch(/Skip to main content/);
  });

  it('keeps the skip link visually hidden until focused, then visible', () => {
    const line = src.split('\n').find((l) => l.includes('href="#main-content"')) ?? '';
    expect(line).toMatch(/sr-only/);
    expect(line).toMatch(/focus:not-sr-only/);
  });
});
