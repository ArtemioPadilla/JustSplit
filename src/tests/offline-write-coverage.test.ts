import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

/**
 * Plan B19c (risk:high, ADR 0015): "writes require a connection" only holds if NO write
 * path is missed, now or when someone adds one. This is the tripwire, in two halves
 * (both source scans, so a new write that forgets the rule fails here, not in review):
 *
 *  1. DATA LAYER: every function that performs a write primitive (an adapter write, a
 *     storage upload/remove, a profile or credential write) starts by calling
 *     `assertOnline()`, so it throws `OfflineWriteError` before any network call.
 *  2. UI: every component that uses a write hook, or calls a write function of the
 *     stores/storage, reads the connection through `useCanWrite()` (or is handed the
 *     page's `WriteState`), so its control can be blocked and explained.
 *
 * Deliberately NOT writes, and therefore not scanned: sign in/up/out, the password-reset
 * email and resetting local data (leaving or signing in must never depend on this rule),
 * and every read.
 */
const SRC = join(process.cwd(), 'src');

function walk(dir: string, keep: (path: string) => boolean, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, keep, out);
    else if (keep(path)) out.push(path);
  }
  return out;
}

const isSource = (path: string) => /\.(ts|tsx)$/.test(path) && !/\.test\.(ts|tsx)$/.test(path) && !path.includes('/tests/');

/** Calls that change something on the server. `.update(` / `.remove(` are only meaningful in the files scanned below. */
const WRITE_PRIMITIVE =
  /\.(setDocument|updateDocument|deleteDocument|batchWrite|upload|remove|update|updatePassword|updateDisplayProfile)\(/;

function functionBodies(file: string): Array<{ name: string; body: string }> {
  const text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found: Array<{ name: string; body: string }> = [];
  source.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.body && node.name) {
      found.push({ name: node.name.text, body: node.body.getText(source) });
    }
  });
  return found;
}

const DATA_LAYER_FILES = [
  ...walk(join(SRC, 'lib/data/repos'), isSource),
  join(SRC, 'lib/data/storage.ts'),
  join(SRC, 'stores/auth.ts'),
];

describe('offline write coverage: data layer', () => {
  it('finds the write functions it is meant to guard (the scan itself works)', () => {
    const writers = DATA_LAYER_FILES.flatMap((file) => functionBodies(file).filter((fn) => WRITE_PRIMITIVE.test(fn.body)).map((fn) => fn.name));
    for (const expected of ['create', 'update', 'remove', 'uploadReceipt', 'uploadAvatar', 'removeReceipts', 'updateProfile', 'updatePassword']) {
      expect(writers, expected).toContain(expected);
    }
  });

  it.each(DATA_LAYER_FILES.map((file) => [relative(SRC, file), file] as const))(
    '%s: every function that writes calls assertOnline() first',
    (_name, file) => {
      const offenders = functionBodies(file)
        .filter((fn) => WRITE_PRIMITIVE.test(fn.body))
        .filter((fn) => !/^\{\s*(\/\/[^\n]*\n\s*)*assertOnline\(\);/.test(fn.body))
        .map((fn) => fn.name);
      expect(offenders).toEqual([]);
    },
  );
});

describe('offline write coverage: UI', () => {
  // `useSettlements` is a read; only the `useSettleUp` mutation is a write.
  const WRITE_HOOK_IMPORT = /from '@\/lib\/data\/hooks\/use(Create|Update|Delete|Remove|Send|Add|Attach)[A-Za-z]*'|from '@\/lib\/data\/hooks\/useSettleUp'/;
  const WRITE_CALL = /\b(updateProfile|updatePassword|updateDisplayProfile|uploadAvatar|removeAvatar|uploadReceipt)\(/;

  const components = walk(join(SRC, 'components'), isSource);

  it('finds the write surfaces it is meant to check (the scan itself works)', () => {
    const writers = components
      .filter((file) => {
        const text = readFileSync(file, 'utf8');
        return WRITE_HOOK_IMPORT.test(text) || WRITE_CALL.test(text);
      })
      .map((file) => relative(SRC, file));
    for (const expected of [
      'components/features/expenses/ExpenseForm.tsx',
      'components/features/settlements/RecordPaymentForm.tsx',
      'components/features/profile/AvatarUploadField.tsx',
      'components/features/groups/MembersSection.tsx',
      'components/islands/FriendsIsland.tsx',
    ]) {
      expect(writers, expected).toContain(expected);
    }
  });

  it('every component that writes reads the connection (useCanWrite) or is handed the page state (WriteState)', () => {
    const offenders = components
      .filter((file) => {
        const text = readFileSync(file, 'utf8');
        return WRITE_HOOK_IMPORT.test(text) || WRITE_CALL.test(text);
      })
      .filter((file) => {
        const text = readFileSync(file, 'utf8');
        return !/\buseCanWrite\b|\bWriteState\b/.test(text);
      })
      .map((file) => relative(SRC, file));
    expect(offenders).toEqual([]);
  });

  it('every route view or island that writes through a store function also reads the connection', () => {
    const islands = walk(join(SRC, 'components/islands'), isSource);
    const offenders = islands
      .filter((file) => {
        const text = readFileSync(file, 'utf8');
        return /\b(updateProfile|updatePassword)\(/.test(text) && !/\buseCanWrite\b|\bWriteState\b/.test(text);
      })
      .map((file) => relative(SRC, file));
    expect(offenders).toEqual([]);
  });
});
