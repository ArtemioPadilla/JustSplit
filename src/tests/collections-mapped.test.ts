import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { schemaMap } from '@/lib/data/schema-map';

/**
 * Plan B5a: every string literal passed as a `StorageAdapter` `collection`
 * argument in `src/lib/data/repos/*`, and every `BatchOperation.collection`
 * literal anywhere in `src`, must be a `schemaMap` key — the relational
 * adapter (and the memory adapter) throw on anything else instead of
 * falling back to document mode (spec D1/D10).
 *
 * `profiles.ts` is excluded: `profiles` is not a SchemaMap collection (spec
 * D10) — it goes through `SupabaseProfileStore`/`rpc`, never
 * `adapter.<method>('profiles', ...)`.
 */
const REPOS_DIR = resolve(__dirname, '../lib/data/repos');
const SRC = resolve(__dirname, '..');
// Test infrastructure deliberately exercises an unmapped collection to prove
// the "throws" behavior (relational-adapter.test.ts, memory-adapter.test.ts,
// storage-adapter-contract.shared.ts); this scan is about PRODUCTION code
// only, so `src/tests/**` (fixtures/helpers, not app code — same exemption
// data-boundary.test.ts uses) is out of scope here.
const TESTS_DIR = resolve(__dirname);

const ADAPTER_METHOD_RE = /adapter\.(?:getDocument|setDocument|updateDocument|deleteDocument|query|subscribeToQuery)(?:<[^>]*>)?\(\s*'([a-z_]+)'/g;
const BATCH_COLLECTION_RE = /collection:\s*'([a-z_]+)'/g;

function collectionLiteralsIn(src: string): string[] {
  const literals: string[] = [];
  for (const m of src.matchAll(ADAPTER_METHOD_RE)) literals.push(m[1]!);
  for (const m of src.matchAll(BATCH_COLLECTION_RE)) literals.push(m[1]!);
  return literals;
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('collections used by src/lib/data/repos/* are all SchemaMap keys (plan B5a)', () => {
  const repoFiles = readdirSync(REPOS_DIR).filter((f) => /\.ts$/.test(f) && !f.endsWith('.test.ts') && f !== 'profiles.ts');

  it('found repo files to scan (guards against a vacuous pass)', () => {
    expect(repoFiles.length).toBeGreaterThan(0);
  });

  it.each(repoFiles)('%s: every collection literal is a schemaMap key', (file) => {
    const src = readFileSync(resolve(REPOS_DIR, file), 'utf8');
    const literals = collectionLiteralsIn(src);
    expect(literals.length, `${file} has no collection literal — did it use a variable instead of a literal string?`).toBeGreaterThan(0);
    for (const literal of literals) {
      expect(Object.keys(schemaMap), `${file}: "${literal}"`).toContain(literal);
    }
  });

  it('profiles.ts never spells a StorageAdapter collection literal (profiles is not a SchemaMap collection, D10)', () => {
    const src = readFileSync(resolve(REPOS_DIR, 'profiles.ts'), 'utf8');
    expect(collectionLiteralsIn(src)).toEqual([]);
  });

  it('every BatchOperation.collection literal anywhere in production src is a schemaMap key', () => {
    for (const file of walk(SRC)) {
      if (file.endsWith('.test.ts') || file.endsWith('.test.tsx') || file.startsWith(TESTS_DIR)) continue;
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(BATCH_COLLECTION_RE)) {
        expect(Object.keys(schemaMap), `${file}: "${m[1]}"`).toContain(m[1]!);
      }
    }
  });
});
