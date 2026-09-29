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

/**
 * Every top-level function in a module: `function f() {}` declarations AND
 * `const f = (async) (…) => …` / `const f = function (…) {…}` (hardened after
 * centinela's B19c review: an arrow-function writer used to slip past the scan).
 * An expression-bodied arrow has no statement to put `assertOnline()` in, so if it
 * writes it is always an offender.
 */
function functionBodiesFromText(file: string, text: string): Array<{ name: string; body: string }> {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found: Array<{ name: string; body: string }> = [];
  source.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.body && node.name) {
      found.push({ name: node.name.text, body: node.body.getText(source) });
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        const init = decl.initializer;
        if (!init || !ts.isIdentifier(decl.name)) continue;
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
          found.push({ name: decl.name.text, body: init.body.getText(source) });
        }
      }
    }
  });
  return found;
}

function functionBodies(file: string): Array<{ name: string; body: string }> {
  return functionBodiesFromText(file, readFileSync(file, 'utf8'));
}

const GUARDED_FIRST = /^\{\s*(\/\/[^\n]*\n\s*)*assertOnline\(\);/;
const unguardedWriters = (fns: Array<{ name: string; body: string }>) =>
  fns.filter((fn) => WRITE_PRIMITIVE.test(fn.body)).filter((fn) => !GUARDED_FIRST.test(fn.body)).map((fn) => fn.name);

/**
 * Files that implement the primitives or only touch this device, so they are not
 * "writers" in the ADR 0015 sense. Everything else under src/lib/data and src/stores
 * is scanned, so a NEW data or store module that writes must either guard or be
 * listed here with its reason.
 */
const NOT_SERVER_WRITERS: Record<string, string> = {
  'lib/data/relational-adapter.ts': 'implements the adapter primitives the repos call',
  'lib/data/adapter.ts': 'injects the adapter; no calls',
  'lib/data/require-adapter.ts': 'resolves the adapter; no calls',
  'lib/data/client.ts': 'Supabase client + auth session plumbing (sign in/out is deliberately not blocked)',
  'lib/data/reset-local.ts': 'resets THIS device (ADR 0008); deliberately not blocked',
  'stores/theme.ts': 'toggles a CSS class / localStorage on this device',
};

// Hooks only delegate to the (guarded) repos, so they are covered by the UI half below.
const DATA_LAYER_FILES = [
  ...walk(join(SRC, 'lib/data'), (path) => isSource(path) && !path.includes('/lib/data/hooks/')),
  ...walk(join(SRC, 'stores'), isSource),
].filter((file) => !(relative(SRC, file) in NOT_SERVER_WRITERS));

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
      expect(unguardedWriters(functionBodies(file))).toEqual([]);
    },
  );

  it('the scan catches arrow-function and function-expression writers too (self-test)', () => {
    const src = [
      "export const guardedArrow = async (id: string) => { assertOnline(); await adapter.deleteDocument('x', id); };",
      "export const unguardedArrow = async (id: string) => { await adapter.deleteDocument('x', id); };",
      "export const exprArrow = (id: string) => adapter.updateDocument('x', id, {});",
      "export const fnExpr = async function (id: string) { await storage.upload(id); };",
      "export async function lateGuard(id: string) { await read(id); assertOnline(); await adapter.setDocument('x', id, {}); }",
    ].join('\n');
    expect(unguardedWriters(functionBodiesFromText('synthetic.ts', src)).sort()).toEqual(['exprArrow', 'fnExpr', 'lateGuard', 'unguardedArrow']);
  });

  it('every excluded file is real and still justified (no stale exemptions)', () => {
    for (const path of Object.keys(NOT_SERVER_WRITERS)) {
      expect(() => statSync(join(SRC, path)), path).not.toThrow();
    }
  });
});

describe('offline write coverage: UI', () => {
  // Write hooks are DERIVED, not named: any hook module that calls `useMutation(` is a
  // write hook, so a new one (say `useAcceptInvite`) is covered without editing a regex.
  const WRITE_HOOKS = walk(join(SRC, 'lib/data/hooks'), isSource)
    .filter((file) => readFileSync(file, 'utf8').includes('useMutation('))
    .map((file) => file.replace(/^.*\/(use[A-Za-z]+)\.tsx?$/, '$1'));
  const WRITE_HOOK_IMPORT = new RegExp(`from '@/lib/data/hooks/(${WRITE_HOOKS.join('|')})'`);

  it('derives the write hooks from useMutation (the derivation itself works)', () => {
    expect(WRITE_HOOKS).toEqual(expect.arrayContaining(['useSettleUp', 'useCreateExpense', 'useRemoveFriendship', 'useUpdateFriendshipStatus']));
    expect(WRITE_HOOKS).not.toContain('useSettlements');
    expect(WRITE_HOOKS).not.toContain('useLiveQuery');
  });
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
