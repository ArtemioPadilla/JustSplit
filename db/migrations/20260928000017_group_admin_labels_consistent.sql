-- migrate:up
-- ============================================================================
-- Plan B19c (risk:high; ADR 0002 amendment "stored admin labels agree with
-- admin_ids", ADR 0015) — a member labelled `owner` or `admin` in
-- `expense_groups.members[].role` must be in `expense_groups.admin_ids`.
--
-- Why: the label is user-writable. Any member may UPDATE their group
-- (`expense_groups_update`), and `guard_expense_groups` gates only `member_ids`,
-- `admin_ids` and `created_by`, so a plain member could label themselves (or
-- anyone) "admin". Authorization never read the label (RLS and the guard use
-- `admin_ids`), but the app used to derive `admin_ids` from the labels on the
-- next admin membership patch (`computeAdminIds`), so a forged label could become
-- a real admin through an admin's unrelated click. The app no longer does that
-- (it starts from `admin_ids` and derives the badge from it); this migration
-- closes the lie at the source, for every client and every writer.
--
-- The rule is ONE-WAY on purpose: an `owner`/`admin` label needs an `admin_ids`
-- entry, but an `admin_ids` entry with a plain label is fine. `admin_ids` is the
-- authority and the UI shows Admin for anyone in it, so an admin promoted by
-- writing `admin_ids` alone (which the suite and `batch_write` do) stays valid.
-- A `moderator` label is not an admin and needs nothing. Demoting therefore
-- changes both in one UPDATE (the app's `withRemovedMember` does).
--
-- The helper is total: it answers `true` for anything that is not an array of
-- objects (migration 016 and the column's own jsonb_typeof check reject those with
-- 23514) and treats an entry with no `userId` as not being in `admin_ids`. It reads
-- no table (IMMUTABLE, invoker) and is executable by authenticated and service_role
-- (constraints run with the writer's privileges), never by anon or PUBLIC.
--
-- Rollout, in this one transaction: (1) DEMOTE labels the rule would reject: an
-- owner/admin label without an admin_ids entry becomes 'member' (the lowest role:
-- it can only lose a label, never gain a power; admin_ids is not touched, so
-- nobody is promoted or demoted for real); (2) add the constraint NOT VALID (no scan
-- under the ACCESS EXCLUSIVE lock); (3) VALIDATE it (a scan under SHARE UPDATE
-- EXCLUSIVE, which does not block writes).
-- ============================================================================

create or replace function public.group_admin_labels_consistent(members jsonb, admin_ids text[])
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
         where jsonb_typeof(m.entry) = 'object'
           and (m.entry ->> 'role') in ('owner', 'admin')
           and not coalesce((m.entry ->> 'userId') = any (admin_ids), false)
      )
    else true
  end
$$;

revoke execute on function public.group_admin_labels_consistent(jsonb, text[]) from public, anon;
grant  execute on function public.group_admin_labels_consistent(jsonb, text[]) to authenticated, service_role;

-- (1) Demote. Only the offending entries are rewritten, in their original order,
-- every other field kept.
update public.expense_groups g
   set members = (
     select jsonb_agg(
              case
                when jsonb_typeof(e.entry) = 'object'
                 and (e.entry ->> 'role') in ('owner', 'admin')
                 and not coalesce((e.entry ->> 'userId') = any (g.admin_ids), false)
                then jsonb_set(e.entry, '{role}', '"member"')
                else e.entry
              end
              order by e.ord)
       from jsonb_array_elements(g.members) with ordinality as e(entry, ord))
 where jsonb_typeof(g.members) = 'array'
   and not public.group_admin_labels_consistent(g.members, g.admin_ids);

-- (2) + (3)
alter table public.expense_groups
  add constraint expense_groups_admin_labels_consistent
  check (public.group_admin_labels_consistent(members, admin_ids)) not valid;

alter table public.expense_groups
  validate constraint expense_groups_admin_labels_consistent;

-- migrate:down
-- Removes the constraint and its helper: the schema is exactly what migration
-- 016 left. The demotion of step (1) is a data fix and is not reversed (the
-- forged labels it removed were never legitimate and are not recoverable).
alter table public.expense_groups
  drop constraint if exists expense_groups_admin_labels_consistent;

drop function if exists public.group_admin_labels_consistent(jsonb, text[]);
