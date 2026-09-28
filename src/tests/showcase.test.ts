import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * CLAUDE.md quality bar: "New UI components must appear in the /showcase
 * page." UserMenuIsland (plan B6) is the first Track B island to ship —
 * this asserts it gets a live section, not just a name in the placeholder
 * list the scaffold left behind.
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/pages/showcase.astro'), 'utf8');

describe('/showcase (plan B6)', () => {
  it('mounts UserMenuIsland live', () => {
    expect(src).toMatch(/import\s+UserMenuIsland\s+from\s+['"][^'"]*UserMenuIsland['"]/);
    expect(src).toMatch(/<UserMenuIsland\s+client:idle/);
  });
});
