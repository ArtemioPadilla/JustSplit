#!/usr/bin/env node
// Plan B2b acceptance: the RLS suite must go RED when any single policy or any
// guard_<table> trigger is dropped. For each one this script drops it, runs
// the behavioural test file for that table (never the catalog coverage guard,
// which would catch every drop trivially), restores it, and reports.
//
// Local stack only (DATABASE_URL defaults to `supabase start`). Usage:
//   npm run test:rls:mutation
import { execFileSync, spawnSync } from 'node:child_process';

const DB = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!/@(127\.0\.0\.1|localhost):/.test(DB)) {
  console.error(`refusing to mutate a non-local database: ${DB}`);
  process.exit(2);
}

const FILE = {
  expense_groups: 'src/tests/rls/expense-groups.test.ts',
  expenses: 'src/tests/rls/expenses.test.ts',
  settlements: 'src/tests/rls/settlements.test.ts',
  events: 'src/tests/rls/events.test.ts',
  friendships: 'src/tests/rls/friendships.test.ts',
  profiles: 'src/tests/rls/profiles.test.ts',
  objects: 'src/tests/rls/storage.test.ts',
};

const psql = (sql) =>
  execFileSync('psql', [DB, '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
/** Runs a query and returns its rows as objects (one json_agg round trip). */
const rows = (sql) => JSON.parse(psql(`select coalesce(json_agg(r), '[]') from (${sql}) r`).trim());
const q = (id) => `"${id.replaceAll('"', '""')}"`;

const policies = rows(`
  select schemaname as schema, tablename as table, policyname as name, permissive, cmd,
         array_to_string(roles, ',') as roles, qual as using, with_check as check
    from pg_policies
   where schemaname = 'public' or (schemaname = 'storage' and tablename = 'objects' and policyname like 'receipts_%')
   order by 1, 2, 3`).map(({ schema, table, name, permissive, cmd, roles, using, check }) => {
  const target = `${q(schema)}.${q(table)}`;
  return {
    label: `policy ${schema}.${table}.${name}`,
    table,
    drop: `drop policy ${q(name)} on ${target}`,
    restore:
      `create policy ${q(name)} on ${target} as ${permissive} for ${cmd} to ${roles}` +
      (using ? ` using (${using})` : '') +
      (check ? ` with check (${check})` : ''),
  };
});

const triggers = rows(`
  select c.relname as table, t.tgname as name, p.proname as fn
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_proc p on p.oid = t.tgfoid
   where c.relnamespace = 'public'::regnamespace and t.tgname like 'guard_%' and not t.tgisinternal
   order by 1`).map(({ table, name, fn }) => {
  return {
    label: `trigger ${table}.${name}`,
    table,
    drop: `drop trigger ${q(name)} on public.${q(table)}`,
    restore: `create trigger ${q(name)} before update on public.${q(table)} for each row execute function public.${q(fn)}()`,
  };
});

const runFile = (file) =>
  spawnSync('npx', ['vitest', 'run', '--config', 'vitest.rls.config.ts', file], { stdio: 'ignore', env: process.env })
    .status;

// Baseline: every file must be green unmutated, otherwise a "killed" result
// could just be a broken setup (missing keys, stack down).
for (const file of new Set(Object.values(FILE))) {
  if (runFile(file) !== 0) {
    console.error(`baseline failed: ${file} is red without any mutation; fix the setup first.`);
    process.exit(2);
  }
}
console.log('baseline green for every table file.');

const results = [];
for (const m of [...policies, ...triggers]) {
  const file = FILE[m.table];
  if (!file) {
    results.push({ ...m, outcome: 'NO TEST FILE' });
    continue;
  }
  psql(m.drop);
  let status;
  try {
    status = runFile(file);
  } finally {
    psql(m.restore);
  }
  results.push({ ...m, outcome: status === 0 ? 'SURVIVED' : 'killed' });
  console.log(`${status === 0 ? '✗ SURVIVED' : '✓ killed  '}  ${m.label}`);
}

const survived = results.filter((r) => r.outcome !== 'killed');
console.log(`\n${results.length - survived.length}/${results.length} mutations killed.`);
if (survived.length) {
  console.log('Not caught by the suite:');
  for (const r of survived) console.log(`  - ${r.label} (${r.outcome})`);
  process.exit(1);
}
