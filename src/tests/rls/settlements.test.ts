// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, allowed, cast, denied, groupRow, noRows, seed, settlementRow, truth, type Actor } from './fixtures';

/** Spec D10 policy table, `settlements` row (immutable: no update policy). */
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

describe('settlements · select', () => {
  it('both parties see it; a non-member and anon do not', async () => {
    const s = await seed('settlements', settlementRow(A, A, C));
    expect((await A.db.from('settlements').select('id').eq('id', s.id)).data).toHaveLength(1);
    expect((await C.db.from('settlements').select('id').eq('id', s.id)).data).toHaveLength(1);
    expect((await B.db.from('settlements').select('id').eq('id', s.id)).data).toEqual([]);
    expect((await anonDb.from('settlements').select('id').eq('id', s.id)).data ?? []).toEqual([]);
  });
});

describe('settlements · insert', () => {
  it('a party may record a payment with an accepted friend', async () => {
    allowed(await A.db.from('settlements').insert(settlementRow(A, A, C)));
    allowed(await A.db.from('settlements').insert(settlementRow(A, C, A)));
  });

  it('a group settlement between members is allowed', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    allowed(await C.db.from('settlements').insert(settlementRow(C, C, A, { group_id: g.id })));
  });

  it('denies an actor who is not a party', async () => {
    const D = { id: C.id } as Actor;
    denied(await B.db.from('settlements').insert(settlementRow(B, A, D)), '42501');
  });

  it('denies member_ids other than exactly {from, to}', async () => {
    denied(await A.db.from('settlements').insert(settlementRow(A, A, C, { member_ids: [A.id] })), '42501');
    denied(
      await A.db.from('settlements').insert(settlementRow(A, A, C, { member_ids: [A.id, C.id, B.id] })),
      '42501',
    );
  });

  it('mirror: a unilateral settlement with a non-friend is denied', async () => {
    denied(await A.db.from('settlements').insert(settlementRow(A, B, A)), '42501');
  });

  it('mirror: a group settlement with a non-member party is denied', async () => {
    const g = await seed('expense_groups', groupRow(A, []));
    denied(await A.db.from('settlements').insert(settlementRow(A, A, C, { group_id: g.id })), '42501');
  });

  it('denies created_by other than the actor', async () => {
    denied(await A.db.from('settlements').insert(settlementRow(C, A, C)), '42501');
  });

  it('denies anon', async () => {
    denied(await anonDb.from('settlements').insert(settlementRow(A, A, C)));
  });
});

describe('settlements · update (immutable)', () => {
  it('nobody can update, not even the creator', async () => {
    const s = await seed('settlements', settlementRow(A, A, C));
    noRows(await A.db.from('settlements').update({ amount: 1 }).eq('id', s.id).select('id'));
    noRows(await C.db.from('settlements').update({ amount: 1 }).eq('id', s.id).select('id'));
    noRows(await B.db.from('settlements').update({ amount: 1 }).eq('id', s.id).select('id'));
    expect(Number((await truth('settlements', s.id as string))!.amount)).toBe(50);
  });

  it('guard: created_by is immutable even on maintenance paths', async () => {
    const s = await seed('settlements', settlementRow(A, A, C));
    denied(await admin.from('settlements').update({ created_by: C.id }).eq('id', s.id), '42501');
  });
});

describe('settlements · delete', () => {
  it('the creator may delete', async () => {
    const s = await seed('settlements', settlementRow(A, A, C));
    allowed(await A.db.from('settlements').delete().eq('id', s.id));
    expect(await truth('settlements', s.id as string)).toBeNull();
  });

  it('the other party, a non-member and anon cannot', async () => {
    const s = await seed('settlements', settlementRow(A, A, C));
    noRows(await C.db.from('settlements').delete().eq('id', s.id).select('id'));
    noRows(await B.db.from('settlements').delete().eq('id', s.id).select('id'));
    expect((await anonDb.from('settlements').delete().eq('id', s.id).select('id')).data ?? []).toEqual([]);
    expect(await truth('settlements', s.id as string)).not.toBeNull();
  });
});
