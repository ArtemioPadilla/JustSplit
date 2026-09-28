import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type {
  BatchOperation,
  BatchResult,
  PaginatedResult,
  QueryFilter,
  QueryOptions,
  StorageAdapter,
  Unsubscribe,
  WriteOptions,
  WriteResult,
} from '@cyber-eco/types';
import type { CollectionMapping, SchemaMap } from './schema-map';

/**
 * Contingency `StorageAdapter` (plan B5a, spec D1): relational mode over the
 * `SchemaMap` design (`cybereco-hub/docs/design/schema-map-strategy.md`),
 * built directly against `@supabase/supabase-js` because relational mode is
 * not merged in `@cyber-eco/supabase@0.2.1` (that package ships DOCUMENT MODE
 * only — `public.documents`, owner-only RLS, forbidden for shared data by
 * spec D10). Upstreamed as Track C' H2 once gate C1 clears; deleted here
 * afterwards (plan B22).
 *
 * The `SupabaseClient` is injected via a getter (mirrors
 * `SupabaseStorageAdapter`'s lazy `() => Firestore`-style pattern) — this
 * adapter never creates the client (`src/lib/data/client.ts` is the only
 * module that does).
 */
export interface RelationalSupabaseAdapterConfig {
  schemaMap: SchemaMap;
}

/**
 * `subscribeToQuery`'s callback shape, extended with an optional trailing
 * `error` argument (ADR 0004 amendment, plan B8b coordinator review): the
 * `StorageAdapter` interface (`@cyber-eco/types`) only declares
 * `(data: T[]) => void`, which cannot distinguish a genuine query failure
 * (RLS denial, network error) from a legitimately empty result — a plain
 * `catch(() => callback([]))` made the two indistinguishable, so a failed
 * live screen looked identical to "no data" forever, with no error surfaced
 * and no way to retry.
 *
 * **Rule for future `StorageAdapter` extensions** (formalized here, not
 * ad-hoc): an extension is allowed ONLY as an optional TRAILING parameter
 * (never a required one, never inserted before an existing parameter) —
 * every existing caller that only knows the narrower interface type keeps
 * working unchanged (TypeScript's own bivariant method-parameter check is
 * what makes this assignable back to `StorageAdapter`). It must be recorded
 * in ADR 0004 (the "amendment" section), and it must NEVER change the
 * upstream `@cyber-eco/types` interface itself — that package is external
 * (vendored, `vendor/cyber-eco-types-*.tgz`) and out of this repo's control;
 * widening it for real is Track C' H2's job, not a local workaround's.
 *
 * `useLiveQuery` (`src/lib/data/hooks/useLiveQuery.ts`) is the only reader
 * of this extra argument today.
 */
export type LiveQueryCallback<T> = (data: T[], error?: unknown) => void;

/**
 * UUIDv4 without a static `node:crypto` import — this adapter runs in the
 * browser (copied from `cybereco-hub/packages/supabase/src/SupabaseStorageAdapter.ts`,
 * which explains why: bundlers cannot resolve `node:crypto` in that
 * environment).
 */
function randomUUID(): string {
  const webcrypto = globalThis.crypto;
  if (typeof webcrypto?.randomUUID === 'function') return webcrypto.randomUUID();
  if (typeof webcrypto?.getRandomValues === 'function') {
    const bytes = webcrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error('RelationalSupabaseAdapter needs globalThis.crypto (Node 20+, a browser, or Cloudflare workerd).');
}

function camelToSnake(field: string): string {
  return field.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function snakeToCamel(column: string): string {
  return column.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}

/** Metadata fields with `strategy: 'server'` — never included in a write; the DB column defaults/triggers own them (D10). */
function serverManagedFields(mapping: CollectionMapping): Set<string> {
  const fields: string[] = [];
  if (mapping.metadata?.createdAt?.strategy === 'server') fields.push(mapping.metadata.createdAt.field);
  if (mapping.metadata?.updatedAt?.strategy === 'server') fields.push(mapping.metadata.updatedAt.field);
  return new Set(fields);
}

interface SplitResult {
  /** Real, snake_case column -> value. */
  columns: Record<string, unknown>;
  /** Unmodeled top-level fields, camelCase key -> value (goes into `jsonbColumn` verbatim). */
  overflow: Record<string, unknown>;
}

export class RelationalSupabaseAdapter implements StorageAdapter {
  private client: SupabaseClient | null = null;
  private readonly schemaMap: SchemaMap;

  constructor(
    private readonly getClient: () => SupabaseClient,
    config: RelationalSupabaseAdapterConfig,
  ) {
    this.schemaMap = config.schemaMap;
  }

  private ensureClient(): SupabaseClient {
    if (!this.client) this.client = this.getClient();
    return this.client;
  }

  /** Every collection the adapter touches must be a SchemaMap key (spec D10: no document-mode fallback, ever). */
  private mappingFor(collection: string): CollectionMapping {
    const mapping = this.schemaMap[collection];
    if (!mapping) {
      throw new Error(`RelationalSupabaseAdapter: collection "${collection}" is not in the SchemaMap`);
    }
    return mapping;
  }

  /** Splits a documental payload into real columns (snake_case) vs. unmodeled overflow fields (camelCase). */
  private splitFields(mapping: CollectionMapping, data: Record<string, unknown>): SplitResult {
    const columnMap = mapping.columnMap ?? {};
    const realColumns = new Set(mapping.columns);
    const serverFields = serverManagedFields(mapping);
    const columns: Record<string, unknown> = {};
    const overflow: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(data)) {
      if (field === 'id' || serverFields.has(field)) continue;
      const column = columnMap[field] ?? camelToSnake(field);
      if (realColumns.has(column)) {
        columns[column] = value;
      } else {
        overflow[field] = value;
      }
    }
    return { columns, overflow };
  }

  /** Rehydrates a physical row into a flat document: real columns (camelCase) + `extra` spread on top. */
  private fromRow(mapping: CollectionMapping, row: Record<string, unknown>): Record<string, unknown> {
    const idColumn = mapping.idColumn ?? 'id';
    const jsonbColumn = mapping.jsonbColumn ?? 'extra';
    const inverse = new Map(Object.entries(mapping.columnMap ?? {}).map(([field, column]) => [column, field]));
    const doc: Record<string, unknown> = { id: row[idColumn] };
    for (const column of mapping.columns) {
      const field = inverse.get(column) ?? snakeToCamel(column);
      doc[field] = row[column];
    }
    if (mapping.metadata?.createdAt) doc[mapping.metadata.createdAt.field] = row[mapping.metadata.createdAt.column];
    if (mapping.metadata?.updatedAt) doc[mapping.metadata.updatedAt.field] = row[mapping.metadata.updatedAt.column];
    const overflow = (row[jsonbColumn] as Record<string, unknown> | null) ?? {};
    return { ...doc, ...overflow };
  }

  /** Resolves a documental field to either a real column, or an `extra->>field` / `extra->field` JSON path. */
  private resolveField(mapping: CollectionMapping, field: string): { path: string; isOverflow: boolean } {
    if (field === 'id') return { path: mapping.idColumn ?? 'id', isOverflow: false };
    if (mapping.metadata?.createdAt?.field === field) return { path: mapping.metadata.createdAt.column, isOverflow: false };
    if (mapping.metadata?.updatedAt?.field === field) return { path: mapping.metadata.updatedAt.column, isOverflow: false };
    const column = mapping.columnMap?.[field] ?? camelToSnake(field);
    if (mapping.columns.includes(column)) return { path: column, isOverflow: false };
    return { path: field, isOverflow: true };
  }

  async getDocument<T>(collection: string, id: string): Promise<T | null> {
    const mapping = this.mappingFor(collection);
    const client = this.ensureClient();
    const idColumn = mapping.idColumn ?? 'id';
    const { data, error } = await client.from(mapping.table).select('*').eq(idColumn, id).maybeSingle();
    if (error) throw new Error(`RelationalSupabaseAdapter: getDocument(${collection}/${id}) failed: ${error.message}`);
    if (!data) return null;
    return this.fromRow(mapping, data as Record<string, unknown>) as T;
  }

  /**
   * Translates one write to the pre-translated row shape `batch_write`
   * expects (snake_case columns + an `extra` object with the overflow keys).
   */
  private toOp(type: 'set' | 'update', collection: string, id: string, data: Record<string, unknown>, merge = false) {
    const mapping = this.mappingFor(collection);
    const jsonbColumn = mapping.jsonbColumn ?? 'extra';
    const { columns, overflow } = this.splitFields(mapping, data);
    return { type, collection, id, data: { ...columns, [jsonbColumn]: overflow }, merge };
  }

  /**
   * Single writes go through the same `batch_write` RPC as `batchWrite`
   * (`db/migrations/20260928000008_batch_write.sql`), never through a client
   * upsert or a read-modify-write:
   * - `set` updates a visible row first and inserts only when none matched.
   *   A client `upsert` is checked against the INSERT policy even when the
   *   row exists, which denies a non-creator member's replace (ADR 0002).
   * - `merge: true` and `update` merge `extra` on the server
   *   (`extra = extra || patch`) in one statement, so concurrent writers of
   *   different overflow keys cannot lose each other's changes.
   */
  async setDocument<T>(collection: string, id: string, data: T, options?: WriteOptions): Promise<WriteResult> {
    const op = this.toOp('set', collection, id, data as Record<string, unknown>, options?.merge ?? false);
    const client = this.ensureClient();
    const { error } = await client.rpc('batch_write', { ops: [op] });
    if (error) throw new Error(`RelationalSupabaseAdapter: setDocument(${collection}/${id}) failed: ${error.message}`);
    return { id, success: true };
  }

  async updateDocument(collection: string, id: string, data: Record<string, unknown>): Promise<WriteResult> {
    const op = this.toOp('update', collection, id, data);
    const client = this.ensureClient();
    const { error } = await client.rpc('batch_write', { ops: [op] });
    // batch_write raises no_data_found when the row is absent or not visible.
    if (error && (error as { code?: string }).code === 'P0002') return { id, success: false };
    if (error) throw new Error(`RelationalSupabaseAdapter: updateDocument(${collection}/${id}) failed: ${error.message}`);
    return { id, success: true };
  }

  async deleteDocument(collection: string, id: string): Promise<WriteResult> {
    const mapping = this.mappingFor(collection);
    const client = this.ensureClient();
    const idColumn = mapping.idColumn ?? 'id';
    const { error } = await client.from(mapping.table).delete().eq(idColumn, id);
    if (error) throw new Error(`RelationalSupabaseAdapter: deleteDocument(${collection}/${id}) failed: ${error.message}`);
    // Deleting an absent/invisible row is a no-op success (documental contract, storage-adapter-contract.md §5.3).
    return { id, success: true };
  }

  async query<T>(collection: string, filters: QueryFilter[], options?: QueryOptions): Promise<PaginatedResult<T>> {
    const mapping = this.mappingFor(collection);
    const client = this.ensureClient();
    let qb = client.from(mapping.table).select('*');

    for (const filter of filters) {
      const { path, isOverflow } = this.resolveField(mapping, filter.field);
      const textPath = isOverflow ? `extra->>${filter.field}` : path;
      switch (filter.operator) {
        case '==':
          qb = qb.eq(textPath, filter.value as never);
          break;
        case '!=':
          qb = qb.neq(textPath, filter.value as never);
          break;
        case '<':
          qb = qb.lt(textPath, filter.value as never);
          break;
        case '<=':
          qb = qb.lte(textPath, filter.value as never);
          break;
        case '>':
          qb = qb.gt(textPath, filter.value as never);
          break;
        case '>=':
          qb = qb.gte(textPath, filter.value as never);
          break;
        case 'in':
          if (!Array.isArray(filter.value)) {
            throw new Error(`RelationalSupabaseAdapter: 'in' filter on '${filter.field}' requires an array value`);
          }
          qb = qb.in(textPath, filter.value as never[]);
          break;
        case 'array-contains':
          // Real column (text[]/jsonb) -> `col @> ARRAY[$1]` / jsonb `@>`.
          // Overflow -> jsonb containment on the `extra->field` path.
          qb = isOverflow ? qb.contains(`extra->${filter.field}`, JSON.stringify([filter.value])) : qb.contains(path, [filter.value] as never);
          break;
        case 'array-contains-any':
          throw new Error(`RelationalSupabaseAdapter: 'array-contains-any' is not supported (spec D10; field '${filter.field}')`);
        default:
          throw new Error(`RelationalSupabaseAdapter: unsupported query operator '${String(filter.operator)}'`);
      }
    }

    if (options?.sort) {
      for (const sort of options.sort) {
        const { path, isOverflow } = this.resolveField(mapping, sort.field);
        qb = qb.order(isOverflow ? `extra->>${sort.field}` : path, { ascending: sort.direction === 'asc' });
      }
    }
    if (options?.offset !== undefined) {
      const pageSize = options.limit ?? 1000;
      qb = qb.range(options.offset, options.offset + pageSize - 1);
    } else if (options?.limit !== undefined) {
      qb = qb.limit(options.limit);
    }

    const { data, error } = await qb;
    if (error) throw new Error(`RelationalSupabaseAdapter: query('${collection}') failed: ${error.message}`);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const docs = rows.map((row) => this.fromRow(mapping, row) as T);
    const hasMore = options?.limit !== undefined ? rows.length === options.limit : false;
    return { data: docs, total: docs.length, hasMore };
  }

  /**
   * Pre-translates every op to row shape (`toRow()` — the same `splitFields`
   * used by `setDocument`/`updateDocument`) before calling the atomic
   * `batch_write(ops jsonb)` RPC (`db/migrations/20260928000008_batch_write.sql`),
   * SECURITY INVOKER, so a single denied/invalid op rolls back the whole
   * batch (storage-adapter-contract.md §3).
   */
  async batchWrite(operations: BatchOperation[]): Promise<BatchResult> {
    if (operations.length === 0) return { success: true, count: 0 };
    const client = this.ensureClient();
    let ops: unknown[];
    try {
      // Client-side pre-translation can itself fail (e.g. an unmapped
      // collection, spec D1: never fall back to document mode) — that must
      // report the same "nothing applied" contract as an RPC-side rollback,
      // never throw (storage-adapter-contract.md §3: batchWrite never throws).
      ops = operations.map((op) => {
        if (op.type === 'delete') {
          this.mappingFor(op.collection);
          return { type: 'delete' as const, collection: op.collection, id: op.id };
        }
        return this.toOp(op.type, op.collection, op.id, (op.data ?? {}) as Record<string, unknown>, op.options?.merge ?? false);
      });
    } catch (cause) {
      return { success: false, count: 0, errors: [{ index: -1, error: (cause as Error).message }] };
    }
    const { data, error } = await client.rpc('batch_write', { ops });
    if (error) return { success: false, count: 0, errors: [{ index: -1, error: error.message }] };
    return { success: true, count: typeof data === 'number' ? data : operations.length };
  }

  subscribe<T>(collection: string, id: string, callback: (data: T | null) => void): Unsubscribe {
    const mapping = this.mappingFor(collection);
    const client = this.ensureClient();
    const idColumn = mapping.idColumn ?? 'id';
    let active = true;

    const fetchAndEmit = (): void => {
      void this.getDocument<T>(collection, id)
        .then((doc) => {
          if (active) callback(doc);
        })
        .catch(() => {
          if (active) callback(null);
        });
    };
    fetchAndEmit();

    const channel: RealtimeChannel = client
      .channel(`${mapping.table}:${id}:${randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: mapping.table, filter: `${idColumn}=eq.${id}` }, () => {
        fetchAndEmit();
      })
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }

  /**
   * FETCH-THEN-LISTEN over the whole table: on ANY `postgres_changes` event
   * (INSERT, UPDATE, or a PK-only DELETE — deletes carry no other column and
   * are not RLS-filtered, D10) the query is re-run and re-emitted. The
   * adapter never evaluates the change payload against the filter — hub
   * adapter semantics (`storage-adapter-contract.md` §4,
   * `SupabaseStorageAdapter.subscribeToQuery`).
   *
   * `callback` is typed `LiveQueryCallback<T>` (see its doc comment above)
   * rather than the bare `StorageAdapter` interface shape: a failed
   * `query()` forwards its error as the second argument instead of being
   * silently swallowed into an indistinguishable `callback([])`.
   */
  subscribeToQuery<T>(collection: string, filters: QueryFilter[], callback: LiveQueryCallback<T>): Unsubscribe {
    const mapping = this.mappingFor(collection);
    const client = this.ensureClient();
    let active = true;

    const fetchAndEmit = (): void => {
      void this.query<T>(collection, filters)
        .then((result) => {
          if (active) callback(result.data);
        })
        .catch((error: unknown) => {
          if (active) callback([], error);
        });
    };
    fetchAndEmit();

    const channel: RealtimeChannel = client
      .channel(`${mapping.table}:query:${randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: mapping.table }, () => {
        fetchAndEmit();
      })
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }

  /**
   * Opaque per storage-adapter-contract.md §2. Metadata fields with
   * `strategy: 'server'` (every JustSplit `createdAt`/`updatedAt`, D10) are
   * ALWAYS dropped from the row translation regardless of the value passed
   * here — `default now()` / the `set_updated_at` trigger own that column —
   * so this return value is never actually written for those two fields.
   */
  serverTimestamp(): unknown {
    return new Date().toISOString();
  }

  /** IDs are random UUIDv4s (D10: "a leaked id of a row you cannot select is unusable"). */
  generateId(_collection: string): string {
    return randomUUID();
  }
}
