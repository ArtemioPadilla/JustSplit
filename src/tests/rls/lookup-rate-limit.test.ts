// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, anon, cast, createActor, sql, type Actor } from './fixtures';

/**
 * Plan B2d migration E (ADR 0013, closes the ADR 0006 follow-up): at most 30
 * `find_profile_by_email` lookups per caller per rolling hour, recorded in
 * `profile_lookup_attempts` (RLS on, no policy, no client grant). The 31st
 * raises SQLSTATE P0429 with the message `rate_limited`; a rejected call is
 * not recorded, so the window slides instead of extending.
 *
 * Red/green for this file is verified by the CI "RLS & contract" job (and
 * locally against `supabase start`).
 */
let A: Actor, C: Actor;
let done: () => Promise<void>;

const LIMIT = 30;

beforeAll(async () => {
  const c = await cast();
  ({ A, C } = c);
  done = c.cleanup;
});
afterAll(async () => {
  await done();
});

const lookup = (who: Actor, email = 'nobody@rls.test') => who.db.rpc('find_profile_by_email', { p_email: email });

async function attempts(who: Actor): Promise<number> {
  const { count, error } = await admin
    .from('profile_lookup_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('uid', who.id);
  expect(error).toBeNull();
  return count ?? 0;
}

async function seedAttempts(who: Actor, n: number, at: string): Promise<void> {
  const { error } = await admin.from('profile_lookup_attempts').insert(Array.from({ length: n }, () => ({ uid: who.id, at })));
  expect(error).toBeNull();
}

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

describe('profile_lookup_attempts (catalog)', () => {
  it('has RLS enabled, no policy, and no grant to anon or authenticated', () => {
    expect(sql(`select relrowsecurity::text from pg_class where oid = 'public.profile_lookup_attempts'::regclass`)).toEqual(['true']);
    expect(sql(`select count(*) from pg_policies where tablename = 'profile_lookup_attempts'`)).toEqual(['0']);
    expect(
      sql(`select grantee || ' ' || privilege_type from information_schema.role_table_grants
            where table_schema = 'public' and table_name = 'profile_lookup_attempts' and grantee in ('anon', 'authenticated')`),
    ).toEqual([]);
  });

  it('is indexed on (uid, at)', () => {
    expect(
      sql(`select indexdef from pg_indexes where tablename = 'profile_lookup_attempts' and indexdef ~ '\\(uid, at\\)'`),
    ).toHaveLength(1);
  });

  it('is unreadable and unwritable by a signed-in client, and by anon', async () => {
    const R = await createActor('R');
    const read = await R.db.from('profile_lookup_attempts').select('*');
    expect(read.error?.code).toBe('42501');
    const write = await R.db.from('profile_lookup_attempts').insert({ uid: R.id });
    expect(write.error?.code).toBe('42501');
    const wipe = await R.db.from('profile_lookup_attempts').delete().eq('uid', R.id);
    expect(wipe.error?.code).toBe('42501');
    expect((await anon().from('profile_lookup_attempts').select('*')).error).not.toBeNull();
  });
});

describe('find_profile_by_email rate limit', () => {
  it('allows 30 lookups in an hour; the 31st raises rate_limited (P0429) and is not recorded', async () => {
    const R = await createActor('R');
    for (let i = 0; i < LIMIT; i += 1) {
      const { error } = await lookup(R);
      expect(error, `lookup ${i + 1}`).toBeNull();
    }
    expect(await attempts(R)).toBe(LIMIT);

    const blocked = await lookup(R);
    expect(blocked.error?.code).toBe('P0429');
    expect(blocked.error?.message).toBe('rate_limited');
    expect(await attempts(R)).toBe(LIMIT);
  });

  it('every call counts, whether or not it matches anyone (a found user does not get a free lookup)', async () => {
    const R = await createActor('R');
    await seedAttempts(R, LIMIT - 1, ago(5));
    expect((await lookup(R, C.email)).error).toBeNull(); // matches C: the 30th
    expect((await lookup(R, C.email)).error?.code).toBe('P0429');
    expect((await lookup(R, '%')).error?.code).toBe('P0429'); // malformed also blocked once at the limit
  });

  it('is per caller: one user hitting the limit does not block another', async () => {
    const R = await createActor('R');
    await seedAttempts(R, LIMIT, ago(5));
    expect((await lookup(R)).error?.code).toBe('P0429');
    const { data, error } = await lookup(A, C.email);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: C.id, name: 'C', avatarUrl: null }]);
  });

  it('the window slides: attempts older than an hour stop counting, and the caller is unblocked', async () => {
    const R = await createActor('R');
    await seedAttempts(R, LIMIT, ago(30));
    expect((await lookup(R)).error?.code).toBe('P0429');
    const { error: age } = await admin.from('profile_lookup_attempts').update({ at: ago(61) }).eq('uid', R.id);
    expect(age).toBeNull();
    expect((await lookup(R)).error).toBeNull();
  });

  it('prunes the caller\'s attempts older than a day when it records a new one', async () => {
    const R = await createActor('R');
    await seedAttempts(R, 3, ago(60 * 25));
    await seedAttempts(R, 2, ago(90));
    expect((await lookup(R)).error).toBeNull();
    expect(await attempts(R)).toBe(3); // the two from 90 minutes ago + the new one
  });

  it('find_profiles_by_ids is not rate limited by it', async () => {
    const R = await createActor('R');
    await seedAttempts(R, LIMIT, ago(5));
    expect((await R.db.rpc('find_profiles_by_ids', { ids: [R.id] })).error).toBeNull();
  });
});
