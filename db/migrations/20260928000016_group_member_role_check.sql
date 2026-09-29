-- migrate:up
-- ============================================================================
-- Plan B19b (risk:high; ADR 0002 amendment "member roles are enum-checked") —
-- `expense_groups.members[].role` is one of owner | admin | moderator | member.
--
-- Where roles live: ONLY inside the `expense_groups.members` jsonb array
-- (`[{ userId, displayName, role, joinedAt, invitedBy? }, ...]`). No column,
-- no other table. The app parses `role` as that enum, so a stored value outside
-- it (the RLS fixtures wrote 'user' and the database accepted it) failed the
-- parse of the whole group and blanked every page that opened it.
--
-- A CHECK constraint cannot hold a subquery, so it calls an IMMUTABLE helper
-- that answers "does every members[] entry carry a valid role?". A constraint
-- (not a trigger) so that existing rows are validated too and the rule holds
-- for every writer, the service role and maintenance included.
--
-- What "valid" means: `members` is an array (a non-array is left to the
-- existing jsonb_typeof check) and EVERY entry is an object whose `role` is a
-- JSON string equal to one of the four roles. A missing, null, numeric or array
-- role, a case or whitespace variant, and an entry that is not an object are all
-- rejected. The array is the source of truth for the labels only: authorization
-- reads `admin_ids`, never `role` (RLS and guard_expense_groups), and
-- `expense_groups_admins_are_members` (migration 003, admin_ids <@ member_ids)
-- is untouched. The two are NOT tied together here: the app derives admin_ids
-- from the roles on every membership patch (`computeAdminIds`), but the suite
-- also writes admin_ids without touching members[], so a two-way constraint
-- would change what the guard lets an admin do. Not part of this migration.
--
-- Rollout: (1) normalise existing rows: an OBJECT entry with a missing or
-- unknown role becomes 'member' (the lowest role: it can only lose a label,
-- never gain a power); (2) add the constraint NOT VALID (no scan under the
-- ACCESS EXCLUSIVE lock); (3) VALIDATE it (a scan under SHARE UPDATE EXCLUSIVE,
-- which does not block writes). Dbmate wraps the file in one transaction, so a
-- row the normalisation cannot fix (an entry that is not an object, which the
-- app never writes) aborts the whole migration with the constraint's name
-- rather than dropping a member silently.
--
-- The helper is executed as the writing role (constraints run with the
-- caller's privileges), so authenticated and service_role need EXECUTE; anon
-- and PUBLIC never do (the coverage guard: no public function is callable by
-- anon). It does not read any table, so it leaks nothing.
-- ============================================================================

create or replace function public.group_members_roles_valid(members jsonb)
returns boolean
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when jsonb_typeof(members) = 'array' then
      not exists (
        select 1
          from jsonb_array_elements(members) as m(entry)
         where jsonb_typeof(m.entry) is distinct from 'object'
            or jsonb_typeof(m.entry -> 'role') is distinct from 'string'
            or (m.entry ->> 'role') not in ('owner', 'admin', 'moderator', 'member')
      )
    else true
  end
$$;

revoke execute on function public.group_members_roles_valid(jsonb) from public, anon;
grant  execute on function public.group_members_roles_valid(jsonb) to authenticated, service_role;

-- (1) Normalise. Only object entries are rewritten, in their original order.
update public.expense_groups g
   set members = (
     select jsonb_agg(
              case
                when jsonb_typeof(e.entry) = 'object'
                 and (jsonb_typeof(e.entry -> 'role') is distinct from 'string'
                      or (e.entry ->> 'role') not in ('owner', 'admin', 'moderator', 'member'))
                then jsonb_set(e.entry, '{role}', '"member"')
                else e.entry
              end
              order by e.ord)
       from jsonb_array_elements(g.members) with ordinality as e(entry, ord))
 where jsonb_typeof(g.members) = 'array'
   and exists (
     select 1
       from jsonb_array_elements(g.members) as m(entry)
      where jsonb_typeof(m.entry) = 'object'
        and (jsonb_typeof(m.entry -> 'role') is distinct from 'string'
             or (m.entry ->> 'role') not in ('owner', 'admin', 'moderator', 'member'))
   );

-- (2) + (3)
alter table public.expense_groups
  add constraint expense_groups_member_roles_valid
  check (public.group_members_roles_valid(members)) not valid;

alter table public.expense_groups
  validate constraint expense_groups_member_roles_valid;

-- migrate:down
-- Removes the constraint and its helper: the schema is exactly what migration
-- 015 left. The normalisation of step (1) is a data fix and is not reversed
-- (the original 'user' labels are not recoverable and were never valid).
alter table public.expense_groups
  drop constraint if exists expense_groups_member_roles_valid;

drop function if exists public.group_members_roles_valid(jsonb);
