#!/usr/bin/env node
// Plan B2b acceptance: the RLS suite must go RED when any single policy or any
// guard_<table> trigger is dropped. For each one this script drops it, runs
// the behavioural test files for that table (never the catalog coverage guard,
// which would catch every drop trivially), restores it, and reports.
//
// Plan B2d adds the mutations the membership lifecycle introduced: each
// membership helper function is replaced by `select false`, each ON DELETE
// SET NULL foreign key is dropped, and the lookup-attempts table has RLS
// disabled / is granted to `authenticated`. The B2d review adds clause-level
// mutations: the event_id check of settlements_insert, and both halves of the
// "leaving a group/event" guard (the check itself, and the pg_trigger_depth()
// cascade exemption). A mutation is killed when ANY of its files goes red.
//
// Local stack only (DATABASE_URL defaults to `supabase start`). Usage:
//   npm run test:rls:mutation
import { execFileSync, spawnSync } from 'node:child_process';

const DB = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!/@(127\.0\.0\.1|localhost):/.test(DB)) {
  console.error(`refusing to mutate a non-local database: ${DB}`);
  process.exit(2);
}

const dir = 'src/tests/rls/';
const FILES = {
  expense_groups: [`${dir}expense-groups.test.ts`, `${dir}fk-lifecycle.test.ts`],
  expenses: [`${dir}expenses.test.ts`, `${dir}visibility.test.ts`, `${dir}membership-edit.test.ts`],
  settlements: [`${dir}settlements.test.ts`, `${dir}visibility.test.ts`],
  events: [`${dir}events.test.ts`, `${dir}membership-edit.test.ts`, `${dir}fk-lifecycle.test.ts`],
  friendships: [`${dir}friendships.test.ts`],
  profiles: [`${dir}profiles.test.ts`],
  objects: [`${dir}storage.test.ts`, `${dir}visibility.test.ts`],
  profile_lookup_attempts: [`${dir}lookup-rate-limit.test.ts`],
  ungroup: [`${dir}ungroup-guard.test.ts`, `${dir}fk-lifecycle.test.ts`],
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

// B2d: the membership helpers. Each is replaced by `select false` (same
// signature and attributes, restored from pg_get_functiondef afterwards), so a
// policy that stops honouring group/event membership goes red.
const HELPERS = ['is_group_member(text)', 'is_event_member(text)', 'can_see_shared_row(text[], text, text)', 'can_see_expense(text)'];
const helperMutations = HELPERS.map((signature) => {
  const original = psql(`select pg_get_functiondef('public.${signature}'::regprocedure)`).trim();
  const neutered = original.replace(/AS \$function\$[\s\S]*\$function\$/, 'AS $function$ select false $function$');
  const table = signature.startsWith('can_see_expense') ? 'objects' : 'expenses';
  return {
    label: `function public.${signature} -> select false`,
    table,
    // The helper is shared by expenses, settlements and storage policies.
    files: [...FILES.expenses, ...FILES.settlements, ...FILES.objects],
    drop: neutered,
    restore: original,
  };
});

// B2d: the ON DELETE SET NULL foreign keys (migration B).
const fkMutations = rows(`
  select c.conrelid::regclass::text as table, c.conname as name, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
   where c.contype = 'f' and c.connamespace = 'public'::regnamespace and c.confdeltype = 'n'
   order by 1, 2`).map(({ table, name, def }) => ({
  label: `foreign key ${table}.${name}`,
  table: 'expense_groups',
  files: [`${dir}fk-lifecycle.test.ts`],
  drop: `alter table public.${q(table)} drop constraint ${q(name)}`,
  restore: `alter table public.${q(table)} add constraint ${q(name)} ${def}`,
}));

// B2d: the lookup-attempts table must stay closed to clients.
const attemptsMutations = [
  {
    label: 'table profile_lookup_attempts row level security disabled',
    table: 'profile_lookup_attempts',
    drop: 'alter table public.profile_lookup_attempts disable row level security',
    restore: 'alter table public.profile_lookup_attempts enable row level security',
  },
  {
    label: 'table profile_lookup_attempts granted to authenticated',
    table: 'profile_lookup_attempts',
    drop: 'grant select, insert, delete on table public.profile_lookup_attempts to authenticated',
    restore: 'revoke all on table public.profile_lookup_attempts from authenticated',
  },
];

// B2d review: clause-level mutations (the whole policy/trigger still exists).
const settlementInsert = rows(`select with_check as check from pg_policies where policyname = 'settlements_insert'`)[0].check;
const EVENT_CLAUSE = '((event_id IS NULL) OR is_event_member(event_id))';
if (!settlementInsert.includes(EVENT_CLAUSE)) throw new Error('settlements_insert has no event_id clause to mutate');
const clauseMutations = [
  {
    label: 'policy settlements_insert without its event_id membership clause',
    table: 'settlements',
    files: FILES.settlements,
    drop: `alter policy settlements_insert on public.settlements with check (${settlementInsert.replace(EVENT_CLAUSE, 'true')})`,
    restore: `alter policy settlements_insert on public.settlements with check (${settlementInsert})`,
  },
];
for (const fn of ['guard_expenses', 'guard_events']) {
  const original = psql(`select pg_get_functiondef('public.${fn}'::regproc)`).trim();
  if (!original.includes('pg_trigger_depth() <= 1')) throw new Error(`${fn} has no pg_trigger_depth() check to mutate`);
  for (const [what, replacement] of [
    ['leave check removed', 'false'],
    ['cascade exemption removed (the check also runs for ON DELETE SET NULL)', 'true'],
  ]) {
    clauseMutations.push({
      label: `function ${fn}: ${what}`,
      table: 'ungroup',
      files: FILES.ungroup,
      drop: original.replaceAll('pg_trigger_depth() <= 1', replacement),
      restore: original,
    });
  }
}

const runFile = (file) =>
  spawnSync('npx', ['vitest', 'run', '--config', 'vitest.rls.config.ts', file], { stdio: 'ignore', env: process.env })
    .status;
const filesOf = (m) => m.files ?? FILES[m.table];

// Baseline: every file must be green unmutated, otherwise a "killed" result
// could just be a broken setup (missing keys, stack down).
for (const file of new Set(Object.values(FILES).flat())) {
  if (runFile(file) !== 0) {
    console.error(`baseline failed: ${file} is red without any mutation; fix the setup first.`);
    process.exit(2);
  }
}
console.log('baseline green for every table file.');

const results = [];
for (const m of [...policies, ...triggers, ...helperMutations, ...fkMutations, ...attemptsMutations, ...clauseMutations]) {
  const files = filesOf(m);
  if (!files) {
    results.push({ ...m, outcome: 'NO TEST FILE' });
    continue;
  }
  psql(m.drop);
  let killed = false;
  try {
    // Stops at the first red file: one is enough to kill the mutation.
    killed = files.some((file) => runFile(file) !== 0);
  } finally {
    psql(m.restore);
  }
  results.push({ ...m, outcome: killed ? 'killed' : 'SURVIVED' });
  console.log(`${killed ? '✓ killed  ' : '✗ SURVIVED'}  ${m.label}`);
}

const survived = results.filter((r) => r.outcome !== 'killed');
console.log(`\n${results.length - survived.length}/${results.length} mutations killed.`);
if (survived.length) {
  console.log('Not caught by the suite:');
  for (const r of survived) console.log(`  - ${r.label} (${r.outcome})`);
  process.exit(1);
}
