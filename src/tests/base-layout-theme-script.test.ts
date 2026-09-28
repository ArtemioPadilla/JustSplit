import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * "Theme persists across reloads without flash" (plan B6 acceptance) has two
 * halves: the dynamic "persists" half is src/stores/theme.test.ts; this file
 * is the "without flash" half. A browser test that actually screenshots the
 * first paint isn't practical in this Vitest + jsdom setup (jsdom has no
 * rendering/paint pipeline at all, so there's nothing to screenshot or time)
 * — this is a source-level assertion on the mechanism that prevents the
 * flash instead: BaseLayout's zero-flash script must be
 *   1. the first thing in <head> (before any stylesheet or other markup
 *      that could paint), and
 *   2. `is:inline` (Astro must emit it verbatim and un-deferred; a bundled
 *      `<script>` would load and execute after the initial paint, which is
 *      the exact flash this exists to prevent), and
 *   3. synchronous — it must set the `.dark` class before returning, not in
 *      a callback/promise/rAF, or the browser can still paint in between.
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/layouts/BaseLayout.astro'), 'utf8');

describe('BaseLayout zero-flash theme script (plan B6)', () => {
  it('is the first element in <head>, before any stylesheet', () => {
    const headOpen = src.indexOf('<head>');
    const scriptTag = src.indexOf('<script is:inline>', headOpen);
    const firstStylesheet = src.indexOf('<link rel="stylesheet"', headOpen);
    expect(headOpen).toBeGreaterThanOrEqual(0);
    expect(scriptTag).toBeGreaterThan(headOpen);
    // -1 (no stylesheet at all) would also satisfy "before", but this repo
    // does load a font stylesheet — assert the real ordering, not a vacuous one.
    expect(firstStylesheet).toBeGreaterThan(0);
    expect(scriptTag).toBeLessThan(firstStylesheet);
  });

  it('is is:inline (never bundled/deferred) and reads localStorage synchronously', () => {
    const scriptMatch = src.match(/<script is:inline>([\s\S]*?)<\/script>/);
    expect(scriptMatch, 'no <script is:inline> found in BaseLayout.astro').not.toBeNull();
    const body = scriptMatch![1]!;
    expect(body).toMatch(/localStorage\.getItem\(['"]theme['"]\)/);
    expect(body).toMatch(/matchMedia\(['"]\(prefers-color-scheme:\s*dark\)['"]\)/);
    expect(body).toMatch(/classList\.add\(['"]dark['"]\)/);
    // No async indirection between reading the preference and applying the
    // class — a Promise/rAF/setTimeout here would reopen the flash window.
    expect(body).not.toMatch(/requestAnimationFrame|setTimeout|\.then\(/);
  });
});
