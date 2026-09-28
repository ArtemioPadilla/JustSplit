-- migrate:up
-- ============================================================================
-- Plan B2 step 3 — JustSplit tables (spec D10, relational mode).
--
-- Conventions: `id text` primary key (adapter generateId); snake_case columns
-- for the universal @cyber-eco/types fields; JustSplit-only top-level fields
-- live in the `extra` jsonb overflow, which only the SchemaMap adapter reads
-- or writes (the app never sees a field named `extra`; no constraint inspects
-- it, so Track D adds overflow keys without a migration). Money numeric(14,2),
-- currency char(3), calendar dates `date` (ISO `YYYY-MM-DD` on the wire),
-- server-managed created_at / updated_at.
--
-- Authorization columns read by RLS and the guard triggers: member_ids,
-- admin_ids, created_by, paid_by, from_user_id, to_user_id, users,
-- requested_by, status. No policy and no check constraint ever reads `extra`.
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ── expense_groups ──────────────────────────────────────────────────────────
create table public.expense_groups (
  id              text          primary key,
  name            text          not null,
  description     text,
  type            text          not null default 'friends'
                                check (type in ('family', 'friends', 'community', 'organization', 'other')),
  currency        char(3)       not null,
  members         jsonb         not null default '[]'::jsonb check (jsonb_typeof(members) = 'array'),
  settings        jsonb         not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  total_expenses  numeric(14,2) not null default 0,
  member_ids      text[]        not null,
  admin_ids       text[]        not null,
  created_by      text          not null,
  extra           jsonb         not null default '{}'::jsonb,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now(),
  constraint expense_groups_admins_are_members check (admin_ids <@ member_ids)
);
create index expense_groups_member_ids_gin on public.expense_groups using gin (member_ids);

-- ── expenses ────────────────────────────────────────────────────────────────
-- group_id is nullable in JustSplit (event and friend-to-friend expenses).
create table public.expenses (
  id              text          primary key,
  group_id        text,
  description     text          not null,
  amount          numeric(14,2) not null,
  currency        char(3)       not null,
  paid_by         text          not null,
  split_type      text          not null check (split_type in ('equal', 'percentage', 'exact')),
  splits          jsonb         not null default '[]'::jsonb check (jsonb_typeof(splits) = 'array'),
  date            date          not null,
  category        text,
  tags            text[]        not null default '{}',
  notes           text,
  images          text[]        not null default '{}',
  source          text,
  transaction_id  text,
  member_ids      text[]        not null,
  created_by      text          not null,
  extra           jsonb         not null default '{}'::jsonb,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);
create index expenses_member_ids_gin on public.expenses using gin (member_ids);
create index expenses_group_id_idx   on public.expenses (group_id);
create index expenses_event_id_idx   on public.expenses ((extra->>'eventId'));

-- ── settlements ─────────────────────────────────────────────────────────────
create table public.settlements (
  id              text          primary key,
  group_id        text,
  from_user_id    text          not null,
  to_user_id      text          not null,
  amount          numeric(14,2) not null,
  currency        char(3)       not null,
  date            date          not null,
  method          text,
  notes           text,
  transaction_id  text,
  member_ids      text[]        not null,
  created_by      text          not null,
  extra           jsonb         not null default '{}'::jsonb,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now(),
  constraint settlements_distinct_parties check (from_user_id <> to_user_id)
);
create index settlements_member_ids_gin on public.settlements using gin (member_ids);
create index settlements_group_id_idx   on public.settlements (group_id);
create index settlements_event_id_idx   on public.settlements ((extra->>'eventId'));

-- ── events ──────────────────────────────────────────────────────────────────
-- `kind` has no check constraint on purpose: values are parsed with a default
-- in the app (parseEventKind, spec D9), so a new kind needs no migration.
create table public.events (
  id                  text        primary key,
  name                text        not null,
  description         text,
  group_id            text,
  date                date,
  start_date          date,
  end_date            date,
  location            text,
  preferred_currency  char(3),
  kind                text        not null default 'event',
  member_ids          text[]      not null,
  created_by          text        not null,
  extra               jsonb       not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index events_member_ids_gin on public.events using gin (member_ids);
create index events_group_id_idx   on public.events (group_id);

-- ── friendships ─────────────────────────────────────────────────────────────
create table public.friendships (
  id            text        primary key,
  users         text[]      not null,
  status        text        not null default 'pending'
                            check (status in ('pending', 'accepted', 'rejected')),
  requested_by  text        not null,
  extra         jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint friendships_two_distinct_users
    check (cardinality(users) = 2 and users[1] <> users[2])
);
create index friendships_users_gin on public.friendships using gin (users);
-- One row per unordered pair: request spam is a unique violation.
create unique index friendships_pair_uniq
  on public.friendships ((least(users[1], users[2])), (greatest(users[1], users[2])));

-- ── updated_at triggers ─────────────────────────────────────────────────────
create trigger expense_groups_set_updated_at before update on public.expense_groups
  for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
create trigger settlements_set_updated_at before update on public.settlements
  for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger friendships_set_updated_at before update on public.friendships
  for each row execute function public.set_updated_at();

-- migrate:down
drop table if exists public.friendships cascade;
drop table if exists public.events cascade;
drop table if exists public.settlements cascade;
drop table if exists public.expenses cascade;
drop table if exists public.expense_groups cascade;
drop function if exists public.set_updated_at();
