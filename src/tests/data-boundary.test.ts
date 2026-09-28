import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * CLAUDE.md rule 7 / plan B2a: only `src/lib/data/` may import the Supabase
 * SDK or the CyberEco Supabase adapters; islands and stores go through
 * `src/lib/data/repos/*`. And rule 9: the upstream `SupabaseStorageAdapter`
 * is never constructed without a `schemaMap` (document mode writes
 * `public.documents`, whose RLS is owner-only).
 */
const ROOT = resolve(__dirname, '../..');
const SRC = resolve(ROOT, 'src');
const DATA = resolve(SRC, 'lib', 'data') + sep;
const RESTRICTED = ['@supabase/supabase-js', '@cyber-eco/supabase'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|tsx|astro|mjs|js)$/.test(name) ? [path] : [];
  });
}

const importRe = /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
const files = walk(SRC).filter((f) => !/\.test\.tsx?$/.test(f));

describe('data-layer import boundary (CLAUDE.md rule 7)', () => {
  it('only src/lib/data/ imports the Supabase SDK or @cyber-eco/supabase', () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.startsWith(DATA)) continue;
      for (const m of readFileSync(file, 'utf8').matchAll(importRe)) {
        const spec = m[1]!;
        if (RESTRICTED.some((r) => spec === r || spec.startsWith(`${r}/`))) {
          offenders.push(`${relative(ROOT, file)} → ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the scan sees the data layer itself (guards against a vacuous pass)', () => {
    const client = readFileSync(resolve(DATA, 'client.ts'), 'utf8');
    expect([...client.matchAll(importRe)].map((m) => m[1])).toContain('@supabase/supabase-js');
  });
});

/** Argument text of every `new SupabaseStorageAdapter(…)` call in `src`. */
export function storageAdapterCalls(src: string): string[] {
  const calls: string[] = [];
  for (const m of src.matchAll(/new\s+SupabaseStorageAdapter\s*(?:<[^>]*>)?\s*\(/g)) {
    let depth = 1;
    let i = m.index! + m[0].length;
    const start = i;
    while (i < src.length && depth > 0) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') depth--;
      i++;
    }
    calls.push(src.slice(start, i - 1));
  }
  return calls;
}

describe('storage adapter construction (CLAUDE.md rule 9)', () => {
  const dataFiles = files.filter((f) => f.startsWith(DATA));

  it('the scanner extracts nested argument lists', () => {
    const src = `a = new SupabaseStorageAdapter(() => client, { table: 'documents' });
      b = new SupabaseStorageAdapter(() => getClient(), { schemaMap: build({ x: 1 }) });`;
    expect(storageAdapterCalls(src)).toEqual([
      "() => client, { table: 'documents' }",
      '() => getClient(), { schemaMap: build({ x: 1 }) }',
    ]);
  });

  it('never constructs the upstream SupabaseStorageAdapter without a schemaMap', () => {
    for (const file of dataFiles) {
      for (const args of storageAdapterCalls(readFileSync(file, 'utf8'))) {
        expect(args, `${relative(ROOT, file)}: document-mode SupabaseStorageAdapter`).toMatch(/\bschemaMap\b/);
      }
    }
  });

  it('adapter.ts is the only file that imports @cyber-eco/supabase', () => {
    const importers = dataFiles.filter((f) => /['"]@cyber-eco\/supabase['"]/.test(readFileSync(f, 'utf8')));
    expect(importers.map((f) => relative(ROOT, f))).toEqual([`src${sep}lib${sep}data${sep}adapter.ts`]);
  });
});
