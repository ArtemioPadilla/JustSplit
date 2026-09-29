// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, allowed, cast, denied, groupRow, LOCAL, seed, sql, truth, type Actor } from './fixtures';

/**
 * B19c (risk:high) / migration 017: the `members[].role` labels are user-writable
 * (any member may update `expense_groups`; `guard_expense_groups` gates only
 * `member_ids`, `admin_ids` and `created_by`), so a plain member could label
 * themselves "admin". Authorization never read the label (RLS and the guard use
 * `admin_ids`), but the app used to derive `admin_ids` from the labels on the next
 * admin membership patch, so a forged label could become a real admin. The
 * database now refuses the lie at the source: a member labelled `owner` or `admin`
 * must be in `admin_ids` (SQLSTATE 23514, for every writer, the service role
 * included). The reverse is allowed on purpose: `admin_ids` is the authority and the
 * UI derives the badge from it, so an admin_ids entry with a plain label is fine.
 */
const MIGRATION = resolve(__dirname, '../../../db/migrations/20260928000017_group_admin_labels_consistent.sql');
const CONSTRAINT = 'expense_groups_admin_labels_consistent';
const HELPER = 'group_admin_labels_consistent';
const CHECK_VIOLATION = '23514';

let A: Actor, C: Actor;
let done: () => Promise<void>;

beforeAll(async () => {
  const c = await cast();
  ({ A, C } = c);
  done = c.cleanup;
});
afterAll(() => done());

const member = (a: Actor, role: unknown) => ({ userId: a.id, displayName: a.name, role, joinedAt: new Date().toISOString() });

/** A group A creates with C as a member labelled `role`; `adminIds` says who is really an admin. */
const group = (role: unknown, adminIds: string[] = [A.id]) =>
  groupRow(A, [C], { members: [member(A, 'owner'), member(C, role)], admin_ids: adminIds });

describe('expense_groups.members[].role vs admin_ids · insert', () => {
  it('accepts the normal shape: the creator labelled owner and in admin_ids, everyone else member', async () => {
    allowed(await A.db.from('expense_groups').insert(group('member')));
  });

  it.each(['owner', 'admin'])('accepts a member labelled %s who IS in admin_ids', async (role) => {
    allowed(await A.db.from('expense_groups').insert(group(role, [A.id, C.id])));
  });

  it('accepts a moderator who is not in admin_ids (a moderator is not an admin)', async () => {
    allowed(await A.db.from('expense_groups').insert(group('moderator')));
  });

  it('accepts an admin_ids entry whose label is plain member (the label is display only; admin_ids is the authority)', async () => {
    allowed(await A.db.from('expense_groups').insert(group('member', [A.id, C.id])));
  });

  it.each(['owner', 'admin'])('rejects a member labelled %s who is NOT in admin_ids (23514)', async (role) => {
    const row = group(role);
    denied(await A.db.from('expense_groups').insert(row), CHECK_VIOLATION);
    expect(await truth('expense_groups', row.id)).toBeNull();
  });

  it('rejects an admin label with no userId at all (it cannot be in admin_ids)', async () => {
    const row = group('member');
    row.members = [member(A, 'owner'), { displayName: C.name, role: 'admin', joinedAt: new Date().toISOString() }];
    denied(await A.db.from('expense_groups').insert(row), CHECK_VIOLATION);
  });

  it('applies to the service role too: it is the constraint, not RLS', async () => {
    denied(await admin.from('expense_groups').insert(group('admin')), CHECK_VIOLATION);
  });

  it('never turns a malformed members[] into a different error: the other checks still answer 23514', async () => {
    const notObject = group('member');
    notObject.members = [member(A, 'owner'), 'not-a-member'];
    denied(await A.db.from('expense_groups').insert(notObject), CHECK_VIOLATION);
    const notArray = group('member');
    notArray.members = 'not-an-array';
    denied(await A.db.from('expense_groups').insert(notArray), CHECK_VIOLATION);
  });
});

describe('expense_groups.members[].role vs admin_ids · update (the forgery this closes)', () => {
  it.each(['admin', 'owner'])('a plain member cannot label themselves %s (23514), and the row keeps its labels', async (role) => {
    const g = await seed('expense_groups', group('member'));
    denied(await C.db.from('expense_groups').update({ members: [member(A, 'owner'), member(C, role)] }).eq('id', g.id), CHECK_VIOLATION);
    const members = (await truth('expense_groups', g.id as string))!.members as { role: string }[];
    expect(members.map((m) => m.role)).toEqual(['owner', 'member']);
  });

  it('a plain member cannot promote someone else by label either', async () => {
    const g = await seed('expense_groups', group('member'));
    denied(await C.db.from('expense_groups').update({ members: [member(A, 'owner'), member(C, 'member'), member(C, 'admin')] }).eq('id', g.id), CHECK_VIOLATION);
  });

  it('a real admin promoting someone writes admin_ids and the label together, and that is accepted', async () => {
    const g = await seed('expense_groups', group('member'));
    allowed(
      await A.db
        .from('expense_groups')
        .update({ members: [member(A, 'owner'), member(C, 'admin')], admin_ids: [A.id, C.id] })
        .eq('id', g.id),
    );
    expect((await truth('expense_groups', g.id as string))!.admin_ids).toEqual([A.id, C.id]);
  });

  it('an admin adding C to admin_ids without touching the labels is accepted (the badge follows admin_ids)', async () => {
    const g = await seed('expense_groups', group('member'));
    allowed(await A.db.from('expense_groups').update({ admin_ids: [A.id, C.id] }).eq('id', g.id));
  });

  it('demoting must change both: dropping C from admin_ids while the label still says admin is rejected, both together is accepted', async () => {
    const g = await seed('expense_groups', group('admin', [A.id, C.id]));
    denied(await A.db.from('expense_groups').update({ admin_ids: [A.id] }).eq('id', g.id), CHECK_VIOLATION);
    allowed(await A.db.from('expense_groups').update({ admin_ids: [A.id], members: [member(A, 'owner'), member(C, 'member')] }).eq('id', g.id));
  });

  it('removing an admin removes them from members[] and admin_ids in one patch, which is accepted', async () => {
    const g = await seed('expense_groups', group('admin', [A.id, C.id]));
    allowed(await A.db.from('expense_groups').update({ members: [member(A, 'owner')], member_ids: [A.id], admin_ids: [A.id] }).eq('id', g.id));
  });

  it('an update that leaves the labels alone is unaffected (a member may still rename the group)', async () => {
    const g = await seed('expense_groups', group('member'));
    allowed(await C.db.from('expense_groups').update({ name: 'Renamed' }).eq('id', g.id));
  });
});

describe('migration 017 catalog', () => {
  it('is a CHECK constraint on expense_groups and is validated', () => {
    const rows = sql(`select contype::text || '|' || convalidated::text from pg_constraint
                       where conrelid = 'public.expense_groups'::regclass and conname = '${CONSTRAINT}'`);
    expect(rows).toEqual(['c|true']);
  });

  it('its helper is executable by authenticated and service_role, never by anon or public', () => {
    const rows = sql(`select p.proname || ' auth=' || has_function_privilege('authenticated', p.oid, 'execute')::text
                                       || ' service=' || has_function_privilege('service_role', p.oid, 'execute')::text
                                       || ' anon=' || has_function_privilege('anon', p.oid, 'execute')::text
                        from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = '${HELPER}'`);
    expect(rows).toEqual([`${HELPER} auth=true service=true anon=false`]);
  });

  it('the helper reads no table and is immutable (a constraint may call it)', () => {
    const rows = sql(`select provolatile::text || '|' || prosecdef::text from pg_proc
                       where pronamespace = 'public'::regnamespace and proname = '${HELPER}'`);
    expect(rows).toEqual(['i|false']);
  });
});

describe('migration 017 down path and rollout', () => {
  /** dbmate's two sections, without the marker lines. */
  const sections = () => {
    const [head, tail] = readFileSync(MIGRATION, 'utf8').split(/^-- migrate:down\s*$/m);
    return { up: head!.replace(/^-- migrate:up\s*$/m, ''), down: tail ?? '' };
  };
  const psql = (script: string) =>
    execFileSync('psql', [LOCAL.dbUrl, '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-f', '-'], { encoding: 'utf8', input: script });

  it('the file has an up and a down section that both name the constraint', () => {
    const { up, down } = sections();
    expect(up).toContain(CONSTRAINT);
    expect(down).toContain(CONSTRAINT);
  });

  it('down removes the constraint and its helper; up restores both (inside a rolled-back transaction)', () => {
    const { up, down } = sections();
    const state = `select 'constraint=' || count(*)::text from pg_constraint where conname = '${CONSTRAINT}'
                   union all select 'function=' || count(*)::text from pg_proc where proname = '${HELPER}'`;
    const out = psql(`begin;\n${down}\n${state};\n${up}\n${state};\nrollback;\n${state};\n`)
      .split('\n')
      .filter((l) => /^(constraint|function)=/.test(l));
    expect(out).toEqual([
      'constraint=0', 'function=0', // after down
      'constraint=1', 'function=1', // after up again
      'constraint=1', 'function=1', // after rollback: the live database is untouched
    ]);
  });

  it('down leaves migration 016 alone: the role enum check is still there', () => {
    const { down } = sections();
    const out = psql(`begin;\n${down}\nselect 'roles=' || count(*)::text from pg_constraint where conname = 'expense_groups_member_roles_valid';\nrollback;\n`)
      .split('\n')
      .filter((l) => l.startsWith('roles='));
    expect(out).toEqual(['roles=1']);
  });

  it('up demotes labels written before it: an owner or admin label without an admin_ids entry becomes "member"; consistent rows, order and every other field are kept; then it validates', () => {
    const { up, down } = sections();
    const members = JSON.stringify([
      { userId: 'u1', displayName: 'One', role: 'owner', joinedAt: 'x' }, // in admin_ids: kept
      { userId: 'u2', displayName: 'Two', role: 'admin', joinedAt: 'x', invitedBy: 'u1' }, // forged: demoted
      { userId: 'u3', displayName: 'Three', role: 'owner', joinedAt: 'x' }, // forged owner: demoted
      { userId: 'u4', displayName: 'Four', role: 'moderator', joinedAt: 'x' }, // not an admin label: kept
      { userId: 'u5', displayName: 'Five', role: 'admin', joinedAt: 'x' }, // in admin_ids: kept
      { displayName: 'Six', role: 'admin', joinedAt: 'x' }, // no userId: demoted
    ]);
    const out = psql(`begin;
${down}
insert into public.expense_groups (id, name, currency, members, member_ids, admin_ids, created_by)
  values ('b19c-normalise', 'Legacy', 'MXN', '${members}'::jsonb, '{u1,u2,u3,u4,u5}', '{u1,u5}', 'u1');
insert into public.expense_groups (id, name, currency, members, member_ids, admin_ids, created_by)
  values ('b19c-consistent', 'Fine', 'MXN', '[{"userId":"u1","displayName":"One","role":"owner","joinedAt":"x"}]'::jsonb, '{u1}', '{u1}', 'u1');
${up}
select 'roles=' || (select string_agg(e ->> 'role', ',' order by ord)
                      from public.expense_groups g, jsonb_array_elements(g.members) with ordinality as t(e, ord)
                     where g.id = 'b19c-normalise');
select 'invitedBy=' || (select e ->> 'invitedBy' from public.expense_groups g, jsonb_array_elements(g.members) as t(e) where g.id = 'b19c-normalise' and e ->> 'userId' = 'u2');
select 'fine=' || (select members::text from public.expense_groups where id = 'b19c-consistent');
select 'admin_ids=' || (select admin_ids::text from public.expense_groups where id = 'b19c-normalise');
select 'validated=' || convalidated::text from pg_constraint where conname = '${CONSTRAINT}';
rollback;
`)
      .split('\n')
      .filter((l) => /^(roles|invitedBy|fine|admin_ids|validated)=/.test(l));
    expect(out).toEqual([
      'roles=owner,member,member,moderator,admin,member',
      'invitedBy=u1',
      'fine=[{"role": "owner", "userId": "u1", "joinedAt": "x", "displayName": "One"}]',
      'admin_ids={u1,u5}', // never promotes: admin_ids is untouched
      'validated=true',
    ]);
  });
});
