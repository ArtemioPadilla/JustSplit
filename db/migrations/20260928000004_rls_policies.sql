-- migrate:up
-- ============================================================================
-- Plan B2 step 4 — Row Level Security (spec D10 policy table).
--
-- RLS is the ONLY authorization (static client, doctrine §1.1). Every policy is
-- `to authenticated` and compares against `(select auth.uid())::text`; `anon`
-- matches no policy on any table. One named policy per command.
--
-- "Membership mirror" (expenses, events, settlements; insert + update WITH
-- CHECK): with a group_id, the row's member_ids must be a subset of a group
-- the actor belongs to; without one, every other id in member_ids must be an
-- accepted friend of the actor. Without it any signed-up user could push
-- "you owe me" rows into any other user's lists.
--
-- Column references inside subqueries are table-qualified on purpose:
-- expense_groups also has a member_ids column, and an unqualified name would
-- bind to the inner table.
--
-- Old-vs-new rules (immutable created_by, admin-only membership changes,
-- recipient-only friendship status) cannot be expressed by policies; they
-- live in the guard_<table> triggers (next migration).
-- ============================================================================

alter table public.expense_groups enable row level security;
alter table public.expenses       enable row level security;
alter table public.settlements    enable row level security;
alter table public.events         enable row level security;
alter table public.friendships    enable row level security;

-- ── expense_groups ──────────────────────────────────────────────────────────
create policy expense_groups_select on public.expense_groups
  for select to authenticated
  using ((select auth.uid())::text = any (member_ids));

create policy expense_groups_insert on public.expense_groups
  for insert to authenticated
  with check (
    created_by = (select auth.uid())::text
    and (select auth.uid())::text = any (member_ids)
    and (select auth.uid())::text = any (admin_ids)
    and not exists (
      select 1 from unnest(expense_groups.member_ids) as m(uid)
      where m.uid <> (select auth.uid())::text
        and not exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and f.users @> array[(select auth.uid())::text, m.uid]
        )
    )
  );

create policy expense_groups_update on public.expense_groups
  for update to authenticated
  using ((select auth.uid())::text = any (member_ids))
  with check ((select auth.uid())::text = any (member_ids));

create policy expense_groups_delete on public.expense_groups
  for delete to authenticated
  using ((select auth.uid())::text = any (admin_ids));

-- ── expenses ────────────────────────────────────────────────────────────────
create policy expenses_select on public.expenses
  for select to authenticated
  using ((select auth.uid())::text = any (member_ids));

create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (
    created_by = (select auth.uid())::text
    and (select auth.uid())::text = any (member_ids)
    and paid_by = any (member_ids)
    and not exists (
      select 1 from jsonb_array_elements(expenses.splits) as s(split)
      where (s.split->>'userId') is null
         or not ((s.split->>'userId') = any (expenses.member_ids))
    )
    and (
      (expenses.group_id is not null and exists (
        select 1 from public.expense_groups g
        where g.id = expenses.group_id
          and (select auth.uid())::text = any (g.member_ids)
          and expenses.member_ids <@ g.member_ids
      ))
      or
      (expenses.group_id is null and not exists (
        select 1 from unnest(expenses.member_ids) as m(uid)
        where m.uid <> (select auth.uid())::text
          and not exists (
            select 1 from public.friendships f
            where f.status = 'accepted'
              and f.users @> array[(select auth.uid())::text, m.uid]
          )
      ))
    )
  );

create policy expenses_update on public.expenses
  for update to authenticated
  using ((select auth.uid())::text = any (member_ids))
  with check (
    (select auth.uid())::text = any (member_ids)
    and paid_by = any (member_ids)
    and not exists (
      select 1 from jsonb_array_elements(expenses.splits) as s(split)
      where (s.split->>'userId') is null
         or not ((s.split->>'userId') = any (expenses.member_ids))
    )
    and (
      (expenses.group_id is not null and exists (
        select 1 from public.expense_groups g
        where g.id = expenses.group_id
          and (select auth.uid())::text = any (g.member_ids)
          and expenses.member_ids <@ g.member_ids
      ))
      or
      (expenses.group_id is null and not exists (
        select 1 from unnest(expenses.member_ids) as m(uid)
        where m.uid <> (select auth.uid())::text
          and not exists (
            select 1 from public.friendships f
            where f.status = 'accepted'
              and f.users @> array[(select auth.uid())::text, m.uid]
          )
      ))
    )
  );

create policy expenses_delete on public.expenses
  for delete to authenticated
  using (created_by = (select auth.uid())::text or paid_by = (select auth.uid())::text);

-- ── settlements (immutable: no update policy; correct by delete + insert) ───
create policy settlements_select on public.settlements
  for select to authenticated
  using ((select auth.uid())::text = any (member_ids));

create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (
    created_by = (select auth.uid())::text
    and (select auth.uid())::text in (from_user_id, to_user_id)
    and member_ids @> array[from_user_id, to_user_id]
    and member_ids <@ array[from_user_id, to_user_id]
    and (
      (settlements.group_id is not null and exists (
        select 1 from public.expense_groups g
        where g.id = settlements.group_id
          and (select auth.uid())::text = any (g.member_ids)
          and settlements.member_ids <@ g.member_ids
      ))
      or
      (settlements.group_id is null and not exists (
        select 1 from unnest(settlements.member_ids) as m(uid)
        where m.uid <> (select auth.uid())::text
          and not exists (
            select 1 from public.friendships f
            where f.status = 'accepted'
              and f.users @> array[(select auth.uid())::text, m.uid]
          )
      ))
    )
  );

create policy settlements_delete on public.settlements
  for delete to authenticated
  using (created_by = (select auth.uid())::text);

-- ── events ──────────────────────────────────────────────────────────────────
create policy events_select on public.events
  for select to authenticated
  using ((select auth.uid())::text = any (member_ids));

create policy events_insert on public.events
  for insert to authenticated
  with check (
    created_by = (select auth.uid())::text
    and (select auth.uid())::text = any (member_ids)
    and (
      (events.group_id is not null and exists (
        select 1 from public.expense_groups g
        where g.id = events.group_id
          and (select auth.uid())::text = any (g.member_ids)
          and events.member_ids <@ g.member_ids
      ))
      or
      (events.group_id is null and not exists (
        select 1 from unnest(events.member_ids) as m(uid)
        where m.uid <> (select auth.uid())::text
          and not exists (
            select 1 from public.friendships f
            where f.status = 'accepted'
              and f.users @> array[(select auth.uid())::text, m.uid]
          )
      ))
    )
  );

create policy events_update on public.events
  for update to authenticated
  using ((select auth.uid())::text = any (member_ids))
  with check (
    (select auth.uid())::text = any (member_ids)
    and (
      (events.group_id is not null and exists (
        select 1 from public.expense_groups g
        where g.id = events.group_id
          and (select auth.uid())::text = any (g.member_ids)
          and events.member_ids <@ g.member_ids
      ))
      or
      (events.group_id is null and not exists (
        select 1 from unnest(events.member_ids) as m(uid)
        where m.uid <> (select auth.uid())::text
          and not exists (
            select 1 from public.friendships f
            where f.status = 'accepted'
              and f.users @> array[(select auth.uid())::text, m.uid]
          )
      ))
    )
  );

create policy events_delete on public.events
  for delete to authenticated
  using (created_by = (select auth.uid())::text);

-- ── friendships ─────────────────────────────────────────────────────────────
create policy friendships_select on public.friendships
  for select to authenticated
  using ((select auth.uid())::text = any (users));

create policy friendships_insert on public.friendships
  for insert to authenticated
  with check (
    requested_by = (select auth.uid())::text
    and (select auth.uid())::text = any (users)
    and cardinality(users) = 2
    and status = 'pending'
  );

create policy friendships_update on public.friendships
  for update to authenticated
  using ((select auth.uid())::text = any (users))
  with check ((select auth.uid())::text = any (users));

create policy friendships_delete on public.friendships
  for delete to authenticated
  using ((select auth.uid())::text = any (users));

-- migrate:down
drop policy if exists friendships_delete    on public.friendships;
drop policy if exists friendships_update    on public.friendships;
drop policy if exists friendships_insert    on public.friendships;
drop policy if exists friendships_select    on public.friendships;
drop policy if exists events_delete         on public.events;
drop policy if exists events_update         on public.events;
drop policy if exists events_insert         on public.events;
drop policy if exists events_select         on public.events;
drop policy if exists settlements_delete    on public.settlements;
drop policy if exists settlements_insert    on public.settlements;
drop policy if exists settlements_select    on public.settlements;
drop policy if exists expenses_delete       on public.expenses;
drop policy if exists expenses_update       on public.expenses;
drop policy if exists expenses_insert       on public.expenses;
drop policy if exists expenses_select       on public.expenses;
drop policy if exists expense_groups_delete on public.expense_groups;
drop policy if exists expense_groups_update on public.expense_groups;
drop policy if exists expense_groups_insert on public.expense_groups;
drop policy if exists expense_groups_select on public.expense_groups;
-- RLS stays enabled on rollback: with no policy it denies everything, which
-- is the safe state until step 3 is rolled back too.
