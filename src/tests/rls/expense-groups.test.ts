// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { allowed, befriend, cast, createActor, denied, groupRow, noRows, seed, truth, type Actor } from './fixtures';

/** Spec D10 policy table, `expense_groups` row + guard_expense_groups. */
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

describe('expense_groups · select', () => {
  it('a member sees the group; a non-member and anon do not', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    expect((await A.db.from('expense_groups').select('id').eq('id', g.id)).data).toHaveLength(1);
    expect((await C.db.from('expense_groups').select('id').eq('id', g.id)).data).toHaveLength(1);
    expect((await B.db.from('expense_groups').select('id').eq('id', g.id)).data).toEqual([]);
    expect((await anonDb.from('expense_groups').select('id').eq('id', g.id)).data ?? []).toEqual([]);
  });
});

describe('expense_groups · insert', () => {
  it('the creator may create a group with accepted friends', async () => {
    allowed(await A.db.from('expense_groups').insert(groupRow(A, [C])));
  });

  it('denies a member who is not an accepted friend of the creator', async () => {
    denied(await A.db.from('expense_groups').insert(groupRow(A, [B])), '42501');
  });

  it('denies created_by other than the actor', async () => {
    denied(await A.db.from('expense_groups').insert(groupRow(A, [C], { created_by: C.id })), '42501');
  });

  it('denies a creator missing from member_ids', async () => {
    const row = groupRow(A, [C], { member_ids: [C.id], admin_ids: [C.id] });
    denied(await A.db.from('expense_groups').insert(row), '42501');
  });

  it('denies a creator missing from admin_ids', async () => {
    denied(await A.db.from('expense_groups').insert(groupRow(A, [C], { admin_ids: [C.id] })), '42501');
  });

  it('denies anon', async () => {
    denied(await anonDb.from('expense_groups').insert(groupRow(A, [C])));
  });
});

describe('expense_groups · update', () => {
  it('any member may edit ordinary fields', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    allowed(await C.db.from('expense_groups').update({ name: 'Renamed' }).eq('id', g.id));
    expect((await truth('expense_groups', g.id as string))!.name).toBe('Renamed');
  });

  it('a non-member and anon match no row', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    noRows(await B.db.from('expense_groups').update({ name: 'x' }).eq('id', g.id).select('id'));
    const res = await anonDb.from('expense_groups').update({ name: 'x' }).eq('id', g.id).select('id');
    expect(res.data ?? []).toEqual([]);
    expect((await truth('expense_groups', g.id as string))!.name).toBe('Group');
  });

  it('guard: a non-admin member cannot change member_ids or admin_ids', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    denied(await C.db.from('expense_groups').update({ admin_ids: [A.id, C.id] }).eq('id', g.id), '42501');
    denied(await C.db.from('expense_groups').update({ member_ids: [C.id, A.id] }).eq('id', g.id), '42501');
  });

  it('guard: an admin may add an accepted friend', async () => {
    const g = await seed('expense_groups', groupRow(A, []));
    allowed(await A.db.from('expense_groups').update({ member_ids: [A.id, C.id] }).eq('id', g.id));
  });

  it('guard: an admin cannot add a non-friend', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    denied(await A.db.from('expense_groups').update({ member_ids: [A.id, C.id, B.id] }).eq('id', g.id), '42501');
  });

  it('guard: nobody can change created_by', async () => {
    const g = await seed('expense_groups', groupRow(A, [C], { admin_ids: [A.id, C.id] }));
    denied(await A.db.from('expense_groups').update({ created_by: C.id }).eq('id', g.id), '42501');
    denied(await C.db.from('expense_groups').update({ created_by: C.id }).eq('id', g.id), '42501');
  });

  it('with check: a member cannot remove themselves', async () => {
    const g = await seed('expense_groups', groupRow(A, [C], { admin_ids: [A.id, C.id] }));
    denied(await C.db.from('expense_groups').update({ member_ids: [A.id], admin_ids: [A.id] }).eq('id', g.id), '42501');
  });

  it('an admin removing another member keeps them out of later reads', async () => {
    const D = await createActor('D');
    await befriend(A, D);
    const g = await seed('expense_groups', groupRow(A, [C, D]));
    allowed(await A.db.from('expense_groups').update({ member_ids: [A.id, C.id] }).eq('id', g.id));
    expect((await D.db.from('expense_groups').select('id').eq('id', g.id)).data).toEqual([]);
  });
});

describe('expense_groups · delete', () => {
  it('an admin may delete', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    allowed(await A.db.from('expense_groups').delete().eq('id', g.id));
    expect(await truth('expense_groups', g.id as string)).toBeNull();
  });

  it('a non-admin member, a non-member and anon cannot', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    noRows(await C.db.from('expense_groups').delete().eq('id', g.id).select('id'));
    noRows(await B.db.from('expense_groups').delete().eq('id', g.id).select('id'));
    const res = await anonDb.from('expense_groups').delete().eq('id', g.id).select('id');
    expect(res.data ?? []).toEqual([]);
    expect(await truth('expense_groups', g.id as string)).not.toBeNull();
  });
});
