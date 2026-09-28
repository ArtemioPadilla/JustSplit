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
