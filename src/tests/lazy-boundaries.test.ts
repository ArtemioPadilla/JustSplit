import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Plan B19: weight that a page does not need to paint sits behind a lazy
 * boundary, so it is not in the page's statically loaded JS (the figure
 * `performance-budgets.json` gates). Each row is one such boundary: the module
 * is never imported statically by the file that needs it, only through
 * `import()` (usually `React.lazy`), and the behaviour behind it keeps its own
 * tests (a lazy dialog still opens, a lazy picker still picks).
 *
 * This is a source-text check like `user-menu-lazy-auth.test.ts`: the
 * build-output side is `scripts/check-budgets.mjs`.
 */
const SRC = resolve(__dirname, '..');

/** Non-type `import ... from '<spec>'` statements. */
function staticImports(source: string): string[] {
  return [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
}
const dynamicImports = (source: string): string[] => [...source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);

const LAZY: { file: string; module: string; why: string }[] = [
  {
    file: 'components/islands/QueryProvider.tsx',
    module: '@/components/features/settings/ResetLocalDataButton',
    why: 'only rendered when the persisted cache fails to restore; it drags the whole Base UI dialog stack into every app page',
  },
];

describe.each(LAZY)('$file', ({ file, module, why }) => {
  const source = readFileSync(resolve(SRC, file), 'utf8');
  it(`does not import ${module} statically (${why})`, () => {
    expect(staticImports(source)).not.toContain(module);
  });
  it(`loads ${module} through import()`, () => {
    expect(dynamicImports(source)).toContain(module);
  });
});
