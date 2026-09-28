import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Spec D3 / ADR 0004: no `DataLayerService` orchestrator and no
 * `createDataLayer(` call exist anywhere in `src/` — the layering is
 * `island -> hook -> repo -> StorageAdapter`, nothing else. Because no
 * `createDataLayer` call exists, there is no `PermissionService` to
 * configure: the permissions-rls-doctrine.md §1.1 requirement
 * (`permissions: { enabled: false }`) is satisfied structurally, not by a
 * setting somewhere that could be flipped.
 */
const SRC = resolve(__dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|tsx|astro|mjs|js)$/.test(name) ? [path] : [];
  });
}

describe('no DataLayerService / createDataLayer( anywhere in src (spec D3, ADR 0004)', () => {
  // Excludes .test.ts(x) files: this file's own prose (and any other test's
  // comments describing the constraint) would otherwise flag itself.
  const files = walk(SRC).filter((f) => !/\.test\.tsx?$/.test(f));

  it('found files to scan (guards against a vacuous pass)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('never calls createDataLayer(', () => {
    const offenders = files.filter((f) => /createDataLayer\(/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });

  it('never references DataLayerService', () => {
    const offenders = files.filter((f) => /\bDataLayerService\b/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });
});
