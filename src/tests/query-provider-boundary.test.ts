import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Plan B5a, spec D3: "exactly one `QueryProvider` per page — the route
 * island — ... layout islands (`UserMenuIsland`, `ToasterIsland`) read Nano
 * Stores only and never mount `QueryProvider`." A source-text test asserts
 * `QueryProvider` is imported only by route islands and never by a
 * `src/components/common/*` Astro component or a known layout island.
 *
 * No route island exists yet (Track B's feature islands land in Phase 2), so
 * this test is currently vacuous on the "importers exist" side — its job is
 * to fail the moment a future PR gets the layering wrong, and the "guards
 * against a vacuous pass" case below proves the scanner itself works.
 */
const ROOT = resolve(__dirname, '..', '..');
const SRC = resolve(ROOT, 'src');
const COMMON_DIR = resolve(SRC, 'components', 'common') + sep;

/** Layout islands that read Nano Stores only (spec D3) — never allowed to import QueryProvider. */
const KNOWN_LAYOUT_ISLANDS = ['UserMenuIsland.tsx', 'ToasterIsland.tsx'];

const QUERY_PROVIDER_IMPORT_RE = /from\s+['"][^'"]*QueryProvider['"]/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|tsx|astro)$/.test(name) ? [path] : [];
  });
}

/** Every source file (outside the QueryProvider module itself and tests) that imports it. */
function queryProviderImporters(): string[] {
  return walk(SRC).filter((file) => {
    if (file.endsWith(`${sep}QueryProvider.tsx`) || /\.test\.tsx?$/.test(file)) return false;
    return QUERY_PROVIDER_IMPORT_RE.test(readFileSync(file, 'utf8'));
  });
}

describe('QueryProvider import boundary (plan B5a, spec D3)', () => {
  it('the scanner recognizes a QueryProvider import (guards against a vacuous pass)', () => {
    expect(QUERY_PROVIDER_IMPORT_RE.test("import QueryProvider from '@/components/islands/QueryProvider';")).toBe(true);
    expect(QUERY_PROVIDER_IMPORT_RE.test("import QueryProvider from './QueryProvider';")).toBe(true);
    expect(QUERY_PROVIDER_IMPORT_RE.test("import { Something } from '@/components/islands/Other';")).toBe(false);
  });

  it('no src/components/common/* Astro component imports QueryProvider', () => {
    const offenders = queryProviderImporters().filter((f) => f.startsWith(COMMON_DIR));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it('no known layout island (UserMenuIsland, ToasterIsland — spec D3) imports QueryProvider', () => {
    const offenders = queryProviderImporters().filter((f) => KNOWN_LAYOUT_ISLANDS.some((name) => f.endsWith(`${sep}${name}`)));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });
});
