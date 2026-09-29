// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, allowed, cast, denied, groupRow, LOCAL, seed, sql, truth, type Actor } from './fixtures';

/**
 * B19b (risk:high) / migration 016: `expense_groups.members` is a jsonb array
 * and its `role` values were unconstrained, so the RLS fixtures wrote `'user'`,
 * the database accepted it, and every page that opened the group blanked with
 * "Something went wrong" (the app parses the role as an enum). The database now
 * enforces `owner | admin | moderator | member` on every write, from every role
 * (the constraint, not RLS: the service role is refused too).
 *
 * Authorization is unchanged and never read from this field: RLS and
 * guard_expense_groups use `admin_ids`, which the existing
 * `expense_groups_admins_are_members` check keeps a subset of `member_ids`.
 */
const MIGRATION = resolve(__dirname, '../../../db/migrations/20260928000016_group_member_role_check.sql');
const CONSTRAINT = 'expense_groups_member_roles_valid';
const ROLES = ['owner', 'admin', 'moderator', 'member'];
const CHECK_VIOLATION = '23514';

let A: Actor, C: Actor;
let done: () => Promise<void>;

beforeAll(async () => {
  const c = await cast();
  ({ A, C } = c);
  done = c.cleanup;
});
afterAll(() => done());

const member = (a: Actor, role: unknown) => ({
  userId: a.id,
  displayName: a.name,
  role,
  joinedAt: new Date().toISOString(),
});

/** A group A creates with C as a friend-member carrying `role` (A stays an admin). */
const groupWithRole = (role: unknown) => groupRow(A, [C], { members: [member(A, 'owner'), member(C, role)] });

describe('expense_groups.members[].role · insert', () => {
  it.each(ROLES)('accepts the role %s', async (role) => {
    allowed(await A.db.from('expense_groups').insert(groupWithRole(role)));
  });

  it('accepts a group with no members[] entries at all', async () => {
    allowed(await A.db.from('expense_groups').insert(groupRow(A, [], { members: [], admin_ids: [A.id] })));
  });

  it.each(['user', 'superadmin', 'Admin', 'admin ', ''])('rejects the unknown role %j (23514)', async (role) => {
    denied(await A.db.from('expense_groups').insert(groupWithRole(role)), CHECK_VIOLATION);
  });

  it.each([
    ['a missing role', undefined],
    ['a null role', null],
    ['a numeric role', 3],
    ['an array role', ['admin']],
  ])('rejects %s (23514)', async (_name, role) => {
    const row = groupWithRole('member');
    const entry = { userId: C.id, displayName: C.name, joinedAt: new Date().toISOString(), ...(role === undefined ? {} : { role }) };
    row.members = [member(A, 'owner'), entry];
    denied(await A.db.from('expense_groups').insert(row), CHECK_VIOLATION);
  });

  it('rejects a members[] entry that is not an object (23514)', async () => {
    const row = groupWithRole('member');
    row.members = [member(A, 'owner'), 'not-a-member'];
    denied(await A.db.from('expense_groups').insert(row), CHECK_VIOLATION);
  });

  it('rejects one bad member among valid ones, and nothing is written', async () => {
    const row = groupRow(A, [C], { members: [member(A, 'owner'), member(C, 'member'), member(C, 'root')] });
    denied(await A.db.from('expense_groups').insert(row), CHECK_VIOLATION);
    expect(await truth('expense_groups', row.id)).toBeNull();
  });
});

describe('expense_groups.members[].role · update', () => {
  it('an admin may change a member to another valid role', async () => {
    const g = await seed('expense_groups', groupWithRole('member'));
    allowed(await A.db.from('expense_groups').update({ members: [member(A, 'owner'), member(C, 'moderator')] }).eq('id', g.id));
    const members = (await truth('expense_groups', g.id as string))!.members as { role: string }[];
    expect(members.map((m) => m.role)).toEqual(['owner', 'moderator']);
  });

  it('rejects an update that sets an unknown role (23514), and the row keeps its roles', async () => {
    const g = await seed('expense_groups', groupWithRole('member'));
    denied(await A.db.from('expense_groups').update({ members: [member(A, 'owner'), member(C, 'user')] }).eq('id', g.id), CHECK_VIOLATION);
    const members = (await truth('expense_groups', g.id as string))!.members as { role: string }[];
    expect(members.map((m) => m.role)).toEqual(['owner', 'member']);
  });

  it('a plain member cannot smuggle an unknown role in either (23514 is raised, not silently accepted)', async () => {
    const g = await seed('expense_groups', groupWithRole('member'));
    denied(await C.db.from('expense_groups').update({ members: [member(A, 'owner'), member(C, 'root')] }).eq('id', g.id), CHECK_VIOLATION);
  });

  it('applies to the service role too: it is the constraint, not RLS', async () => {
    const g = await seed('expense_groups', groupWithRole('member'));
    denied(await admin.from('expense_groups').update({ members: [member(A, 'owner'), member(C, 'user')] }).eq('id', g.id), CHECK_VIOLATION);
    denied(await admin.from('expense_groups').insert(groupWithRole('user')), CHECK_VIOLATION);
  });

  it('an update that leaves members alone is unaffected', async () => {
    const g = await seed('expense_groups', groupWithRole('member'));
    allowed(await C.db.from('expense_groups').update({ name: 'Renamed' }).eq('id', g.id));
  });
});

describe('admin_ids stays a subset of member_ids (the existing invariant)', () => {
  it('rejects an admin who is not a member (23514)', async () => {
    denied(await admin.from('expense_groups').insert(groupRow(A, [C], { admin_ids: [A.id, 'someone-else'] })), CHECK_VIOLATION);
  });
});

describe('migration 016 catalog', () => {
  it('is a CHECK constraint on expense_groups and is validated', () => {
    const rows = sql(`select contype::text || '|' || convalidated::text from pg_constraint
                       where conrelid = 'public.expense_groups'::regclass and conname = '${CONSTRAINT}'`);
    expect(rows).toEqual(['c|true']);
  });

  it('its helper is executable by authenticated and service_role, never by anon or public', () => {
    const rows = sql(`select p.proname || ' auth=' || has_function_privilege('authenticated', p.oid, 'execute')::text
                                       || ' service=' || has_function_privilege('service_role', p.oid, 'execute')::text
                                       || ' anon=' || has_function_privilege('anon', p.oid, 'execute')::text
                        from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'group_members_roles_valid'`);
    expect(rows).toEqual(['group_members_roles_valid auth=true service=true anon=false']);
  });
});

describe('migration 016 down path', () => {
  /** dbmate's two sections, without the marker lines. */
  const sections = () => {
    const [head, tail] = readFileSync(MIGRATION, 'utf8').split(/^-- migrate:down\s*$/m);
    return { up: head!.replace(/^-- migrate:up\s*$/m, ''), down: tail ?? '' };
  };

  it('the file has an up and a down section that both name the constraint', () => {
    const { up, down } = sections();
    expect(up).toContain(CONSTRAINT);
    expect(down).toContain(CONSTRAINT);
  });

  it('down removes the constraint and its helper; up restores both (inside a rolled-back transaction)', () => {
    const { up, down } = sections();
    const state = `select 'constraint=' || count(*)::text from pg_constraint where conname = '${CONSTRAINT}'
                   union all select 'function=' || count(*)::text from pg_proc where proname = 'group_members_roles_valid'`;
    const script = `begin;\n${down}\n${state};\n${up}\n${state};\nrollback;\n${state};\n`;
    const out = execFileSync('psql', [LOCAL.dbUrl, '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
      encoding: 'utf8',
      input: script,
    })
      .split('\n')
      .filter((l) => /^(constraint|function)=/.test(l));
    expect(out).toEqual([
      'constraint=0', 'function=0', // after down
      'constraint=1', 'function=1', // after up again
      'constraint=1', 'function=1', // after rollback: the live database is untouched
    ]);
  });

  it('up normalises rows written before it: an unknown or missing role becomes "member", order and valid roles kept, then it validates', () => {
    const { up, down } = sections();
    const members = JSON.stringify([
      { userId: 'u1', displayName: 'One', role: 'owner', joinedAt: 'x' },
      { userId: 'u2', displayName: 'Two', role: 'user', joinedAt: 'x' },
      { userId: 'u3', displayName: 'Three', joinedAt: 'x' },
      { userId: 'u4', displayName: 'Four', role: 'moderator', joinedAt: 'x' },
      { userId: 'u5', displayName: 'Five', role: 7, joinedAt: 'x' },
    ]);
    const script = `begin;
${down}
insert into public.expense_groups (id, name, currency, members, member_ids, admin_ids, created_by)
  values ('b19b-normalise', 'Legacy', 'MXN', '${members}'::jsonb, '{u1,u2,u3,u4,u5}', '{u1}', 'u1');
${up}
select 'roles=' || (select string_agg(e ->> 'role', ',' order by ord)
                      from public.expense_groups g, jsonb_array_elements(g.members) with ordinality as t(e, ord)
                     where g.id = 'b19b-normalise');
select 'validated=' || convalidated::text from pg_constraint where conname = '${CONSTRAINT}';
rollback;
`;
    const out = execFileSync('psql', [LOCAL.dbUrl, '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
      encoding: 'utf8',
      input: script,
    })
      .split('\n')
      .filter((l) => /^(roles|validated)=/.test(l));
    expect(out).toEqual(['roles=owner,member,member,moderator,member', 'validated=true']);
  });
});
