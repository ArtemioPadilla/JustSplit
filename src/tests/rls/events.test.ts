// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { allowed, cast, denied, eventRow, groupRow, noRows, seed, truth, type Actor } from './fixtures';

/** Spec D10 policy table, `events` row + membership mirror + guard_events. */
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

describe('events · select', () => {
  it('members see it; a non-member and anon do not', async () => {
    const e = await seed('events', eventRow(A, [C]));
    expect((await C.db.from('events').select('id').eq('id', e.id)).data).toHaveLength(1);
    expect((await B.db.from('events').select('id').eq('id', e.id)).data).toEqual([]);
    expect((await anonDb.from('events').select('id').eq('id', e.id)).data ?? []).toEqual([]);
  });
});

describe('events · insert', () => {
  it('an ungrouped event with an accepted friend is allowed', async () => {
    allowed(await A.db.from('events').insert(eventRow(A, [C])));
  });

  it('a group event within the group members is allowed', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    allowed(await A.db.from('events').insert(eventRow(A, [C], { group_id: g.id })));
  });

  it('mirror: an ungrouped event with a non-friend is denied', async () => {
    denied(await A.db.from('events').insert(eventRow(A, [B])), '42501');
  });

  it('mirror: a group event whose member_ids ⊄ group.member_ids is denied', async () => {
    const g = await seed('expense_groups', groupRow(A, []));
    denied(await A.db.from('events').insert(eventRow(A, [C], { group_id: g.id })), '42501');
  });

  it('denies created_by other than the actor and a creator outside member_ids', async () => {
    denied(await A.db.from('events').insert(eventRow(A, [C], { created_by: C.id })), '42501');
    denied(await A.db.from('events').insert(eventRow(A, [C], { member_ids: [C.id] })), '42501');
  });

  it('denies anon', async () => {
    denied(await anonDb.from('events').insert(eventRow(A, [C])));
  });
});

describe('events · update', () => {
  it('any member may edit', async () => {
    const e = await seed('events', eventRow(A, [C]));
    allowed(await C.db.from('events').update({ location: 'Oaxaca' }).eq('id', e.id));
    expect((await truth('events', e.id as string))!.location).toBe('Oaxaca');
  });

  it('a non-member and anon match no row', async () => {
    const e = await seed('events', eventRow(A, [C]));
    noRows(await B.db.from('events').update({ location: 'x' }).eq('id', e.id).select('id'));
    expect((await anonDb.from('events').update({ location: 'x' }).eq('id', e.id).select('id')).data ?? []).toEqual([]);
  });

  it('mirror: adding a non-friend is rejected', async () => {
    const e = await seed('events', eventRow(A, [C]));
    denied(await A.db.from('events').update({ member_ids: [A.id, C.id, B.id] }).eq('id', e.id), '42501');
  });

  it('guard: created_by is immutable', async () => {
    const e = await seed('events', eventRow(A, [C]));
    denied(await A.db.from('events').update({ created_by: C.id }).eq('id', e.id), '42501');
  });
});

describe('events · delete', () => {
  it('the creator may delete', async () => {
    const e = await seed('events', eventRow(A, [C]));
    allowed(await A.db.from('events').delete().eq('id', e.id));
    expect(await truth('events', e.id as string)).toBeNull();
  });

  it('another member, a non-member and anon cannot', async () => {
    const e = await seed('events', eventRow(A, [C]));
    noRows(await C.db.from('events').delete().eq('id', e.id).select('id'));
    noRows(await B.db.from('events').delete().eq('id', e.id).select('id'));
    expect((await anonDb.from('events').delete().eq('id', e.id).select('id')).data ?? []).toEqual([]);
    expect(await truth('events', e.id as string)).not.toBeNull();
  });
});
