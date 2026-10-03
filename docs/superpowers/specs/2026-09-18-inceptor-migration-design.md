# JustSplit → Inceptor migration — Design spec

**Status:** draft (2026-09-18; backend decision revised 2026-09-27) · **Owner:** @ArtemioPadilla · **Plan:** `docs/superpowers/plans/2026-09-18-inceptor-migration.md`

## 1. Why

JustSplit is a Next.js 15 / React 18 / MUI / Firebase app, last touched
2025-05-20, with no issue-driven workflow, no CI quality gate, and a stack
that has drifted from everything else we maintain. **Inceptor**
(`ArtemioPadilla/inceptor`) is the scaffold we want to be the *single*
base for this and future projects: Astro 5 + React 19 islands + Tailwind v4 +
Base UI/shadcn, with an issue → triage → PR → merge → deploy loop driven by
the `prometeo` / `forja` / `centinela` sub-agents.

The goal of this migration is therefore twofold, and the two halves are
independent and ship in that order:

| Track | What | Ships as |
|---|---|---|
| **A. Workflow adoption** | `CLAUDE.md`, `.claude/agents` + checklists + commands, `ci.yml`, `claude.yml` triage, issue/PR templates, labels + milestones, repo hygiene | seven small PRs to `main` (A1–A6, with A3 split into A3a/A3b), no app code changes |
| **B. Stack migration** | Re-platform the app on the Inceptor scaffold (Astro + islands + Tailwind + shadcn) over **Supabase through the CyberEco data layer** (`@cyber-eco/types` + `@cyber-eco/auth` + `@cyber-eco/supabase`), starting from a clean schema; Firebase is retired at cutover | a series of issue-driven PRs on an integration branch, then one cutover PR |
| **C. Upstream to Inceptor** | `docs/recipes/data-cybereco-supabase.md`, `docs/recipes/adopt-existing-app.md`, `init.mjs --into` | 3 issues in the `inceptor` repo, independent of the cutover |
| **C'. Upstream to `cybereco-hub`** | H1 written consumer commitment (this spec) satisfying ADR-008's gate (1); H2 relational mode (`SchemaMap`) in `@cyber-eco/supabase`; H3 `examples/static-app-supabase` | 3 issues in the `cybereco-hub` repo; H2 is gated on the hub's gate C1 (D1) |
| **D. Relationship kinds, categories and conceptos** (post-cutover, D9) | JustSplit `kind` mapped onto the universal `ExpenseGroup.type` + a JustSplit-only `kind` field, `events.kind`, a global category taxonomy, group-owned conceptos, one optional budget — additive optional top-level fields that the SchemaMap stores in the `extra` overflow column (D10), no schema or RLS change, every touched table re-covered by the RLS suite. Issue ids D0–D12 in the plan are not the decision ids of §3 | issue-driven PRs to `main` after B22 (plan Track D); not a cutover gate |

After B lands, the only things we maintain are Inceptor and the CyberEco data
layer; JustSplit becomes a downstream consumer of both (Track C upstreams the
reusable recipe to Inceptor, Track C' upstreams relational mode and the example
app to `cybereco-hub`). Track
D is the first post-cutover feature epic and runs through the same loop; the
migration only prepares for it (D9).

## 2. Current-state inventory (features to preserve; data and backend are not)

**Preserved: the user-facing features (§6). Not preserved: the data, the
Firestore document shapes, the security rules and the Firebase project** (D1:
no existing data is worth migrating; JustSplit starts from a clean schema,
D10). The Firebase facts below are recorded because they are the reasons for
not keeping the backend, not constraints on the target.

**Routes (26 `page.tsx`)** — `/` (dashboard), `/landing`, `/about`, `/help`,
`/auth/signin`, `/auth/signup`, `/profile`, `/expenses` (+ `/list`, `/new`,
`/[id]`, `/edit/[id]`), `/events` (+ `/list`, `/new`, `/[id]`,
`/edit/[id]`), `/groups` (+ `/list`, `/new`, `/[id]`), `/friends`
(+ `/add`, `/[id]`), `/settlements`, `/test-notification` (dev only, drop).
`/expenses`, `/events` and `/groups` are not pages but `PageRedirect` client
redirects to `/…/list`. Links exist to routes that do not exist
(`/auth/register`, `/auth/reset-password`, `/tos`, `/privacy`, `/contact`).

**Data model (`src/types/index.ts`)** — `User`, `Friendship`, `Group`,
`Expense` (with `splitMethod`, `participantShares`, `images`), `Event`,
`Settlement`, `TimelineEvent`/`TimelineExpense`. Six Firestore collections:
`users`, `friendships`, `groups`, `events`, `expenses`, `settlements`, with
security rules in `src/firebase/firestore.rules` and indexes in
`firestore.indexes.json` (empty). The committed rules file is **stale and
inconsistent with the code**: it has no `friendships` block, the `groups`
block uses `request.data` (not a rules variable), the `events` rule gates on
`participants` while the app writes `members`, and the `settlements` listener
queries `involvedUsers`, a field nothing writes. No workflow deploys rules, so
the deployed ruleset is unknown — and, with nothing to migrate, it is never
captured: the target authorization model is written from scratch as Postgres
RLS (D10). Timestamps
(`createdAt`, `updatedAt`, `settlements.date`) are stored as Firestore
`Timestamp`s although the TS types say `string`/`Date`. Images and avatars
are **base64 data-URLs stored inside Firestore documents**
(`expenses.images[]`, `users.avatarUrl`); Firebase Storage is not used. None
of this is carried over: the clean schema uses `timestamptz`, real columns and
Supabase Storage (D10).

**State** — `AppContext.tsx` (866 lines): a `useReducer` store hydrated by
five `onSnapshot` listeners (users/events/expenses/settlements/groups) that
are (re)bound whenever the auth user changes; `AuthContext.tsx`: Firebase
Auth with email/password + Google popup (Facebook/Twitter buttons call real
providers), profile auto-creation on first sign-in, `resetPassword`,
`linkAccount`, Auth `displayName`/`photoURL` sync, persistence-mode switch on
IndexedDB corruption; `NotificationContext.tsx`: toast queue. All three are
React Context — **exactly the pattern Inceptor forbids across islands**
(CLAUDE.md warning 2). Four pages let the user "add by name", which
dispatches a local-only `ADD_USER` (phantom uuid user, never persisted).

**Domain logic (pure, keep — `expenseCalculator` is re-typed onto the
universal `splits[]` in plan B3, the rest moves verbatim)** — `utils/expenseCalculator.ts`,
`utils/currencyExchange.ts` (live rates + fallback table),
`utils/formatters.ts`, `utils/csvExport.ts`, `utils/timelineUtils/*`,
`utils/fileUtils.ts`. These have the best test coverage and are
framework-free except `currencyExchange.ts`, which also exports a React hook
(`useExchangeRate`) and a localStorage cache (`justSplitData.exchange_rates`,
6 h TTL) and a second `formatCurrency` (symbol-based) competing with the Intl
one in `formatters.ts`.

**UI** — 40 CSS-module files, MUI only in 2 files
(`ExpenseSplitter/index.tsx`, `app/expenses/edit/[id]/page.tsx`),
`framer-motion` in 2 files (`about`, `help`) **and** `motion` installed but
unused, `chart.js`/`react-chartjs-2` are installed but unused; charts are
hand-rolled CSS/SVG in `MonthlyTrendsChart`/`BalanceOverview`/`ExpenseDistribution`,
`react-intersection-observer`. Dashboard: 11 components (`UserSummary` unused
by any page; `MonthlyTrendsChart` and `ExpenseDistribution` imported but never
rendered; `BalanceOverview`/`UpcomingEvents`/`FinancialSummary` fed placeholder
state). Custom ui kit:
`Button`, `IconButton`, `CurrencySelector`, `EditableText`, `EntityList`,
`HoverCard`, `Notification`, `PageRedirect`, `ProgressBar`, `Timeline`,
`DatabaseRecovery`/`DatabaseErrorRecovery`, `ImageUploader`,
`AvatarUploader`, `CurrencyExchangeTicker`, `Header`. Design tokens live in
`src/styles/theme.css` (74 custom properties), `src/app/globals.css` (33) and
`docs/design/style-guide.md`.

**Tests** — 32 Jest + Testing Library files (dashboard, timeline, utils,
contexts; Jest's default `testMatch` also picks up
`src/app/__tests__/exampleTest.tsx`). Jest config uses jsdom + CSS-module
mocks, `collectCoverage: true` with a 70 % threshold against ~20 % actual
coverage; 7 suites (23 tests) fail today and `tsc --noEmit` reports 157 errors, all in test files. 30 of 32 files use `jest.mock`/`jest.fn`/`jest.spyOn`.

**Hosting/CI** — Firebase Hosting with `frameworksBackend` (Next SSR via
`webframeworks` experiment) on project `justsplit-eef51` (single project, no
staging; preview channels share production Auth/Firestore); three workflows,
two of which deploy on every push to `main` (duplicate, with different
service-account secrets), Node 18, `actions/checkout@v2`, unpinned actions,
preview builds run with no Firebase env. No test/lint/type-check job, no
ESLint config (`next lint` would prompt interactively). `apphosting*.yaml`
suggest an App Hosting backend may be connected to the repo.

**Repo hygiene debt** — committed junk: `git-diff.txt`, `report.txt`,
`tree.txt`, a directory literally named `'` containing a macOS path; a
`debug-firebase.js` util; a Pages-router `src/pages/_app.tsx`; shadow page
files (`page-fixed.tsx`, `page.tsx.new`, `page.tsx.bak`); duplicate
`ProgressBar`/`Button`/test-util modules; `reports/test-report.html`;
`--no-lint` production build.

## 3. Decisions

### D1. Supabase via the CyberEco data layer; Firebase retired. (owner decision 2026-09-27)
JustSplit moves to **Supabase, consumed through the CyberEco data layer**:
`@cyber-eco/types` for the `StorageAdapter` contract and the universal
`Expense` / `Settlement` / `ExpenseGroup` / `Friendship` types,
`@cyber-eco/auth` for `<AuthProvider>`, `@cyber-eco/supabase` for
`SupabaseStorageAdapter` + `SupabaseAuthAdapter` + `SupabaseProfileStore`.
Firebase — Auth, Firestore, Hosting, project `justsplit-eef51` — is retired
at cutover (plan B20). **No existing data is worth migrating**: JustSplit
starts from a clean schema (D10); the Firestore documents, the stale rules
and the base64 images of §2 are not ported. (Should a future issue ever import any of it: an
expense's legacy `settledAt` and the `Settlement` rows that covered it are carried either/or, never
both — ADR 0014.)

Rationale:

- `cybereco-hub/docs/adr/ADR-007-inceptor-app-archetype.md` makes Inceptor
  the official archetype for CyberEco apps ("instancia Inceptor y conéctalo":
  Inceptor + `@cyber-eco/auth` + the data layer). This is the sanctioned
  path; a Firebase recipe in Inceptor would be a second, unsanctioned one.
- Nothing to preserve, so swapping the backend adds no data-migration risk
  and removes the rules-reconciliation work of the previous plan entirely.
- Postgres RLS per table is real authorization for a static client
  (`cybereco-hub/docs/design/permissions-rls-doctrine.md` §1.1: RLS is the
  primary and only authorization; the client has no permission service at
  all — no `createDataLayer` / `DataLayerService` is instantiated, so the
  doctrine's `permissions: { enabled: false }` requirement is met
  structurally rather than by a setting), whereas Firestore rules would have
  had to be reverse-engineered from a stale file.
- The portfolio (Nestboard, TradePilot, FinSight) already gravitates to
  Supabase (`cybereco-hub/docs/adr/ADR-008-supabase-storage-adapter.md`):
  one backend, one doctrine, one adapter.

Rejected: keeping Firebase (the previous D1 — a second recipe to maintain, a
stale ruleset to capture, no shared data layer); Supabase without the data
layer (loses the universal types and the `StorageAdapter` seam that Track C'
upstreams).

**Consequence for the hub.** JustSplit is the **written, committed consumer**
that ADR-008's gate (1) requires before relational mode is built (plan H1).
Gate (2): the three design documents exist and are Vigente
(`docs/design/permissions-rls-doctrine.md`, `docs/design/schema-map-strategy.md`,
`docs/design/storage-adapter-contract.md`); H1 also closes Story 3.2 in the
roadmap, which still lists it as pending, and amends the Epic 7 gate sentence
so that the JustSplit commitment satisfies gate (1) by its own wording.
Gate (3) — gate C1, one public deploy with ≥ 1 real user — is the Hub deploy
to Render (`cybereco-hub/docs/ROADMAP-EPICS-STORIES-TASKS.md`, Story 0.3), an
owner action still pending.

**Gate C1 and sequencing (not a blocker for JustSplit).** Relational mode in
`@cyber-eco/supabase` is hub-package work that gate C1 forbids until the Hub
deploys (Story 0.3, ~40 min of owner action). JustSplit does not wait for it:
(a) Track A and B1–B4 (scaffold, static pages, auth) need no storage adapter
at all; (b) the JustSplit repo layer codes **only against the `StorageAdapter`
interface** from `@cyber-eco/types` (published, `0.2.1`) — never against
`SupabaseStorageAdapter` internals; the upstream adapter is constructed with a
client **getter** and, once H2 ships, a `schemaMap` — never without one
(document mode is its constructor default); (c) **contingency**: if relational mode is
not merged upstream when plan B5a starts, JustSplit ships
`src/lib/data/relational-adapter.ts`, a local `StorageAdapter` implementation
of the `SchemaMap` design (per-collection tables with real columns + `extra`
jsonb overflow + Realtime `postgres_changes`), behind the same interface, and
upstreams it as Track C' H2 once C1 clears. What is never done: falling back
to **document mode** for group data — `public.documents` RLS is
`owner_id is null OR owner_id = auth.uid()` for every command
(`packages/supabase/db/migrations/20260704000001_documents.sql`), so any
shared document would be readable and writable by every authenticated user —
enforced by the B2b/B5a tests (no `public.documents` table exists in the
`justsplit` project, every collection string used by a repo is a `SchemaMap`
key, `adapter.ts` always passes `schemaMap`), not by convention.

**Two identity contexts, stated.** JustSplit gets its **own Supabase project**
(`justsplit`) with its own `auth.users`. Shared identity with the CyberEco Hub
is deferred: Hub → app silent SSO is a known broken P0
(`cybereco-hub/docs/reviews/auth-static-hosting-validation.md`) and
Firebase ↔ Supabase federation is undesigned
(`docs/adr/ADR-009-identity-federation.md` is *Proposed*, Story 3.1). Nothing
in this spec assumes a Hub account; ADR-009 owns the federation question.

**Packages.** `@cyber-eco/{types,auth,supabase}@0.2.1` are published to
GitHub Packages (`publishConfig.registry: https://npm.pkg.github.com` in each
`packages/*/package.json`). The packages are owned by the **`cyber-eco`
GitHub organisation** (`cyber-eco/cybereco-hub`, a private repo, so the
packages are private), not by `ArtemioPadilla`; therefore
`ArtemioPadilla/JustSplit`'s `GITHUB_TOKEN` can never read them and a personal
token is required: a **classic PAT with `read:packages`**, issued by a member
of the `cyber-eco` org with read access to `cyber-eco/cybereco-hub` (GitHub
Packages' npm registry does not accept fine-grained PATs; if the org ever
allows them and GitHub adds support, a fine-grained PAT with resource owner
`cyber-eco` and Packages: read is the alternative to verify), stored as repo
secret `GH_PACKAGES_TOKEN`. The committed `.npmrc` carries **only**
`@cyber-eco:registry=https://npm.pkg.github.com` — never a
`_authToken=${...}` line, which makes every npm command fail for anyone
without the variable; the token lives in `~/.npmrc` locally
(`//npm.pkg.github.com/:_authToken=<pat>`, `SETUP.md`) and in CI through
`actions/setup-node` (`registry-url`, `scope: '@cyber-eco'`) +
`NODE_AUTH_TOKEN: ${{ secrets.GH_PACKAGES_TOKEN }}` on `npm ci`. Fallback if
access cannot be granted: vendor the packages (§5, ADR 0011). Plus
`@supabase/supabase-js` (peer dependency of the adapters).

### D2. Astro `output: 'static'` on GitHub Pages; client-only dynamic routes through the `404.astro` shell.
> **Hosting superseded (2026-10-03, plan B20a):** production is **Cloudflare Pages at `https://split.cybere.co`**, no base path, branch previews instead of the staging workflow, `_headers` for HSTS/CSP — [ADR 0016](../../decisions/0016-cloudflare-pages-at-split-cybere-co.md). The static output, the `404.astro` shell, `withBase()` and the other paragraphs below stand; GitHub Pages remains the documented fallback.

No SSR adapter: the app is 100 % authenticated client-side data, so there is
nothing to render on the server. Hosting is **GitHub Pages** through
Inceptor's own `deploy.yml` (kept from the `create-inceptor-app` output — it
builds `dist/` and publishes it with `actions/deploy-pages`). Domain: **custom
domain preferred** (`ASTRO_BASE` unset, `site` = the domain, `withBase()` is
an identity); **subpath fallback** `https://artemiopadilla.github.io/JustSplit/`
with `ASTRO_BASE=/JustSplit` when no domain is configured. Because the
fallback is real (and the staging site below is always a subpath),
`withBase()` (Inceptor's `src/lib/href.ts`) is **not** assumed to be an
identity anywhere: every internal `href`, redirect target and public asset
reference goes through it, and a Vitest greps `src/` for hard-coded
`href="/…"`. A redirect target read from a URL (the `?next=` of the auth
pages) passes through `safeNext()` (`src/lib/href.ts`, plan B4) before
`withBase()`: with `ASTRO_BASE` unset, `withBase('//evil.example')` is a
protocol-relative URL that leaves the site, so `safeNext` returns `/` unless
the value is a same-origin path whose first segment is a known route family.

**Dynamic routes** (`/expenses/[id]`, `/events/[id]`, `/groups/[id]`,
`/friends/[id]`, `/expenses/edit/[id]`, `/events/edit/[id]`) cannot be
prerendered because ids are user data, and GitHub Pages has **no rewrites**.
Each becomes a route island that reads the id from `location.pathname` (same
pattern as a Hosting rewrite would have needed, different mechanism); the
page that serves them is `src/pages/404.astro`, which renders the app shell
(`<BaseLayout>` + `<AppRouterIsland client:only="react" />`) and mounts the
route island matching the pathname (`/expenses/edit/:id` →
`ExpenseFormIsland`, `/expenses/:id` → `ExpenseDetailIsland`, `/events/…`,
`/groups/:id`, `/friends/:id`, otherwise a real not-found view). The response
status is 404 — acceptable: these are authenticated routes no crawler should
index (`robots.txt` disallows them) and the browser renders the body
regardless. Static routes (`/expenses/list`, `/expenses/new`, `/settlements`,
…) are ordinary Astro pages served with 200. `/expenses`, `/events`,
`/groups` are tiny Astro pages with a `<meta http-equiv="refresh">` + JS
redirect to `withBase('/…/list')` (Pages has no server redirects).
`trailingSlash: 'ignore'` with Astro's default `build.format: 'directory'`
(Pages serves `dir/index.html` for both `/x` and `/x/`).

**Previews and staging.** GitHub Pages has no PR previews. Per-PR review is
the CI build plus `npm run preview` locally; the `staging` need (plan
B18/B19: read-only smoke, Lighthouse) is met by **this repository's own Pages
site**, which is idle until cutover because nothing deploys `main` (D5):
`deploy-staging.yml` (Inceptor's `deploy.yml` with `on: push: branches:
[inceptor]`, `actions/deploy-pages`, `concurrency: pages`) publishes the
`inceptor` branch to `https://artemiopadilla.github.io/JustSplit/` with
`ASTRO_BASE=/JustSplit` — identical to the production fallback URL, so one
OAuth origin, one callback (`/JustSplit/auth/callback/`) and one base cover
both. Owner action (plan B2a): add `inceptor` to the allowed deployment
branches of the `github-pages` environment (the default policy allows only
`main`). The two deploy workflows never run concurrently because nothing
pushes `main` before cutover; B22 removes the staging workflow and the
environment rule. The staging build inherits `site: SITE_ORIGIN`, so its
canonical/sitemap/JSON-LD point at production — acceptable for a smoke
target. Alternatives recorded, not chosen: a second repository
`ArtemioPadilla/JustSplit-staging` published from a `gh-pages` branch (needs
`public/.nojekyll` because Jekyll drops `_astro/`, a deploy key, a second
OAuth origin and `ASTRO_BASE=/JustSplit-staging`; the shape to use if a
permanent post-cutover staging is wanted, with an `ASTRO_SITE` override so
`site` is the staging origin — ADR 0009) and Cloudflare Pages (free per-PR
previews, `_redirects` for the dynamic routes); revisit if the lack of
previews hurts.

### D3. One island per route; Nano Stores for session, preferences and toasts; TanStack Query over domain repos over `StorageAdapter`.
Per Inceptor rule 3 we do **not** wrap the app in one `client:load` island.
Each page is an Astro page (shell, `<BaseLayout>`, header, footer, `FeedbackFAB`)
with exactly one route island under `src/components/islands/`
(`DashboardIsland`, `ExpenseListIsland`, `ExpenseFormIsland`, …). Islands that
need auth-gated data render `client:only="react"` with a static
`slot="fallback"` skeleton; marketing pages (`/landing`, `/about`, `/help`)
are plain Astro with no route island and no `@supabase/supabase-js` /
`@cyber-eco/*` chunk (layout-level JS — theme toggle, `FeedbackFAB`, PWA
islands — is allowed and budgeted). This deliberately departs from
COMPONENTS.md's "last resort" note on `client:only` and follows
`docs/recipes/auth-supabase.md` §5; the trade-off (no SSR HTML) is paid back
by the fallback slot.

**Data access = TanStack Query over domain repos over the `StorageAdapter`
interface.** Inceptor already ships `@tanstack/react-query` with a per-island
`QueryClient` and an `idb-keyval` persister (`QueryProvider`). The layering is
the one `cybereco-hub/docs/specs/tradepilot-pilot-integration.md` Seam 2 (M9)
prescribes for a static app: `island → hook (useQuery/useMutation) → domain
repo (src/lib/data/repos/*) → StorageAdapter (SupabaseStorageAdapter) →
Postgres + RLS`. **No `DataLayerService`** orchestrator: in a SPA its webhooks
are an in-memory queue with no consumer, its L1 cache duplicates TanStack
Query, and its permission checks are not authorization. Because no
`createDataLayer` call exists, there is no `PermissionService` to configure:
the doctrine §1.1 requirement (`permissions: { enabled: false }`) is
satisfied structurally, and a Vitest asserts `createDataLayer(` and
`DataLayerService` never appear in `src/`. Repos import only
`StorageAdapter`, `QueryFilter`, `BatchOperation` from `@cyber-eco/types`; the
concrete adapter is created once in `src/lib/data/adapter.ts` (the D1
contingency swaps it without touching a repo).

- **Reads**: `useQuery({ queryKey: ['expenses', uid], queryFn: () =>
  repos.expenses.listForUser(uid) })` with a `staleTime` per collection,
  hydrated from the idb persister on a warm navigation (queries opt in with
  `meta: { persist: true }` — Inceptor's persister is opt-in; exactly one
  `QueryProvider` per page, the route island, with one shared idb key
  `justsplit:query`, so a warm navigation to any route reuses collections
  fetched on another). Inceptor is an MPA
  (no `ClientRouter`; CSS cross-document view transitions only), so every
  route load is a fresh React root — the persister is what keeps time-to-data
  low, in the role Firestore's persistent local cache used to have.
- **Realtime**: one `adapter.subscribeToQuery(collection, filters, cb)` per
  active query key (FETCH-THEN-LISTEN over Realtime `postgres_changes`,
  `storage-adapter-contract.md` §4); the callback runs
  `queryClient.setQueryData(queryKey, rows)` (or `invalidateQueries` when the
  emitted set is partial). Subscribed in `useEffect` through
  `createDisposer()`, torn down on unmount (Inceptor "island lifecycle
  discipline"); a Vitest asserts exactly one live channel per key across
  `$user` transitions `null → A → B → null`. The subscription's initial
  emission **is** the fetch; `useQuery` does not fetch a live key twice (the
  paired query runs with `enabled: false`). The adapter never evaluates the
  filter predicate on a change payload: on any event it re-runs the query
  (hub adapter semantics) — DELETE events arrive unfiltered by RLS and carry
  only the `id` (D10).
- **Writes**: `useMutation` → repo → `adapter.setDocument` /
  `updateDocument` / `deleteDocument` / `batchWrite` (atomic
  `batch_write(ops jsonb)` under RLS, SECURITY INVOKER), Zod-validated input
  (D10 schemas). Optimistic updates only where the old app had them (mark
  settled).
- **Offline**: Supabase has no native offline cache. The idb persister is the
  mitigation — read-only offline (last data shown, `OfflineBanner`), mutations
  disabled while `$online === false`. Not a Firestore-style write queue.

Cross-island state stays in Nano Stores under `src/stores/` and is limited to
what is **not** server data:

- `auth.ts` — `$user` (`AuthUser | null` — the type is exported by
  `@cyber-eco/types`, not by `@cyber-eco/auth`, whose client entry re-exports
  `BaseUserConstraint`/`HubUser` only), `$authReady`, `$profile` (the hub's
  `profiles` row via `SupabaseProfileStore`, typed as `JustSplitProfile`
  through `createAuthContext<JustSplitProfile>()` in
  `src/lib/auth-context.ts`). Fed by one store bridge: the
  `<AuthProvider config={{ adapter, profileStore }}
  createUserProfile={createJustSplitProfile}
  onUserProfileLoaded={onProfileLoaded}>` from
  `cybereco-hub/packages/auth/src/context/AuthContext.tsx` is React Context,
  so it is mounted **inside each route island tree** (it cannot span islands —
  CLAUDE.md warning 2) and a tiny `AuthBridge` child mirrors `useAuth()`
  (`currentUser` → `$user`, `userProfile` → `$profile`, `!isLoading` →
  `$authReady`) into the stores, which layout islands (`UserMenuIsland`) read
  instead of the context. The bridge never subscribes to
  `onAuthStateChanged` itself — the provider already owns that listener and
  the profile bootstrap; the two callbacks are module-level constants because
  the provider's effect lists them in its dependency array. Actions
  (`packages/supabase/src/auth/SupabaseAuthAdapter.ts`): `signIn`,
  `signUp(email, password, displayName)`, Google sign-in (**redirect** flow;
  supabase-js completes the PKCE exchange from the URL when the page loads
  again). Google is the one action that bypasses `AuthAdapter`:
  `signInWithProvider('google')` calls `signInWithOAuth({ provider })` with no
  `redirectTo`, so the return lands on the project's single Site URL — wrong
  for whichever of staging/production started the flow (one shared project,
  D5) and unusable there because the PKCE verifier lives in the originating
  origin's localStorage. `signInWithGoogle()` therefore calls
  `client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo:
  new URL(withBase('/auth/callback/'), location.origin).href } })` directly
  (both origins are registered as additional redirect URLs); H1 requests a
  `signInWithProvider(provider, { redirectTo? })` overload upstream. `signOut`,
  `resetPassword`, `updatePassword`, `updateDisplayProfile`. Dropped
  explicitly: Facebook/Twitter buttons and `linkProvider`. Persistence is the
  supabase-js client option (`persistSession: true`, localStorage). Plus a
  `toGuardUser()` adapter to Inceptor's `GuardUser` (roles: `['user']` from
  the session; flags never from `profiles`, which is user-writable and never
  a permission source). The `profiles` row is created on first sign-in by
  `AuthProvider` through the `createUserProfile` prop (one writer, client-side
  under own-row RLS) before `isLoading` — hence `$authReady` — flips; no
  second bootstrap exists.
- `preferences.ts` — `$preferredCurrency` derived from
  `$profile.preferences.preferredCurrency` (`profiles.preferences` jsonb is
  the source of truth; `@nanostores/persistent` — an explicit new dependency
  added in plan B1, not part of the scaffold, whose only alternative is the
  `stores/theme.ts` `onMount` + `localStorage` pattern — only mirrors the
  last value for first paint) and `$rateCache` (the 6 h exchange-rate cache
  under the key `justsplit:rates`; the old `justSplitData.exchange_rates`
  key is simply ignored). This is the only cross-island currency state: each
  list island owns a local display-currency selector and conversion pass (§6
  Currency row), and the old `isConvertingCurrencies` flag — hard-coded `true`
  today, with no rendered toggle — is dropped: conversion is always on.
- `notifications.ts` — toast queue: thin wrapper over Inceptor's `toast()`
  (`src/components/ui/toast.tsx`, module-level `toastManager` singleton).
  Decision gated on a test (plan B17b): if a `toast()` call from island A
  reaches a `<Toaster />` mounted in island B on the same page, keep ONE
  layout-level `<ToasterIsland client:idle />` in `BaseLayout`; otherwise
  each route island renders `<Toaster />` once inside its own tree (same-tree
  contract per `ShowcaseToast.tsx`) and `notifications.ts` becomes a Nano
  Store `$toasts` drained by exactly one island per page.
- `online.ts`, `install.ts`, `theme.ts` — from the scaffold.

There are no `$expenses`-style collection stores: server data lives in the
Query cache, keyed per collection and user, so the 866-line `AppContext`
becomes five repos of ~40 lines plus hooks. `@cyber-eco/auth` reads
`process.env.NODE_ENV` (three places) and `process.env.NEXT_PUBLIC_HUB_URL`
unguarded; a static bundle defines both under `vite.define` in
`astro.config.mjs` (`cybereco-hub/examples/static-app/README.md`, "The
`process.env` `define` values"), which also documents the "guard is UX only,
RLS is the authorization" model this spec follows. Its other reads
(`useHubAuth.ts`, `logger.ts`) are guarded with `typeof process !==
'undefined'` and survive in the bundle by design. The package ships one
client entry with `splitting: false`, no `sideEffects` flag, `jose`, and
`zod@^3` while the app uses `zod@^4` — two `zod` copies in the auth chunk.
That chunk (`@cyber-eco/auth` + `@supabase/supabase-js`) is **measured in
plan B4**, not deferred to B19, and ADR 0003 records the fallback if it alone
pushes `/auth/signin/` over the 150 kB script budget.

### D4. UI: shadcn/Base UI + Tailwind v4 replace MUI + CSS modules.
Mapping (owned copies under `src/components/ui/`):

| JustSplit | Inceptor |
|---|---|
| `Button`, `IconButton` | `button` (`variant="ghost" size="icon"`) |
| `CurrencySelector` | `Combobox` (`combobox.tsx`, extend `items` from `string[]` to `{code,symbol,name}` with a `renderItem`) |
| `EditableText` | `Editable` (`editable.tsx`; add `@zag-js/editable` + `@zag-js/react` at Inceptor's pinned versions) |
| `EntityList` | `data-table` (TanStack) |
| `HoverCard` | `hover-card` (Base UI) |
| `Notification` | `toast` |
| `ProgressBar` | `ProgressBar` (`progress-bar.tsx`; Inceptor has no `progress.tsx`) |
| `Timeline` + `HoverCard` | new `EventTimeline` feature widget under `src/components/features/events/` (props: `users`, `onNavigate`, `convert`; no store access, no portal — positioning comes from Inceptor `hover-card`). Inceptor's `ui/timeline.tsx` is a vertical activity feed — a different thing; named to avoid colliding with it |
| `ImageUploader`/`AvatarUploader` | `FileUpload` (`file-upload.tsx`) + `Avatar` (`avatar.tsx`) + **Supabase Storage** bucket `receipts` (D10: object paths stored in `Expense.images[]` / `profiles.avatarUrl`, signed URLs at render; base64 data-URLs are gone with the clean schema). Recorded in ADR 0005 (plan B5b), whose alternative is base64 in `extra` (zero backend surface, row bloat, no size limit but the request cap) |
| hand-rolled dashboard charts | `src/components/ui/charts/` Recharts wrappers (rebuilt, nothing to port from chart.js) |
| MUI `DatePicker` | `DatePicker` (`date-picker.tsx`; add `react-day-picker` — also needed by `calendar.tsx` and `lib/field-type.ts`) |
| `framer-motion` | `motion/react` (`LazyMotion` + `domAnimation`) |

None of these are emitted by `create-inceptor-app`; plan B1 copies them (plus
`hover-card.tsx`, `popover.tsx`, `calendar.tsx`, `tabs.tsx`, `sheet.tsx`,
`checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `skeleton.tsx`) from the
Inceptor checkout with their tests, taking dependency versions from
Inceptor's `package.json`.

### D5. Integration branch + issue-per-feature, cutover in one PR.
`main` deploys nothing new: the live Next app stays on Firebase Hosting,
untouched, until cutover (its deploy workflows were deleted in the docs PR
#2, commit `0ba4348`; the last deployed build keeps serving). Track B work lands on a long-lived
`inceptor` integration branch via issue-driven PRs
(`phase-N/issue-NNN-slug` → `inceptor`). GitHub Pages has no PR previews
(D2): per-PR review is the CI build; every merge into `inceptor` deploys to
the staging Pages site, which is the manual smoke target. When the acceptance
checklist in §6 is green, one PR `inceptor → main` cuts over and `deploy.yml`
publishes the production Pages site. **Rollback**: reverting the merge does
**not** restore the Next site (it needed Firebase's SSR function, which Pages
cannot run), so rollback = re-point DNS / the custom domain back to Firebase
Hosting, and the rollback window is "the Firebase project stays alive 14 days
after cutover" (plan B20, ADR 0009); the old build stays as-deployed for the
whole 14-day window — a "we moved" page, if any, replaces it only when the
window closes. Data needs no rollback because nothing is migrated; the
Supabase project is production from its first migration.
Staging and production share the one Supabase project `justsplit` (there are
no production users before cutover; a second project is created only if a
post-cutover need appears); smoke tests on staging run as a dedicated test
account and never touch other users' rows (RLS makes that structural as long
as smoke runs use only the publishable key; the `service_role` key never
leaves `supabase start`, plan B18).
`ci.yml` must list `inceptor` in both `push.branches` and
`pull_request.branches`; the integration branch gets the same
required-status-check protection as `main` for the life of Track B.

### D6. Scaffold via `create-inceptor-app`, then graft, not in-place edits.
`scripts/init.mjs` refuses an existing target directory, so we generate a
fresh lean project (`--archetype static --name JustSplit --repo
ArtemioPadilla/JustSplit`) into a sibling directory and copy its tree into
this repo on the integration branch, replacing `src/`, `next.config.js`,
`jest.*`, `tsconfig.json`, `package.json`. The Next tree is available from
`main` / git history for reference; nothing is kept under a `legacy/` folder.
`init.mjs` emits only the core subset (18 ui components, 6 lib files,
`ErrorBoundary`/`QueryProvider`/`ThemeToggle`/`FeedbackFAB`, `ci.yml`, and a
GitHub-Pages `deploy.yml` that is **kept** as the production deploy, D2);
everything else in the D4
mapping, and every scaffold piece the plan cites (`route-guard.tsx`,
`disposer.ts`, `use-client-preference.ts`, `HydrationCanary`, charts, PWA,
budgets, eslint), is copied from the Inceptor checkout in plan B1 under an
explicit manifest.

### D7. Tests: Vitest replaces Jest; pure-logic tests port first.
Utils tests port with a mechanical codemod (`jest.` → `vi.`, add
`import { vi, describe, it, expect, beforeEach } from 'vitest'`;
`vi.mock(path, factory)` is hoisted — factories that reference outer
variables must use `vi.hoisted()`), then a `// @vitest-environment jsdom`
pragma on every file that touches `document`/`localStorage`/RTL. Inceptor's
Vitest defaults to the node environment, so pure utils suites run there
unchanged. Component tests are rewritten per island against
`@testing-library/react` under Vitest + jsdom, following Inceptor's
`vitest.setup.ts`. The data layer is faked with an in-memory `StorageAdapter`
double (`src/tests/memory-adapter.ts`) that repos, hooks and islands run
against; `@supabase/supabase-js` is never mocked. Authorization is tested
separately as an RLS suite against a local Supabase (plan B2b), never in unit
tests. Every Jest suite has an owning task (plan Phase 2 table). Target: **no regression in covered behaviour**, not
line-for-line parity.

### D8. Node 22, SHA-pinned actions, five workflows: `ci.yml`, `deploy.yml`, `deploy-staging.yml`, `db-migrate.yml`, `claude.yml`.
> **Deploy workflows superseded (2026-10-03, plan B20a):** `deploy-staging.yml` is deleted and `deploy.yml` is the Cloudflare Pages deploy, called from `ci.yml` after the required jobs pass — [ADR 0016](../../decisions/0016-cloudflare-pages-at-split-cybere-co.md). Four workflows remain.

`ci.yml` is copied from Inceptor keeping only the `build` and `actionlint`
jobs (`server-node`/`server-flask` deleted), with `inceptor` added to its
branch globs; it installs `@cyber-eco/*` from GitHub Packages with
`NODE_AUTH_TOKEN` (D1) and, from plan B2b on, carries a second job `RLS &
contract (supabase start)`. The three Firebase workflows
(`firebase-deploy.yml`, `firebase-hosting-merge.yml`,
`firebase-hosting-pull-request.yml`) were **deleted in the docs PR (#2)**, so
between that merge and plan A3b nothing runs on `main` or on PRs; nothing
deploys `main` until cutover. `deploy.yml` is Inceptor's GitHub Pages
workflow (push to `main`, `actions/deploy-pages`, `ASTRO_BASE` from the
repository **variable** `vars.ASTRO_BASE` — a base path is public config, not
a secret — or unset for the custom domain); `deploy-staging.yml` publishes
`inceptor` to the same Pages site (D2); `db-migrate.yml` is copied from
`cybereco-hub/.github/workflows/db-migrate.yml` (dbmate; secret
`SUPABASE_DB_URL` = session-pooler URI with `?sslmode=require`; forward-only
`dbmate migrate` on push to `main` touching `db/migrations/**`, plus
`workflow_dispatch` with the hub's `command`/`confirm` inputs). GitHub
registers `workflow_dispatch` only for workflow files on the default branch,
so `db-migrate.yml` lands on `main` in **plan A3b** (inert until the secret
exists) and plan B2 applies the `inceptor` migrations with `gh workflow run
db-migrate.yml --ref inceptor -f command=migrate` — the ref is the dispatch
branch, there is no `ref` input. `claude.yml` is the AI triage workflow (plan
A5). All `uses:` refs SHA-pinned.

### D9. Relationship kinds, categories and conceptos (post-cutover Track D).
JustSplit will support different **relationship kinds** — couple, household
(roommates), friends, trip and project — plus an **expense category
taxonomy** and **conceptos**. None of it is part of the migration: it lands
after B22 as Track D (plan), and the only pre-cutover work is the `extra jsonb`
overflow column on every JustSplit table (D10 — an adapter detail: the
SchemaMap stores unmapped top-level fields there and rehydrates them flat),
the `events.kind` column, and read schemas that never strip or reject a
top-level key they do not know, so that an older build never breaks on a row
written by a newer one.

A kind is **configuration on the containers that already exist**, not a new
entity: couple / household / friends / project / other are the JustSplit
`kind` of an `expense_groups` row, stored as a JustSplit-only top-level
`kind` field (an overflow key, D10) while the universal
`ExpenseGroup.type` is set from a fixed map (couple → `family`, household →
`community`, friends → `friends`, project → `organization`, other → `other`;
widening the upstream enum is a later tiny PR gated on C1); a trip is the
JustSplit-local `events` row (the collection was literally called Trip and
already carries `startDate`/`endDate`/`location`/`memberIds`/
`preferredCurrency` and the `?event=` settlement scope), flagged
`events.kind = 'trip'` — never a Group with a date range. A kind only does three things: pre-fill defaults
(currency, split, participants, category ordering, preset conceptos), pick
the hero widget of the detail page, and hide tabs the kind does not need.
Kinds are presentation, never ownership or RLS.

**Model.** Every change is an additive, optional top-level field that the
SchemaMap stores in the `extra` jsonb overflow of an existing table (D10), or
a write into a column that already exists since plan B2. The app never reads
or writes a field named `extra`. No table, column, index, policy or trigger is
added, no field is renamed or re-typed, no field becomes required. The gating columns
the policies read (`member_ids`, `admin_ids`, `created_by`, `paid_by`,
`from_user_id`/`to_user_id`, `users`) are untouched.

| Table | New optional top-level fields (stored by the SchemaMap in the `extra` overflow column unless a real column is noted) | Read default when absent / unknown |
|---|---|---|
| `expense_groups` | `kind: string` (`couple` \| `household` \| `friends` \| `project` \| `other`); `settings: { defaultSplitType?: 'equal' \| 'exact' \| 'percentage', defaultShares?: Record<uid, number>, defaultCurrency?: string, budget?: { amount, currency, period: 'monthly' \| 'total' } }` (beyond the universal `settings { defaultSplitType, simplifyDebts, maxMembers }`); `concepts: Concept[]` (inline, ≤ 50, ~150 B each) | `kind` → `'friends'` via `parseKind()` (today's behaviour); `settings` → the kind's defaults from `src/domain/kinds.ts`; `concepts` → `[]` |
| `events` | `kind` (real column since B2, `text not null default 'event'`, values `trip` \| `event`); `settings: { budget?: { amount, currency } }` (period is always the whole event) | `kind` → `'event'` via `parseEventKind()`; no budget UI |
| `expenses` | `group_id` (universal column since B2; B10 writes it from a group context, Track D writes it from every kind's defaults); `conceptId: string`; `category` (universal column; stays a free string) | ungrouped when `group_id is null`; a dangling `conceptId` is ignored; `''`/unknown `category` → the *uncategorized* bucket (distinct from `other`), raw value shown verbatim |
| `settlements` | `group_id` (universal column since B2; written by D7 from the `?group=` scope) | `null` outside a group scope |
| `profiles`, `friendships` | unchanged | — |

`Concept = { id: string (client-generated), name: string, category: string
(taxonomy key), defaultAmount?: number, currency?: string, split?: { type:
SplitType, shares?: Record<uid, number> }, recurrence?: { freq: 'weekly' |
'monthly' | 'yearly', dayOfMonth?: 1..28, interval?: number }, archived?:
boolean }`.

Invariants that make this migration-free and rollback-safe:

- Stored strings are **never Zod enums**: `kind` and `category` parse as
  `z.string()`, and `parseKind()` / `normalizeCategory()` in `src/domain/`
  fall back instead of throwing, so an older deployed build (staging and
  production share one Supabase project) reading a newer row never breaks.
  The one enum is the universal `splitType`, a Postgres `check` constraint
  since B2. Schemas carry no `.default()` for these fields: derived defaults
  are selectors, so stored and derived shapes never mix.
- Every read schema is `.passthrough()` and `repos.*.update` writes partial
  `adapter.updateDocument` patches (never a full-row `setDocument` built from
  a parsed read). An `update` whose patch contains overflow keys **merges**
  them into the column (`extra = extra || <overflow keys of the patch>`),
  never replaces the column; a patch key with a real column updates that
  column. The contingency adapter and the relational `batch_write` both
  implement this rule for `update`, and a contract test in plan B5a pins it
  for the upstream adapter and the contingency adapter alike (plan H1 asks
  `schema-map-strategy.md` to state the rule explicitly) — so no client
  strips a key it does not know, and settle-up writing `settledAt` never
  wipes an expense's `eventId`.
- Group scoping is a real, indexed, RLS-filtered query
  (`where('groupId','==',id)` on `expenses.group_id`), not a client-side
  union: there is no `expenseIds` array on the group (the universal
  `ExpenseGroup` has none) and nothing to dual-write. The universal
  `totalExpenses` is a display cache written by the expense mutation in the
  same `batchWrite`; balances never read it.
- No backfill of any kind: the schema is clean and every group expense
  carries `group_id` from plan B10 on. Groups created before Track D have no
  `kind`, render as `friends`, and show a dismissible "¿Qué tipo de
  grupo es?" nudge that writes `kind` (one member update).
- Only Track D code writes these fields. Rolling Track D back (`git revert`)
  leaves inert keys in `extra` that the pre-D app ignores.

**Kinds and per-kind defaults** (`src/domain/kinds.ts`, one code table;
labels are `{ en, es }`):

| Kind | Container | Members | Default participants / split / currency | Category order (shown first) | Hero widget on the detail page |
|---|---|---|---|---|---|
| `couple` (Pareja) | Group | exactly 2, enforced by the form only (me + one accepted friend) | both / `equal`, optional remembered ratio in `settings.defaultShares` / creator's preferred | rent, groceries, utilities, internet, food, health, subscriptions, gifts | `BalanceCard`: one sentence "Ana le debe a Luis $1,240" + one **Liquidar** button (a single transfer; no minimal-transactions table). Degrades to `TotalByCategory` when `memberIds.length !== 2`. Events tab hidden until a trip exists |
| `household` (Casa / roomies) | Group | N | all / `equal`, `percentage` allowed / creator's preferred | rent, utilities, internet, groceries, services, shopping, food | `TotalByCategory` in the MVP; `DueBillsList` (conceptos due this period) above the balances once plan D11 lands |
| `friends` (Amigos) — **read default for every legacy group** | Group | N | all, editable subset / `equal` / none | food, entertainment, transportation, shopping, gifts, activities | Today's group page + `TotalByCategory` + balances; Events tab always visible with a "Nuevo viaje" button |
| `trip` (Viaje) | **Event** (`events.kind = 'trip'`), optional `group_id` | `event.memberIds` | members / `equal` / `preferredCurrency` prompted (settlement currency) | accommodation, transportation, food, activities, shopping, fees | `TripSummary`: total in the trip currency, per person, category donut, "Liquidar viaje" → `/settlements?event=<id>`; "Trip ended — settle up" callout after `endDate`; computed (never stored) "Liquidado" badge |
| `project` (Proyecto) | Group | N | pick / `percentage` with `settings.defaultShares` asked at creation (`equal` fallback) / creator's preferred | services, shopping, subscriptions, fees, transportation, food | `TotalByCategory` in the MVP; `BudgetBar` "Gastado $940 de $1,500" once plan D10 lands. Events tab hidden until a trip exists |
| `other` (Otro) | Group | N | as friends; full taxonomy in canonical order | — | as friends; also what `parseKind()` returns for an unknown string |

The create flow (`/groups/new`) opens with a kind picker (Pareja, Casa,
Amigos, Viaje, Proyecto, Otro); **Viaje routes to `/events/new?kind=trip`**
(with `&group=<id>` when started from a group page). Any member can change a
group's kind later; it is a hint, not a lock.

**Categories.** One global, fixed, code-owned taxonomy in
`src/domain/categories.ts`; documents store only the key in the existing
`expenses.category` string. Keys are immutable once shipped (renaming a key
is a data migration; labels are free to change) and a Vitest snapshot of the
key list is add-only. The five keys the Next app writes today (`food`,
`transportation`, `accommodation`, `entertainment`, `other`) are kept
byte-for-byte, so B10 writes exactly those five from a
`src/domain/categories.ts` stub and no alias map is ever needed.

| Key | es / en | lucide icon |
|---|---|---|
| `food` (legacy) | Comida y bebida / Food & drink | `Utensils` |
| `groceries` | Súper / Groceries | `ShoppingCart` |
| `rent` | Renta / Rent | `House` |
| `utilities` | Servicios (luz, agua, gas) / Utilities | `Zap` |
| `internet` | Internet y teléfono / Internet & phone | `Wifi` |
| `transportation` (legacy) | Transporte / Transport | `Car` |
| `accommodation` (legacy) | Alojamiento / Accommodation | `BedDouble` |
| `activities` | Actividades y tours / Activities | `Tent` |
| `entertainment` (legacy) | Ocio / Entertainment | `Ticket` |
| `shopping` | Compras / Shopping | `ShoppingBag` |
| `health` | Salud y farmacia / Health | `HeartPulse` |
| `services` | Servicios profesionales / Services | `Wrench` |
| `subscriptions` | Suscripciones / Subscriptions | `Tv` |
| `gifts` | Regalos / Gifts | `Gift` |
| `fees` | Comisiones e impuestos / Fees & taxes | `Receipt` |
| `other` (legacy) | Otros / Other | `Tag` |

Per-kind behaviour is only **ordering**: `categoriesForKind(kind)` puts the
kind's subset first and the rest under "Más categorías", so every category
is reachable from every kind. `normalizeCategory(raw)` maps a known key to
itself and `''`/`undefined`/unknown to the *uncategorized* bucket for
aggregation only (the raw value is never rewritten). Icons are resolved
through a static import map in a component (`CategoryIcon.tsx`); `src/domain`
never imports `lucide-react`, so the chunk stays tree-shaken. Colours are the
dataviz categorical palette indexed by taxonomy order, shared by
`ExpenseDistribution`, list badges and chips in light and dark. Labels are
the app's first and only i18n surface: `useLocale()` on
`useClientPreference` (`navigator.language` → `es`/`en`, server default
`en`) selects the label; no i18n framework, no `users.locale` field. CSV
export writes the key **and** the label in two columns. **Not** per-group
custom categories: the per-group nuance ("Renta", "Luz", "Hosting") is
expressed by conceptos carrying a taxonomy key, which keeps every chart, CSV
and filter comparable across groups; revisit only if users ask.

**Conceptos.** "Concepto" is read in the Spanish accounting sense — the
named line item (rubro) between the category and free text: *Renta* under
`rent`, *Súper* under `groceries`, *Hotel* under `accommodation`. It ships in
two steps on one object:

1. **Vocabulary (zero schema cost, plan D4):** in Spanish the existing
   `expense.description` field is labelled **Concepto**, `category`
   **Categoría** and `notes` **Notas**; the form order is Categoría →
   Concepto → Importe. No subcategory level and no free tags are added.
2. **Reusable templates (plan D9):** a concepto is a group-owned template in
   `expense_groups.concepts[]` (an overflow key; see `Concept` above) plus
   `expenses.conceptId`.
   Picking one in the expense form fills description, category, default
   amount, currency and an optional split override; typing a new name offers
   "Guardar como concepto". Per-kind presets (couple: Renta, Súper, Luz,
   Internet; household: those plus Agua, Gas, Limpieza; project: Hosting,
   Dominio) are offered as pre-checked rows at group creation and become
   ordinary editable rows in the group's Settings tab. Writes are partial
   `updateDocument` patches of `concepts` (members already have update
   rights under the D10 policies; no RLS change). **Last-writer-wins is
   accepted**: the `StorageAdapter` has no conditional write and the
   relational `batch_write` `update` is unconditional, so a
   re-read-and-retry on `updatedAt` narrows but cannot close the lost-update
   window between two members appending at once — the acceptance is
   single-writer (conceptos are edited by one admin in practice) and ADR 0010
   records the `group_concepts` table (one row per concepto, append-safe) as
   the alternative if concurrent edits prove to matter. Aggregations use
   `conceptId`, never string matching; a deleted concepto leaves its expenses
   intact. Trips have no conceptos (trip spend is not repetitive).

The product-feature reading of "conceptos" (budgets, recurring expenses,
period close) is scoped to two items that ride on the same object:

- **Budget:** one optional `settings.budget` per Group (`monthly` or
  `total`) and per Event (whole event), rendered as an informational
  `BudgetBar` — no per-category budgets, no alerts, no shaming states
  (`.claude/checklists/ethics.md`, copied by plan A2). Multi-currency progress uses the B16 rate cache with an
  "as of" caption and shows "sin conversión" when a rate is unavailable.
- **Recurring:** a concepto with a `recurrence` is surfaced as a
  client-computed "Cuentas por agregar" checklist (`src/domain/recurrence.ts`:
  `nextDueDate`, `dueConcepts(group, expenses, today)`) derived from the
  expenses Query cache: due when the next date ≤ today and no expense with that
  `conceptId` exists in the period. One tap pre-fills the expense form;
  **nothing is ever auto-created** — the app is a static site with no server
  code beyond the B2 authorization triggers and functions (D10: no Edge
  Functions, nothing that creates or mutates business rows), page-mount
  writes would break the read-only staging discipline (D5), and generated
  instances would be phantom financial records.
- **Period close is not built:** "Cerrar mes" / "Liquidar viaje" is the
  existing settle-up island (B14) pre-filtered by date range or
  `?group=`/`?event=`, writing ordinary `Settlement` rows; a period is closed
  when its expenses carry `settledAt` *(superseded by ADR 0014: a period is settled
  up when its scope's balances net to zero — derived, not flagged)*. No `closedAt`, no lock, no
  reopen flow — a lock the policies cannot enforce would be a UI fiction. A
  period "closed" by `settledAt` is a member-asserted state, not a verified
  one (D10 Splits).

**RLS impact: none, and tested.** Every Track D field lives in the `extra`
overflow or in a column that exists since plan B2; the policies and guard
triggers read only `member_ids` / `admin_ids` / `created_by` / `paid_by` /
`from_user_id` / `to_user_id` / `users` / `requested_by` / `status` (D10).
Track D reuses the B11b/B12 queries (`groupId == id`, `eventId == id`), both
on indexed, RLS-filtered columns (`group_id`, `event_id` since B2d, ADR 0013); it adds no
new query shape — Postgres has no composite-index constraint on combining
them with `array-contains`. Guards,
all tests rather than schema changes (plan B2b/B3/B5a): (1) ADR 0002 records
that no policy inspects `extra` and no `check` constraint enumerates its keys
— if a later migration adds one, Track D opens with a conditional plan D0
migration issue through the same RLS-tested `risk:high` path; (2) the B2b RLS
suite has one case per table asserting that a row carrying the fields above
is readable and writable by a member and denied to a non-member; (3) the B5a
contract test asserts `updateDocument` merges a patch's overflow keys into
`extra` instead of replacing the column. Two accepted
consequences, recorded in ADR 0010: visibility is per **`member_ids`**, not
per split participant — for a group expense the writer sets the row's
`member_ids` to the group's members at write time, so every member sees every
group expense, and a member added later does not see older rows until an
admin re-shares them (a `batchWrite` over the group's expenses; Track D
nice-to-have, surfaced by a "solo ves los gastos compartidos contigo" hint);
and a couple's "exactly 2 members" is form-enforced only (the widget degrades
instead of a `cardinality(member_ids) = 2` constraint that would block
re-kinding).

**Share-aware balances come for free.** The universal `Expense` carries
`splitType` + `splits[]` with a materialised `amount` per participant (D10),
and `expenseCalculator` consumes `splits[]` only from plan B3 on — the old
`amount / participants.length` bug (`src/utils/expenseCalculator.ts:36` and
`:136`) does not survive the re-typing. Track D issue D2 (plan) is therefore
the share-aware **test** issue (rounding, shares that do not sum, a
participant missing from `splits`, multi-currency), still sequenced right
after D1 and before D3 — the first issue that writes a default split.

**Explicitly not built** (pasted into the `v0.7` milestone description so it
is not re-derived): a trip as a Group kind (two overlapping time-boxed
containers) or an Event folded into Group; per-group custom categories; a
subcategory level or free tags; per-category budgets, alerts or push nudges;
auto-generated recurring expenses (client- or server-side); a period-close
entity, `closedAt` or locking; a `users.locale` field or an i18n framework;
a `categories`/`concepts` table (revisited only through the D9 fallback);
itemised receipts, multiple payers, OCR/AI suggestions; server-side code
beyond the B2 authorization triggers and functions (D10): no Edge Functions,
no scheduled jobs, no trigger that creates or mutates business rows. Track D
is not part of the cutover gate (§6) nor of the migration's definition of
done.

### D10. Data model and RLS (relational mode).
Every collection is a **table in relational mode** through a `SchemaMap`
(`cybereco-hub/docs/design/schema-map-strategy.md`: `{ [collection]: { table,
idColumn?, columnMap?, jsonbColumn?, metadata? } }`); **nothing lives in
`public.documents`** (document mode's RLS is owner-only, D1). The `SchemaMap`
(`src/lib/data/schema-map.ts`) doubles as the auditable inventory
collection → table → policy that doctrine §1.1 requires: every table the
adapter touches has RLS, and a test asserts the map, the migrations and the
policy list agree.

| Collection | Table | Row type | Notes |
|---|---|---|---|
| `expense_groups` | `public.expense_groups` | universal `ExpenseGroup` (`@cyber-eco/types`, `packages/types/src/expense.ts`) | `type` = the universal enum; `members[]` entries are the universal `ExpenseGroupMember` (`userId`, `displayName`, `role: AppRole`, `joinedAt`, `invitedBy?`) and `adminIds` is derived from `role` with `hasMinimumRole`; the JustSplit-only `kind`, extended `settings` and `concepts[]` are top-level fields with no column (overflow keys, stored in `extra`, D9) |
| `expenses` | `public.expenses` | universal `Expense` | `split_type` + `splits jsonb`; **`group_id` nullable** in JustSplit (event and friend-to-friend expenses exist; the universal type says `groupId: string`, so JustSplit's row type is `Omit<Expense, 'groupId'> & { groupId: string \| null; memberIds: string[] }` — making `groupId` optional and `memberIds` required upstream is a tiny PR gated on C1, like the `type` widening); `conceptId`, `settledAt` are JustSplit-only top-level fields with no column (overflow keys, stored in `extra`); **`eventId` is the `event_id` column with a foreign key since B2d ([ADR 0013](../../decisions/0013-membership-lifecycle.md))** |
| `settlements` | `public.settlements` | universal `Settlement` | `group_id` nullable as above; `expenseIds` is an overflow key and `eventId` is the `event_id` column since B2d ([ADR 0013](../../decisions/0013-membership-lifecycle.md)); `createdAt`/`updatedAt` come from `metadata.strategy: 'server'` and are omitted from the write literal |
| `events` | `public.events` | JustSplit-local (`src/schemas/event.ts`; the hub's legacy `JustSplit.Event` namespace in `packages/types/src/justsplit/types.ts` is a reference, not a dependency) | `group_id?`, `member_ids`, `date`, `start_date`, `end_date`, `location`, `preferred_currency`, `kind` (`trip` \| `event`); `settings` (budget) is an overflow key |
| `friendships` | `public.friendships` | universal `Friendship` (`packages/types/src/friendship.ts`) | `users text[]` (exactly 2), `status`, `requested_by` |
| `profiles` | `public.profiles` | the hub's `profiles` (`packages/supabase/db/migrations/20260715000001_profiles.sql`, copied verbatim) | **not a `SchemaMap` collection**: its columns are quoted camelCase `text` (`"avatarUrl"`, `"createdAt"`, …) written flat by `SupabaseProfileStore`, it has no `extra` column and the default camelCase → snake_case rule would address non-existent columns. Own-row RLS (never widened); `preferences` jsonb holds `preferredCurrency` and `phoneNumber`; reached only through `SupabaseProfileStore` (own row), `find_profile_by_email` and `find_profiles_by_ids` (below). `profiles.email` is display-only, never a lookup key |

**Column conventions.** `id text primary key` (adapter `generateId`);
camelCase field → snake_case column through `columnMap`; JustSplit-only
top-level fields with no mapped column go to the `jsonbColumn` overflow
`extra jsonb not null default '{}'` and are rehydrated flat on read — the app
never reads or writes a field named `extra`; the column is an adapter detail
(`schema-map-strategy.md` §3.2). A filter or sort on such a field resolves to
`extra->>'<field>'`; an `update` merges the patch's overflow keys into the
column (D9 invariant 2). Timestamps
`created_at` / `updated_at timestamptz not null default now()` with
`metadata.strategy: 'server'`, rehydrated as ISO strings
(`storage-adapter-contract.md` §2); money `numeric(14,2)`; `currency char(3)`;
`split_type text check (split_type in ('equal','percentage','exact'))`;
`member_ids text[] not null` with a GIN index on every table that has it;
`group_id` and `extra->>'eventId'` indexed. Server-side code is limited to:
the `updated_at` trigger, the `guard_<table>` BEFORE UPDATE triggers
(authorization rules RLS cannot express because policies cannot compare old
and new rows), `batch_write`, `find_profile_by_email` and
`find_profiles_by_ids`. Nothing else, and nothing that creates or mutates
business rows.

**Membership authorization = denormalised `member_ids text[]`** (mirrors the
universal `memberIds`, present on `ExpenseGroup`, `Expense`, `Settlement` and
the JustSplit `events`). All policies are `to authenticated` and compare
against `(select auth.uid())::text` (written `uid` below); anon matches no
policy on any table. A policy sees only the new row, so the update rules that
need `old` (who may change `member_ids`/`admin_ids`, immutability of
`created_by`/`users`/`requested_by`, recipient-only `status`) are enforced by
one `guard_<table>()` BEFORE UPDATE trigger per table, shipped in the same
plan-B2 migration. "Membership mirror" below is the clause that ties every
other id in a row to a relationship the actor really has:

| Table | select | insert (`with check`) | update (`using` + `with check`) | delete |
|---|---|---|---|---|
| `expense_groups` | `uid = any(member_ids)` | `created_by = uid` ∧ uid ∈ `member_ids` ∧ uid ∈ `admin_ids` ∧ every `m ∈ member_ids, m <> uid` is an accepted friend of uid | `using` and `with check`: `uid = any(member_ids)`; `guard_expense_groups` rejects a change to `member_ids`/`admin_ids` when `uid <> all(old.admin_ids)`, requires every id newly added to `member_ids` to be an accepted friend of the acting admin, and rejects any change to `created_by` | `uid = any(admin_ids)` |
| `expenses` | `uid = any(member_ids)` | `created_by = uid` ∧ uid ∈ `member_ids` ∧ `paid_by` ∈ `member_ids` ∧ every `splits[].userId` ∈ `member_ids` (`jsonb_array_elements`) ∧ membership mirror | `using`: `uid = any(member_ids)`; `with check`: uid ∈ `member_ids` ∧ `paid_by` ∈ `member_ids` ∧ every `splits[].userId` ∈ `member_ids` ∧ membership mirror (the insert clauses minus `created_by = uid`); `guard_expenses` rejects any change to `created_by` | `created_by = uid` ∨ `paid_by = uid` |
| `settlements` | `uid = any(member_ids)` | `created_by = uid` ∧ uid ∈ {`from_user_id`, `to_user_id`} ∧ `member_ids = {from, to}` ∧ membership mirror | none (immutable; correct by delete + insert) | `created_by = uid` |
| `events` | `uid = any(member_ids)` | `created_by = uid` ∧ uid ∈ `member_ids` ∧ membership mirror | `using` and `with check`: `uid = any(member_ids)`; `guard_events` rejects any change to `created_by` | `created_by = uid` |
| `friendships` | `uid = any(users)` | `requested_by = uid` ∧ uid ∈ `users` ∧ `cardinality(users) = 2` ∧ `status = 'pending'` | `using` and `with check`: `uid = any(users)`; `guard_friendships` rejects any change to `users` or `requested_by`, and a `status` change when `uid = old.requested_by` (recipient-only — the requester/recipient rules the old Firestore draft had) | `uid = any(users)` (either party) |
| `profiles` | own row | own row | own row | own row |

**Membership mirror** (`expenses`, `events`, `settlements`; insert and
update `with check`): when `group_id is not null`, `exists (select 1 from
expense_groups g where g.id = group_id and uid = any(g.member_ids) and
member_ids <@ g.member_ids)`; otherwise every `m ∈ member_ids, m <> uid`
satisfies `exists (select 1 from friendships f where f.status = 'accepted'
and f.users @> array[uid, m])`. Without it any signed-up user could push
"you owe me" expenses, events, groups or unilateral settlements into any
other user's lists (a uid leaks through any shared row), which the
participant pickers only prevent client-side; the doctrine requires RLS to
express the same intention as the app (§1.1). `friendships` also gets
`create unique index friendships_pair_uniq on friendships ((least(users[1],
users[2])), (greatest(users[1], users[2])))`, so request spam on a pair is a
unique violation. If the owner ever rejects the mirror, ADR 0002 must record
"authenticated ≠ trusted: any signed-in user can push rows into any other
user's lists" as an accepted risk and a block/hide-user issue is filed before
cutover.

**Guard triggers.** One `guard_<table>()` function per table (`security
invoker`, `set search_path = public, pg_temp`), `before update for each
row`: on every table `if new.created_by is distinct from old.created_by then
raise insufficient_privilege`; on `expense_groups` additionally the
admin-only and accepted-friend rules above; on `friendships` the
immutability and recipient-only rules above. Column-level `revoke update
(col)` is **not** used: it is a no-op while table-level UPDATE is granted,
and every upsert path (`setDocument`, `SupabaseProfileStore`, `batch_write`
`set`) would fail on existing rows.

Leaving a group is an admin action in v1 (an admin edits `member_ids`).
Alternative recorded, not chosen: a junction table `group_members(group_id,
user_id)` plus a `security definer is_member(group_id)` function referenced
from every policy. Arrays win because the adapter maps `member_ids` 1:1 to the
universal `memberIds` (no join the `StorageAdapter` cannot express), the
`select` policies need no function call or join (cheaper, provable per row)
— the insert/update `with check` clauses carry one indexed subquery on
`expense_groups` or `friendships` so that membership mirrors the app's
participant rules (doctrine §1.1) — `member_ids @> array[uid]` is
GIN-indexable, and it is the same shape the old Firestore rules gated on.
Cost: denormalisation (D9's "member added later" consequence).

**Realtime.** Every table is added to the `supabase_realtime` publication in
the same migration that creates it. RLS filters INSERT/UPDATE events; DELETE
events are delivered to every subscriber of the table with only the `id`
(Supabase does not apply RLS to deletes and we never set `replica identity
full`). The adapter never evaluates the filter predicate on a change payload:
on any event it re-runs the query (as the hub adapter does,
`SupabaseStorageAdapter.subscribeToQuery`) or, at most, drops
`payload.old.id` from the cached set on DELETE. Ids are `generateId` UUIDs,
so a leaked id of a row you cannot select is unusable. The adapter translates
`== != < <= > >= in array-contains` (the last as array/jsonb containment);
`array-contains-any` is **not** supported and JustSplit needs none of it —
every list is `array-contains` on `member_ids` (or `users`) or `==` on
`group_id` / `eventId` (`extra->>'eventId'`). One channel per active query key (D3).

**Migrations.** dbmate files under `db/migrations/` (the hub's
`packages/supabase/db/migrations/` convention) — **never** under the Supabase
CLI's `supabase/migrations/`, which the CLI would execute whole on `start`/`db
reset` (the `-- migrate:down` section included, dropping every table it just
created) while tracking them in its own table. Applied by `db-migrate.yml`
(D8) with secret `SUPABASE_DB_URL` (session pooler, IPv4, `?sslmode=require`);
locally with the Supabase CLI (`supabase start` with `[db.migrations] enabled
= false` and `[db.seed] enabled = false` in `supabase/config.toml`, then
`dbmate --no-dump-schema migrate` — not `up`, per the hub README — against
`postgresql://postgres:postgres@127.0.0.1:54322/postgres`). Bootstrap order:
`schema_migrations` hardening (dbmate creates `public.schema_migrations`
before applying anything; Supabase grants ALL on `public` to `anon` and
`authenticated`, so the first file runs `alter table public.schema_migrations
enable row level security; revoke all on table public.schema_migrations from
anon, authenticated` — the `postgres` owner bypasses RLS, so dbmate keeps
working; alternative: `DBMATE_MIGRATIONS_TABLE=dbmate.schema_migrations` in a
non-exposed schema, in both `db-migrate.yml` and the local script) →
`profiles` (hub file verbatim) → JustSplit tables (+ the `friendships` pair
index) → RLS + guard triggers → Realtime publication → `receipts` bucket +
storage policies → relational `batch_write(ops jsonb) returns integer`
(`security invoker` so RLS applies per operation, `set search_path = public,
pg_temp`, `revoke execute … from public, anon; grant execute … to
authenticated, service_role` kept from the hub template; op shape is the
upstream `{ type, collection, id, data, merge }` with `data` **pre-translated
by the adapter** to row shape — snake_case column keys plus an `extra` object
holding the overflow keys — so the SQL stays generic: a fixed `case
op_collection when 'expense_groups' then … when 'expenses' … when 'settlements'
… when 'events' … when 'friendships' … else raise exception end` over exactly
the five SchemaMap tables (no dynamic SQL on caller-supplied names; an
unmapped collection such as `schema_migrations` raises and applies nothing);
`set` → `insert … select * from jsonb_populate_record(null::<table>, op_data
|| jsonb_build_object('id', op_id)) on conflict (id) do update set <every
column> = excluded.<column>, extra = case when op_merge then <table>.extra ||
excluded.extra else excluded.extra end`; `update` → dynamic SQL built with
`format()` from `jsonb_each(op_data - 'extra')` (`%I = (%L::jsonb #>>
'{}')::<coltype>` per present key, column types from
`information_schema.columns`) plus `extra = extra || coalesce(op_data->'extra',
'{}')`, `where id = op_id`, `if not found then raise`; `delete` → `delete from
<table> where id = op_id`; the plan-B5a tests pin the `case` arms to
`Object.keys(schemaMap)` — provided by relational mode upstream, which must
accept this pre-translated op shape, or by the contingency adapter's
migration, D1) → `find_profile_by_email(p_email text)` (`security definer`,
`stable`, `set search_path = public, pg_temp`; matches `lower(u.email) =
lower(p_email)` on **`auth.users u`** with `u.email_confirmed_at is not
null`, never on the user-writable `profiles.email` — a user can set their own
`profiles.email` to a victim's address and hijack every friend request meant
for them; returns `p.id, p.name, p."avatarUrl"` from `profiles p join
auth.users u on u.id = p.id`; returns nothing for a `p_email` that does not
match `^[^@\s]+@[^@\s]+$`; `revoke execute on function
public.find_profile_by_email(text) from public, anon; grant execute … to
authenticated` — the alternative hardening `set search_path = ''` with
fully-qualified names is equivalent and acceptable) →
`find_profiles_by_ids(ids text[])` (`security definer`, `stable`, same
`search_path` and grant/revoke pair; returns `id, name, "avatarUrl"` only for
ids that share at least one row with `uid = (select auth.uid())::text` in
`friendships.users`, `expense_groups.member_ids`, `events.member_ids`,
`expenses.member_ids` or `settlements.member_ids`, always including uid
itself; `cardinality(ids) <= 200`). `profiles` RLS stays own-row — widening
it is banned because the row also holds `email`, `preferences`,
`permissions` and `isAdmin` — so friend search goes through
`find_profile_by_email`, and every other user's display name/avatar (friends
list, event members, expense participants, settlement parties, CSV) resolves
through `find_profiles_by_ids`; group member names are additionally
denormalised into `expense_groups.members[].displayName`, which the universal
type already carries, filled from the same function at add time.

**Images.** Supabase Storage, private bucket `receipts`, paths
`expenses/{expenseId}/{uuid}.jpg` and `avatars/{uid}/{uuid}.jpg`
(`storage.foldername(name)` returns the folder segments without the file
name, so a flat `avatars/{uid}.jpg` has no second segment and a policy on
`[2]` would deny every upload). Policies on `storage.objects`, all `to
authenticated` with `uid = (select auth.uid())::text`: avatars
insert/update/delete — `bucket_id = 'receipts' and
(storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] =
uid`; avatars select — `bucket_id = 'receipts' and
(storage.foldername(name))[1] = 'avatars'`; expenses, every command —
`bucket_id = 'receipts' and (storage.foldername(name))[1] = 'expenses' and
exists (select 1 from public.expenses e where e.id =
(storage.foldername(name))[2] and uid = any(e.member_ids))`; bucket-level
size (5 MiB) and `image/*` content-type limits. Receipt upload order: insert
the expense row (RLS; the insert policy is satisfied by the row alone —
`images: []` is valid) → upload objects → `updateDocument({ images })` (a
partial patch, RLS update = member); `repos.expenses.remove` deletes the
objects under `expenses/{id}/` **before** the row, because no policy can reach
them afterwards. `Expense.images[]` and `profiles."avatarUrl"` store the
object path; islands resolve signed URLs (1 h). This replaces the Firebase
Storage decision of the previous plan; base64-in-document is gone with the
clean schema.

**Splits.** Universal `splitType: 'equal' | 'percentage' | 'exact'` +
`splits: { userId, amount, percentage? }[]`. The writer always materialises
`splits[].amount` (equal → `amount / n` with the remainder cents on the
payer's share; percentage → rounded to cents), so `expenseCalculator` consumes
`splits[]` only — this fixes the old `amount / participants.length` bug by
construction (D9). Old JustSplit concepts map as: `participants` =
`splits.map(s => s.userId)`; `paidBy` unchanged (must be ∈ `member_ids`, not
necessarily ∈ `splits`); `settled` → `settledAt: string | null` (an overflow
key), written by settle-up in the same `batchWrite` as the `Settlement`
insert **(superseded by [ADR 0014](../../decisions/0014-settlements-ledger.md), plan B14a: settle-up
writes no `settledAt`, it is legacy and read-only; balances are a ledger of splits minus
settlements)** (the universal `Expense` has no settled flag; deriving it from
settlements would cost a join on every list, and a stored `settledAt` is one
indexed jsonb key that mirrors today's UI). Trust statement: every overflow
key is writable by any member of the row and is never protected by RLS;
`settledAt` and `settlements` rows are attestations by `created_by`, not
verified payments — the UI says "marcado como pagado por <name>" (names via
`find_profiles_by_ids`), never "paid". `expenseIds` on a settlement →
`expenseIds` (overflow); `eventId` → `event_id` (a column since B2d, ADR 0013)
on expenses and settlements, `group_id` on `events`.

## 4. Target architecture

```
src/
  pages/                      Astro shells (no route island unless placed; layout JS budgeted)
    index.astro               → DashboardIsland (client:only, fallback slot; redirects to /landing when logged out)
    landing.astro about.astro help.astro          (static)
    auth/signin.astro auth/signup.astro auth/reset-password.astro → LoginForm / SignUpForm / ResetPasswordIsland
    expenses/index.astro list.astro new.astro     (index = meta-refresh + JS redirect to /expenses/list)
    events/…  groups/…  friends/…  settlements.astro  profile.astro
    404.astro                 app shell → AppRouterIsland → {ExpenseDetail,ExpenseForm,EventDetail,EventForm,GroupDetail,FriendDetail}Island by location.pathname (D2)
    showcase.astro            reusable widgets (CLAUDE.md quality bar)
    llms.txt.ts  llms-full.txt.ts  (from Inceptor, re-branded)
  components/
    islands/                  one island per route + AppRouterIsland + AuthGate + AuthBridge + ErrorBoundary + QueryProvider + HydrationCanary
    ui/                       shadcn (owned)  · ui/charts/ Recharts wrappers
    common/                   Header.astro FeedbackFAB.astro ThemeToggle.astro SiteFooter.astro
    features/                 domain widgets shared by islands (ExpenseSplitter, BalanceOverview, events/EventTimeline…)
                              Track D: groups/{KindPicker,BalanceCard,TotalByCategory,ConceptCombobox,BudgetBar,DueBillsList} events/TripSummary expenses/{CategorySelect,CategoryIcon}
  stores/                     auth.ts preferences.ts notifications.ts theme.ts install.ts online.ts   (no collection stores: server data lives in the Query cache)
  lib/                        data/{client,adapter,schema-map,storage,relational-adapter*}.ts data/repos/{groups,expenses,settlements,events,friendships,profiles}.ts data/hooks/*.ts
                              auth-context.ts (createAuthContext<JustSplitProfile>) route-guard.tsx disposer.ts utils.ts href.ts (withBase, safeNext) site-meta.ts …   (*relational-adapter.ts only under the D1 contingency)
  schemas/                    zod: universal types re-exported from @cyber-eco/types + wrappers: group.ts expense.ts settlement.ts (JustSplit-only top-level fields = overflow keys) event.ts friendship.ts profile.ts; reads .passthrough(); D9 keys optional + opaque until Track D
  domain/                     expenseCalculator.ts (consumes splits[]) currency.ts formatters.ts csvExport.ts fileUtils.ts timeline/*
                              categories.ts (five-key stub in B3; full taxonomy in Track D) · Track D: kinds.ts groupSelectors.ts recurrence.ts
  tests/                      memory-adapter.ts (StorageAdapter double) rls/ (B2b suite, runs against `supabase start`) scaffold-manifest.test.ts …
  styles/global.css
db/migrations/                dbmate (never supabase/migrations/): schema_migrations hardening · profiles (hub verbatim) · justsplit tables · rls + guard_<table> triggers · realtime · storage bucket + policies · batch_write · find_profile_by_email · find_profiles_by_ids
supabase/config.toml          local CLI only ([db.migrations] and [db.seed] disabled; dbmate owns the schema) · supabase/seed.sql applied with psql after db:migrate
.npmrc                        @cyber-eco:registry=https://npm.pkg.github.com only (the token lives in ~/.npmrc locally and in NODE_AUTH_TOKEN in CI)
.github/workflows/            ci.yml (Build & Check + RLS & contract jobs) deploy.yml (GitHub Pages, from Inceptor) deploy-staging.yml db-migrate.yml (from cybereco-hub; on main since A3b) claude.yml
```

## 5. Risks

| Risk | Mitigation |
|---|---|
| `@cyber-eco/*` are on GitHub Packages owned by the `cyber-eco` org: CI and every contributor need a personal `read:packages` token (this repo's `GITHUB_TOKEN` can never read another owner's packages) | `.npmrc` committed with only `@cyber-eco:registry=https://npm.pkg.github.com`; repo secret `GH_PACKAGES_TOKEN` (classic PAT, `read:packages`, from a `cyber-eco` member) mapped to `NODE_AUTH_TOKEN` through `actions/setup-node` in `ci.yml`/`deploy*.yml`; the token is pre-checked in plan A4 with `npm view @cyber-eco/types@0.2.1 --registry=https://npm.pkg.github.com` before B1 starts; the local token lives in `~/.npmrc`, documented in `SETUP.md`, and `doctor.sh` warns when it is missing. Fallback if access cannot be granted: vendor the three packages' `dist/` under `vendor/` with a pin (recorded in ADR 0011) |
| Relational mode is not implemented in `@cyber-eco/supabase` (document mode only; gated on the hub's C1) | Repos code against the `StorageAdapter` interface only (D1); the contingency `src/lib/data/relational-adapter.ts` implements the `SchemaMap` design locally and is upstreamed as H2; a contract test suite (`storage-adapter-contract.md` §5) runs against both the memory double and the real adapter so the swap is mechanical. Never document mode for shared data |
| RLS mistakes are silent (a missing policy = open table, a wrong policy = empty lists; a table nobody mapped — dbmate's `public.schema_migrations` today — is exposed by Supabase's default grants) | Every table gets RLS in the same migration; the B2b suite runs every command × {member, non-member, anonymous} per table against `supabase start` in CI; the coverage guard asserts every table in `pg_tables where schemaname = 'public'` has `relrowsecurity`, every `SchemaMap` table has ≥ 1 policy per command, `schema_migrations` has zero grants to `anon`/`authenticated`, no `public` function is executable by `anon`, and `public.documents` does not exist; no `DataLayerService` exists, so nobody mistakes the data layer for a defence |
| Realtime limits: no `array-contains-any`, one channel per query, tables must be in the publication, RLS-filtered INSERT/UPDATE payloads; DELETE payloads are PK-only and unfiltered | JustSplit's queries use only `array-contains` on `member_ids`/`users` and `==` on `group_id`/`eventId`; the publication is part of every table's migration and asserted by a test; the adapter re-runs the query on any event instead of evaluating a payload; channels are per active query key and torn down with `createDisposer()` (D3 listener-leak test) |
| Redirect-only OAuth (`signInWithOAuth`) in a PWA/standalone window, and the `?code=` return URL under a subpath base; one Supabase Site URL for staging + production | The return URL is `withBase('/auth/callback/')` on the **originating origin**, passed per call as `options.redirectTo` (the adapter's `signInWithProvider` omits it and would land on the single Site URL, D3) and registered as an additional redirect URL in the Supabase project and in Google Cloud; `?next=` goes through `safeNext()` and travels in `sessionStorage`, not through the provider round-trip; supabase-js completes the PKCE exchange on load; standalone display-mode is tested manually on the staging site; email + password never needs the redirect |
| Auth flash: `client:only` islands render nothing until JS runs and the session resolves | Each route island is mounted as `<XIsland client:only="react"><div slot="fallback"><RouteSkeleton /></div></XIsland>` (Astro renders the fallback slot statically); inside the island, `$authReady === false` renders the same `Skeleton`. `useClientPreference` is only needed in the SSR'd islands (`UserMenuIsland`, `ToasterIsland`) |
| Existing deep links (`/expenses/abc123`) break | The `404.astro` shell (D2) mounts the matching route island; a Vitest asserts every dynamic route family is routed by `AppRouterIsland`, that `dist/404.html` exists and contains the shell, and that the redirect pages for `/expenses`, `/events`, `/groups` exist; the PWA `navigateFallback` serves the same shell offline (plan B19) — with `ignoreURLParametersMatching: [/.*/]`, because Workbox otherwise misses the precache for any URL with a query string and would serve the shell for `/auth/callback/?code=…`, `/settlements/?event=…` and table URL state (asserted by the B19 test) |
| Subpath deploy (`ASTRO_BASE`) breaks hard-coded links or the staging site (always a subpath) | `withBase()` on every internal `href`/asset (D2); a Vitest greps `src/` for `href="/` outside `withBase(`; the staging site was a permanent subpath deployment, so a regression showed before cutover; **since B20a (ADR 0016) production and previews are root-hosted** and the subpath is covered by unit tests and `OFFLINE_SMOKE_BASE=/JustSplit npm run check:offline` |
| Offline behaviour regresses (Firestore had a persistent cache + write queue; Supabase has neither) | TanStack Query idb persister for reads (D3); mutations disabled while offline with an explicit `OfflineBanner`; accepted and stated in ADR 0004 (no offline writes in v1) |
| `@cyber-eco/auth` breaks in a static bundle (`process.env` reads); its single client entry + `jose` + a second `zod` push `/auth/signin/` over budget | `vite.define` for `process.env.NODE_ENV` and `process.env.NEXT_PUBLIC_HUB_URL` in `astro.config.mjs` (`examples/static-app/README.md`); a build test greps `dist/_astro/*.js` for the two unguarded reads only (`process\.env\.(NEXT_PUBLIC_HUB_URL\|NODE_ENV)`) and asserts zero hits — the guarded `typeof process !== 'undefined' && process.env…` reads in `useHubAuth.ts`/`logger.ts` are expected — plus a jsdom smoke test that mounts `<AuthProvider>` with `globalThis.process` deleted; the auth chunk is measured in plan B4 and ADR 0003 records the fallback (drive the Supabase adapters from `src/stores/auth.ts` without `<AuthProvider>`) |
| Identity federation with the Hub arrives later and wants JustSplit's `auth.users` to be the Hub's | Out of scope (D1); JustSplit's `profiles` is the hub's schema verbatim, and every row keys on `auth.uid()`, so a later ADR-009 mapping has one column to remap. No JustSplit code assumes a Hub account |
| Feature parity silently drops something (e.g. CSV export, exchange ticker) | Feature-parity checklist (§6) is the cutover gate; each row maps to an issue |
| Full-page navigations re-fetch collections | Query cache persisted to IndexedDB (D3); plan B18 measures time-to-data on a warm navigation ≤ 300 ms on the staging site |
| Track D fields (`kind`, `settings`, `concepts`, `conceptId`) are read by builds that predate them (staging and production share one Supabase project) | B3 declares them as opaque optional `z.string()` / `z.record` / `z.array(z.unknown())` top-level fields (never enums, no `.default()`), every read schema is `.passthrough()`, `repos.*.update` is a partial `updateDocument` whose overflow keys merge into `extra`, and a write-input overflow key-set test pins the migration's unmapped keys (D9) |
| Firebase is retired before the new site is proven | The Firebase project stays alive for 14 days after cutover (D5, plan B20); rollback = re-point the domain; `main` is never redeployed to Firebase |

## 6. Feature-parity checklist (cutover gate)

- [ ] Sign in / sign up (email+password, Google via redirect with a per-call `redirectTo`), sign out, password reset (new page — today's link is dead), `profiles` row created on first sign-in (one writer: `AuthProvider`'s `createUserProfile`), profile edit (name, phone in `preferences.phoneNumber`, preferred currency) incl. avatar upload (Supabase Storage)
- [ ] Dashboard (as wired today): welcome screen, header with CSV export + currency selector + refresh rates, exchange ticker, financial summary (totalSpent/unsettledCount only), recent expenses, recent settlements
- [ ] Dashboard (new — components exist but are not rendered or fed real data): monthly trends, expense distribution, balance overview, upcoming events — scope decided in plan B8a/B8b
- [ ] Expenses: list (event filter, sort, display-currency selector with converted amounts and "(Originally: …)" caption, settled badge, CSV export of the filtered rows), create (equal/exact/percentage split as universal `splitType` + `splits[]`, images uploaded after the row is inserted; category is new on create — today only edit has it; `?group=`/`?event=`/`?friend=` pre-selection), detail (inline-editable description and notes, converted amount, split type + participants with names, event link, receipt gallery through signed URLs, CSV export of the one expense), edit, delete (new — no page calls `deleteExpense` today)
- [ ] Events: list (sort by date/name/total, date filter, per-event timeline, per-event total in the display currency), create, detail (inline-editable name, timeline, Settlement Progress bar, total/unsettled stats, per-member balances in the display currency, expense list with settled badges, "View Settlements", "Add expense", CSV export), edit; delete event: not built (no page calls `deleteEvent` today)
- [ ] Groups: list, create (creator `role: 'owner'`, members from accepted friends), detail (members with names from `find_profiles_by_ids`, events, expenses via `group_id`, display-currency selector), attach an existing event or expense to the group (only expenses whose participants ⊆ the group's members), admin member management, delete group (admin; rows survive ungrouped)
- [ ] Friends: list with Friend Requests / Friends / Sent Requests (Cancel) sections, request by exact email (kept — today's `/friends` form, now through `find_profile_by_email` on `auth.users`), accept/reject/remove (`friendships` table, universal `Friendship`), detail with names from `find_profiles_by_ids`, "Add shared expense" → `/expenses/new?friend=`, unregistered email → mailto/copy-link invitation (new); **dropped**: the browsable name/email directory search (own-row `profiles`), the local-only add-by-name form, the legacy `User.friends*` arrays
- [ ] Settlements: who-owes-whom, minimal-transaction algorithm, mark as paid **persisted (new — today it is local-only and lost on the next snapshot)** as a `Settlement` row + `settledAt` on the expenses in one `batchWrite` *(superseded by ADR 0014 / plan B14a: a single `Settlement` insert, no expense is marked)* (shown as "marcado como pagado por <name>", an attestation), display-currency selector + exchange-rates table, multi-currency conversion, `?event=` deep link, history with both parties' names
- [ ] Currency: preferred currency (`profiles.preferences` is the source of truth), live exchange ticker with fallback table, rate cache; a display-currency selector with live conversion of every listed amount on the expenses list, expense detail, events list/detail (default: the event's `preferredCurrency`), settlements and group detail; conversion is always on (the `isConvertingCurrencies` toggle is dropped)
- [ ] CSV export from the dashboard, the filtered expense list, the expense detail and the event detail page (one `ExportCsvButton`, names via `find_profiles_by_ids`)
- [ ] Notifications/toasts (topology per plan B17b ADR)
- [ ] Offline: last data readable from the Query persister, mutations disabled with `OfflineBanner`; "Restablecer datos locales" clears the persister (plan B17b) — *implemented by plan B19c, [ADR 0015](../../decisions/0015-writes-require-a-connection.md): every write control is `aria-disabled` with one shared sentence, the data layer refuses the write, nothing is queued*
- [ ] Existing URLs resolve via the `404.astro` shell; `/expenses`, `/events`, `/groups` redirect to `/…/list`; dead links fixed; every link goes through `withBase()`
- [ ] Every table in `public` has RLS (coverage guard), every `SchemaMap` table has a policy per command + guard trigger + Realtime publication, `public.documents` does not exist; the B2b RLS suite is green in CI against `supabase start` and `npm run db:audit` shows no diff against the `justsplit` project
- [ ] `npm run check`, `npm run test`, Lighthouse budgets (split by route family) green; axe smoke clean
- [ ] Staging site (the `inceptor` Cloudflare Pages preview `https://inceptor.justsplit.pages.dev`, ADR 0016, superseding the GitHub Pages URL) manually smoke-tested (dedicated test account, publishable key only) on desktop + mobile viewport; Google sign-in verified to return to `/JustSplit/auth/callback/` on staging and to the production domain's callback after cutover

## 7. Out of scope

**Canonical source is `ArtemioPadilla/JustSplit` `main`** (decided 2026-09-27).
The open PR #1 `feat/nx-refactor` (CyberEco Nx monorepo: `apps/hub`,
`apps/justsplit`, `apps/website`) and the `cyber-eco/*` repositories are not
inputs to this migration; the 97-file drift in its `apps/justsplit/src` is not
ported. PR #1 should be closed or re-scoped so it does not compete with the
`inceptor` integration branch.

Migrating any Firestore data, document or base64 image (nothing is ported;
the Firebase retirement steps are outside the app's scope but listed in plan
B20); shared identity with the CyberEco Hub (ADR-009, Story 3.1 in the hub);
the `DataLayerService` orchestrator, webhooks, permissions service; offline
writes (writes are disabled while offline and never queued, [ADR 0015](../../decisions/0015-writes-require-a-connection.md), plan B19c); payment integrations; E2E encryption (README claim, never built);
Tauri desktop/mobile packaging (available later via Inceptor's
`add-tauri*.mjs`); redesign beyond what the shadcn mapping implies; Astro
View Transitions / `ClientRouter`. For Track D (D9): per-group custom
categories, a subcategory level or tags, per-category budgets or alerts,
auto-generated recurring expenses, a period-close entity or lock, a
`profiles.locale` field / i18n framework, new tables, columns or policies for
kinds, and server-side code beyond the B2 authorization triggers and
functions (D10).
