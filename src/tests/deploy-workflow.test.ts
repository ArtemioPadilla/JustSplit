import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Spec D2/D8: exactly one workflow deploys the production site (GitHub Pages
 * from `main`), the base path is a repository VARIABLE (never a secret), and
 * every third-party action is SHA-pinned. ci.yml and db-migrate.yml also run
 * on push to main by design; deploy-staging.yml (B2a) deploys from `inceptor`.
 */
const DIR = resolve(__dirname, '../../.github/workflows');
const workflows = readdirSync(DIR)
  .filter((f) => f.endsWith('.yml'))
  .map((f) => [f, readFileSync(resolve(DIR, f), 'utf8')] as const);

describe('deploy workflow (spec D2)', () => {
  const pages = workflows.filter(([, y]) => y.includes('actions/deploy-pages'));

  it('deploy.yml is the only workflow that deploys to GitHub Pages from main', () => {
    const fromMain = pages.filter(([, y]) => /on:\s*\n\s*push:\s*\n\s*branches:\s*\[main\]/.test(y));
    expect(fromMain.map(([f]) => f)).toEqual(['deploy.yml']);
  });

  it('the base path comes from a repository variable with the project-pages fallback', () => {
    const [, y] = pages.find(([f]) => f === 'deploy.yml')!;
    expect(y).toMatch(/ASTRO_BASE:\s*\$\{\{\s*vars\.ASTRO_BASE\s*\|\|\s*'\/JustSplit'\s*\}\}/);
    expect(y).not.toMatch(/secrets\.ASTRO_BASE/);
  });

  it('third-party actions are SHA-pinned', () => {
    for (const [f, y] of workflows) {
      // Only real step lines (`- uses:` at line start), not comment text that quotes `uses:`.
      const uses = [...y.matchAll(/^\s*-?\s*uses:\s+([^\s#]+)/gm)].map((m) => m[1]!);
      for (const ref of uses) {
        if (/^(actions|github)\//.test(ref) || ref.startsWith('./')) continue;
        expect(ref, `${f}: ${ref}`).toMatch(/@[0-9a-f]{40}$/);
      }
    }
  });
});
