#!/usr/bin/env node
/**
 * Page-size budget gate (plan B19). Runs after `astro build` in `npm run check`
 * and on every PR: it reads `dist/`, measures the STATICALLY loaded gzipped JS
 * of every built page (scripts/lib/bundle-graph.mjs), and fails when a page
 * exceeds the budget of its path group in `performance-budgets.json`.
 *
 * Never raise a budget to absorb a regression (SETUP.md, "Performance
 * budgets"). A budget is only ever set from a measurement taken after the
 * reductions, with about 5% headroom.
 *
 *   node scripts/check-budgets.mjs            gate (exit 1 on any failure)
 *   node scripts/check-budgets.mjs --report   print the measurement, never fail on a budget
 *
 * BUDGET_DIST / BUDGET_FILE override the inputs (the unit tests use them).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { budgetFor, evaluate, groupFor, listPages, measurePage } from './lib/bundle-graph.mjs';

const kb = (bytes) => (bytes / 1024).toFixed(1).padStart(7);

export function run({ dist, budgetsPath, report = false, log = console.log, error = console.error }) {
  if (!existsSync(resolve(dist, '_astro'))) {
    error(`check-budgets failed:\n  - ${dist}/_astro is missing — run \`astro build\` first`);
    return 1;
  }
  const hasBudgets = existsSync(budgetsPath);
  if (!hasBudgets && !report) {
    error(`check-budgets failed:\n  - ${budgetsPath} is missing`);
    return 1;
  }
  const budgets = hasBudgets ? JSON.parse(readFileSync(budgetsPath, 'utf8')) : { groups: {} };
  const measurements = listPages(dist).map(({ file }) => measurePage(dist, file));

  log(`check-budgets: statically loaded JS per page, gzip (dynamic import() chunks excluded)`);
  log(`  ${'page'.padEnd(26)} ${'static JS'.padStart(9)} ${'budget'.padStart(7)} ${'JS+CSS'.padStart(8)} ${'+lazy JS'.padStart(9)}  largest chunk`);
  for (const m of measurements) {
    const group = hasBudgets ? groupFor(m.route, budgets) : undefined;
    const budget = group ? String(budgetFor(budgets.groups[group], m.route)).padStart(7) : ' '.repeat(7);
    log(
      `  ${m.route.padEnd(26)} ${kb(m.jsGz)} kB ${budget} ${kb(m.totalGz)} ${kb(m.withLazyGz)}  ${m.chunks[0]?.name ?? '(no JS)'}`,
    );
  }
  log('  static JS is gated; JS+CSS (transfer) and +lazy JS (worst case if every lazy chunk loaded) are information.');

  if (report) return 0;
  const { failures, warnings } = evaluate(measurements, budgets);
  for (const w of warnings) log(`  WARN ${w}`);
  if (failures.length > 0) {
    error(`\ncheck-budgets failed:\n  - ${failures.join('\n  - ')}`);
    return 1;
  }
  log(`\ncheck-budgets ok (${measurements.length} pages within budget)`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(
    run({
      dist: resolve(process.env.BUDGET_DIST ?? 'dist'),
      budgetsPath: resolve(process.env.BUDGET_FILE ?? 'performance-budgets.json'),
      report: process.argv.includes('--report'),
    }),
  );
}
