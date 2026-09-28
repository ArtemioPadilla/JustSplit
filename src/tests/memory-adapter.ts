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
import { schemaMap } from '@/lib/data/schema-map';

/**
 * In-memory `StorageAdapter` (plan B5a). Used by repo/hook tests and as the
 * always-on half of `storage-adapter-contract.test.ts` (the real relational
 * adapter is the other half, gated behind `test:contract:live`).
 *
 * Documents are plain flat objects — there is no relational translation here
 * (no columns, no `extra` overflow column): a shallow merge on
 * `updateDocument` already satisfies the D9 invariant ("a patch key with a
 * real column updates that column; overflow keys merge into extra") because
 * there is no distinction to make in a flat in-memory store.
 *
 * Foreign keys (ADR 0013, migration B): deleting an `expense_groups` row sets
 * `groupId` to `null` on the `expenses`, `events` and `settlements` that named
 * it, and deleting an `events` row sets `eventId` to `null` on `expenses` and
 * `settlements` — the same `ON DELETE SET NULL` the database applies, so the
 * repo and contract suites see the behaviour the real adapter has. There is
 * no referential check on write (an unknown `groupId` is accepted), only the
 * delete action.
 *
 * Visibility (ADR 0013, migration C): pass `{ viewer }` and READS apply the
 * select policies — a row is visible to a user in its `memberIds`, or (for
 * `expenses` / `settlements`) to a member of its group or its event, looked up
 * live in this same store; groups, events and friendships stay member-only.
 * `viewer` is read on every call (so a sign-in change is honoured) and a
 * `null` viewer sees nothing, like `anon`. An `updateDocument` (or batch
 * `update`) of a row the viewer cannot see behaves like `batch_write`'s
 * `no_data_found`. Without the option nothing is filtered — the legacy
 * behaviour the repo tests rely on. Write policies are NOT emulated; the RLS
 * suite owns those.
 *
 * Unlike the hub's own `MockStorageAdapter` (documented in
 * `storage-adapter-contract.md` §3 as NOT atomic), `batchWrite` here IS
 * atomic: every op is validated and staged against a draft copy of the
 * store first, and only committed if every op in the batch succeeds.
 */
/** ADR 0013 migration B: `[referenced collection, referencing collection, referencing field]`. */
const SET_NULL_REFERENCES: ReadonlyArray<readonly [string, string, string]> = [
  ['expense_groups', 'expenses', 'groupId'],
  ['expense_groups', 'events', 'groupId'],
  ['expense_groups', 'settlements', 'groupId'],
  ['events', 'expenses', 'eventId'],
  ['events', 'settlements', 'eventId'],
];

export interface MemoryAdapterOptions {
  /** The signed-in uid, read on every call; `null`/`undefined` = signed out (sees nothing). Omit to disable visibility filtering. */
  viewer?: () => string | null | undefined;
}

export function createMemoryAdapter(collections: readonly string[] = Object.keys(schemaMap), options: MemoryAdapterOptions = {}): StorageAdapter {
  const allowed = new Set(collections);
  const store = new Map<string, Map<string, Record<string, unknown>>>();
  const listeners = new Map<string, Set<() => void>>();

  function assertMapped(collection: string): void {
    if (!allowed.has(collection)) {
      throw new Error(`memory-adapter: collection "${collection}" is not mapped`);
    }
  }

  function collectionMap(collection: string): Map<string, Record<string, unknown>> {
    let m = store.get(collection);
    if (!m) {
      m = new Map();
      store.set(collection, m);
    }
    return m;
  }

  function includes(value: unknown, uid: string): boolean {
    return Array.isArray(value) && (value as unknown[]).includes(uid);
  }

  /** The select policies of migrations 04 + 12, for the current viewer (always true when no viewer option was given). */
  function visible(collection: string, doc: Record<string, unknown>): boolean {
    if (!options.viewer) return true;
    const uid = options.viewer();
    if (!uid) return false;
    switch (collection) {
      case 'friendships':
        return includes(doc.users, uid);
      case 'expense_groups':
      case 'events':
        return includes(doc.memberIds, uid);
      case 'expenses':
      case 'settlements': {
        if (includes(doc.memberIds, uid)) return true;
        const group = typeof doc.groupId === 'string' ? store.get('expense_groups')?.get(doc.groupId) : undefined;
        if (group && includes(group.memberIds, uid)) return true;
        const event = typeof doc.eventId === 'string' ? store.get('events')?.get(doc.eventId) : undefined;
        return Boolean(event && includes(event.memberIds, uid));
      }
      default:
        return true;
    }
  }

  function notify(collection: string): void {
    for (const fn of listeners.get(collection) ?? []) fn();
  }

  function matches(doc: Record<string, unknown>, filter: QueryFilter): boolean {
    const value = doc[filter.field];
    switch (filter.operator) {
      case '==':
        return value === filter.value;
      case '!=':
        return value !== filter.value;
      case '<':
        return (value as number) < (filter.value as number);
      case '<=':
        return (value as number) <= (filter.value as number);
      case '>':
        return (value as number) > (filter.value as number);
      case '>=':
        return (value as number) >= (filter.value as number);
      case 'in':
        return Array.isArray(filter.value) && (filter.value as unknown[]).includes(value);
      case 'array-contains':
        return Array.isArray(value) && (value as unknown[]).includes(filter.value);
      case 'array-contains-any':
        throw new Error(`memory-adapter: 'array-contains-any' is not supported (field '${filter.field}')`);
      default:
        throw new Error(`memory-adapter: unsupported query operator '${String(filter.operator)}'`);
    }
  }

  function runQuery<T>(collection: string, filters: QueryFilter[], options?: QueryOptions): PaginatedResult<T> {
    assertMapped(collection);
    let docs = [...collectionMap(collection).entries()]
      .filter(([, data]) => visible(collection, data))
      .map(([id, data]) => ({ id, ...data }) as T);
    for (const filter of filters) {
      docs = docs.filter((doc) => matches(doc as Record<string, unknown>, filter));
    }
    if (options?.sort) {
      for (const sort of [...options.sort].reverse()) {
        docs.sort((a, b) => {
          const av = (a as Record<string, unknown>)[sort.field] as string | number;
          const bv = (b as Record<string, unknown>)[sort.field] as string | number;
          const cmp = av === bv ? 0 : av < bv ? -1 : 1;
          return sort.direction === 'asc' ? cmp : -cmp;
        });
      }
    }
    const offset = options?.offset ?? 0;
    const sliced = options?.limit !== undefined ? docs.slice(offset, offset + options.limit) : docs.slice(offset);
    return { data: sliced, total: docs.length, hasMore: options?.limit !== undefined && offset + options.limit < docs.length };
  }

  async function getDocument<T>(collection: string, id: string): Promise<T | null> {
    assertMapped(collection);
    const doc = collectionMap(collection).get(id);
    return doc && visible(collection, doc) ? ({ id, ...doc } as T) : null;
  }

  async function setDocument<T>(collection: string, id: string, data: T, options?: WriteOptions): Promise<WriteResult> {
    assertMapped(collection);
    const map = collectionMap(collection);
    const payload = { ...(data as Record<string, unknown>) };
    delete payload.id;
    if (options?.merge) {
      const existing = map.get(id) ?? {};
      map.set(id, { ...existing, ...payload });
    } else {
      map.set(id, payload);
    }
    notify(collection);
    return { id, success: true };
  }

  async function updateDocument(collection: string, id: string, data: Record<string, unknown>): Promise<WriteResult> {
    assertMapped(collection);
    const map = collectionMap(collection);
    const existing = map.get(id);
    if (!existing || !visible(collection, existing)) return { id, success: false };
    const patch = { ...data };
    delete patch.id;
    map.set(id, { ...existing, ...patch });
    notify(collection);
    return { id, success: true };
  }

  /**
   * Applies ON DELETE SET NULL for a deleted `collection`/`id` against maps
   * resolved by `mapFor` (the live store, or a batch draft). Returns the
   * collections whose rows changed.
   */
  function setNullReferences(mapFor: (collection: string) => Map<string, Record<string, unknown>>, collection: string, id: string): string[] {
    const touched: string[] = [];
    for (const [referenced, referencing, field] of SET_NULL_REFERENCES) {
      if (referenced !== collection || !allowed.has(referencing)) continue;
      const map = mapFor(referencing);
      let changed = false;
      for (const [rowId, doc] of map) {
        if (doc[field] === id) {
          map.set(rowId, { ...doc, [field]: null });
          changed = true;
        }
      }
      if (changed) touched.push(referencing);
    }
    return touched;
  }

  async function deleteDocument(collection: string, id: string): Promise<WriteResult> {
    assertMapped(collection);
    collectionMap(collection).delete(id);
    const touched = setNullReferences(collectionMap, collection, id);
    notify(collection);
    for (const other of touched) notify(other);
    return { id, success: true };
  }

  async function query<T>(collection: string, filters: QueryFilter[], options?: QueryOptions): Promise<PaginatedResult<T>> {
    return runQuery<T>(collection, filters, options);
  }

  /** The draft copy of a collection, created from the live one on first touch. */
  function draftMap(draft: Map<string, Map<string, Record<string, unknown>>>, collection: string): Map<string, Record<string, unknown>> {
    let map = draft.get(collection);
    if (!map) {
      map = new Map(collectionMap(collection));
      draft.set(collection, map);
    }
    return map;
  }

  /** Applies one op against a draft Map (never the live store) for batch staging. */
  function applyOpToDraft(draft: Map<string, Map<string, Record<string, unknown>>>, op: BatchOperation): void {
    assertMapped(op.collection);
    const map = draftMap(draft, op.collection);
    if (op.type === 'set') {
      const payload = { ...(op.data ?? {}) };
      delete payload.id;
      if (op.options?.merge) {
        map.set(op.id, { ...(map.get(op.id) ?? {}), ...payload });
      } else {
        map.set(op.id, payload);
      }
    } else if (op.type === 'update') {
      const existing = map.get(op.id);
      if (!existing || !visible(op.collection, existing)) {
        throw new Error(`memory-adapter: batchWrite update target ${op.collection}/${op.id} does not exist`);
      }
      const patch = { ...(op.data ?? {}) };
      delete patch.id;
      map.set(op.id, { ...existing, ...patch });
    } else if (op.type === 'delete') {
      map.delete(op.id);
      setNullReferences((collection) => draftMap(draft, collection), op.collection, op.id);
    } else {
      throw new Error(`memory-adapter: unknown batch op type "${String(op.type)}"`);
    }
  }

  async function batchWrite(operations: BatchOperation[]): Promise<BatchResult> {
    if (operations.length === 0) return { success: true, count: 0 };
    const draft = new Map<string, Map<string, Record<string, unknown>>>();
    try {
      for (const op of operations) applyOpToDraft(draft, op);
    } catch (cause) {
      return { success: false, count: 0, errors: [{ index: -1, error: (cause as Error).message }] };
    }
    // All-or-nothing: only now commit the draft collections into the live store.
    for (const [collection, map] of draft) store.set(collection, map);
    // Every collection the draft touched, including rows nulled by a delete.
    for (const collection of draft.keys()) notify(collection);
    return { success: true, count: operations.length };
  }

  function subscribe<T>(collection: string, id: string, callback: (data: T | null) => void): Unsubscribe {
    assertMapped(collection);
    let active = true;
    const emit = () => {
      if (!active) return;
      const doc = collectionMap(collection).get(id);
      callback(doc && visible(collection, doc) ? ({ id, ...doc } as T) : null);
    };
    emit();
    const set = listeners.get(collection) ?? new Set();
    set.add(emit);
    listeners.set(collection, set);
    return () => {
      active = false;
      set.delete(emit);
    };
  }

  function subscribeToQuery<T>(collection: string, filters: QueryFilter[], callback: (data: T[]) => void): Unsubscribe {
    assertMapped(collection);
    let active = true;
    const emit = () => {
      if (!active) return;
      callback(runQuery<T>(collection, filters).data);
    };
    emit();
    const set = listeners.get(collection) ?? new Set();
    set.add(emit);
    listeners.set(collection, set);
    return () => {
      active = false;
      set.delete(emit);
    };
  }

  function serverTimestamp(): unknown {
    return new Date().toISOString();
  }

  function generateId(_collection: string): string {
    return globalThis.crypto.randomUUID();
  }

  return {
    getDocument,
    setDocument,
    updateDocument,
    deleteDocument,
    query,
    batchWrite,
    subscribe,
    subscribeToQuery,
    serverTimestamp,
    generateId,
  };
}
