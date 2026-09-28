// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { allowed, cast, denied, expenseRow, groupRow, noRows, seed, truth, type Actor } from './fixtures';

/** Spec D10 policy table, `expenses` row + membership mirror + guard_expenses. */
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

describe('expenses · select', () => {
  it('members see it; a non-member and anon do not', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    expect((await A.db.from('expenses').select('id').eq('id', e.id)).data).toHaveLength(1);
    expect((await C.db.from('expenses').select('id').eq('id', e.id)).data).toHaveLength(1);
    expect((await B.db.from('expenses').select('id').eq('id', e.id)).data).toEqual([]);
    expect((await anonDb.from('expenses').select('id').eq('id', e.id)).data ?? []).toEqual([]);
  });
});

describe('expenses · insert', () => {
  it('an ungrouped expense with an accepted friend is allowed', async () => {
    allowed(await A.db.from('expenses').insert(expenseRow(A, [C])));
  });

  it('a group expense within the group members is allowed', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    allowed(await C.db.from('expenses').insert(expenseRow(C, [A], { group_id: g.id })));
  });

  it('mirror: an ungrouped expense with a non-friend is denied', async () => {
    denied(await A.db.from('expenses').insert(expenseRow(A, [B])), '42501');
  });

  it('mirror: a group expense whose member_ids ⊄ group.member_ids is denied', async () => {
    const g = await seed('expense_groups', groupRow(A, []));
    denied(await A.db.from('expenses').insert(expenseRow(A, [C], { group_id: g.id })), '42501');
  });

  it('mirror: an expense in a group the actor is not in is denied', async () => {
    const g = await seed('expense_groups', groupRow(C, []));
    denied(await A.db.from('expenses').insert(expenseRow(A, [], { group_id: g.id })), '42501');
  });

  it('denies created_by other than the actor', async () => {
    denied(await A.db.from('expenses').insert(expenseRow(A, [C], { created_by: C.id })), '42501');
  });

  it('denies a creator missing from member_ids', async () => {
    const row = expenseRow(A, [C], { member_ids: [C.id], paid_by: C.id, splits: [{ userId: C.id, amount: 100 }] });
    denied(await A.db.from('expenses').insert(row), '42501');
  });

  it('denies paid_by outside member_ids', async () => {
    denied(await A.db.from('expenses').insert(expenseRow(A, [C], { paid_by: B.id })), '42501');
  });

  it('denies a splits[].userId outside member_ids', async () => {
    const row = expenseRow(A, [C], { splits: [{ userId: A.id, amount: 50 }, { userId: B.id, amount: 50 }] });
    denied(await A.db.from('expenses').insert(row), '42501');
  });

  it('denies anon', async () => {
    denied(await anonDb.from('expenses').insert(expenseRow(A, [C])));
  });
});

describe('expenses · update', () => {
  it('any member may edit ordinary fields', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    allowed(await C.db.from('expenses').update({ description: 'Pizza' }).eq('id', e.id));
    expect((await truth('expenses', e.id as string))!.description).toBe('Pizza');
  });

  it('a non-member and anon match no row', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    noRows(await B.db.from('expenses').update({ description: 'x' }).eq('id', e.id).select('id'));
    expect((await anonDb.from('expenses').update({ description: 'x' }).eq('id', e.id).select('id')).data ?? []).toEqual([]);
    expect((await truth('expenses', e.id as string))!.description).toBe('Tacos');
  });

  it('with check: paid_by outside member_ids is rejected', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    denied(await A.db.from('expenses').update({ paid_by: B.id }).eq('id', e.id), '42501');
  });

  it('with check: a splits[].userId outside member_ids is rejected', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    denied(await A.db.from('expenses').update({ splits: [{ userId: B.id, amount: 100 }] }).eq('id', e.id), '42501');
  });

  it('mirror: adding a non-friend to member_ids is rejected', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    denied(await A.db.from('expenses').update({ member_ids: [A.id, C.id, B.id] }).eq('id', e.id), '42501');
  });

  it('guard: created_by is immutable', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    denied(await A.db.from('expenses').update({ created_by: C.id }).eq('id', e.id), '42501');
  });
});

describe('expenses · delete', () => {
  it('the creator may delete', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    allowed(await A.db.from('expenses').delete().eq('id', e.id));
    expect(await truth('expenses', e.id as string)).toBeNull();
  });

  it('the payer may delete', async () => {
    const e = await seed('expenses', expenseRow(A, [C], { paid_by: C.id }));
    allowed(await C.db.from('expenses').delete().eq('id', e.id));
    expect(await truth('expenses', e.id as string)).toBeNull();
  });

  it('a member who is neither creator nor payer, a non-member and anon cannot', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    noRows(await C.db.from('expenses').delete().eq('id', e.id).select('id'));
    noRows(await B.db.from('expenses').delete().eq('id', e.id).select('id'));
    expect((await anonDb.from('expenses').delete().eq('id', e.id).select('id')).data ?? []).toEqual([]);
    expect(await truth('expenses', e.id as string)).not.toBeNull();
  });
});
