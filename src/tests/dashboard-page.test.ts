import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `/` dashboard shell (plan B8b, spec D2 pattern): a static skeleton in the
 * island's `slot="fallback"`, `<DashboardIsland client:only="react" />`, no
 * landing/marketing copy (that lives only in `landing.astro`, plan B7).
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/pages/index.astro'), 'utf8');

describe('/ dashboard shell (plan B8b)', () => {
  it('mounts DashboardIsland client-only, inside an ErrorBoundary-aware island', () => {
    expect(src).toMatch(/<DashboardIsland\s+client:only="react"/);
  });

  it('has a static skeleton fallback and a no-JS message', () => {
    expect(src).toMatch(/slot="fallback"/);
    expect(src).toMatch(/<noscript>/);
  });

  it('wraps the island in a <main> landmark (axe landmark-one-main/region)', () => {
    expect(src).toMatch(/<main[^>]*>[\s\S]*<DashboardIsland/);
  });

  it('renders no landing/marketing copy — that lives only in landing.astro', () => {
    expect(src).not.toMatch(/Fair expense splitting/);
    expect(src).not.toMatch(/JustSplit<\/h1>/);
  });
});
