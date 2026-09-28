-- migrate:up
-- ============================================================================
-- Plan B2d migration B (ADR 0013) — foreign keys with ON DELETE SET NULL.
--
-- Until now nothing tied `group_id` / `event_id` to the row they name (spec
-- D9/D10 chose denormalised ids on purpose). Deleting a group therefore left
-- every row that pointed at it dangling, and the app had to ungroup them one
-- by one first (plan B12) — a choreography that needed the deleting admin to
-- see every row and to be friends with every member of each one. A foreign
-- key makes the database do it, atomically, for every row.
--
--   expenses.group_id, events.group_id, settlements.group_id
--                                     → expense_groups(id) ON DELETE SET NULL
--   expenses.event_id, settlements.event_id
--                                     → events(id)          ON DELETE SET NULL
--
-- Referential actions run as the table owner and bypass RLS, so rows the
-- deleting user cannot select are unlinked as well. They still fire the
-- BEFORE UPDATE guard triggers, which allow a change that only NULLs
-- `group_id` / `event_id` (guard_expenses, guard_events, guard_settlements
-- never reject that). Deleting a group or an event is still authorised by its
-- own DELETE policy (admin / creator); the foreign key only cleans up after it.
--
-- Existing data: orphans (an id that points at nothing, possible until now)
-- are nulled FIRST — exactly what the action would have done — and the
-- constraints are then added NOT VALID and VALIDATEd, so the validation scan
-- is a separate step from the constraint creation.
-- ============================================================================

update public.expenses    set group_id = null where group_id is not null
   and not exists (select 1 from public.expense_groups g where g.id = expenses.group_id);
update public.events      set group_id = null where group_id is not null
   and not exists (select 1 from public.expense_groups g where g.id = events.group_id);
update public.settlements set group_id = null where group_id is not null
   and not exists (select 1 from public.expense_groups g where g.id = settlements.group_id);
update public.expenses    set event_id = null where event_id is not null
   and not exists (select 1 from public.events ev where ev.id = expenses.event_id);
update public.settlements set event_id = null where event_id is not null
   and not exists (select 1 from public.events ev where ev.id = settlements.event_id);

alter table public.expenses
  add constraint expenses_group_id_fkey foreign key (group_id)
  references public.expense_groups (id) on delete set null not valid;
alter table public.events
  add constraint events_group_id_fkey foreign key (group_id)
  references public.expense_groups (id) on delete set null not valid;
alter table public.settlements
  add constraint settlements_group_id_fkey foreign key (group_id)
  references public.expense_groups (id) on delete set null not valid;
alter table public.expenses
  add constraint expenses_event_id_fkey foreign key (event_id)
  references public.events (id) on delete set null not valid;
alter table public.settlements
  add constraint settlements_event_id_fkey foreign key (event_id)
  references public.events (id) on delete set null not valid;

alter table public.expenses    validate constraint expenses_group_id_fkey;
alter table public.events      validate constraint events_group_id_fkey;
alter table public.settlements validate constraint settlements_group_id_fkey;
alter table public.expenses    validate constraint expenses_event_id_fkey;
alter table public.settlements validate constraint settlements_event_id_fkey;

-- migrate:down
-- Dropping a foreign key loses no data; the ids simply stop being enforced.
alter table public.settlements drop constraint if exists settlements_event_id_fkey;
alter table public.expenses    drop constraint if exists expenses_event_id_fkey;
alter table public.settlements drop constraint if exists settlements_group_id_fkey;
alter table public.events      drop constraint if exists events_group_id_fkey;
alter table public.expenses    drop constraint if exists expenses_group_id_fkey;
