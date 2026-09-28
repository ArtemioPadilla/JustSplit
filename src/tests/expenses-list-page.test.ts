import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `/expenses/list` shell (plan B9, spec D2 pattern — same as `/`'s
 * dashboard-page.test.ts): a static skeleton in the island's
 * `slot="fallback"`, `<ExpenseListIsland client:only="react" />`.
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/pages/expenses/list.astro'), 'utf8');

describe('/expenses/list shell (plan B9)', () => {
  it('mounts ExpenseListIsland client-only', () => {
    expect(src).toMatch(/<ExpenseListIsland\s+client:only="react"/);
  });

  it('has a static skeleton fallback and a no-JS message', () => {
    expect(src).toMatch(/slot="fallback"/);
    expect(src).toMatch(/<noscript>/);
  });

  it('wraps the island in a <main> landmark (axe landmark-one-main/region)', () => {
    expect(src).toMatch(/<main[^>]*>[\s\S]*<ExpenseListIsland/);
  });
});
