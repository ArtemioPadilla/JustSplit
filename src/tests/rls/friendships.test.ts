// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, allowed, cast, createActor, denied, noRows, truth, uuid, type Actor } from './fixtures';

/** Spec D10 policy table, `friendships` row + guard_friendships + pair index. */
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

const request = (from: Actor, to: Actor, over: Record<string, unknown> = {}) => ({
  id: uuid(),
  users: [from.id, to.id],
  status: 'pending',
  requested_by: from.id,
  ...over,
});

/** A fresh pending request between two new users (requester R → recipient T). */
async function pending() {
  const R = await createActor('R');
  const T = await createActor('T');
  const row = request(R, T);
  allowed(await R.db.from('friendships').insert(row));
  return { R, T, id: row.id };
}

describe('friendships · select', () => {
  it('both parties see it; a stranger and anon do not', async () => {
    const { R, T, id } = await pending();
    expect((await R.db.from('friendships').select('id').eq('id', id)).data).toHaveLength(1);
    expect((await T.db.from('friendships').select('id').eq('id', id)).data).toHaveLength(1);
    expect((await B.db.from('friendships').select('id').eq('id', id)).data).toEqual([]);
    expect((await anonDb.from('friendships').select('id').eq('id', id)).data ?? []).toEqual([]);
  });
});

describe('friendships · insert', () => {
  it('a user may send a pending request', async () => {
    allowed(await B.db.from('friendships').insert(request(B, C)));
  });

  it('denies a request created as already accepted', async () => {
    const X = await createActor('X');
    denied(await X.db.from('friendships').insert(request(X, A, { status: 'accepted' })), '42501');
  });

  it('denies requested_by other than the actor', async () => {
    const X = await createActor('X');
    denied(await X.db.from('friendships').insert(request(X, A, { requested_by: A.id })), '42501');
  });

  it('denies a request the actor is not part of', async () => {
    const X = await createActor('X');
    denied(await X.db.from('friendships').insert(request(A, B, { requested_by: X.id })), '42501');
  });

  it('denies cardinality(users) <> 2', async () => {
    const X = await createActor('X');
    denied(await X.db.from('friendships').insert(request(X, A, { users: [X.id, A.id, B.id] })));
    denied(await X.db.from('friendships').insert(request(X, A, { users: [X.id] })));
  });

  it('a second request for the same pair is a unique violation, in either direction', async () => {
    const { R, T } = await pending();
    denied(await R.db.from('friendships').insert(request(R, T)), '23505');
    denied(await T.db.from('friendships').insert(request(T, R)), '23505');
  });

  it('denies anon', async () => {
    denied(await anonDb.from('friendships').insert(request(A, B)));
  });
});

describe('friendships · update', () => {
  it('the recipient may accept', async () => {
    const { T, id } = await pending();
    allowed(await T.db.from('friendships').update({ status: 'accepted' }).eq('id', id));
    expect((await truth('friendships', id))!.status).toBe('accepted');
  });

  it('guard: the requester cannot change status', async () => {
    const { R, id } = await pending();
    denied(await R.db.from('friendships').update({ status: 'accepted' }).eq('id', id), '42501');
  });

  it('guard: users and requested_by are immutable', async () => {
    const { R, T, id } = await pending();
    denied(await T.db.from('friendships').update({ users: [T.id, B.id] }).eq('id', id), '42501');
    denied(await T.db.from('friendships').update({ requested_by: T.id }).eq('id', id), '42501');
    denied(await R.db.from('friendships').update({ users: [R.id, B.id] }).eq('id', id), '42501');
  });

  it('a stranger and anon match no row', async () => {
    const { id } = await pending();
    noRows(await B.db.from('friendships').update({ status: 'accepted' }).eq('id', id).select('id'));
    expect((await anonDb.from('friendships').update({ status: 'accepted' }).eq('id', id).select('id')).data ?? []).toEqual([]);
    expect((await truth('friendships', id))!.status).toBe('pending');
  });
});

describe('friendships · delete', () => {
  it('either party may delete', async () => {
    const a = await pending();
    allowed(await a.R.db.from('friendships').delete().eq('id', a.id));
    expect(await truth('friendships', a.id)).toBeNull();
    const b = await pending();
    allowed(await b.T.db.from('friendships').delete().eq('id', b.id));
    expect(await truth('friendships', b.id)).toBeNull();
  });

  it('a stranger and anon cannot', async () => {
    const { id } = await pending();
    noRows(await B.db.from('friendships').delete().eq('id', id).select('id'));
    expect((await anonDb.from('friendships').delete().eq('id', id).select('id')).data ?? []).toEqual([]);
    expect(await truth('friendships', id)).not.toBeNull();
  });
});

describe('friendships · maintenance paths', () => {
  it('guard: users stay immutable for the service role too', async () => {
    const { id } = await pending();
    denied(await admin.from('friendships').update({ users: [A.id, B.id] }).eq('id', id), '42501');
  });
});
