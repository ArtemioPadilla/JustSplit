-- migrate:up
-- ============================================================================
-- Plan B2d migration E (ADR 0013; closes the follow-up recorded in ADR 0006) —
-- a per-caller rate limit on find_profile_by_email.
--
-- The function answers "does this exact confirmed email have an account?" for
-- any signed-in user, so a script could enumerate candidate addresses. The
-- limit lives inside the function (the only place a static client cannot skip):
--
--   * every call by an authenticated caller is recorded in
--     public.profile_lookup_attempts(uid, at), whether or not it matched;
--   * at most LOOKUP_LIMIT (30) attempts in the last hour; the next call raises
--     SQLSTATE P0429 with the message `rate_limited` and is NOT recorded, so a
--     blocked caller who keeps hammering does not extend their own block - the
--     window simply slides as old attempts age out;
--   * recording an attempt also prunes that caller's attempts older than a day,
--     so the table stays small without a scheduled job;
--   * a per-caller advisory lock serialises concurrent calls, so two parallel
--     requests cannot both slip under the limit.
--
-- The table has RLS enabled and NO policy, and no grant to anon/authenticated:
-- clients can neither read their own counter nor reset it. The SECURITY
-- DEFINER function runs as the table owner, which bypasses RLS.
--
-- A call without a JWT (postgres / service_role maintenance) is not limited or
-- recorded. The function is no longer STABLE: it writes.
-- ============================================================================

-- uid references auth.users like public.profiles does: deleting an account
-- deletes its lookup history with it.
create table public.profile_lookup_attempts (
  uid uuid        not null references auth.users (id) on delete cascade,
  at  timestamptz not null default now()
);
create index profile_lookup_attempts_uid_at_idx on public.profile_lookup_attempts (uid, at);

alter table public.profile_lookup_attempts enable row level security;
revoke all on table public.profile_lookup_attempts from anon, authenticated;

create or replace function public.find_profile_by_email(p_email text)
returns table (id text, name text, "avatarUrl" text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- The limit: lookups allowed per caller per rolling hour. Raise it here (and
  -- in ADR 0013) if real usage ever needs more; the client copy never states it.
  lookup_limit constant integer := 30;
  caller uuid := (select auth.uid());
  recent integer;
begin
  if caller is not null then
    perform pg_advisory_xact_lock(hashtextextended('find_profile_by_email:' || caller::text, 0));

    select count(*) into recent
      from public.profile_lookup_attempts a
     where a.uid = caller
       and a.at > now() - interval '1 hour';
    if recent >= lookup_limit then
      raise exception 'rate_limited' using errcode = 'P0429';
    end if;

    insert into public.profile_lookup_attempts (uid) values (caller);
    delete from public.profile_lookup_attempts a
     where a.uid = caller
       and a.at < now() - interval '1 day';
  end if;

  -- Matches the CONFIRMED address in auth.users, never the user-writable
  -- profiles.email: otherwise anyone could set their profile email to a
  -- victim's address and receive the victim's requests.
  return query
    select p.id::text, p.name, p."avatarUrl"
      from public.profiles p
      join auth.users u on u.id = p.id
     where p_email ~ '^[^@\s]+@[^@\s]+$'
       and u.email_confirmed_at is not null
       and lower(u.email) = lower(p_email)
     limit 1;
end;
$$;

-- migrate:down
-- Restores the STABLE, unlimited SQL function of migration 09 (create or
-- replace keeps its execute grants) and drops the attempts table.
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

drop table if exists public.profile_lookup_attempts;
