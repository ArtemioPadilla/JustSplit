/**
 * The local-stack half of the live smoke (`scripts/live-smoke.mjs`, plan A7):
 * read the `supabase start` keys, build `dist` against them, and seed /
 * clean up deterministic users and rows through the service role — the same
 * way `src/tests/rls/fixtures.ts` does for the RLS suite. Never a hosted
 * project: the URL must be loopback.
 *
 * No key is committed or written to disk: they come from `supabase status -o
 * json` (or the same SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
 * variables the RLS fixtures accept), exactly as `scripts/db-env.mjs` derives
 * the public pair.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

export const PASSWORD = 'live-smoke-password';

export function readStack(env = process.env) {
  const fromEnv = {
    API_URL: env.SUPABASE_URL,
    ANON_KEY: env.SUPABASE_ANON_KEY,
    SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  };
  let status = {};
  if (!(fromEnv.API_URL && fromEnv.ANON_KEY && fromEnv.SERVICE_ROLE_KEY)) {
    try {
      status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }));
    } catch (cause) {
      throw new Error('live smoke: no local Supabase keys. Run `npm run db:start && npm run db:migrate` first.', { cause });
    }
  }
  const url = fromEnv.API_URL ?? status.API_URL;
  // The same pair `scripts/db-env.mjs` writes for `npm run dev`.
  const publicKey = fromEnv.ANON_KEY ?? (status.PUBLISHABLE_KEY || status.ANON_KEY);
  const serviceKey = fromEnv.SERVICE_ROLE_KEY ?? status.SERVICE_ROLE_KEY;
  if (!url || !publicKey || !serviceKey) throw new Error('live smoke: `supabase status` did not report the API URL and keys.');
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(`live smoke refuses to run against a non-local Supabase (${url}).`);
  }
  return { url, publicKey, serviceKey };
}

/**
 * Builds the production site with the local stack's public config into a
 * throwaway directory, so `dist/` (the one `npm run check` produced, built
 * WITHOUT Supabase on purpose) is never overwritten. The keys reach the build
 * through this process's environment only.
 */
export function buildDist(stack) {
  const outDir = mkdtempSync(join(tmpdir(), 'justsplit-live-dist-'));
  execFileSync('npx', ['astro', 'build', '--outDir', outDir], {
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, PUBLIC_SUPABASE_URL: stack.url, PUBLIC_SUPABASE_KEY: stack.publicKey },
  });
  return outDir;
}

export function createAdmin(stack) {
  return createClient(stack.url, stack.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const throwIf = (error) => {
  if (error) throw error;
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Deterministic cast and data. Emails carry a per-run tag, so a run that died
 * before cleanup can never collide with the next one; row ids are UUIDs.
 *
 *  - Ana (the main signed-in user), Beto (her accepted friend), Cami (nobody's
 *    friend yet: the friend-request flow), Dani (sent Ana a pending request).
 *  - "Casa (smoke)" group and "Seed trip" event, Ana + Beto.
 *  - Groceries: 100.00 paid by Beto, split equally (Ana owes 50.00, outside any
 *    event). Fuel: 40.00 paid by Ana in "Seed trip", split equally (Beto owes
 *    20.00). Pairwise, the personal view therefore reads "Ana owes Beto 30.00"
 *    for both of them, and nothing else on the page depends on today's date.
 * `created` collects user ids as they are made, so the caller's `finally` can
 * clean up even when a later insert throws.
 *
 *  - Optional columns (description, end date, notes, category) are left NULL on
 *    purpose: reading NULL columns back was a real defect (plan B11b).
 */
export async function seed(admin, created = []) {
  const tag = randomUUID().slice(0, 8);
  const users = {};
  for (const [key, name] of [['ana', 'Ana Smoke'], ['beto', 'Beto Smoke'], ['cami', 'Cami Smoke'], ['dani', 'Dani Smoke']]) {
    const email = `${key}-${tag}@live-smoke.test`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { name } });
    throwIf(error);
    created.push(data.user.id); // the caller cleans these up even if a later insert throws
    users[key] = { id: data.user.id, email, name };
    throwIf((await admin.from('profiles').insert({ id: data.user.id, name, email })).error);
  }
  const { ana, beto, cami, dani } = users;

  throwIf(
    (
      await admin.from('friendships').insert([
        { id: randomUUID(), users: [ana.id, beto.id], status: 'accepted', requested_by: ana.id },
        { id: randomUUID(), users: [dani.id, ana.id], status: 'pending', requested_by: dani.id },
      ])
    ).error,
  );

  const groupId = randomUUID();
  throwIf(
    (
      await admin.from('expense_groups').insert({
        id: groupId,
        name: 'Casa (smoke)',
        currency: 'USD',
        members: [ana, beto].map((u, i) => ({ userId: u.id, displayName: u.name, role: i === 0 ? 'admin' : 'member', joinedAt: new Date().toISOString() })),
        member_ids: [ana.id, beto.id],
        admin_ids: [ana.id],
        created_by: ana.id,
      })
    ).error,
  );

  const eventId = randomUUID();
  throwIf(
    (await admin.from('events').insert({ id: eventId, name: 'Seed trip', kind: 'event', member_ids: [ana.id, beto.id], created_by: ana.id })).error,
  );

  const half = (amount) => [ana, beto].map((u) => ({ userId: u.id, amount: amount / 2 }));
  const groceriesId = randomUUID();
  const fuelId = randomUUID();
  throwIf(
    (
      await admin.from('expenses').insert([
        {
          id: groceriesId, description: 'Seed groceries', amount: 100, currency: 'USD', paid_by: beto.id,
          split_type: 'equal', splits: half(100), date: today(), member_ids: [ana.id, beto.id], created_by: beto.id,
        },
        {
          id: fuelId, description: 'Seed fuel', amount: 40, currency: 'USD', paid_by: ana.id, event_id: eventId,
          split_type: 'equal', splits: half(40), date: today(), member_ids: [ana.id, beto.id], created_by: ana.id,
        },
      ])
    ).error,
  );

  return { tag, users, groupId, eventId, groceriesId, fuelId };
}

/** Removes everything the run touched: rows naming its users, then the users. */
export async function cleanup(admin, userIds) {
  if (userIds.length === 0) return;
  const overlap = `{${userIds.join(',')}}`;
  for (const table of ['expenses', 'settlements', 'events', 'expense_groups']) {
    await admin.from(table).delete().filter('member_ids', 'ov', overlap);
  }
  await admin.from('friendships').delete().filter('users', 'ov', overlap);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}
