import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * B19b: `motion` sat in `dependencies` although nothing in `src/` imports it
 * (B19 measured 0 bytes and noted it could be dropped). An unused runtime
 * dependency is install weight, audit surface and a false claim about the
 * stack. The rule is symmetrical, so it also catches the opposite slip: import
 * `motion/react` without declaring it and this fails until it is added back.
 *
 * `tailwindcss-motion` (the CSS-only utilities plugin) is a different package
 * and stays.
 */
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8')) as {
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const sources = import.meta.glob('../**/*.{ts,tsx,astro}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** Import specifiers only (not comments or prose), test files excluded: a test may name a module it bans. */
const importsMotion = Object.entries(sources)
  .filter(([path]) => !/\.test\.[tj]sx?$/.test(path))
  .filter(([, text]) => /(from|import)\s*\(?\s*['"]motion(\/[\w-]+)?['"]/.test(text))
  .map(([path]) => path);

describe('the motion dependency (B19b)', () => {
  it('is declared if and only if something in src/ imports it', () => {
    const declared = 'motion' in pkg.dependencies || 'motion' in (pkg.devDependencies ?? {});
    expect(declared, `imported by: ${importsMotion.join(', ') || 'nothing'}`).toBe(importsMotion.length > 0);
  });

  it('keeps tailwindcss-motion, the CSS plugin the styles use', () => {
    expect(pkg.dependencies['tailwindcss-motion']).toBeDefined();
  });
});
