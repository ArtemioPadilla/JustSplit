-- migrate:up
-- ============================================================================
-- Plan B2d migration C (ADR 0013) — visibility follows membership (select).
--
-- Until now a row of `expenses` / `settlements` was visible only to the users
-- listed in its own `member_ids`. That froze visibility at write time: a
-- member added to a group later saw none of its history, an event's totals
-- differed by viewer, and a non-friend event member saw nothing. Now a row is
-- visible to
--   * a user in its `member_ids` (unchanged: it still names who is involved),
--   * OR a member of its group (`group_id`), OR a member of its event
--     (`event_id`), live — so joining a group shows its feed, and leaving it
--     hides the feed (rows that still name the user stay readable).
--
-- Helpers (all answer ONLY about the calling user, so none is a membership
-- oracle for someone else):
--   is_group_member(gid)     SECURITY DEFINER  caller ∈ expense_groups.member_ids
--   is_event_member(eid)     SECURITY DEFINER  caller ∈ events.member_ids
--   can_see_shared_row(...)  SECURITY INVOKER  the one visibility predicate:
--                            member_ids ∪ group ∪ event, used by the
--                            expenses/settlements select policies
--   can_see_expense(id)      SECURITY DEFINER  the same predicate for the row
--                            with that id (the storage policies need a lookup)
-- The two membership helpers are definers so the check does not depend on the
-- caller's own RLS over expense_groups/events; every definer pins
-- `search_path`, is revoked from public/anon and granted to authenticated
-- only (policies are evaluated as the calling role, so it needs EXECUTE).
--
-- Write policies keep their own rules (migration D). Everything that gates on
-- "can select this row" - update USING, Realtime delivery, storage - follows
-- automatically from the select policy or this predicate.
-- ============================================================================

create or replace function public.is_group_member(gid text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.expense_groups g
     where g.id = gid
       and (select auth.uid())::text = any (g.member_ids)
  );
$$;

create or replace function public.is_event_member(eid text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.events e
     where e.id = eid
       and (select auth.uid())::text = any (e.member_ids)
  );
$$;

create or replace function public.can_see_shared_row(p_member_ids text[], p_group_id text, p_event_id text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select (select auth.uid())::text = any (p_member_ids)
      or (p_group_id is not null and public.is_group_member(p_group_id))
      or (p_event_id is not null and public.is_event_member(p_event_id));
$$;

create or replace function public.can_see_expense(eid text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.expenses e
     where e.id = eid
       and public.can_see_shared_row(e.member_ids, e.group_id, e.event_id)
  );
$$;

revoke execute on function public.is_group_member(text)                  from public, anon;
revoke execute on function public.is_event_member(text)                  from public, anon;
revoke execute on function public.can_see_shared_row(text[], text, text) from public, anon;
revoke execute on function public.can_see_expense(text)                  from public, anon;
grant  execute on function public.is_group_member(text)                  to authenticated;
grant  execute on function public.is_event_member(text)                  to authenticated;
grant  execute on function public.can_see_shared_row(text[], text, text) to authenticated;
grant  execute on function public.can_see_expense(text)                  to authenticated;

-- ── select policies ─────────────────────────────────────────────────────────
alter policy expenses_select on public.expenses
  using (public.can_see_shared_row(member_ids, group_id, event_id));

alter policy settlements_select on public.settlements
  using (public.can_see_shared_row(member_ids, group_id, event_id));

-- ── receipts: one helper for select / insert / update / delete ──────────────
-- The object follows the expense row's visibility. The expense repo still
-- deletes objects BEFORE the row (no policy can reach them afterwards).
alter policy receipts_expenses_select on storage.objects
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and public.can_see_expense((storage.foldername(name))[2])
  );

alter policy receipts_expenses_insert on storage.objects
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and public.can_see_expense((storage.foldername(name))[2])
  );

alter policy receipts_expenses_update on storage.objects
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and public.can_see_expense((storage.foldername(name))[2])
  )
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and public.can_see_expense((storage.foldername(name))[2])
  );

alter policy receipts_expenses_delete on storage.objects
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and public.can_see_expense((storage.foldername(name))[2])
  );

-- ── find_profiles_by_ids: resolve everyone named on a row the caller can see ─
-- Otherwise a group member could see an expense naming a former member and
-- show them as "Unknown". Expenses and settlements now count whenever the
-- caller can SEE the row (member_ids, group or event), not only when the
-- caller is listed in it.
create or replace function public.find_profiles_by_ids(ids text[])
returns table (id text, name text, "avatarUrl" text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  me text := (select auth.uid())::text;
begin
  if me is null then
    return;
  end if;
  if ids is null then
    return;
  end if;
  if cardinality(ids) > 200 then
    raise exception 'find_profiles_by_ids: at most 200 ids per call'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
    select p.id::text, p.name, p."avatarUrl"
      from public.profiles p
     where p.id::text = any (ids)
       and (
         p.id::text = me
         or exists (select 1 from public.friendships f    where f.users      @> array[me, p.id::text])
         or exists (select 1 from public.expense_groups g where g.member_ids @> array[me, p.id::text])
         or exists (select 1 from public.events e         where e.member_ids @> array[me, p.id::text])
         or exists (select 1 from public.expenses x
                     where x.member_ids @> array[p.id::text]
                       and public.can_see_shared_row(x.member_ids, x.group_id, x.event_id))
         or exists (select 1 from public.settlements s
                     where s.member_ids @> array[p.id::text]
                       and public.can_see_shared_row(s.member_ids, s.group_id, s.event_id))
       );
end;
$$;

-- migrate:down
-- Restores the member_ids-only policies of migrations 04 and 07 and the
-- version of find_profiles_by_ids from migration 09, then drops the helpers.
create or replace function public.find_profiles_by_ids(ids text[])
returns table (id text, name text, "avatarUrl" text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  me text := (select auth.uid())::text;
begin
  if me is null then
    return;
  end if;
  if ids is null then
    return;
  end if;
  if cardinality(ids) > 200 then
    raise exception 'find_profiles_by_ids: at most 200 ids per call'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
    select p.id::text, p.name, p."avatarUrl"
      from public.profiles p
     where p.id::text = any (ids)
       and (
         p.id::text = me
         or exists (select 1 from public.friendships f    where f.users      @> array[me, p.id::text])
         or exists (select 1 from public.expense_groups g where g.member_ids @> array[me, p.id::text])
         or exists (select 1 from public.events e         where e.member_ids @> array[me, p.id::text])
         or exists (select 1 from public.expenses x       where x.member_ids @> array[me, p.id::text])
         or exists (select 1 from public.settlements s    where s.member_ids @> array[me, p.id::text])
       );
end;
$$;

alter policy receipts_expenses_delete on storage.objects
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and exists (
      select 1 from public.expenses e
      where e.id = (storage.foldername(name))[2]
        and (select auth.uid())::text = any (e.member_ids)
    )
  );

alter policy receipts_expenses_update on storage.objects
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and exists (
      select 1 from public.expenses e
      where e.id = (storage.foldername(name))[2]
        and (select auth.uid())::text = any (e.member_ids)
    )
  )
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and exists (
      select 1 from public.expenses e
      where e.id = (storage.foldername(name))[2]
        and (select auth.uid())::text = any (e.member_ids)
    )
  );

alter policy receipts_expenses_insert on storage.objects
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and exists (
      select 1 from public.expenses e
      where e.id = (storage.foldername(name))[2]
        and (select auth.uid())::text = any (e.member_ids)
    )
  );

alter policy receipts_expenses_select on storage.objects
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and exists (
      select 1 from public.expenses e
      where e.id = (storage.foldername(name))[2]
        and (select auth.uid())::text = any (e.member_ids)
    )
  );

alter policy settlements_select on public.settlements
  using ((select auth.uid())::text = any (member_ids));

alter policy expenses_select on public.expenses
  using ((select auth.uid())::text = any (member_ids));

drop function if exists public.can_see_expense(text);
drop function if exists public.can_see_shared_row(text[], text, text);
drop function if exists public.is_event_member(text);
drop function if exists public.is_group_member(text);
