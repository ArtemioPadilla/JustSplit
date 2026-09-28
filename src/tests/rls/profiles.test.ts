// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, allowed, cast, denied, noRows, type Actor } from './fixtures';

/** `profiles`: own-row for every command (hub migration, copied verbatim). */
let A: Actor, B: Actor;
let anonDb: Awaited<ReturnType<typeof cast>>['anon'];
let done: () => Promise<void>;

beforeAll(async () => {
  const c = await cast();
  ({ A, B } = c);
  anonDb = c.anon;
  done = c.cleanup;
});
afterAll(() => done());

describe('profiles', () => {
  it('select: own row only', async () => {
    expect((await A.db.from('profiles').select('id').eq('id', A.id)).data).toHaveLength(1);
    expect((await B.db.from('profiles').select('id').eq('id', A.id)).data).toEqual([]);
    expect((await anonDb.from('profiles').select('id').eq('id', A.id)).data ?? []).toEqual([]);
  });

  it('insert: own row only', async () => {
    await admin.from('profiles').delete().eq('id', A.id);
    allowed(await A.db.from('profiles').insert({ id: A.id, name: 'A' }));
    denied(await B.db.from('profiles').insert({ id: A.id, name: 'hijack' }));
    denied(await anonDb.from('profiles').insert({ id: A.id, name: 'hijack' }));
  });

  it('update: own row only', async () => {
    allowed(await A.db.from('profiles').update({ name: 'Ana' }).eq('id', A.id));
    noRows(await B.db.from('profiles').update({ name: 'x' }).eq('id', A.id).select('id'));
    expect((await anonDb.from('profiles').update({ name: 'x' }).eq('id', A.id).select('id')).data ?? []).toEqual([]);
    const { data } = await admin.from('profiles').select('name').eq('id', A.id).single();
    expect(data!.name).toBe('Ana');
  });

  it('update: a user cannot move their row to another id', async () => {
    denied(await A.db.from('profiles').update({ id: B.id }).eq('id', A.id));
  });

  it('delete: own row only', async () => {
    noRows(await B.db.from('profiles').delete().eq('id', A.id).select('id'));
    expect((await anonDb.from('profiles').delete().eq('id', A.id).select('id')).data ?? []).toEqual([]);
    allowed(await A.db.from('profiles').delete().eq('id', A.id));
    const { data } = await admin.from('profiles').select('id').eq('id', A.id);
    expect(data).toEqual([]);
  });
});
