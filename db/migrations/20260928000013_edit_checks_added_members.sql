-- migrate:up
-- ============================================================================
-- Plan B2d migration D (ADR 0013) — edits check only what changed.
--
-- The membership mirror of migration 04 was evaluated against the WHOLE new
-- row on every update: with a group, `member_ids <@ group.member_ids`; without
-- one, every member had to be an accepted friend of the EDITOR. So removing a
-- member from a group locked every old row that still named them (ADR 0002,
-- B12), and a non-friend co-member could never edit a shared expense (ADR
-- 0005, B10). Both are the same mistake: re-validating people who were
-- already on the row.
--
-- Now the update policy keeps only what needs no OLD row, and the rules that
-- compare OLD and NEW move into the BEFORE UPDATE guards, where only ADDED
-- members (new.member_ids minus old.member_ids) are checked:
--
--   expenses  group_id set          → each added member is a member of the group
--             else event_id set     → each added member is an event member or an
--                                     accepted friend of the actor
--             else                  → each added member is an accepted friend
--   events    group_id set          → each added member is a member of the group
--             else                  → each added member is an accepted friend
--
-- and pointing a row at a (different) group/event is allowed only to someone
-- named on the row and a member of the target (group targets also need
-- member_ids ⊆ the group, the B12 attach rule). Leaving one (NULL or a move
-- away) needs membership of the one being left, except for the ON DELETE SET
-- NULL action of migration B (see below).
--
-- The lookups run SECURITY INVOKER under the actor's own RLS: an actor sees a
-- group only when they belong to it, an event likewise, and friendships are
-- their own, which is exactly the set of facts they may rely on. No JWT
-- (postgres / service_role / maintenance) skips the membership rules; the
-- created_by rule always applies.
--
-- Insert is unchanged for group expenses and plain friend expenses. A
-- no-group event expense may name other event members OR the creator's
-- friends, and the creator must belong to the event (otherwise anyone could
-- push rows into an event's feed, which every event member now sees). The
-- same holds for settlements (migration 012 made event members see them, with
-- their amounts): settlements_insert requires the creator to be an event member.
--
-- LEAVING a group or event is privileged like joining one: visibility follows
-- group_id/event_id, so nulling (or moving away from) the link pulls the row
-- out of every member's feed and changes their balances. A direct write needs
-- membership of the group/event the row is leaving. The ON DELETE SET NULL
-- referential action is exempt - it must keep working for rows nobody in the
-- group can see - and is told apart by trigger nesting: a direct UPDATE fires
-- the guard at pg_trigger_depth() = 1, the foreign key's UPDATE is issued from
-- inside the RI trigger, so the guard runs at depth 2.
-- ============================================================================

alter policy expenses_insert on public.expenses
  with check (
    created_by = (select auth.uid())::text
    and (select auth.uid())::text = any (member_ids)
    and paid_by = any (member_ids)
    and not exists (
      select 1 from jsonb_array_elements(expenses.splits) as s(split)
      where (s.split->>'userId') is null
         or not ((s.split->>'userId') = any (expenses.member_ids))
    )
    and (expenses.event_id is null or public.is_event_member(expenses.event_id))
    and (
      (expenses.group_id is not null and exists (
        select 1 from public.expense_groups g
        where g.id = expenses.group_id
          and (select auth.uid())::text = any (g.member_ids)
          and expenses.member_ids <@ g.member_ids
      ))
      or
      (expenses.group_id is null and expenses.event_id is not null and not exists (
        select 1 from unnest(expenses.member_ids) as m(uid)
        where m.uid <> (select auth.uid())::text
          and not exists (
            select 1 from public.events ev
            where ev.id = expenses.event_id and m.uid = any (ev.member_ids)
          )
          and not exists (
            select 1 from public.friendships f
            where f.status = 'accepted'
              and f.users @> array[(select auth.uid())::text, m.uid]
          )
      ))
      or
      (expenses.group_id is null and expenses.event_id is null and not exists (
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

-- USING: the actor can see the row (member_ids, group or event). WITH CHECK:
-- they still can afterwards, and the row stays internally consistent.
alter policy expenses_update on public.expenses
  using (public.can_see_shared_row(member_ids, group_id, event_id))
  with check (
    public.can_see_shared_row(member_ids, group_id, event_id)
    and paid_by = any (member_ids)
    and not exists (
      select 1 from jsonb_array_elements(expenses.splits) as s(split)
      where (s.split->>'userId') is null
         or not ((s.split->>'userId') = any (expenses.member_ids))
    )
  );

-- Events: a member keeps editing; only the guard looks at group membership.
alter policy events_update on public.events
  with check ((select auth.uid())::text = any (member_ids));

-- Settlements: the same feed-injection rule as expenses (event_id must be an
-- event the creator belongs to); the rest of the policy is migration 04's.
alter policy settlements_insert on public.settlements
  with check (
    created_by = (select auth.uid())::text
    and (select auth.uid())::text in (from_user_id, to_user_id)
    and member_ids @> array[from_user_id, to_user_id]
    and member_ids <@ array[from_user_id, to_user_id]
    and (settlements.event_id is null or public.is_event_member(settlements.event_id))
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

create or replace function public.guard_expenses()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  actor text := (select auth.uid())::text;
  added text;
  allowed boolean;
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'expenses.created_by is immutable'
      using errcode = 'insufficient_privilege';
  end if;

  if actor is null then
    return new;
  end if;

  -- Leaving a group / event (nulling or moving away) needs membership of the
  -- one being left; pg_trigger_depth() > 1 is the ON DELETE SET NULL action.
  if old.group_id is not null and new.group_id is distinct from old.group_id
     and pg_trigger_depth() <= 1 then
    if not public.is_group_member(old.group_id) then
      raise exception 'only a member of a group can take an expense out of it'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  if old.event_id is not null and new.event_id is distinct from old.event_id
     and pg_trigger_depth() <= 1 then
    if not public.is_event_member(old.event_id) then
      raise exception 'only a member of an event can take an expense out of it'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Pointing the row at a different group / event.
  if new.group_id is not null and new.group_id is distinct from old.group_id then
    if not (actor = any (old.member_ids)) then
      raise exception 'only someone named on an expense can move it into a group'
        using errcode = 'insufficient_privilege';
    end if;
    if not public.is_group_member(new.group_id) then
      raise exception 'you are not a member of that group'
        using errcode = 'insufficient_privilege';
    end if;
    if not (new.member_ids <@ coalesce(
              (select g.member_ids from public.expense_groups g where g.id = new.group_id),
              '{}'::text[])) then
      raise exception 'every member of a group expense must belong to the group'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.event_id is not null and new.event_id is distinct from old.event_id then
    if not (actor = any (old.member_ids)) then
      raise exception 'only someone named on an expense can link it to an event'
        using errcode = 'insufficient_privilege';
    end if;
    if not public.is_event_member(new.event_id) then
      raise exception 'you are not a member of that event'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Only ADDED members are checked; whoever was already on the row stays.
  for added in
    select unnest(new.member_ids) except select unnest(old.member_ids)
  loop
    if new.group_id is not null then
      allowed := exists (
        select 1 from public.expense_groups g
        where g.id = new.group_id and added = any (g.member_ids)
      );
    elsif new.event_id is not null then
      allowed := exists (
                   select 1 from public.events ev
                   where ev.id = new.event_id and added = any (ev.member_ids)
                 )
              or exists (
                   select 1 from public.friendships f
                   where f.status = 'accepted' and f.users @> array[actor, added]
                 );
    else
      allowed := exists (
        select 1 from public.friendships f
        where f.status = 'accepted' and f.users @> array[actor, added]
      );
    end if;
    if not allowed then
      raise exception 'a new member of an expense must belong to its group, or be an event member or an accepted friend'
        using errcode = 'insufficient_privilege';
    end if;
  end loop;

  return new;
end;
$$;

create or replace function public.guard_events()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  actor text := (select auth.uid())::text;
  added text;
  allowed boolean;
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'events.created_by is immutable'
      using errcode = 'insufficient_privilege';
  end if;

  if actor is null then
    return new;
  end if;

  -- Leaving a group (nulling or moving away) needs membership of the group
  -- being left; pg_trigger_depth() > 1 is the ON DELETE SET NULL action.
  if old.group_id is not null and new.group_id is distinct from old.group_id
     and pg_trigger_depth() <= 1 then
    if not public.is_group_member(old.group_id) then
      raise exception 'only a member of a group can take an event out of it'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Attaching to a different group: the actor must
  -- belong to it and the event's members must all be group members (B12).
  if new.group_id is not null and new.group_id is distinct from old.group_id then
    if not public.is_group_member(new.group_id) then
      raise exception 'you are not a member of that group'
        using errcode = 'insufficient_privilege';
    end if;
    if not (new.member_ids <@ coalesce(
              (select g.member_ids from public.expense_groups g where g.id = new.group_id),
              '{}'::text[])) then
      raise exception 'every member of a group event must belong to the group'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  for added in
    select unnest(new.member_ids) except select unnest(old.member_ids)
  loop
    if new.group_id is not null then
      allowed := exists (
        select 1 from public.expense_groups g
        where g.id = new.group_id and added = any (g.member_ids)
      );
    else
      allowed := exists (
        select 1 from public.friendships f
        where f.status = 'accepted' and f.users @> array[actor, added]
      );
    end if;
    if not allowed then
      raise exception 'a new member of an event must belong to its group, or be an accepted friend'
        using errcode = 'insufficient_privilege';
    end if;
  end loop;

  return new;
end;
$$;

-- migrate:down
-- Restores the whole-row membership mirror of migration 04 and the created_by
-- only guards of migration 05.
alter policy expenses_insert on public.expenses
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

-- expenses_update (04)
alter policy expenses_update on public.expenses
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

-- events_update (04)
alter policy events_update on public.events
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

-- settlements_insert (04)
alter policy settlements_insert on public.settlements
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

-- guard_expenses (05)
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

-- guard_events (05)
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
