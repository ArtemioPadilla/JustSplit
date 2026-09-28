-- migrate:up
-- ============================================================================
-- Plan B2 step 8 — relational batch_write(ops jsonb) (spec D10).
--
-- Atomic multi-row write for the StorageAdapter's batchWrite. SECURITY INVOKER
-- so every operation runs under the caller's RLS and guard triggers: one denied
-- operation aborts the whole batch and nothing is written.
--
-- Op shape (upstream contract): { type: 'set'|'update'|'delete', collection,
-- id, data, merge }. `data` is PRE-TRANSLATED by the adapter to row shape:
-- snake_case column keys plus an `extra` object holding the overflow keys.
--
-- Table names never come from the caller: `collection` is mapped through a
-- fixed CASE over exactly the five SchemaMap tables and anything else (e.g.
-- 'schema_migrations', 'profiles', 'documents') raises before any write.
-- Column names are validated against information_schema.columns of that
-- table; an unknown key raises (an adapter translation bug, not user input).
-- Values are converted with jsonb_populate_record, so arrays, jsonb, numeric
-- and date columns get their real types.
--
-- set, merge = false → replace every column of a visible row (id and
--                      created_at excepted; omitted columns fall back to their
--                      defaults), or insert when no visible row has that id.
-- set, merge = true  → update only the provided columns of a visible row and
--                      merge `extra` (existing || new), or insert.
--                      A set on an existing row the caller cannot see falls
--                      through to the insert and fails (unique violation).
-- update             → only the provided columns; `extra` merged; raises if
--                      the row does not exist or is not visible.
-- delete             → delete by id (no-op when absent or not visible).
-- created_at / updated_at are server-managed and ignored in `data`.
-- ============================================================================
create or replace function public.batch_write(ops jsonb)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  op            jsonb;
  idx           integer := 0;
  applied       integer := 0;
  op_type       text;
  op_collection text;
  op_id         text;
  op_data       jsonb;
  op_merge      boolean;
  tbl           text;
  row_data      jsonb;
  unknown_key   text;
  provided      text[];
  all_cols      text[];
  insert_cols   text;
  insert_vals   text;
  update_set    text;
  affected      integer;
begin
  if ops is null or jsonb_typeof(ops) <> 'array' then
    raise exception 'batch_write: ops must be a JSON array';
  end if;

  for op in select value from jsonb_array_elements(ops) loop
    op_type       := op->>'type';
    op_collection := op->>'collection';
    op_id         := op->>'id';
    op_data       := coalesce(op->'data', '{}'::jsonb);
    op_merge      := coalesce((op->>'merge')::boolean, false);

    -- Fixed allowlist: the only place a table name is chosen.
    tbl := case op_collection
      when 'expense_groups' then 'expense_groups'
      when 'expenses'       then 'expenses'
      when 'settlements'    then 'settlements'
      when 'events'         then 'events'
      when 'friendships'    then 'friendships'
      else null
    end;
    if tbl is null then
      raise exception 'batch_write: collection "%" is not mapped (op %)', op_collection, idx
        using errcode = 'invalid_parameter_value';
    end if;
    if op_id is null or op_id = '' then
      raise exception 'batch_write: op % has no id', idx using errcode = 'invalid_parameter_value';
    end if;
    if op_type in ('set', 'update') and jsonb_typeof(op_data) <> 'object' then
      raise exception 'batch_write: op % data must be an object', idx using errcode = 'invalid_parameter_value';
    end if;

    if op_type in ('set', 'update') then
      row_data := (op_data - 'id' - 'created_at' - 'updated_at') || jsonb_build_object('id', op_id);

      select array_agg(c.column_name::text order by c.ordinal_position)
        into all_cols
        from information_schema.columns c
       where c.table_schema = 'public' and c.table_name = tbl;

      select k into unknown_key
        from jsonb_object_keys(row_data) as k
       where k <> all (all_cols)
       limit 1;
      if unknown_key is not null then
        raise exception 'batch_write: "%" is not a column of % (op %)', unknown_key, tbl, idx
          using errcode = 'undefined_column';
      end if;

      select array_agg(k order by k) into provided from jsonb_object_keys(row_data) as k;
    end if;

    if op_type = 'set' then
      -- Update first, insert only when no visible row matched. An upsert
      -- (INSERT … ON CONFLICT DO UPDATE) would evaluate the INSERT policy's
      -- WITH CHECK against the proposed row even when the row exists, so a
      -- partial merge or a non-creator member's replace would be denied.
      if op_merge then
        select string_agg(format('%I = r.%I', k, k), ', ')
          into update_set
          from unnest(provided) as k
         where k not in ('id', 'extra');
        update_set := concat_ws(', ', update_set,
          'extra = t.extra || coalesce(r.extra, ''{}''::jsonb)');
      else
        select string_agg(
                 case when k = any (provided) then format('%I = r.%I', k, k)
                      else format('%I = default', k) end, ', ')
          into update_set
          from unnest(all_cols) as k
         where k not in ('id', 'created_at', 'updated_at');
      end if;

      execute format(
        'update public.%I as t set %s from jsonb_populate_record(null::public.%I, $1) as r where t.id = $2',
        tbl, update_set, tbl
      ) using row_data, op_id;
      get diagnostics affected = row_count;

      if affected = 0 then
        select string_agg(format('%I', k), ', '), string_agg(format('r.%I', k), ', ')
          into insert_cols, insert_vals
          from unnest(provided) as k;
        execute format(
          'insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) as r',
          tbl, insert_cols, insert_vals, tbl
        ) using row_data;
      end if;

    elsif op_type = 'update' then
      select string_agg(format('%I = r.%I', k, k), ', ')
        into update_set
        from unnest(provided) as k
       where k not in ('id', 'extra');
      update_set := concat_ws(', ', update_set,
        'extra = t.extra || coalesce(r.extra, ''{}''::jsonb)');

      execute format(
        'update public.%I as t set %s from jsonb_populate_record(null::public.%I, $1) as r where t.id = $2',
        tbl, update_set, tbl
      ) using row_data, op_id;
      get diagnostics affected = row_count;
      if affected = 0 then
        raise exception 'batch_write: update target %/% does not exist (op %)', op_collection, op_id, idx
          using errcode = 'no_data_found';
      end if;

    elsif op_type = 'delete' then
      execute format('delete from public.%I where id = $1', tbl) using op_id;

    else
      raise exception 'batch_write: unknown op type "%" (op %)', op_type, idx
        using errcode = 'invalid_parameter_value';
    end if;

    applied := applied + 1;
    idx := idx + 1;
  end loop;

  return applied;
end;
$$;

revoke execute on function public.batch_write(jsonb) from public, anon;
grant  execute on function public.batch_write(jsonb) to authenticated, service_role;

-- migrate:down
drop function if exists public.batch_write(jsonb);
