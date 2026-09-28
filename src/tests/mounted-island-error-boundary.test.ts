import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Plan B6: "every route island wraps its inner component in
 * `<ErrorBoundary name="<Island>">` inside the island file" (the Inceptor
 * pattern — see `LoginForm.tsx`). This is a source-text regression guard,
 * not a one-off list: it finds every island actually mounted with a
 * `client:*` directive from an Astro file (pages, layouts, and
 * `components/common/*`, which is how layout islands like UserMenuIsland
 * reach every page) and asserts each one's own module wraps its rendered
 * output in `<ErrorBoundary`.
 *
 * Exclusions (both are DELIBERATE, not gaps in the scanner):
 *   - `HydrationCanary`: renders `null` — a pure side-effect/monitoring
 *     island with no UI to protect, and it IS the hydration-mismatch
 *     detector FeedbackFAB reports through; wrapping the detector in the
 *     boundary it's meant to help diagnose is circular, and plan B6 already
 *     calls it out as the one island that "stays in BaseLayout only" rather
 *     than following the rest of this rule.
 *   - Providers/helpers such as `AuthIsland`, `AuthGate`, `AuthBridge`,
 *     `QueryProvider` need NO manual exclusion here: they are composed
 *     INSIDE a route island's own JSX tree (`ErrorBoundary > AuthIsland >
 *     AuthGate > Content`, per `AuthIsland.tsx`'s doc comment), never
 *     referenced with a `client:*` directive from an `.astro` file
 *     directly, so this scanner — which only looks at `.astro` mount sites
 *     — never encounters them as a "mounted island" in the first place.
 */
const ROOT = resolve(__dirname, '..', '..');
const SRC = resolve(ROOT, 'src');
const ISLANDS_DIR = resolve(SRC, 'components', 'islands');
const SCAN_DIRS = [resolve(SRC, 'pages'), resolve(SRC, 'layouts'), resolve(SRC, 'components', 'common')];

const EXCLUDED_ISLANDS = new Set(['HydrationCanary']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return name.endsWith('.astro') ? [path] : [];
  });
}

interface Mount {
  astroFile: string;
  componentName: string;
  islandFile: string | null;
}

/** Every `<Name client:...` mount in an .astro file, resolved to its imported module path. */
function mountsIn(astroFile: string): Mount[] {
  const src = readFileSync(astroFile, 'utf8');
  // Astro files split on '---' as [ '', frontmatter, template... ] — index 1
  // is the actual frontmatter (index 0 is whatever precedes the opening
  // fence, normally empty).
  const frontmatter = src.split(/^---$/m)[1] ?? '';

  const mounts: Mount[] = [];
  // Non-greedy up to the first `client:*` — tolerates any number of other
  // props (e.g. LoginForm's `forgotPasswordHref={...} signUpHref={...}`)
  // between the tag name and the client directive.
  const mountRe = /<([A-Z][A-Za-z0-9_]*)\b[^>]*?\bclient:(?:idle|load|visible|only|media)\b/g;
  let m: RegExpExecArray | null;
  while ((m = mountRe.exec(src)) !== null) {
    const name = m[1]!;
    const importRe = new RegExp(`import\\s+${name}\\s+from\\s+['"]([^'"]+)['"]`);
    const importMatch = frontmatter.match(importRe);
    let islandFile: string | null = null;
    if (importMatch) {
      const spec = importMatch[1]!;
      const base = spec.startsWith('.')
        ? resolve(dirname(astroFile), spec)
        : resolve(SRC, spec.replace(/^@\//, ''));
      islandFile = `${base}.tsx`;
    }
    mounts.push({ astroFile, componentName: name, islandFile });
  }
  return mounts;
}

const astroFiles = SCAN_DIRS.flatMap((d) => walk(d));
const allMounts = astroFiles.flatMap(mountsIn);

describe('every mounted island wraps ErrorBoundary (plan B6)', () => {
  it('the scanner finds at least one real client:* mount (guards against a vacuous pass)', () => {
    expect(allMounts.length).toBeGreaterThan(0);
  });

  it.each(allMounts.filter((mnt) => !EXCLUDED_ISLANDS.has(mnt.componentName)))(
    '$componentName (mounted from $astroFile) wraps <ErrorBoundary',
    ({ componentName, islandFile }) => {
      expect(islandFile, `could not resolve an import for <${componentName} client:...>`).not.toBeNull();
      expect(islandFile, `resolved path is not under src/components/islands/: ${islandFile}`).toMatch(
        new RegExp(`^${ISLANDS_DIR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      );
      const source = readFileSync(islandFile!, 'utf8');
      expect(source, `${islandFile} does not import ErrorBoundary`).toMatch(
        /import\s+ErrorBoundary\s+from\s+['"][^'"]*ErrorBoundary['"]/,
      );
      expect(source, `${islandFile} does not render <ErrorBoundary`).toMatch(/<ErrorBoundary\b/);
    },
  );
});
