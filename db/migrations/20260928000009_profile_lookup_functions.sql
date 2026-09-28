-- migrate:up
-- ============================================================================
-- Plan B2 steps 9–10 — the only cross-user reads of `profiles` (spec D10).
--
-- `profiles` RLS stays own-row (it also holds email, preferences, permissions,
-- isAdmin), so other users' names/avatars are resolved through these two
-- SECURITY DEFINER functions, which return three columns and nothing else.
-- Both are callable by `authenticated` only.
-- ============================================================================

-- Friend search by exact email. Matches the CONFIRMED address in auth.users,
-- never the user-writable profiles.email: otherwise anyone could set their
-- profile email to a victim's address and receive the victim's requests.
create or replace function public.find_profile_by_email(p_email text)
returns table (id text, name text, "avatarUrl" text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id::text, p.name, p."avatarUrl"
    from public.profiles p
    join auth.users u on u.id = p.id
   where p_email ~ '^[^@\s]+@[^@\s]+$'
     and u.email_confirmed_at is not null
     and lower(u.email) = lower(p_email)
   limit 1;
$$;

revoke execute on function public.find_profile_by_email(text) from public, anon;
grant  execute on function public.find_profile_by_email(text) to authenticated;

-- Display data for users who share at least one row with the caller
-- (friendship in any status, group, event, expense or settlement), plus the
-- caller. At most 200 ids per call.
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

revoke execute on function public.find_profiles_by_ids(text[]) from public, anon;
grant  execute on function public.find_profiles_by_ids(text[]) to authenticated;

-- migrate:down
drop function if exists public.find_profiles_by_ids(text[]);
drop function if exists public.find_profile_by_email(text);
