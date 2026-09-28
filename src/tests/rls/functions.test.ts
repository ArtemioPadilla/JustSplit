// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, befriend, cast, createActor, groupRow, seed, type Actor } from './fixtures';

/** Plan B2 steps 9–10: the only cross-user reads of `profiles`. */
let A: Actor, B: Actor, C: Actor;
let anonDb: Awaited<ReturnType<typeof cast>>['anon'];
let done: () => Promise<void>;

beforeAll(async () => {
  const c = await cast();
  ({ A, B, C } = c);
  anonDb = c.anon;
  done = c.cleanup;
});
afterAll(() => done());

describe('find_profile_by_email', () => {
  it('anon cannot call it', async () => {
    const { error } = await anonDb.rpc('find_profile_by_email', { p_email: A.email });
    expect(error?.code).toBe('42501');
  });

  it('finds a confirmed user by exact email, case-insensitively', async () => {
    const { data, error } = await B.db.rpc('find_profile_by_email', { p_email: A.email.toUpperCase() });
    expect(error).toBeNull();
    expect(data).toEqual([{ id: A.id, name: 'A', avatarUrl: null }]);
  });

  it('matches auth.users, not the user-writable profiles.email', async () => {
    // B points their own profile email at A's address…
    const { error: upd } = await B.db.from('profiles').update({ email: A.email }).eq('id', B.id);
    expect(upd).toBeNull();
    // …and a search for A's address still returns A only.
    const { data } = await C.db.rpc('find_profile_by_email', { p_email: A.email });
    expect(data).toEqual([{ id: A.id, name: 'A', avatarUrl: null }]);
    // B's real address still finds B.
    const { data: b } = await C.db.rpc('find_profile_by_email', { p_email: B.email });
    expect((b as { id: string }[]).map((r) => r.id)).toEqual([B.id]);
  });

  it('does not return an unconfirmed user', async () => {
    const U = await createActor('U', { confirmed: false });
    const { data } = await A.db.rpc('find_profile_by_email', { p_email: U.email });
    expect(data).toEqual([]);
  });

  it('returns nothing for a malformed address', async () => {
    const { data } = await A.db.rpc('find_profile_by_email', { p_email: '%' });
    expect(data).toEqual([]);
  });
});

describe('find_profiles_by_ids', () => {
  it('anon cannot call it', async () => {
    const { error } = await anonDb.rpc('find_profiles_by_ids', { ids: [A.id] });
    expect(error?.code).toBe('42501');
  });

  it('resolves the caller and an accepted friend; a stranger returns no row', async () => {
    const { data } = await A.db.rpc('find_profiles_by_ids', { ids: [A.id, C.id, B.id] });
    expect((data as { id: string }[]).map((r) => r.id).sort()).toEqual([A.id, C.id].sort());
  });

  it('resolves a co-member who is not a friend', async () => {
    // C is friends with both A and B, so C can create a group with both.
    await befriend(C, B);
    await seed('expense_groups', groupRow(C, [A, B]));
    const { data } = await A.db.rpc('find_profiles_by_ids', { ids: [B.id] });
    expect(data).toEqual([{ id: B.id, name: 'B', avatarUrl: null }]);
  });

  it('returns only id, name and avatarUrl', async () => {
    const { data } = await A.db.rpc('find_profiles_by_ids', { ids: [C.id] });
    expect(Object.keys((data as object[])[0]!).sort()).toEqual(['avatarUrl', 'id', 'name']);
  });

  it('rejects more than 200 ids', async () => {
    const ids = Array.from({ length: 201 }, (_, i) => `id-${i}`);
    const { error } = await A.db.rpc('find_profiles_by_ids', { ids });
    expect(error).not.toBeNull();
  });

  it('B cannot select A’s profiles row directly', async () => {
    const { data } = await B.db.from('profiles').select('*').eq('id', A.id);
    expect(data).toEqual([]);
  });

  it('the service role sees nothing through it (no JWT, no caller)', async () => {
    const { data } = await admin.rpc('find_profiles_by_ids', { ids: [A.id] });
    expect(data).toEqual([]);
  });
});
