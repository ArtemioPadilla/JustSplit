// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  allowed,
  cast,
  createActor,
  denied,
  eventRow,
  expenseRow,
  groupRow,
  noRows,
  seed,
  truth,
  uuid,
  type Actor,
} from './fixtures';

/**
 * Plan B2d migration D (ADR 0013): edits check only what changed.
 *
 * `expenses_update` no longer re-derives membership from the whole row; the
 * rules that need OLD live in guard_expenses / guard_events and look at ADDED
 * members and at re-pointed group_id/event_id only. Removing someone from a
 * group therefore no longer locks the old rows, and a non-friend co-member
 * can edit (and be edited around).
 *
 * Cast: A (admin/creator), B (stranger), C (A's friend), D (non-friend of A:
 * a member of the same groups/events).
 *
 * Red/green for this file is verified by the CI "RLS & contract" job (and
 * locally against `supabase start`).
 */
let A: Actor, B: Actor, C: Actor, D: Actor;
let done: () => Promise<void>;

beforeAll(async () => {
  const c = await cast();
  ({ A, B, C } = c);
  done = c.cleanup;
  D = await createActor('D');
});
afterAll(() => done());

const desc = async (id: unknown) => (await truth('expenses', id as string))!.description;

describe('expenses · insert with an event', () => {
  it('a non-friend event member may create a no-group event expense with another event member', async () => {
    const ev = await seed('events', eventRow(A, [D]));
    allowed(await D.db.from('expenses').insert(expenseRow(D, [A], { event_id: ev.id })));
  });

  it('every other member must be an event member OR an accepted friend of the creator', async () => {
    const ev = await seed('events', eventRow(A, [D]));
    // C is A's friend but not in the event: allowed for A.
    allowed(await A.db.from('expenses').insert(expenseRow(A, [C], { event_id: ev.id })));
    // B is neither an event member nor A's friend: denied.
    denied(await A.db.from('expenses').insert(expenseRow(A, [B], { event_id: ev.id })), '42501');
  });

  it('a user who is not in the event cannot push an expense into its feed', async () => {
    const ev = await seed('events', eventRow(A, [D]));
    denied(await B.db.from('expenses').insert(expenseRow(B, [], { event_id: ev.id })), '42501');
    denied(await C.db.from('expenses').insert(expenseRow(C, [A], { event_id: ev.id })), '42501');
  });

  it('a group expense still needs member_ids within the group, whatever the event', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const ev = await seed('events', eventRow(A, [C, D]));
    denied(await A.db.from('expenses').insert(expenseRow(A, [D], { group_id: g.id, event_id: ev.id })), '42501');
    allowed(await A.db.from('expenses').insert(expenseRow(A, [C], { group_id: g.id, event_id: ev.id })));
  });
});

describe('expenses · update by a member who is not in member_ids', () => {
  it('a non-friend event member can edit the description of a no-group event expense; a stranger cannot', async () => {
    const ev = await seed('events', eventRow(A, [D]));
    const e = await seed('expenses', expenseRow(A, [C], { event_id: ev.id }));
    allowed(await D.db.from('expenses').update({ description: 'Edited by D' }).eq('id', e.id));
    expect(await desc(e.id)).toBe('Edited by D');
    noRows(await B.db.from('expenses').update({ description: 'x' }).eq('id', e.id).select('id'));
    expect(await desc(e.id)).toBe('Edited by D');
  });

  it('a group member can edit a group expense they are not in member_ids of', async () => {
    const g = await seed('expense_groups', groupRow(A, [D]));
    const e = await seed('expenses', expenseRow(A, [], { group_id: g.id }));
    allowed(await D.db.from('expenses').update({ description: 'Edited by D' }).eq('id', e.id));
    expect(await desc(e.id)).toBe('Edited by D');
  });
});

describe('removing a member does not lock old rows', () => {
  it('after the admin removes a member, another member can still edit an expense that still lists them', async () => {
    const g = await seed('expense_groups', groupRow(A, [C, D]));
    const e = await seed('expenses', expenseRow(A, [C, D], { group_id: g.id }));
    allowed(await A.db.from('expense_groups').update({ member_ids: [A.id, C.id] }).eq('id', g.id));

    allowed(await C.db.from('expenses').update({ description: 'Still editable' }).eq('id', e.id));
    allowed(await A.db.from('expenses').update({ description: 'Still editable by A' }).eq('id', e.id));
    expect(await desc(e.id)).toBe('Still editable by A');
    // ...and the removed member, who is still named on the row, can too.
    allowed(await D.db.from('expenses').update({ description: 'Editable by D' }).eq('id', e.id));
  });

  it('the same holds for an event that belongs to the group', async () => {
    const g = await seed('expense_groups', groupRow(A, [C, D]));
    const ev = await seed('events', eventRow(A, [C, D], { group_id: g.id }));
    allowed(await A.db.from('expense_groups').update({ member_ids: [A.id, C.id] }).eq('id', g.id));
    allowed(await A.db.from('events').update({ location: 'Oaxaca' }).eq('id', ev.id));
    allowed(await C.db.from('events').update({ location: 'Puebla' }).eq('id', ev.id));
    expect((await truth('events', ev.id as string))!.location).toBe('Puebla');
  });
});

describe('expenses · the guard checks added members only', () => {
  it('existing non-friend members do not block an unrelated edit, even when member_ids is re-sent unchanged', async () => {
    // B is not A's friend; the row was written before the friendship rule
    // mattered (or by someone whose friend B is).
    const e = await seed('expenses', expenseRow(A, [C, B]));
    allowed(await A.db.from('expenses').update({ description: 'Renamed' }).eq('id', e.id));
    allowed(await C.db.from('expenses').update({ description: 'Renamed by C', member_ids: [A.id, C.id, B.id] }).eq('id', e.id));
    expect(await desc(e.id)).toBe('Renamed by C');
  });

  it('adding a non-friend to a no-group, no-event expense is rejected; adding an accepted friend is allowed', async () => {
    const e = await seed('expenses', expenseRow(A, []));
    denied(await A.db.from('expenses').update({ member_ids: [A.id, B.id] }).eq('id', e.id), '42501');
    allowed(await A.db.from('expenses').update({ member_ids: [A.id, C.id] }).eq('id', e.id));
  });

  it('adding a non-group member to a group expense is rejected; adding a group member who is not the editor\'s friend is allowed', async () => {
    const g = await seed('expense_groups', groupRow(A, [C, D]));
    const e = await seed('expenses', expenseRow(A, [], { group_id: g.id }));
    denied(await A.db.from('expenses').update({ member_ids: [A.id, B.id] }).eq('id', e.id), '42501');
    // D is a group member but not A's friend: the group is the rule.
    allowed(await A.db.from('expenses').update({ member_ids: [A.id, D.id] }).eq('id', e.id));
  });

  it('on an event expense (no group) an added member must be an event member or the editor\'s friend', async () => {
    const ev = await seed('events', eventRow(A, [D]));
    const e = await seed('expenses', expenseRow(A, [], { event_id: ev.id }));
    allowed(await A.db.from('expenses').update({ member_ids: [A.id, D.id] }).eq('id', e.id)); // event member, not a friend
    allowed(await A.db.from('expenses').update({ member_ids: [A.id, D.id, C.id] }).eq('id', e.id)); // friend, not an event member
    denied(await A.db.from('expenses').update({ member_ids: [A.id, D.id, C.id, B.id] }).eq('id', e.id), '42501');
  });

  it('an event-only member cannot add anyone to a group expense (they are not a member of the group)', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const ev = await seed('events', eventRow(A, [D]));
    const e = await seed('expenses', expenseRow(A, [], { group_id: g.id, event_id: ev.id }));
    allowed(await D.db.from('expenses').update({ description: 'Edited by D' }).eq('id', e.id));
    denied(await D.db.from('expenses').update({ member_ids: [A.id, C.id] }).eq('id', e.id), '42501');
  });

  it('with check still holds: paid_by and every split user must be in member_ids; created_by is immutable', async () => {
    const g = await seed('expense_groups', groupRow(A, [D]));
    const e = await seed('expenses', expenseRow(A, [], { group_id: g.id }));
    denied(await D.db.from('expenses').update({ paid_by: B.id }).eq('id', e.id), '42501');
    denied(await D.db.from('expenses').update({ splits: [{ userId: B.id, amount: 100 }] }).eq('id', e.id), '42501');
    denied(await D.db.from('expenses').update({ created_by: D.id }).eq('id', e.id), '42501');
  });

  it('an editor cannot make the row invisible to themselves (with check: they must still see it)', async () => {
    const e = await seed('expenses', expenseRow(A, [C]));
    denied(await A.db.from('expenses').update({ member_ids: [C.id], paid_by: C.id, splits: [{ userId: C.id, amount: 100 }] }).eq('id', e.id), '42501');
  });
});

describe('expenses · pointing a row at a group or an event', () => {
  it('needs the actor to belong to the target: a group or event they are not in is rejected', async () => {
    const g = await seed('expense_groups', groupRow(C, []));
    const ev = await seed('events', eventRow(C, []));
    const e = await seed('expenses', expenseRow(A, []));
    denied(await A.db.from('expenses').update({ group_id: g.id }).eq('id', e.id), '42501');
    denied(await A.db.from('expenses').update({ event_id: ev.id }).eq('id', e.id), '42501');
    expect((await truth('expenses', e.id as string))!.group_id).toBeNull();
  });

  it('attaching to a group works for a participant when member_ids ⊆ the group (the B12 flow), not otherwise', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const ok = await seed('expenses', expenseRow(A, [C]));
    allowed(await A.db.from('expenses').update({ group_id: g.id, member_ids: [A.id, C.id] }).eq('id', ok.id));
    const stray = await seed('expenses', expenseRow(A, [C, B]));
    denied(await A.db.from('expenses').update({ group_id: g.id }).eq('id', stray.id), '42501');
  });

  it('linking to an event works for a participant who is an event member', async () => {
    const ev = await seed('events', eventRow(A, [C]));
    const e = await seed('expenses', expenseRow(A, [C]));
    allowed(await A.db.from('expenses').update({ event_id: ev.id }).eq('id', e.id));
    expect((await truth('expenses', e.id as string))!.event_id).toBe(ev.id);
  });

  it('someone who only sees a row through the group cannot move it into another group', async () => {
    const mine = await seed('expense_groups', groupRow(D, []));
    const theirs = await seed('expense_groups', groupRow(A, [D]));
    const e = await seed('expenses', expenseRow(A, [], { group_id: theirs.id })); // D sees it, is not in member_ids
    denied(await D.db.from('expenses').update({ group_id: mine.id }).eq('id', e.id), '42501');
  });

  it('nulling group_id or event_id is allowed, and an unknown id is rejected by the foreign key', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const ev = await seed('events', eventRow(A, [C]));
    const e = await seed('expenses', expenseRow(A, [C], { group_id: g.id, event_id: ev.id }));
    denied(await A.db.from('expenses').update({ event_id: uuid() }).eq('id', e.id));
    allowed(await A.db.from('expenses').update({ group_id: null, event_id: null }).eq('id', e.id));
    const row = (await truth('expenses', e.id as string))!;
    expect([row.group_id, row.event_id]).toEqual([null, null]);
  });
});

describe('events · the guard checks added members only', () => {
  it('a group event may take an added member who is in the group but not the editor\'s friend', async () => {
    const g = await seed('expense_groups', groupRow(A, [C, D]));
    const ev = await seed('events', eventRow(A, [C], { group_id: g.id }));
    allowed(await A.db.from('events').update({ member_ids: [A.id, C.id, D.id] }).eq('id', ev.id));
    denied(await A.db.from('events').update({ member_ids: [A.id, C.id, D.id, B.id] }).eq('id', ev.id), '42501');
  });

  it('an existing member who left the group does not block an edit of the event', async () => {
    const g = await seed('expense_groups', groupRow(A, [C, D]));
    const ev = await seed('events', eventRow(A, [C, D], { group_id: g.id }));
    allowed(await A.db.from('expense_groups').update({ member_ids: [A.id, C.id] }).eq('id', g.id));
    allowed(await D.db.from('events').update({ location: 'Edited by the removed member' }).eq('id', ev.id));
  });

  it('attaching an event to a group needs the actor in the group and member_ids within it', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const ok = await seed('events', eventRow(A, [C]));
    allowed(await A.db.from('events').update({ group_id: g.id }).eq('id', ok.id));
    const stray = await seed('events', eventRow(A, [C, D]));
    denied(await A.db.from('events').update({ group_id: g.id }).eq('id', stray.id), '42501');
    const foreign = await seed('expense_groups', groupRow(C, []));
    const mine = await seed('events', eventRow(A, []));
    denied(await A.db.from('events').update({ group_id: foreign.id }).eq('id', mine.id), '42501');
  });

  it('a member cannot remove themselves from an event (with check), and created_by stays immutable', async () => {
    const ev = await seed('events', eventRow(A, [C]));
    denied(await C.db.from('events').update({ member_ids: [A.id] }).eq('id', ev.id), '42501');
    denied(await A.db.from('events').update({ created_by: C.id }).eq('id', ev.id), '42501');
  });
});
