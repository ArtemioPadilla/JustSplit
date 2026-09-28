// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, cast, expenseRow, seed, uuid, type Actor } from './fixtures';

/** Spec D10 "Images": private `receipts` bucket + storage.objects policies. */
let A: Actor, B: Actor, C: Actor;
let anonDb: Awaited<ReturnType<typeof cast>>['anon'];
let done: () => Promise<void>;
const paths: string[] = [];

beforeAll(async () => {
  const c = await cast();
  ({ A, B, C } = c);
  anonDb = c.anon;
  done = c.cleanup;
});
afterAll(async () => {
  if (paths.length) await admin.storage.from('receipts').remove(paths);
  await done();
});

const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], { type: 'image/jpeg' });
const bucket = (a: { db: Actor['db'] } | Actor['db']) => ('db' in a ? a.db : a).storage.from('receipts');

async function upload(who: Actor['db'], path: string, opts: { upsert?: boolean } = {}) {
  const res = await who.storage.from('receipts').upload(path, jpeg(), { contentType: 'image/jpeg', ...opts });
  if (!res.error) paths.push(path);
  return res;
}

describe('receipts bucket', () => {
  it('is private, 5 MiB, image/* only', async () => {
    const { data } = await admin.storage.getBucket('receipts');
    expect(data).toMatchObject({ public: false, file_size_limit: 5242880, allowed_mime_types: ['image/*'] });
  });
});

describe('expenses/{expenseId}/…', () => {
  it('a member uploads a receipt; the other member can read it; a non-member cannot', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    const path = `expenses/${e.id}/${uuid()}.jpg`;
    expect((await upload(A.db, path)).error).toBeNull();
    expect((await bucket(C).download(path)).error).toBeNull();
    expect((await bucket(B).download(path)).error).not.toBeNull();
    expect((await anonDb.storage.from('receipts').download(path)).error).not.toBeNull();
  });

  it('another member may replace a receipt (upsert = update policy)', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    const path = `expenses/${e.id}/${uuid()}.jpg`;
    expect((await upload(A.db, path)).error).toBeNull();
    expect((await upload(C.db, path, { upsert: true })).error).toBeNull();
    expect((await upload(B.db, path, { upsert: true })).error).not.toBeNull();
  });

  it('a non-member cannot upload under someone else’s expense', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    expect((await upload(B.db, `expenses/${e.id}/${uuid()}.jpg`)).error).not.toBeNull();
  });

  it('an upload under an unknown expense id is denied', async () => {
    expect((await upload(A.db, `expenses/${uuid()}/${uuid()}.jpg`)).error).not.toBeNull();
  });

  it('the remove flow deletes objects before the row; afterwards nothing can reach them', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    const path = `expenses/${e.id}/${uuid()}.jpg`;
    expect((await upload(A.db, path)).error).toBeNull();

    // repos.expenses.remove: objects first…
    const removed = await bucket(A).remove([path]);
    expect(removed.error).toBeNull();
    expect(removed.data).toHaveLength(1);
    // …then the row.
    expect((await A.db.from('expenses').delete().eq('id', e.id)).error).toBeNull();

    const { data } = await admin.storage.from('receipts').list(`expenses/${e.id}`);
    expect(data).toEqual([]);
  });

  it('once the row is gone, a leftover object is unreachable for its former members', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    const path = `expenses/${e.id}/${uuid()}.jpg`;
    expect((await upload(A.db, path)).error).toBeNull();
    await admin.from('expenses').delete().eq('id', e.id);
    expect((await bucket(A).download(path)).error).not.toBeNull();
    const removed = await bucket(A).remove([path]);
    expect(removed.data ?? []).toEqual([]);
  });
});

describe('avatars/{uid}/…', () => {
  it('the owner uploads; any signed-in user can read; anon cannot', async () => {
    const path = `avatars/${A.id}/${uuid()}.jpg`;
    expect((await upload(A.db, path)).error).toBeNull();
    expect((await bucket(B).download(path)).error).toBeNull();
    expect((await anonDb.storage.from('receipts').download(path)).error).not.toBeNull();
  });

  it('the owner may replace and delete their own avatar', async () => {
    const path = `avatars/${A.id}/${uuid()}.jpg`;
    expect((await upload(A.db, path)).error).toBeNull();
    expect((await upload(A.db, path, { upsert: true })).error).toBeNull();
    const removed = await bucket(A).remove([path]);
    expect(removed.error).toBeNull();
    expect(removed.data).toHaveLength(1);
    expect((await admin.storage.from('receipts').list(`avatars/${A.id}`, { search: path.split('/').pop() })).data).toEqual([]);
  });

  it('another user cannot upload into, overwrite or delete the owner’s folder', async () => {
    const path = `avatars/${A.id}/${uuid()}.jpg`;
    expect((await upload(A.db, path)).error).toBeNull();
    expect((await upload(B.db, `avatars/${A.id}/${uuid()}.jpg`)).error).not.toBeNull();
    expect((await upload(B.db, path, { upsert: true })).error).not.toBeNull();
    const removed = await bucket(B).remove([path]);
    expect(removed.data ?? []).toEqual([]);
    expect((await bucket(A).download(path)).error).toBeNull();
  });

  it('a flat avatars/{uid}.jpg path has no owner segment and is denied', async () => {
    expect((await upload(A.db, `avatars/${A.id}.jpg`)).error).not.toBeNull();
  });

  it('a path outside the two prefixes is denied', async () => {
    expect((await upload(A.db, `misc/${A.id}/${uuid()}.jpg`)).error).not.toBeNull();
  });
});
