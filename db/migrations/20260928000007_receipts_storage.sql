-- migrate:up
-- ============================================================================
-- Plan B2 step 7 — private `receipts` bucket + storage.objects policies
-- (spec D10 "Images").
--
-- Paths: expenses/{expenseId}/{uuid}.jpg and avatars/{uid}/{uuid}.jpg.
-- storage.foldername(name) returns the folder segments without the file name,
-- so [1] is the prefix and [2] is the expense id or the user id. Every policy
-- is pinned to bucket_id = 'receipts' and to the first folder segment.
-- Receipt objects follow the expense row's membership; the expense repo
-- deletes objects BEFORE the row, since no policy can reach them afterwards.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/*'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── avatars/{uid}/… — anyone signed in may read; only the owner may write ──
create policy receipts_avatars_select on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = 'avatars');

create policy receipts_avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy receipts_avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy receipts_avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- ── expenses/{expenseId}/… — members of that expense, every command ────────
create policy receipts_expenses_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and exists (
      select 1 from public.expenses e
      where e.id = (storage.foldername(name))[2]
        and (select auth.uid())::text = any (e.member_ids)
    )
  );

create policy receipts_expenses_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and exists (
      select 1 from public.expenses e
      where e.id = (storage.foldername(name))[2]
        and (select auth.uid())::text = any (e.member_ids)
    )
  );

create policy receipts_expenses_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and exists (
      select 1 from public.expenses e
      where e.id = (storage.foldername(name))[2]
        and (select auth.uid())::text = any (e.member_ids)
    )
  )
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and exists (
      select 1 from public.expenses e
      where e.id = (storage.foldername(name))[2]
        and (select auth.uid())::text = any (e.member_ids)
    )
  );

create policy receipts_expenses_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'expenses'
    and exists (
      select 1 from public.expenses e
      where e.id = (storage.foldername(name))[2]
        and (select auth.uid())::text = any (e.member_ids)
    )
  );

-- migrate:down
drop policy if exists receipts_expenses_delete on storage.objects;
drop policy if exists receipts_expenses_update on storage.objects;
drop policy if exists receipts_expenses_insert on storage.objects;
drop policy if exists receipts_expenses_select on storage.objects;
drop policy if exists receipts_avatars_delete  on storage.objects;
drop policy if exists receipts_avatars_update  on storage.objects;
drop policy if exists receipts_avatars_insert  on storage.objects;
drop policy if exists receipts_avatars_select  on storage.objects;
-- The bucket is kept on rollback: deleting it would orphan uploaded objects,
-- and storage refuses to drop a non-empty bucket anyway.
