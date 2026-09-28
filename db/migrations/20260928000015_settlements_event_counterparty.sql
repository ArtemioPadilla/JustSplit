-- migrate:up
-- ============================================================================
-- Plan B14a (ADR 0014) — a settlement inside an event may name an event co-member.
--
-- Since B2d (migration 013) an event expense with no group may name OTHER
-- members of the event, not only the creator's friends. `settlements_insert`
-- kept the friends-only rule for a settlement with no group, so B14's event
-- settle-up would SUGGEST a payment between two event co-members who are not
-- friends (the suggestion pass pairs debtors and creditors across the whole
-- event) that the payer then could not record. The two rules must match.
--
-- Rule, for the counterparty (every member other than the creator):
--
--   group_id is not null                    unchanged: the creator belongs to the
--                                           group and member_ids <@ group.member_ids
--   group_id is null, event_id is not null  an event member of THAT event, OR an
--                                           accepted friend of the creator
--   group_id is null, event_id is null      an accepted friend of the creator (as
--                                           before)
--
-- Every other clause stays: created_by = the caller, the caller is one of the
-- two parties, member_ids is exactly those two, and event_id is null or an event
-- the caller belongs to (migration 013). Nothing else changes: no update policy,
-- creator-only delete, the same select rule.
--
-- The event membership lookup runs SECURITY INVOKER under the caller's own RLS,
-- like the expenses_insert one: the caller must belong to the event (the
-- clause above), so they can see the row and its member list.
-- ============================================================================

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
      (settlements.group_id is null and settlements.event_id is not null and not exists (
        select 1 from unnest(settlements.member_ids) as m(uid)
        where m.uid <> (select auth.uid())::text
          and not exists (
            select 1 from public.events ev
            where ev.id = settlements.event_id and m.uid = any (ev.member_ids)
          )
          and not exists (
            select 1 from public.friendships f
            where f.status = 'accepted'
              and f.users @> array[(select auth.uid())::text, m.uid]
          )
      ))
      or
      (settlements.group_id is null and settlements.event_id is null and not exists (
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

-- migrate:down
-- Restores migration 013's settlements_insert: friends only when there is no
-- group, whether or not the settlement names an event.
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
