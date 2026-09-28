#!/usr/bin/env bash
# Read-only dump of the security surface of the `public` schema (plan B2).
# Usage: npm run db:audit [-- <postgres-url>]   (default: the local stack)
# The output is sorted and stable, so two dumps can be diffed:
#   npm run -s db:audit -- "$SUPABASE_DB_URL" > remote.txt
#   npm run -s db:audit > local.txt && diff local.txt remote.txt   (B18)
set -euo pipefail
URL="${1:-${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}}"
q() { echo "## $1"; psql "$URL" -X -A -t -v ON_ERROR_STOP=1 -c "$2"; echo; }

q "tables: row level security" \
  "select c.relname || ' rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity
     from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' order by 1"
q "policies (public + storage.objects)" \
  "select schemaname || '.' || tablename || ' ' || policyname || ' ' || cmd || ' to ' || array_to_string(roles, ',')
          || E'\n  using: ' || coalesce(qual, '-') || E'\n  check: ' || coalesce(with_check, '-')
     from pg_policies where schemaname = 'public' or (schemaname = 'storage' and tablename = 'objects')
    order by schemaname, tablename, policyname"
q "triggers" \
  "select c.relname || ' ' || t.tgname || ' -> ' || p.proname
     from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_proc p on p.oid = t.tgfoid
    where c.relnamespace = 'public'::regnamespace and not t.tgisinternal order by 1"
q "functions: security + execute grants" \
  "select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
          || case when p.prosecdef then ' definer' else ' invoker' end
          || ' anon=' || has_function_privilege('anon', p.oid, 'execute')
          || ' authenticated=' || has_function_privilege('authenticated', p.oid, 'execute')
          || ' config=' || coalesce(array_to_string(p.proconfig, ';'), '-')
     from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1"
q "foreign keys (B2d: group_id / event_id ON DELETE SET NULL)" \
  "select conrelid::regclass || ' ' || conname || ' ' || pg_get_constraintdef(oid) || ' validated=' || convalidated::text
     from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace order by 1"
q "table grants to anon / authenticated" \
  "select table_name || ' ' || grantee || ' ' || string_agg(privilege_type, ',' order by privilege_type)
     from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')
    group by table_name, grantee order by 1"
q "realtime publication" \
  "select schemaname || '.' || tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1"
q "storage buckets" \
  "select id || ' public=' || public || ' limit=' || coalesce(file_size_limit::text, '-')
          || ' mime=' || coalesce(array_to_string(allowed_mime_types, ','), '-')
     from storage.buckets order by 1"
