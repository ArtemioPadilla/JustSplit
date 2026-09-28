# 0004 — TanStack Query over domain repos over StorageAdapter, no DataLayerService

## Status

`Accepted`

Date: 2026-09-28 (spec D3; plan B5a). Amended by plan B8b and plan B11b (below).

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

**One `QueryProvider` per page,** mounted by the route island (concretely:
by `AuthGate`, inside `RouteGuard` — B11b amendment below), with the
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

## Amendment (2026-09-28, plan B8b): live-query failure surfacing

### Context

Building the `/` dashboard island (plan B8b) surfaced a gap this ADR's
original `useLiveQuery` design didn't address: a failed subscription had no
way to tell the caller. `RelationalSupabaseAdapter.subscribeToQuery`'s
`fetchAndEmit` caught any `query()` rejection (an RLS denial, a network
error, a transient Postgres error) and called `callback([])` — the exact
same shape as "the collection genuinely has zero rows." `useLiveQuery`'s own
wrapped `useQuery` runs with `enabled: false` by design (this ADR's "FETCH-
THEN-LISTEN first emission IS the fetch" decision), so its `queryFn` never
runs and its native `isError`/`error`/`refetch` were permanently inert —
there was no code path, anywhere in the `island -> hook -> repo ->
StorageAdapter` layering, that could turn a real failure into anything a
route island could show the user. `DashboardIsland` (the first consumer)
rendered a skeleton keyed off `data === undefined`, which — for exactly this
reason — never resolved for a failed query: a permanent loading spinner,
no explanation, no way to recover, on every live-query screen this layering
produces from B9 onward.

### Decision

**A typed, optional trailing parameter on the `subscribeToQuery` callback.**
`src/lib/data/relational-adapter.ts` exports `LiveQueryCallback<T> = (data:
T[], error?: unknown) => void`. `RelationalSupabaseAdapter.subscribeToQuery`
forwards a `query()` rejection as that second argument instead of
swallowing it; a later successful re-run (any `postgres_changes` event)
clears it by simply not passing one. This is an app-owned extension of the
`StorageAdapter` interface's own `(data: T[]) => void` shape, never a
change to the vendored `@cyber-eco/types` package — assignable back to the
narrower interface type via TypeScript's own method-parameter bivariance,
so every other reader of that interface's callback shape is unaffected.

**`useLiveQuery` owns real `isError`/`error`/`refetch`/`isRetrying`.**
`isError`/`error` reflect the adapter's forwarded failure (never shown to
the user verbatim — every caller renders a generic message). `refetch()`
bumps an internal generation counter that tears down and re-opens the
subscription from scratch (the underlying disabled `useQuery`'s own
`refetch` would just re-resolve whatever's cached, not retry anything).
`refetch()` is bounded to **one in-flight retry**: a call while the
previous one hasn't resolved yet is a no-op, tracked via a ref (not just
`isRetrying` state) so two calls landing in the same tick or two different
render cycles are both bounded the same way — no automatic retry loop, no
stacked re-subscriptions wasting an unresolved round trip. `isRetrying` is
exposed so a caller can disable its own Retry control for that exact
window (`DashboardIsland`'s Retry button: `disabled`/`aria-busy` from the
click until the next emission).

**Rule for future `StorageAdapter` extensions**, stated in
`LiveQueryCallback`'s doc comment and repeated here: an extension is
allowed ONLY as an optional TRAILING parameter (never required, never
inserted before an existing one); it must be recorded as an amendment to
this ADR; it must NEVER change the upstream `@cyber-eco/types` interface —
that is Track C' H2's job (widening the real, published interface once
relational mode upstreams), not a local workaround's.

### Alternatives considered

- **Keep swallowing (status quo).** Rejected: this is the bug being fixed —
  every live-query screen would keep showing an indistinguishable "no data"
  for a real backend failure, with no error and no recovery.
- **Throw from the hook instead of returning an error state.** Rejected: a
  thrown error inside a `useEffect` is uncatchable by the component tree in
  the normal React sense (effects don't participate in render-phase error
  boundaries the way a thrown render does) and would either crash silently
  or require a second, parallel mechanism just to route it back into state
  — strictly more complexity than returning `isError`/`error` directly.
- **Change the upstream `@cyber-eco/types` `StorageAdapter` interface** to
  formally include an error parameter. Rejected for now: that package is
  vendored (`vendor/cyber-eco-types-0.2.1.tgz`) and this repo does not own
  it; the real fix belongs to Track C' H2 (relational mode upstreaming),
  where the hub's own interface can be revisited with full context. The
  optional-trailing-parameter extension here is the deliberately narrow,
  local-only stand-in until then.

### Consequences

**Positive** — every future `useLiveQuery` consumer (B9 onward) gets a real
error state and a working, bounded retry for free, not something each
island has to reinvent; the extension is narrow enough to upstream or drop
without touching call sites that only know the base interface.

**Negative** — `RelationalSupabaseAdapter.subscribeToQuery`'s callback type
is now adapter-specific rather than the bare interface type, a small
documentation burden for the next person implementing `StorageAdapter`
against a different backend (they must know this convention exists, hence
recording it here rather than only in a code comment).

**Neutral** — the memory adapter (`src/tests/memory-adapter.ts`) keeps its
existing synchronous-throw-on-unmapped-collection behavior unchanged (a
programmer error, not a runtime data condition) — this amendment only
changes how a genuine async query failure is reported, not that class of
error.

### Stakeholder Analysis (new rows, this amendment)

| Stakeholder | Impact | Mitigation |
|---|---|---|
| End users | Now see a visible failure state (generic message + Retry) instead of a silent, indistinguishable-from-empty screen or an endless skeleton. | `ErrorState`'s copy never includes the raw error, SQL, or policy text — a title plus one honest, non-specific hint. Retry is disabled/`aria-busy` for exactly the in-flight window, so it cannot be double-fired into a stuck state. |
| End users facing a non-recoverable denial | A genuine, permanent RLS denial (e.g. a revoked membership) cannot be fixed by Retry — retrying forever would look like the app is broken. | The error state's second line names the FeedbackFAB ("Report an issue", already on every page) as the path forward, instead of inventing a support email/channel that doesn't exist or implying Retry will eventually succeed. |
| Supabase / the provider | A user stuck on a failing screen could otherwise hammer Retry, or a naive auto-retry could loop against a denied/rate-limited endpoint. | No automatic retry loop exists anywhere in this layering — retry is always a deliberate user click, and `useLiveQuery` bounds it to exactly one in-flight re-subscribe per click regardless of how many times the (disabled) button is clicked. |
| Future contributors | The next person extending `StorageAdapter` (a new field, a new backend) has no prior written precedent for how to do that without touching the vendored interface. | The optional-trailing-parameter rule is written once, in `LiveQueryCallback`'s doc comment and here — the next extension is a documented pattern to follow, not a fresh design decision. |

## Amendment (2026-09-28, plan B11b): provider placement, NULL columns, id-lookup chunking

### Context

B11b drove every island in a real browser against `supabase start` for the
first time. That run found three data-layer defects which the mocked unit
suites could not see, because they mock the hooks and the adapter:

1. **No island mounted `QueryProvider`.** "Mounted by the route island"
   (Decision, above) was never implemented. Every data page (`/`,
   `/expenses/list`, `/groups/list`, `/friends`, …) threw "No QueryClient set"
   on its first hook call.
2. **The relational adapter returns `null` for an unset nullable column.**
   Examples: an expense without `notes`, a group without `description`, an
   event without `endDate`. The Zod read schemas declared those fields
   `z.string().optional()`, which rejects `null`. As a result `repos.*.get()`
   threw right after a successful insert. The form reported a failed save for
   a row that had been written, and pressing Retry would have duplicated it.
3. **`find_profiles_by_ids` refuses more than 200 ids per call** (migration
   09). The events list resolves every member and payer of every visible
   event in one call, so it could exceed that cap.

### Decision

- **`AuthGate` mounts the page's single `QueryProvider`**, keyed with
  `JUSTSPLIT_QUERY_IDB_KEY` and placed inside `<RouteGuard>`. This makes
  "mounted by the route island" concrete. Every route island and every
  `AppRouterIsland` view renders exactly one `AuthGate`, so each page gets
  exactly one provider. The provider exists only once a user is known and
  allowed, so an anonymous, still-resolving or denied visitor never has the
  device cache restored. Layout islands still never mount it
  (`query-provider-boundary.test.ts`). The cache reset of ADR 0008 deletes
  the same idb key. The test `AuthGate.query-client.test.tsx` pins all three
  visitor states.
- **Read schemas map `NULL` to "absent".** `optionalColumn()`
  (`src/schemas/nullable-column.ts`) preprocesses `null` to `undefined`
  before `z.string().optional()`. The inferred types are unchanged
  (`string | undefined`, optional key), so no caller changes. **Write**
  schemas are separate and keep `null` as the explicit way to clear a
  column. For example, `EventPatchSchema` is strict with `.nullable()`
  fields, so clearing an event's end date sends `endDate: null`.
- **`repos.profiles.byIds` chunks** at 200 ids, runs the chunks in
  parallel, and flattens the results. An empty list makes no call. The
  server cap stays as it is: it bounds the work of a single request, and
  the client adapts to it.
- **`repos.events.update` validates its patch** with `EventPatchSchema`
  before writing, and throws `EventNotFoundError` for a row the caller
  cannot see. This follows the B9 and B12 convention that a silent 0-row
  write is never reported as success.

### Consequences

**Positive**
- The app works end to end for the first time.
- A saved row is never reported as a failed save.
- Large ledgers resolve every name.

**Negative**
- One provider per page means one `QueryClient` per page load. A
  cross-page cache is possible only through the persisted idb snapshot
  (this was always the design).
- A narrow race remains on sign-out. An idb persist already in flight when
  the provider unmounts could land after `clearPersistedQueryCache()`
  deletes the key. The next sign-in then restores that stale snapshot only
  until the first fetch, and RLS still decides what the new user can read.
  This is recorded here and not engineered away.

**Neutral**
- The mocked suites could not see any of these defects. The follow-up is a
  live smoke job in CI that drives the built `dist` against
  `supabase start`. It is tracked as its own plan issue.

### Stakeholder Analysis (new rows, this amendment)

| Stakeholder | Impact | Mitigation |
|---|---|---|
| End users | Before this amendment every data page failed, and a successful save could look failed, which invited a duplicate on retry. | The provider is mounted once per page. NULL columns read as absent. Save outcomes now match what was written. Each defect has a red→green test. |
| Anonymous / denied visitors | A provider mounted above the guard would restore the device's persisted cache (another user's data on a shared device) before any access check. | The provider sits inside `RouteGuard`. The three visitor states are pinned by `AuthGate.query-client.test.tsx`. |
| Users on shared devices | The sign-out persist race above could leave a stale snapshot. | ADR 0008's reset still deletes the key. The stale snapshot shows only until the first fetch. RLS remains the only authority over reads (CLAUDE.md rule 8). |
| Supabase / the provider | Chunked id lookups send more requests for very large ledgers. | Each request stays within the server's own 200-id bound. Chunks are sent only when needed, and an empty list sends nothing. |

## Supersedes

None.

## References

- Spec D1, D3, D9, D10: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan B3, B5a, B8b (amendment): `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- `src/lib/data/{schema-map,relational-adapter,require-adapter}.ts`,
  `src/lib/data/repos/*`, `src/lib/data/hooks/*`, `src/lib/queryClient.ts`
- `src/tests/{storage-adapter-contract.shared,storage-adapter-contract,
  collections-mapped,data-boundary,query-provider-boundary,
  no-data-layer-service}.test.ts`, `src/tests/storage-adapter-contract.live.test.ts`
- Amendment: `src/lib/data/relational-adapter.ts` (`LiveQueryCallback<T>`),
  `src/lib/data/hooks/useLiveQuery.ts` (`isError`/`error`/`refetch`/
  `isRetrying`), `src/components/islands/DashboardIsland.tsx` (the first
  consumer), and their `.test.ts(x)` files
- B11b amendment: `src/components/islands/AuthGate.tsx` (+
  `AuthGate.query-client.test.tsx`), `src/schemas/nullable-column.ts`,
  `src/lib/data/repos/{profiles,events}.ts`, `src/schemas/event.ts`
  (`EventPatchSchema`), and their tests
- ADR 0002 (canonical schema and RLS), ADR 0011 (Supabase via the CyberEco
  data layer)
- `cyber-eco/cybereco-hub`: `docs/design/schema-map-strategy.md`,
  `docs/design/storage-adapter-contract.md`,
  `docs/design/permissions-rls-doctrine.md`,
  `docs/specs/tradepilot-pilot-integration.md` (Seam 2)
