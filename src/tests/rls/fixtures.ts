import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import { expect } from 'vitest';

/**
 * Plan B2b fixtures. Runs ONLY against `supabase start` (never a hosted
 * project). The service-role key is used here for setup/teardown alone; every
 * actor client signs in with a real password session, so each request carries
 * a real JWT and RLS applies.
 *
 * No key is committed: they come from SUPABASE_URL / SUPABASE_ANON_KEY /
 * SUPABASE_SERVICE_ROLE_KEY (or the `supabase status` names API_URL /
 * ANON_KEY / SERVICE_ROLE_KEY), and otherwise from `supabase status -o json`
 * run in the repository root. DATABASE_URL overrides the catalog connection.
 */
function stackStatus(): Record<string, string> {
  const env = process.env;
  if ((env.SUPABASE_ANON_KEY ?? env.ANON_KEY) && (env.SUPABASE_SERVICE_ROLE_KEY ?? env.SERVICE_ROLE_KEY)) return {};
  try {
    return JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' })) as Record<string, string>;
  } catch (cause) {
    throw new Error(
      'RLS suite: no local Supabase keys. Run `npm run db:start && npm run db:migrate`, ' +
        'or export SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.',
      { cause },
    );
  }
}

const status = stackStatus();
const pick = (...names: string[]) => names.map((n) => process.env[n] ?? status[n]).find(Boolean) ?? '';

export const LOCAL = {
  url: pick('SUPABASE_URL', 'API_URL') || 'http://127.0.0.1:54321',
  anonKey: pick('SUPABASE_ANON_KEY', 'ANON_KEY'),
  serviceKey: pick('SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY'),
  dbUrl: pick('DATABASE_URL', 'DB_URL') || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
};

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(LOCAL.url)) {
  throw new Error(`RLS fixtures refuse to run against a non-local Supabase (${LOCAL.url}).`);
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Service-role client: bypasses RLS. Setup, teardown and ground truth only. */
export const admin: SupabaseClient = createClient(LOCAL.url, LOCAL.serviceKey, noSession);

/** A client with no session (the `anon` role). */
export const anon = (): SupabaseClient => createClient(LOCAL.url, LOCAL.anonKey, noSession);

export interface Actor {
  id: string;
  email: string;
  name: string;
  db: SupabaseClient;
}

const PASSWORD = 'rls-suite-password';
const created: string[] = [];

export async function createActor(label: string, opts: { confirmed?: boolean } = {}): Promise<Actor> {
  const email = `${label.toLowerCase()}-${randomUUID().slice(0, 8)}@rls.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: opts.confirmed ?? true,
    user_metadata: { name: label },
  });
  if (error || !data.user) throw error ?? new Error('createUser returned no user');
  const id = data.user.id;
  created.push(id);

  const { error: pErr } = await admin.from('profiles').insert({ id, name: label, email });
  if (pErr) throw pErr;

  const db = createClient(LOCAL.url, LOCAL.anonKey, noSession);
  if (opts.confirmed ?? true) {
    const { error: sErr } = await db.auth.signInWithPassword({ email, password: PASSWORD });
    if (sErr) throw sErr;
  }
  return { id, email, name: label, db };
}

/** An accepted friendship written with the service role (setup, not under test). */
export async function befriend(a: Actor, b: Actor): Promise<string> {
  const id = randomUUID();
  const { error } = await admin
    .from('friendships')
    .insert({ id, users: [a.id, b.id], status: 'accepted', requested_by: a.id });
  if (error) throw error;
  return id;
}

/**
 * The standard cast: A (member), B (non-member stranger), C (A's accepted
 * friend). Call from beforeAll; `cleanup` from afterAll.
 */
export async function cast() {
  const A = await createActor('A');
  const B = await createActor('B');
  const C = await createActor('C');
  await befriend(A, C);
  return { A, B, C, anon: anon(), cleanup };
}

export async function cleanup(): Promise<void> {
  const ids = created.splice(0);
  if (ids.length === 0) return;
  const overlap = `{${ids.join(',')}}`;
  for (const table of ['expenses', 'settlements', 'events', 'expense_groups']) {
    await admin.from(table).delete().filter('member_ids', 'ov', overlap);
  }
  await admin.from('friendships').delete().filter('users', 'ov', overlap);
  for (const id of ids) await admin.auth.admin.deleteUser(id);
}

/** The SchemaMap tables (spec D10); `profiles` and `schema_migrations` are not in the map. */
export const SCHEMA_MAP_TABLES = ['expense_groups', 'expenses', 'settlements', 'events', 'friendships'];

export const uuid = () => randomUUID();
export const today = () => new Date().toISOString().slice(0, 10);

// ── Row builders (row shape = snake_case columns, what the adapter writes) ──

/** A row as the adapter writes it: snake_case columns keyed by name. */
export type Row = { id: string } & Record<string, unknown>;

export function groupRow(creator: Actor, members: Actor[], over: Record<string, unknown> = {}): Row {
  const all = [creator, ...members.filter((m) => m.id !== creator.id)];
  return {
    id: uuid(),
    name: 'Group',
    currency: 'MXN',
    members: all.map((m) => ({
      userId: m.id,
      displayName: m.name,
      role: m.id === creator.id ? 'admin' : 'user',
      joinedAt: new Date().toISOString(),
    })),
    member_ids: all.map((m) => m.id),
    admin_ids: [creator.id],
    created_by: creator.id,
    ...over,
  };
}

export function expenseRow(creator: Actor, members: Actor[], over: Record<string, unknown> = {}): Row {
  const ids = [creator, ...members.filter((m) => m.id !== creator.id)].map((m) => m.id);
  return {
    id: uuid(),
    group_id: null,
    description: 'Tacos',
    amount: 100,
    currency: 'MXN',
    paid_by: creator.id,
    split_type: 'equal',
    splits: ids.map((userId) => ({ userId, amount: +(100 / ids.length).toFixed(2) })),
    date: today(),
    member_ids: ids,
    created_by: creator.id,
    ...over,
  };
}

export function settlementRow(creator: Actor, from: Actor, to: Actor, over: Record<string, unknown> = {}): Row {
  return {
    id: uuid(),
    group_id: null,
    from_user_id: from.id,
    to_user_id: to.id,
    amount: 50,
    currency: 'MXN',
    date: today(),
    member_ids: [from.id, to.id],
    created_by: creator.id,
    ...over,
  };
}

export function eventRow(creator: Actor, members: Actor[], over: Record<string, unknown> = {}): Row {
  const ids = [creator, ...members.filter((m) => m.id !== creator.id)].map((m) => m.id);
  return { id: uuid(), name: 'Viaje', kind: 'trip', member_ids: ids, created_by: creator.id, ...over };
}

// ── Ground truth + assertions ───────────────────────────────────────────────

/** Inserts with the service role (setup of rows that exist before the test). */
export async function seed(table: string, row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await admin.from(table).insert(row).select().single();
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function truth(table: string, id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await admin.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

type Result = { data: unknown; error: PostgrestError | null };

/** The write was accepted. */
export function allowed(res: Result): void {
  expect(res.error, JSON.stringify(res.error)).toBeNull();
}

/**
 * The write was rejected: RLS (42501), a guard trigger (42501), a check or
 * unique constraint (23xxx) or a missing grant. `code` narrows it.
 */
export function denied(res: Result, code?: string | RegExp): void {
  expect(res.error, 'expected the database to reject the write').not.toBeNull();
  if (code) expect(res.error!.code).toMatch(code);
}

/** An update/delete that matched no visible row (RLS `using` filtered it). */
export function noRows(res: Result): void {
  expect(res.error, JSON.stringify(res.error)).toBeNull();
  expect(res.data).toEqual([]);
}

/** Runs read-only SQL as postgres through psql (catalog checks). */
export function sql(query: string): string[] {
  const out = execFileSync('psql', [LOCAL.dbUrl, '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query], {
    encoding: 'utf8',
  });
  return out.split('\n').filter((l) => l.length > 0);
}
