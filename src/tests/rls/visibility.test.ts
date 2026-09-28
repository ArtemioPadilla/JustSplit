// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
  allowed,
  cast,
  createActor,
  eventRow,
  expenseRow,
  groupRow,
  seed,
  settlementRow,
  uuid,
  type Actor,
} from './fixtures';

/**
 * Plan B2d migration C (ADR 0013): visibility follows membership.
 *
 * A row of `expenses` / `settlements` is visible to a user who is in its
 * `member_ids`, OR is a member of its group (`group_id`), OR is a member of its
 * event (`event_id`). The receipts bucket follows the expense's visibility.
 *
 * Cast: A (creator/admin), B (stranger), C (A's friend), D (a member of the
 * same group/event as A but NOT A's friend, and not in the rows' member_ids).
 *
 * Red/green for this file is verified by the CI "RLS & contract" job (and
 * locally against `supabase start`).
 */
let A: Actor, B: Actor, C: Actor, D: Actor;
let anonDb: Awaited<ReturnType<typeof cast>>['anon'];
let done: () => Promise<void>;
const paths: string[] = [];

beforeAll(async () => {
  const c = await cast();
  ({ A, B, C } = c);
  anonDb = c.anon;
  done = c.cleanup;
  D = await createActor('D');
});
afterAll(async () => {
  if (paths.length) await admin.storage.from('receipts').remove(paths);
  await done();
});

const ids = (res: { data: unknown }) => ((res.data ?? []) as { id: string }[]).map((r) => r.id);
const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], { type: 'image/jpeg' });
async function upload(who: Actor, path: string, opts: { upsert?: boolean } = {}) {
  const res = await who.db.storage.from('receipts').upload(path, jpeg(), { contentType: 'image/jpeg', ...opts });
  if (!res.error) paths.push(path);
  return res;
}

describe('expenses · select follows event membership', () => {
  it('a non-friend event member sees a no-group event expense they are not in member_ids of; a stranger and anon do not', async () => {
    const ev = await seed('events', eventRow(A, [D]));
    const e = await seed('expenses', expenseRow(A, [C], { event_id: ev.id }));
    expect(ids(await D.db.from('expenses').select('id').eq('id', e.id))).toEqual([e.id]);
    expect(ids(await B.db.from('expenses').select('id').eq('id', e.id))).toEqual([]);
    expect(ids(await anonDb.from('expenses').select('id').eq('id', e.id))).toEqual([]);
  });

  it('the canonical eventId query returns every event expense to every event member (event totals no longer differ by viewer)', async () => {
    const ev = await seed('events', eventRow(A, [C, D]));
    const withC = await seed('expenses', expenseRow(A, [C], { event_id: ev.id }));
    const soloA = await seed('expenses', expenseRow(A, [], { event_id: ev.id }));
    for (const who of [A, C, D]) {
      expect(ids(await who.db.from('expenses').select('id').eq('event_id', ev.id)).sort(), who.name).toEqual([withC.id, soloA.id].sort());
    }
    expect(ids(await B.db.from('expenses').select('id').eq('event_id', ev.id))).toEqual([]);
  });
});

describe('expenses · select follows group membership', () => {
  it('a member added to the group after an expense was created sees it (not in its member_ids)', async () => {
    const g = await seed('expense_groups', groupRow(A, []));
    const e = await seed('expenses', expenseRow(A, [], { group_id: g.id }));
    expect(ids(await C.db.from('expenses').select('id').eq('id', e.id))).toEqual([]);

    allowed(await A.db.from('expense_groups').update({ member_ids: [A.id, C.id] }).eq('id', g.id));

    expect(ids(await C.db.from('expenses').select('id').eq('id', e.id))).toEqual([e.id]);
  });

  it('a member removed from the group still reads the old rows that list them, but no longer sees the rest of the group', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const namesC = await seed('expenses', expenseRow(A, [C], { group_id: g.id }));
    const onlyA = await seed('expenses', expenseRow(A, [], { group_id: g.id }));
    expect(ids(await C.db.from('expenses').select('id').eq('group_id', g.id)).sort()).toEqual([namesC.id, onlyA.id].sort());

    allowed(await A.db.from('expense_groups').update({ member_ids: [A.id] }).eq('id', g.id));

    expect(ids(await C.db.from('expenses').select('id').eq('group_id', g.id))).toEqual([namesC.id]);
    expect(ids(await C.db.from('expense_groups').select('id').eq('id', g.id))).toEqual([]);
  });

  it('being in the same group as the row is not enough when the group is a different one', async () => {
    const mine = await seed('expense_groups', groupRow(A, [C]));
    const other = await seed('expense_groups', groupRow(A, [D]));
    const e = await seed('expenses', expenseRow(A, [], { group_id: other.id }));
    expect(mine.id).not.toBe(other.id);
    expect(ids(await C.db.from('expenses').select('id').eq('id', e.id))).toEqual([]);
    expect(ids(await D.db.from('expenses').select('id').eq('id', e.id))).toEqual([e.id]);
  });
});

describe('settlements · select follows membership', () => {
  it('a group member who is not a party sees the group settlement; a stranger does not', async () => {
    const g = await seed('expense_groups', groupRow(A, [C, D]));
    const s = await seed('settlements', settlementRow(A, A, C, { group_id: g.id }));
    expect(ids(await D.db.from('settlements').select('id').eq('id', s.id))).toEqual([s.id]);
    expect(ids(await B.db.from('settlements').select('id').eq('id', s.id))).toEqual([]);
    expect(ids(await anonDb.from('settlements').select('id').eq('id', s.id))).toEqual([]);
  });

  it('an event member who is not a party sees the event settlement', async () => {
    const ev = await seed('events', eventRow(A, [C, D]));
    const s = await seed('settlements', settlementRow(A, A, C, { event_id: ev.id }));
    expect(ids(await D.db.from('settlements').select('id').eq('event_id', ev.id))).toEqual([s.id]);
    expect(ids(await B.db.from('settlements').select('id').eq('event_id', ev.id))).toEqual([]);
  });
});

describe('the membership helpers', () => {
  it('anon cannot call them; a signed-in user learns only about themselves', async () => {
    const g = await seed('expense_groups', groupRow(A, [C]));
    const ev = await seed('events', eventRow(A, [D]));
    for (const [fn, args] of [
      ['is_group_member', { gid: g.id }],
      ['is_event_member', { eid: ev.id }],
      ['can_see_expense', { eid: uuid() }],
    ] as const) {
      expect((await anonDb.rpc(fn, args)).error?.code, fn).toBe('42501');
    }
    expect((await C.db.rpc('is_group_member', { gid: g.id })).data).toBe(true);
    expect((await B.db.rpc('is_group_member', { gid: g.id })).data).toBe(false);
    expect((await D.db.rpc('is_event_member', { eid: ev.id })).data).toBe(true);
    expect((await C.db.rpc('is_event_member', { eid: ev.id })).data).toBe(false);
    expect((await A.db.rpc('is_group_member', { gid: uuid() })).data).toBe(false);
  });
});

describe('receipts follow the expense visibility', () => {
  it('a group member who is not in member_ids can read, replace, add and delete a receipt of a group expense; a stranger cannot', async () => {
    const g = await seed('expense_groups', groupRow(A, [D]));
    const e = await seed('expenses', expenseRow(A, [], { group_id: g.id }));
    const path = `expenses/${e.id}/${uuid()}.jpg`;
    expect((await upload(A, path)).error).toBeNull();

    expect((await D.db.storage.from('receipts').download(path)).error).toBeNull();
    expect((await B.db.storage.from('receipts').download(path)).error).not.toBeNull();
    expect((await upload(D, path, { upsert: true })).error).toBeNull();
    expect((await upload(D, `expenses/${e.id}/${uuid()}.jpg`)).error).toBeNull();
    expect((await upload(B, `expenses/${e.id}/${uuid()}.jpg`)).error).not.toBeNull();
    const removed = await D.db.storage.from('receipts').remove([path]);
    expect(removed.error).toBeNull();
    expect(removed.data).toHaveLength(1);
  });

  it('an event member who is not in member_ids can read a receipt of an event expense', async () => {
    const ev = await seed('events', eventRow(A, [D]));
    const e = await seed('expenses', expenseRow(A, [C], { event_id: ev.id }));
    const path = `expenses/${e.id}/${uuid()}.jpg`;
    expect((await upload(A, path)).error).toBeNull();
    expect((await D.db.storage.from('receipts').download(path)).error).toBeNull();
    expect((await B.db.storage.from('receipts').download(path)).error).not.toBeNull();
  });

  it('a removed group member loses receipts of rows that no longer name them', async () => {
    const g = await seed('expense_groups', groupRow(A, [D]));
    const e = await seed('expenses', expenseRow(A, [], { group_id: g.id }));
    const path = `expenses/${e.id}/${uuid()}.jpg`;
    expect((await upload(A, path)).error).toBeNull();
    expect((await D.db.storage.from('receipts').download(path)).error).toBeNull();

    allowed(await A.db.from('expense_groups').update({ member_ids: [A.id] }).eq('id', g.id));

    expect((await D.db.storage.from('receipts').download(path)).error).not.toBeNull();
  });
});

describe('find_profiles_by_ids resolves everyone named on a row the caller can see', () => {
  it('a group member resolves a participant they share no group, friendship or member_ids row with', async () => {
    const g = await seed('expense_groups', groupRow(A, [C, D]));
    const outsider = await createActor('Outsider');
    // The expense names A and the outsider (a former member); D sees it only through the group.
    await seed('expenses', expenseRow(A, [outsider], { group_id: g.id }));
    const { data } = await D.db.rpc('find_profiles_by_ids', { ids: [outsider.id] });
    expect((data as { id: string }[]).map((r) => r.id)).toEqual([outsider.id]);
    // An unrelated user is still not resolved.
    const { data: none } = await B.db.rpc('find_profiles_by_ids', { ids: [outsider.id] });
    expect(none).toEqual([]);
  });
});
