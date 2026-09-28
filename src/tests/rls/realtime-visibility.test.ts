// @vitest-environment node
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, cast, createActor, eventRow, expenseRow, groupRow, seed, uuid, type Actor } from './fixtures';

/**
 * Plan B2d migration C (ADR 0013): Realtime delivers INSERT/UPDATE per
 * subscriber through RLS, so a group member who is NOT in an expense's
 * member_ids (and an event member likewise) receives its changes, while a
 * stranger and a removed member do not.
 *
 * Red/green for this file is verified by the CI "RLS & contract" job (and
 * locally against `supabase start`).
 */
type Change = RealtimePostgresChangesPayload<Record<string, unknown>>;

let A: Actor, B: Actor, D: Actor;
let done: () => Promise<void>;
const seen: Record<'D' | 'B', Change[]> = { D: [], B: [] };
const channels: RealtimeChannel[] = [];
const probes: string[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor(pred: () => boolean, ms = 8000): Promise<void> {
  const until = Date.now() + ms;
  while (!pred() && Date.now() < until) await sleep(100);
}

async function listen(who: Actor, into: Change[]): Promise<void> {
  const { data } = await who.db.auth.getSession();
  who.db.realtime.setAuth(data.session!.access_token);
  let channel = who.db.channel(`rls-vis-${who.name}-${uuid()}`);
  for (const table of ['expense_groups', 'expenses', 'settlements']) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, (p) => into.push(p as Change));
  }
  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') resolve();
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(err ?? new Error(status));
    });
  });
  channels.push(channel);
}

/** SUBSCRIBED can arrive before the postgres_changes stream is live: write a private probe until it shows up. */
async function ready(who: Actor, into: Change[]): Promise<void> {
  const until = Date.now() + 30_000;
  while (Date.now() < until) {
    const probe = groupRow(who, [], { name: 'probe' });
    probes.push(probe.id);
    const { error } = await admin.from('expense_groups').insert(probe);
    if (error) throw error;
    await waitFor(() => into.some((p) => (p.new as { id?: unknown }).id === probe.id), 1500);
    if (into.some((p) => (p.new as { id?: unknown }).id === probe.id)) return;
  }
  throw new Error(`Realtime never delivered a probe to ${who.name}`);
}

const got = (who: 'D' | 'B', table: string, type: string, id: unknown) => () =>
  seen[who].some((p) => p.table === table && p.eventType === type && (p.new as { id?: unknown }).id === id);

const rows: Record<string, Record<string, unknown>> = {};

beforeAll(async () => {
  const c = await cast();
  ({ A, B } = c);
  done = c.cleanup;
  D = await createActor('D');

  const group = await seed('expense_groups', groupRow(A, [D]));
  const event = await seed('events', eventRow(A, [D]));
  rows.groupExpense = expenseRow(A, [], { group_id: group.id });
  rows.eventExpense = expenseRow(A, [], { event_id: event.id });
  rows.afterRemoval = expenseRow(A, [], { group_id: group.id });
  rows.groupId = { id: group.id };

  await listen(D, seen.D);
  await listen(B, seen.B);
  await Promise.all([ready(D, seen.D), ready(B, seen.B)]);
  seen.D.length = 0;
  seen.B.length = 0;

  for (const key of ['groupExpense', 'eventExpense']) {
    const row = rows[key]!;
    const ins = await admin.from('expenses').insert(row);
    if (ins.error) throw ins.error;
    await waitFor(got('D', 'expenses', 'INSERT', row.id));
    const upd = await admin.from('expenses').update({ description: 'Realtime' }).eq('id', row.id as string);
    if (upd.error) throw upd.error;
    await waitFor(got('D', 'expenses', 'UPDATE', row.id));
  }

  // D leaves the group: a later group expense must not reach them.
  const removed = await admin.from('expense_groups').update({ member_ids: [A.id] }).eq('id', group.id);
  if (removed.error) throw removed.error;
  const later = await admin.from('expenses').insert(rows.afterRemoval!);
  if (later.error) throw later.error;
  await sleep(2500); // give D's stream the same chance to (wrongly) receive it
}, 90_000);

afterAll(async () => {
  if (probes.length) await admin.from('expense_groups').delete().in('id', probes);
  for (const ch of channels) await ch.unsubscribe();
  D.db.realtime.disconnect();
  B.db.realtime.disconnect();
  await done();
});

describe('realtime · visibility follows membership', () => {
  it('a group member who is not in member_ids receives the INSERT and the UPDATE of a group expense', () => {
    const id = rows.groupExpense!.id;
    expect(got('D', 'expenses', 'INSERT', id)()).toBe(true);
    expect(got('D', 'expenses', 'UPDATE', id)()).toBe(true);
  });

  it('an event member who is not in member_ids receives the INSERT and the UPDATE of an event expense', () => {
    const id = rows.eventExpense!.id;
    expect(got('D', 'expenses', 'INSERT', id)()).toBe(true);
    expect(got('D', 'expenses', 'UPDATE', id)()).toBe(true);
  });

  it('a stranger receives neither', () => {
    expect(seen.B.filter((p) => p.table === 'expenses' && ['INSERT', 'UPDATE'].includes(p.eventType))).toEqual([]);
  });

  it('a member removed from the group stops receiving the group\'s new expenses', () => {
    expect(got('D', 'expenses', 'INSERT', rows.afterRemoval!.id)()).toBe(false);
  });
});
