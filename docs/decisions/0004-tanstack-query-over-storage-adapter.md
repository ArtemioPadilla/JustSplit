# 0004 — TanStack Query over domain repos over StorageAdapter, no DataLayerService

## Status

`Accepted`

Date: 2026-09-28 (spec D3; plan B5a)

## Context

JustSplit's target tree is a static Astro site (ADR 0011, spec D2): every
route island is its own React root (Inceptor's islands architecture, no
`ClientRouter`), and the only backend it can safely talk to from the browser
is Postgres through RLS (ADR 0002, ADR 0011). The app needs:

- A read path that survives a cold navigation (every route load is a fresh
  React root, so a page-local cache alone would refetch everything, every
  time) without pretending to have Firestore's persistent local cache.
- A realtime path so a shared ledger reflects a co-member's write without a
  manual refresh.
- A write path that goes through Zod-validated, RLS-shaped inputs, never a
  raw `supabase-js` call from an island.
- No client-side authorization: `permissions-rls-doctrine.md` §1.1 requires
  a static client to run with `permissions: { enabled: false }`, "consciously
  turned off," not silently defaulted.

`cybereco-hub/docs/specs/tradepilot-pilot-integration.md` ("Seam 2", the
layering a static-hosted pilot app is expected to use) prescribes exactly one
shape for this: `island -> hook (useQuery/useMutation) -> domain repo ->
StorageAdapter -> Postgres + RLS`. The alternative the hub ships today,
`DataLayerService` (an orchestrator with an L1 cache, a permission checker,
an in-memory webhook queue and a sync-conflict resolver), is built for a
long-lived server process, not a request/response SPA:

- Its L1 cache duplicates whatever TanStack Query already does, with none of
  Query's persistence, garbage collection, or React integration.
- Its webhook emitter has no consumer in a browser tab that closes on
  navigation.
- Its `PermissionService` would need `enabled: true` to do anything, which
  the doctrine forbids here — RLS is the only real boundary a static client
  has.

## Decision

**Layering: `island -> hook -> repo -> StorageAdapter`, nothing else.**
`src/lib/data/repos/*` are plain async functions over the `StorageAdapter`
interface only (`@cyber-eco/types`), Zod-validated on write (plan B3) and on
read (`.loose()` schemas so an unknown top-level key survives, spec D9).
`src/lib/data/hooks/*` are the only thing an island imports from
`src/lib/data`; hooks never call the adapter directly (`requireStorageAdapter()`
lives in `require-adapter.ts`, called only from repos). No `DataLayerService`
is instantiated and no `createDataLayer(` call exists anywhere in `src`
(`src/tests/no-data-layer-service.test.ts`) — this is what makes
`permissions: { enabled: false }` true **structurally**, not a setting that
could be flipped back on by accident.

**Reads, non-live:** `useQuery({ queryKey, queryFn: () => repos.x.get(id) })`
for detail pages that don't need a subscription (`useGroup(id)`).

**Reads, live:** `useLiveQuery(queryKey, collection, filters, { persist })`
(`src/lib/data/hooks/useLiveQuery.ts`) is the single network source for a
collection key. It subscribes `adapter.subscribeToQuery` inside a
`useEffect` through `createDisposer()` (Inceptor island-lifecycle
discipline); the subscription's FETCH-THEN-LISTEN first emission **is** the
fetch (`storage-adapter-contract.md` §4), so the paired `useQuery` runs with
`enabled: false` — its own `queryFn` never issues a second, redundant
request. Every later emission — an INSERT, UPDATE, or PK-only DELETE
(D10; deletes aren't RLS-filtered and carry only the id) — **refetches the
whole query and calls `queryClient.setQueryData(key, rows)`**; the adapter
never evaluates a change payload against the filter itself (hub adapter
semantics, `RelationalSupabaseAdapter.subscribeToQuery`). Torn down on
unmount, and re-subscribed (never overlapping the old subscription) whenever
the collection/key/filters identity changes — which is what a `$user`
transition looks like from this hook (`useLiveQuery.test.tsx`'s
listener-leak test: `null -> A -> B -> null`, StrictMode double-mount leaves
exactly one).

**Writes:** `useMutation` over a repo function (`useCreateExpense()` etc.),
invalidating the affected non-live keys on success — a live key doesn't need
invalidation (Realtime already pushes the new row to every open subscriber),
but invalidation is the fallback for a page that isn't currently subscribed.

**One `QueryProvider` per page,** mounted by the route island, with the
single shared idb key `JUSTSPLIT_QUERY_IDB_KEY = 'justsplit:query'`
(`src/lib/queryClient.ts`) — so a warm navigation to any route reuses
collections fetched on another (Inceptor's default is one `QueryClient` per
island under a generic key; two providers on one page would clobber each
other). Layout islands (`UserMenuIsland`, `ToasterIsland`) read Nano Stores
only and never mount `QueryProvider` — enforced by
`src/tests/query-provider-boundary.test.ts`.

**The contingency relational adapter.** Relational mode is not merged in
`@cyber-eco/supabase@0.2.1` (ADR 0011, spec D1): `src/lib/data/relational-adapter.ts`
implements `StorageAdapter` over `@supabase/supabase-js` directly, following
the hub's own `SchemaMap` design
(`cybereco-hub/docs/design/schema-map-strategy.md`) — `src/lib/data/schema-map.ts`
is the local `SchemaMap`/`CollectionMapping` copy (typed to be upstreamed
unchanged, Track C' H2 once gate C1 clears; deleted here afterwards, plan
B22). `adapter.ts` is the one place that constructs it, always with
`{ schemaMap }`, and `src/tests/data-boundary.test.ts` fails the build if
either the contingency adapter or the eventual upstream one is ever
constructed without a `schemaMap` — document mode is never a fallback (D10).

## Consequences

**Positive** — the layering matches the hub's own prescribed shape for a
static-hosted app, so the contingency adapter upstreams without a rewrite;
no client-side permission service to misconfigure; `useLiveQuery` gives every
collection page realtime-for-free with exactly one network request per
mount; the idb persister keeps a warm navigation fast without pretending to
be an offline write queue.

**Negative** — a local relational adapter and `SchemaMap` to maintain until
H2 ships upstream; every write, single or batched, is an RPC round trip to
`batch_write` rather than a plain PostgREST call, and a `set` on an existing
row the caller cannot see fails with a unique violation instead of a clearer
error.

Every write goes through the one atomic `batch_write` RPC
(`db/migrations/20260928000008_batch_write.sql`): `setDocument`,
`updateDocument` and `batchWrite` send the same pre-translated op. The server
updates a visible row first and inserts only when none matched, and merges
`extra` with `jsonb ||` in the same statement. Concurrent writers of different
overflow keys therefore keep both changes, and a member who did not create a
row can still replace it (a client upsert would be checked against the INSERT
policy). The earlier client-side read-then-merge lost updates under
concurrency; it was replaced test-first (`Tdd-Red: 15c2e8b`, fix `ece7804`),
and the shared contract suite pins the concurrent case against the memory
adapter and, as `test:contract:live`, the real one.

**Neutral** — `useProfiles(ids)` and other non-live reads still go through
plain `useQuery`, not `useLiveQuery`; nothing about this ADR requires every
read to be realtime.

### Stakeholder Analysis

| Stakeholder | Impact | Mitigation |
|---|---|---|
| End users | The idb-persisted Query cache is a **copy of their data on the device** (every group, expense, settlement they've loaded) — a shared/borrowed device risk if left behind after sign-out. | `src/stores/auth.ts`'s `signOut()` calls `clearPersistedQueryCache()` (`src/lib/queryClient.ts`) — tested in `src/stores/auth.test.ts`. No offline writes in v1: a signed-out or offline visitor sees the last-fetched read-only data, never a queued mutation that could silently apply later under the wrong session. |
| End users (multi-tab / multi-device) | `useLiveQuery`'s Realtime subscription is per-tab; a tab left open indefinitely holds one open Postgres Realtime connection per active collection key. | Torn down on unmount and on a `$user` change (listener-leak test); Realtime connections are cheap relative to the read they replace (no polling), and the app has no background/service-worker sync that would keep a subscription alive after the tab closes. |
| Maintainer | Owns the client-side translation (camelCase fields ↔ snake_case columns, overflow keys ↔ `extra`) that every write and read depends on; a mistake there corrupts rows for every collection. | One write path: `setDocument`/`updateDocument`/`batchWrite` all build the same op through one `toOp`/`splitFields` function and send it to the atomic `batch_write` RPC. The translation is pinned to the migrations by `schema-map.test.ts`, and the D9 overflow-merge invariant (including concurrent writers) by the backend-agnostic contract suite, run against the memory adapter always and the real adapter as `test:contract:live`. |
| CyberEco hub | Gains a concrete, tested reference for the `island -> hook -> repo -> StorageAdapter` layering `tradepilot-pilot-integration.md` Seam 2 only prescribes in prose today. | `relational-adapter.ts` is written to the hub's own `SchemaMap` design on purpose, so upstreaming it (Track C' H2) is a move, not a rewrite. |

## Supersedes

None.

## References

- Spec D1, D3, D9, D10: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan B3, B5a: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- `src/lib/data/{schema-map,relational-adapter,require-adapter}.ts`,
  `src/lib/data/repos/*`, `src/lib/data/hooks/*`, `src/lib/queryClient.ts`
- `src/tests/{storage-adapter-contract.shared,storage-adapter-contract,
  collections-mapped,data-boundary,query-provider-boundary,
  no-data-layer-service}.test.ts`, `src/tests/storage-adapter-contract.live.test.ts`
- ADR 0002 (canonical schema and RLS), ADR 0011 (Supabase via the CyberEco
  data layer)
- `cyber-eco/cybereco-hub`: `docs/design/schema-map-strategy.md`,
  `docs/design/storage-adapter-contract.md`,
  `docs/design/permissions-rls-doctrine.md`,
  `docs/specs/tradepilot-pilot-integration.md` (Seam 2)
