// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCHEMA_MAP_TABLES, sql } from './fixtures';

/**
 * Plan B2b coverage guard: a missing policy, trigger or grant fails CI.
 * Reads the live catalog of the `supabase start` database after dbmate.
 */
const COMMANDS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
/** Cells the spec D10 table leaves empty on purpose. */
const NO_POLICY_BY_DESIGN: Record<string, string[]> = { settlements: ['UPDATE'] };

const MIGRATIONS = resolve(__dirname, '../../../db/migrations');

describe('RLS coverage guard', () => {
  it('every table in public has row level security enabled', () => {
    const off = sql(`select relname from pg_class
                      where relnamespace = 'public'::regnamespace and relkind in ('r', 'p') and not relrowsecurity`);
    expect(off).toEqual([]);
    const tables = sql(`select tablename from pg_tables where schemaname = 'public' order by 1`);
    expect(tables).toEqual(expect.arrayContaining([...SCHEMA_MAP_TABLES, 'profiles', 'schema_migrations']));
  });

  it.each(SCHEMA_MAP_TABLES)('%s has a policy for every command (to authenticated only)', (table) => {
    const rows = sql(`select cmd || '|' || array_to_string(roles, ',') from pg_policies
                       where schemaname = 'public' and tablename = '${table}'`);
    const cmds = new Set(rows.map((r) => r.split('|')[0]));
    for (const cmd of COMMANDS) {
      if (NO_POLICY_BY_DESIGN[table]?.includes(cmd)) {
        expect(cmds.has(cmd), `${table} ${cmd} must stay without a policy`).toBe(false);
      } else {
        expect(cmds.has(cmd), `${table} has no ${cmd} policy`).toBe(true);
      }
    }
    for (const r of rows) expect(r.split('|')[1], `${table}: ${r}`).toBe('authenticated');
  });

  it.each(SCHEMA_MAP_TABLES)('%s has its guard_<table> BEFORE UPDATE trigger', (table) => {
    const rows = sql(`select t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid
                       where c.relname = '${table}' and c.relnamespace = 'public'::regnamespace
                         and t.tgname = 'guard_${table}' and not t.tgisinternal and t.tgenabled <> 'D'`);
    expect(rows).toEqual([`guard_${table}`]);
  });

  it('profiles keeps its own-row policy', () => {
    const rows = sql(`select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles'`);
    expect(rows).toEqual(['profiles_own_row']);
  });

  it('schema_migrations has RLS and no grant to anon or authenticated', () => {
    const grants = sql(`select grantee || ' ' || privilege_type from information_schema.role_table_grants
                         where table_schema = 'public' and table_name = 'schema_migrations'
                           and grantee in ('anon', 'authenticated')`);
    expect(grants).toEqual([]);
    expect(sql(`select count(*) from pg_policies where tablename = 'schema_migrations'`)).toEqual(['0']);
  });

  it('no function in public is executable by anon', () => {
    const rows = sql(`select p.proname from pg_proc p
                       where p.pronamespace = 'public'::regnamespace
                         and has_function_privilege('anon', p.oid, 'execute')`);
    expect(rows).toEqual([]);
  });

  it('SECURITY DEFINER functions pin search_path; only the profile lookups and the B2d membership helpers are definer', () => {
    const rows = sql(`select p.proname || '|' || coalesce(array_to_string(p.proconfig, ';'), '') from pg_proc p
                       where p.pronamespace = 'public'::regnamespace and p.prosecdef order by 1`);
    expect(rows.map((r) => r.split('|')[0])).toEqual([
      'can_see_expense',
      'find_profile_by_email',
      'find_profiles_by_ids',
      'is_event_member',
      'is_group_member',
    ]);
    for (const r of rows) expect(r).toMatch(/search_path=/);
  });

  it('public.documents does not exist and no migration creates it', () => {
    expect(sql(`select count(*) from pg_tables where schemaname = 'public' and tablename = 'documents'`)).toEqual(['0']);
    for (const f of readdirSync(MIGRATIONS)) {
      expect(readFileSync(resolve(MIGRATIONS, f), 'utf8'), f).not.toMatch(/create\s+table[^;]*\bdocuments\b/i);
    }
  });

  it('no policy body and no check constraint references the extra column (Track D guard)', () => {
    const policies = sql(`select policyname from pg_policies
                           where (schemaname = 'public' or (schemaname = 'storage' and tablename = 'objects'))
                             and (coalesce(qual, '') ~ '\\mextra\\M' or coalesce(with_check, '') ~ '\\mextra\\M')`);
    expect(policies).toEqual([]);
    const checks = sql(`select conname from pg_constraint
                         where connamespace = 'public'::regnamespace and contype = 'c'
                           and pg_get_constraintdef(oid) ~ '\\mextra\\M'`);
    expect(checks).toEqual([]);
  });

  it('every SchemaMap table is in the supabase_realtime publication; none uses replica identity full', () => {
    const published = sql(`select tablename from pg_publication_tables
                            where pubname = 'supabase_realtime' and schemaname = 'public' order by 1`);
    expect(published).toEqual(expect.arrayContaining(SCHEMA_MAP_TABLES));
    const full = sql(`select relname from pg_class where relnamespace = 'public'::regnamespace and relreplident = 'f'`);
    expect(full).toEqual([]);
  });

  it('migrations live in db/migrations, never in supabase/migrations', () => {
    let files: string[] = [];
    try {
      files = readdirSync(resolve(__dirname, '../../../supabase/migrations'));
    } catch {
      files = [];
    }
    expect(files).toEqual([]);
  });
});
