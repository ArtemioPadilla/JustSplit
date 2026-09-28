import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * FeedbackFAB files issues against the repo named in src/lib/site-meta.ts
 * (plan B6: "single-sourced from site-meta.ts / PUBLIC_REPO_SLUG"). Before
 * this, FeedbackFAB.astro duplicated the same fallback literal
 * ('ArtemioPadilla/JustSplit') independently of SITE.repoSlug — correct by
 * coincidence, not by construction: the two could silently drift.
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/components/common/FeedbackFAB.astro'), 'utf8');

describe('FeedbackFAB.astro repo slug (plan B6)', () => {
  it('imports SITE from site-meta.ts and uses SITE.repoSlug, not a duplicated literal', () => {
    expect(src).toMatch(/import\s*\{[^}]*SITE[^}]*\}\s*from\s*['"][^'"]*site-meta['"]/);
    expect(src).toMatch(/SITE\.repoSlug/);
    expect(src).not.toMatch(/\?\?\s*['"]ArtemioPadilla\/JustSplit['"]/);
  });
});
