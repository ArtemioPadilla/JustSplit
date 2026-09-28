// @vitest-environment node
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
  cast,
  createActor,
  eventRow,
  expenseRow,
  groupRow,
  SCHEMA_MAP_TABLES,
  settlementRow,
  uuid,
  type Actor,
} from './fixtures';

/**
 * Spec D10 "Realtime": RLS filters INSERT/UPDATE per subscriber; DELETE reaches
 * every subscriber with the primary key only (no `replica identity full`).
 */
type Change = RealtimePostgresChangesPayload<Record<string, unknown>>;

let A: Actor, B: Actor, C: Actor;
let done: () => Promise<void>;
const seen: Record<'A' | 'B', Change[]> = { A: [], B: [] };
const channels: RealtimeChannel[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function listen(who: Actor, into: Change[]): Promise<void> {
  // The socket must carry the user's JWT so Realtime evaluates RLS as them.
  const { data } = await who.db.auth.getSession();
  who.db.realtime.setAuth(data.session!.access_token);
  let channel = who.db.channel(`rls-${who.name}-${uuid()}`);
  for (const table of SCHEMA_MAP_TABLES) {
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

const probes: string[] = [];

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

async function waitFor(pred: () => boolean, ms = 8000): Promise<void> {
  const until = Date.now() + ms;
  while (!pred() && Date.now() < until) await sleep(100);
}

const rows: Record<string, Record<string, unknown>> = {};
const updates: Record<string, Record<string, unknown>> = {
  expense_groups: { name: 'Realtime' },
  expenses: { description: 'Realtime' },
  settlements: { method: 'cash' },
  events: { location: 'Realtime' },
  friendships: { status: 'rejected' },
};

beforeAll(async () => {
  const c = await cast();
  ({ A, B, C } = c);
  done = c.cleanup;
  const D = await createActor('D');
  rows.expense_groups = groupRow(A, [C]);
  rows.expenses = expenseRow(A, [C]);
  rows.settlements = settlementRow(A, A, C);
  rows.events = eventRow(A, [C]);
  rows.friendships = { id: uuid(), users: [A.id, D.id], status: 'pending', requested_by: A.id };

  await listen(A, seen.A);
  await listen(B, seen.B);
  // SUBSCRIBED can arrive before the postgres_changes subscription is live.
  // Probe: each actor gets a private row written until its own INSERT arrives.
  await Promise.all([ready(A, seen.A), ready(B, seen.B)]);
  seen.A.length = 0;
  seen.B.length = 0;

  // Realtime checks INSERT/UPDATE visibility by reading the row as the
  // subscriber when it processes the WAL, so each step waits for the member's
  // event before the next write (a row deleted too early is never delivered).
  const got = (table: string, type: string, id: unknown) => () =>
    seen.A.some((p) => p.table === table && p.eventType === type && ((p.new as { id?: unknown }).id ?? (p.old as { id?: unknown }).id) === id);
  for (const table of SCHEMA_MAP_TABLES) {
    const row = rows[table]!;
    const ins = await admin.from(table).insert(row);
    if (ins.error) throw ins.error;
    await waitFor(got(table, 'INSERT', row.id));
    const upd = await admin.from(table).update(updates[table]!).eq('id', row.id as string);
    if (upd.error) throw upd.error;
    await waitFor(got(table, 'UPDATE', row.id));
    const del = await admin.from(table).delete().eq('id', row.id as string);
    if (del.error) throw del.error;
    await waitFor(got(table, 'DELETE', row.id));
  }
  await sleep(1500); // give B's stream the same chance to (wrongly) receive rows
}, 60_000);

afterAll(async () => {
  if (probes.length) await admin.from('expense_groups').delete().in('id', probes);
  for (const ch of channels) await ch.unsubscribe();
  A.db.realtime.disconnect();
  B.db.realtime.disconnect();
  await done();
});

describe.each(SCHEMA_MAP_TABLES)('realtime · %s', (table) => {
  const of = (who: 'A' | 'B', type: string) =>
    seen[who].filter((p) => p.table === table && p.eventType === type);

  it('the member receives the INSERT and the UPDATE of their row', () => {
    const id = rows[table]!.id;
    expect(of('A', 'INSERT').some((p) => (p.new as { id?: unknown }).id === id)).toBe(true);
    expect(of('A', 'UPDATE').some((p) => (p.new as { id?: unknown }).id === id)).toBe(true);
  });

  it('a non-member receives no INSERT or UPDATE of it', () => {
    expect(of('B', 'INSERT')).toEqual([]);
    expect(of('B', 'UPDATE')).toEqual([]);
  });

  it('any DELETE a subscriber receives carries the primary key and nothing else', () => {
    for (const p of [...of('A', 'DELETE'), ...of('B', 'DELETE')]) {
      const old = p.old as Record<string, unknown>;
      expect(Object.keys(old).filter((k) => old[k] !== null && old[k] !== undefined)).toEqual(['id']);
    }
  });
});
