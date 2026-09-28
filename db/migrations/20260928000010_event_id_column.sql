-- migrate:up
-- ============================================================================
-- Plan B2d migration A (ADR 0013) — `event_id` becomes a real column.
--
-- `eventId` used to be a JustSplit-only overflow key in `extra` (spec D9), so
-- no policy, foreign key or index could see it: an event's expenses were
-- visible only through `member_ids`, and deleting an event left dangling ids.
-- The next migrations need it as a column (foreign key + event-member
-- visibility), so it is promoted on both tables that carry it: `expenses` and
-- `settlements` (B14's `?event=` scope reads the same key).
--
-- Nullable on purpose: most rows have no event. No default, no constraint here
-- (the foreign key is migration B).
-- ============================================================================
alter table public.expenses    add column event_id text;
alter table public.settlements add column event_id text;

-- Backfill for any row written before this migration (staging; production has
-- no data yet). The statements are idempotent and fenced by markers because
-- src/tests/rls/event-id.test.ts extracts and re-runs them. `nullif` drops an
-- empty string; the key leaves `extra` so there is one source of truth. The
-- updated_at trigger bumps the touched rows, which is accepted for a
-- one-time data move.
-- backfill:begin
update public.expenses
   set event_id = nullif(extra->>'eventId', ''),
       extra    = extra - 'eventId'
 where extra ? 'eventId';
update public.settlements
   set event_id = nullif(extra->>'eventId', ''),
       extra    = extra - 'eventId'
 where extra ? 'eventId';
-- backfill:end

-- The expression indexes on extra->>'eventId' are replaced by plain btree
-- indexes on the column (same names, so the catalog stays tidy).
drop index if exists public.expenses_event_id_idx;
drop index if exists public.settlements_event_id_idx;
create index expenses_event_id_idx    on public.expenses (event_id);
create index settlements_event_id_idx on public.settlements (event_id);

-- migrate:down
-- Move the value back into `extra` so a rollback loses nothing, then restore
-- the expression indexes of migration 03.
drop index if exists public.settlements_event_id_idx;
drop index if exists public.expenses_event_id_idx;

update public.expenses
   set extra = extra || jsonb_build_object('eventId', event_id)
 where event_id is not null;
update public.settlements
   set extra = extra || jsonb_build_object('eventId', event_id)
 where event_id is not null;

alter table public.settlements drop column event_id;
alter table public.expenses    drop column event_id;

create index expenses_event_id_idx    on public.expenses ((extra->>'eventId'));
create index settlements_event_id_idx on public.settlements ((extra->>'eventId'));
