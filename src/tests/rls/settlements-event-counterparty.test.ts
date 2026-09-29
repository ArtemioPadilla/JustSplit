// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { allowed, cast, denied, eventRow, groupRow, seed, sql, settlementRow, type Actor } from './fixtures';

/**
 * Plan B14a (ADR 0014), migration 015: a settlement inside an event may name an
 * event co-member who is not the creator's friend — matching what an event
 * EXPENSE may already name (B2d, migration 013). Otherwise B14's event settle-up
 * would suggest a payment between two co-members that the payer could not record.
 *
 * Cast: A and C are accepted friends; B is a stranger to both. The `group_id is
 * not null` branch is unchanged and so is the friends-only rule with no event.
 */
let A: Actor, B: Actor, C: Actor;
let done: () => Promise<void>;

beforeAll(async () => {
  ({ A, B, C, cleanup: done } = await cast());
});
afterAll(() => done());

describe('settlements_insert · event co-members (migration 015)', () => {
  it('non-friend co-members of an event can record a settlement with that event_id, in either direction', async () => {
    const ev = await seed('events', eventRow(A, [B]));
    allowed(await A.db.from('settlements').insert(settlementRow(A, A, B, { event_id: ev.id })));
    allowed(await B.db.from('settlements').insert(settlementRow(B, A, B, { event_id: ev.id })));
  });

  it('the same non-friend pair WITHOUT an event_id is still denied (friends only, as before)', async () => {
    denied(await A.db.from('settlements').insert(settlementRow(A, A, B)), '42501');
    denied(await A.db.from('settlements').insert(settlementRow(A, B, A, { event_id: null })), '42501');
  });

  it('with the event_id of an event the counterparty is not in, a non-friend is denied', async () => {
    const soloEvent = await seed('events', eventRow(A, []));
    denied(await A.db.from('settlements').insert(settlementRow(A, A, B, { event_id: soloEvent.id })), '42501');
  });

  it('an event the creator is not in is denied even when the counterparty is (no pushing rows into a feed)', async () => {
    const theirs = await seed('events', eventRow(B, [C]));
    denied(await A.db.from('settlements').insert(settlementRow(A, A, B, { event_id: theirs.id })), '42501');
    denied(await A.db.from('settlements').insert(settlementRow(A, A, C, { event_id: theirs.id })), '42501');
  });

  it('a stranger — neither an event member nor a friend — is denied, and so is a caller who is not a party', async () => {
    const ev = await seed('events', eventRow(A, [C]));
    denied(await A.db.from('settlements').insert(settlementRow(A, A, B, { event_id: ev.id })), '42501');
    denied(await B.db.from('settlements').insert(settlementRow(B, A, C, { event_id: ev.id })), '42501');
  });

  it('an accepted friend who is not in the event is still allowed (event member OR friend)', async () => {
    const ev = await seed('events', eventRow(A, []));
    allowed(await A.db.from('settlements').insert(settlementRow(A, A, C, { event_id: ev.id })));
  });

  it('the group branch is unchanged: event co-membership does not stand in for group membership', async () => {
    const ev = await seed('events', eventRow(A, [B]));
    const g = await seed('expense_groups', groupRow(A, []));
    denied(await A.db.from('settlements').insert(settlementRow(A, A, B, { group_id: g.id, event_id: ev.id })), '42501');
    const both = await seed('expense_groups', groupRow(A, [B]));
    allowed(await A.db.from('settlements').insert(settlementRow(A, A, B, { group_id: both.id })));
  });

  it('created_by, the party rule and member_ids stay enforced on an event settlement', async () => {
    const ev = await seed('events', eventRow(A, [B]));
    denied(await A.db.from('settlements').insert(settlementRow(B, A, B, { event_id: ev.id })), '42501');
    denied(await A.db.from('settlements').insert(settlementRow(A, A, B, { event_id: ev.id, member_ids: [A.id] })), '42501');
  });

  it('the policy text carries the event branch (the coverage the mutation check removes)', () => {
    const check = sql(`select with_check from pg_policies where policyname = 'settlements_insert'`).join(' ');
    expect(check).toMatch(/event_id IS NOT NULL/);
    expect(check).toMatch(/events ev/);
    expect(check).toMatch(/is_event_member/);
  });
});
