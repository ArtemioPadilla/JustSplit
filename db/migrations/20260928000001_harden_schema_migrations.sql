-- migrate:up
-- ============================================================================
-- Plan B2 step 1 — close the dbmate bookkeeping table to the Data API.
--
-- dbmate creates public.schema_migrations BEFORE it applies any migration, and
-- Supabase's default privileges grant ALL on new `public` tables to `anon` and
-- `authenticated`. Left alone, an anonymous `DELETE /rest/v1/schema_migrations`
-- would make db-migrate.yml re-run every migration on its next push.
-- RLS with no policy denies every Data API role; the revoke removes the grants
-- as well. dbmate connects as `postgres`, the table owner, which bypasses RLS,
-- so migrations keep working.
-- ============================================================================
alter table public.schema_migrations enable row level security;
revoke all on table public.schema_migrations from anon, authenticated;

-- migrate:down
-- Intentionally empty: re-opening the table to the Data API is never wanted,
-- and this file is the last one a full rollback reaches.
select 1;
