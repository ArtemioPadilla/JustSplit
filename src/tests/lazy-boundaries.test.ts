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
  {
    file: 'components/features/currency/CurrencySelector.tsx',
    module: '@/components/features/currency/CurrencyCombobox',
    why: 'the Base UI combobox and its popup stack are ~45 kB gz on nearly every app page; a same-looking read-only stand-in shows until it loads',
  },
  {
    file: 'components/ui/date-picker.tsx',
    module: '@/components/ui/date-picker-impl',
    why: 'the Popover stack plus react-day-picker, date-fns and @date-fns/tz are ~55 kB gz that only an opened picker needs',
  },
  {
    file: 'components/features/settlements/RecordPaymentDialog.tsx',
    module: './RecordPaymentForm',
    why: 'react-hook-form and the payment form are ~20 kB gz that only the open dialog needs',
  },
  {
    file: 'components/ui/data-table-columns-menu.tsx',
    module: '@/components/ui/data-table-columns-menu-impl',
    why: 'the Columns dropdown (Base UI menu, floating-ui, list navigation) was ~50 kB gz on /expenses/list for a control most visits never touch',
  },
];

// The selector's own file must not reach the combobox by any other route either.
const NEVER_STATIC: { file: string; module: string }[] = [
  { file: 'components/features/currency/CurrencySelector.tsx', module: '@/components/ui/combobox' },
  { file: 'components/ui/data-table.tsx', module: '@/components/ui/dropdown-menu' },
  { file: 'components/ui/date-picker.tsx', module: '@/components/ui/popover' },
  { file: 'components/ui/date-picker.tsx', module: '@/components/ui/calendar' },
];
describe.each(NEVER_STATIC)('$file (no back door)', ({ file, module }) => {
  it(`does not import ${module} statically`, () => {
    expect(staticImports(read(file))).not.toContain(module);
  });
});

// Read inside each test: a file that does not exist yet must fail its own test, not the whole suite.
const read = (file: string) => readFileSync(resolve(SRC, file), 'utf8');

describe.each(LAZY)('$file', ({ file, module, why }) => {
  it(`does not import ${module} statically (${why})`, () => {
    expect(staticImports(read(file))).not.toContain(module);
  });
  it(`loads ${module} through import()`, () => {
    expect(dynamicImports(read(file))).toContain(module);
  });
});
