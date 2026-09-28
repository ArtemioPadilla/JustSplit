-- migrate:up
-- ============================================================================
-- Plan B2 step 5 — guard_<table>() BEFORE UPDATE triggers (spec D10).
--
-- A policy sees only the new row, so the rules that compare OLD and NEW live
-- here: created_by is immutable everywhere; on expense_groups only an admin may
-- change member_ids/admin_ids and every newly added member must be an accepted
-- friend of that admin; on friendships users/requested_by are immutable and
-- only the recipient may change status.
--
-- SECURITY INVOKER: the friendships lookups run under the actor's own RLS,
-- which is exactly the set of friendships the actor may rely on. When there is
-- no JWT (postgres / service_role maintenance) auth.uid() is null and only the
-- created_by / users / requested_by immutability rules apply.
--
-- Column-level `revoke update (col)` is deliberately NOT used: it is a no-op
-- while table-level UPDATE is granted, and it would break every upsert path.
-- ============================================================================

create or replace function public.guard_expense_groups()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  actor text := (select auth.uid())::text;
  added text;
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'expense_groups.created_by is immutable'
      using errcode = 'insufficient_privilege';
  end if;

  if actor is not null
     and (new.member_ids is distinct from old.member_ids
          or new.admin_ids is distinct from old.admin_ids) then
    if actor <> all (old.admin_ids) then
      raise exception 'only a group admin can change member_ids or admin_ids'
        using errcode = 'insufficient_privilege';
    end if;

    for added in
      select unnest(new.member_ids) except select unnest(old.member_ids)
    loop
      if added <> actor and not exists (
        select 1 from public.friendships f
        where f.status = 'accepted' and f.users @> array[actor, added]
      ) then
        raise exception 'a new group member must be an accepted friend of the admin adding them'
          using errcode = 'insufficient_privilege';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

create or replace function public.guard_expenses()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'expenses.created_by is immutable'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create or replace function public.guard_settlements()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- No update policy exists, so an authenticated update never reaches this
  -- trigger; it protects maintenance paths and any future policy.
  if new.created_by is distinct from old.created_by then
    raise exception 'settlements.created_by is immutable'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create or replace function public.guard_events()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'events.created_by is immutable'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create or replace function public.guard_friendships()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  actor text := (select auth.uid())::text;
begin
  if new.users is distinct from old.users
     or new.requested_by is distinct from old.requested_by then
    raise exception 'friendships.users and requested_by are immutable'
      using errcode = 'insufficient_privilege';
  end if;

  if new.status is distinct from old.status and actor = old.requested_by then
    raise exception 'only the recipient can change a friendship status'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_expense_groups() from public, anon, authenticated;
revoke execute on function public.guard_expenses()       from public, anon, authenticated;
revoke execute on function public.guard_settlements()    from public, anon, authenticated;
revoke execute on function public.guard_events()         from public, anon, authenticated;
revoke execute on function public.guard_friendships()    from public, anon, authenticated;

create trigger guard_expense_groups before update on public.expense_groups
  for each row execute function public.guard_expense_groups();
create trigger guard_expenses before update on public.expenses
  for each row execute function public.guard_expenses();
create trigger guard_settlements before update on public.settlements
  for each row execute function public.guard_settlements();
create trigger guard_events before update on public.events
  for each row execute function public.guard_events();
create trigger guard_friendships before update on public.friendships
  for each row execute function public.guard_friendships();

-- migrate:down
drop trigger if exists guard_friendships    on public.friendships;
drop trigger if exists guard_events         on public.events;
drop trigger if exists guard_settlements    on public.settlements;
drop trigger if exists guard_expenses       on public.expenses;
drop trigger if exists guard_expense_groups on public.expense_groups;
drop function if exists public.guard_friendships();
drop function if exists public.guard_events();
drop function if exists public.guard_settlements();
drop function if exists public.guard_expenses();
drop function if exists public.guard_expense_groups();
