-- migrate:up
-- ============================================================================
-- profiles — identity-adjacent user profile written CLIENT-SIDE by the browser
-- (publishable key + the user's own session). SupabaseProfileStore.upsert()
-- writes flat top-level keys as columns, so column names must match the
-- HubUser shape EXACTLY — camelCase identifiers are double-quoted to preserve
-- case (unquoted Postgres folds to lowercase; PostgREST would then 404/400 on
-- the camelCase keys the store sends).
-- ============================================================================
create table if not exists public.profiles (
  id            uuid        primary key references auth.users (id) on delete cascade,
  name          text,
  email         text,
  "avatarUrl"   text,
  apps          jsonb       not null default '[]'::jsonb,
  permissions   jsonb       not null default '[]'::jsonb,
  preferences   jsonb       not null default '{}'::jsonb,
  "createdAt"   text,
  "updatedAt"   text,
  "lastLoginAt" text,
  "isAdmin"     boolean     not null default false
);

alter table public.profiles enable row level security;

-- Own-row access for every command via a single FOR ALL policy. USING gates
-- read/update/delete; WITH CHECK gates the new row on insert/update. The
-- earlier per-command policy names are dropped first so this converges whether
-- the table is fresh or was hand-applied with the older 3-policy version.
drop policy if exists profiles_select   on public.profiles;
drop policy if exists profiles_insert   on public.profiles;
drop policy if exists profiles_update   on public.profiles;
drop policy if exists profiles_own_row  on public.profiles;

create policy profiles_own_row on public.profiles
  for all
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- migrate:down
drop table if exists public.profiles cascade;
