-- migrate:up
-- ============================================================================
-- Plan B2 step 6 — Realtime (spec D10).
--
-- RLS filters INSERT/UPDATE change events per subscriber. DELETE events reach
-- every subscriber of the table carrying only the primary key, because
-- `replica identity full` is never set; ids are random UUIDs, so a leaked id of
-- a row you cannot select is unusable. The adapter re-runs its query on any
-- event instead of evaluating filters on payloads.
-- ============================================================================
alter publication supabase_realtime add table
  public.expense_groups,
  public.expenses,
  public.settlements,
  public.events,
  public.friendships;

-- migrate:down
alter publication supabase_realtime drop table
  public.friendships,
  public.events,
  public.settlements,
  public.expenses,
  public.expense_groups;
