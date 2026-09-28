-- Local development seed (plan B2). Applied by `npm run db:seed` AFTER
-- `npm run db:migrate`; never run against the hosted project.
--
-- Two confirmed users (password: `password123`), one accepted friendship and
-- one group they share. Fixed ids so the data is recognisable in the UI.
begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111',
   'authenticated', 'authenticated', 'ana@example.test', crypt('password123', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"name":"Ana"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222',
   'authenticated', 'authenticated', 'beto@example.test', crypt('password123', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"name":"Beto"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
  from auth.users u
 where u.id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')
on conflict (provider_id, provider) do nothing;

insert into public.profiles (id, name, email, "createdAt", "updatedAt")
values
  ('11111111-1111-4111-8111-111111111111', 'Ana',  'ana@example.test',  now()::text, now()::text),
  ('22222222-2222-4222-8222-222222222222', 'Beto', 'beto@example.test', now()::text, now()::text)
on conflict (id) do nothing;

insert into public.friendships (id, users, status, requested_by)
values ('seed-friendship-ana-beto',
        array['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
        'accepted', '11111111-1111-4111-8111-111111111111')
on conflict (id) do nothing;

insert into public.expense_groups (id, name, type, currency, members, member_ids, admin_ids, created_by, extra)
values ('seed-group-casa', 'Casa', 'family', 'MXN',
        '[{"userId":"11111111-1111-4111-8111-111111111111","displayName":"Ana","role":"admin","joinedAt":"2026-09-28T00:00:00Z"},
          {"userId":"22222222-2222-4222-8222-222222222222","displayName":"Beto","role":"user","joinedAt":"2026-09-28T00:00:00Z"}]',
        array['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
        array['11111111-1111-4111-8111-111111111111'],
        '11111111-1111-4111-8111-111111111111',
        '{"kind":"household"}')
on conflict (id) do nothing;

commit;
