# JustSplit → Inceptor migration — Design spec

**Status:** draft (2026-09-18) · **Owner:** @ArtemioPadilla · **Plan:** `docs/superpowers/plans/2026-09-18-inceptor-migration.md`

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
| **B. Stack migration** | Re-platform the app on the Inceptor scaffold (Astro + islands + Tailwind + shadcn), keep Firebase as the backend | a series of issue-driven PRs on an integration branch, then one cutover PR |

After B lands, the only thing we maintain is Inceptor; JustSplit becomes a
downstream consumer of it (Track C upstreams the reusable pieces back).

## 2. Current-state inventory (what must be preserved)

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
the deployed ruleset is unknown until captured (plan B2b). Timestamps
(`createdAt`, `updatedAt`, `settlements.date`) are stored as Firestore
`Timestamp`s although the TS types say `string`/`Date`. Images and avatars
are **base64 data-URLs stored inside Firestore documents**
(`expenses.images[]`, `users.avatarUrl`); Firebase Storage is not used.

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

**Domain logic (pure, keep verbatim)** — `utils/expenseCalculator.ts`,
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
coverage; 5 suites fail today. 30 of 32 files use `jest.mock`/`jest.fn`/`jest.spyOn`.

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

### D1. Keep Firebase (Auth + Firestore + Hosting). Supabase is out of scope.
Inceptor's auth recipe is Supabase, but JustSplit has a live Firebase
project with real user data, deployed security rules (the repo copy is stale,
see plan B2b), and a hosting setup.
Swapping the backend *and* the frontend in one migration doubles the risk
for no product gain. Firebase is a client-side SDK, so it fits Inceptor's
static/islands model as well as Supabase does. A later, separate epic may
evaluate Supabase; this spec neither blocks nor assumes it.

**Consequence:** Track C adds `docs/recipes/auth-firebase.md` to Inceptor so
Firebase is a first-class recipe there, mirroring the Supabase one
(guarded client, `PUBLIC_FIREBASE_*` env, `RouteGuard` adapter, emulator
wiring). Storage rules are part of the Firebase recipe.

### D2. Astro `output: 'static'`; Firebase Hosting serves the built `dist/`.
No SSR adapter. The app is 100% authenticated client-side data, so there is
nothing to render on the server. Dropping `frameworksBackend` removes a Cloud
Function, cold starts, and the `webframeworks` experiment flag. Removing
`frameworksBackend` does not delete the already-deployed SSR function or any
App Hosting backend; plan B20 cleans both up.

**Dynamic routes** (`/expenses/[id]`, `/events/[id]`, `/groups/[id]`,
`/friends/[id]`, `/expenses/edit/[id]`, `/events/edit/[id]`) cannot be
prerendered because ids are user data. Each becomes a single static shell
page (e.g. `src/pages/expenses/[id].astro` is **not** used; instead
`src/pages/expenses/view.astro` renders `<ExpenseDetailIsland client:only="react" />`,
which reads the id from `location.pathname`), and `firebase.json` gets
rewrites `/expenses/** → /expenses/view/index.html` (etc.) so existing URLs
keep working. Hosting applies the first matching rewrite, so `edit/**` rules
precede their family's `**` rule; `trailingSlash: false` keeps the Next-era
URLs (`/expenses/list`) from 301-ing; the `/__/**` namespace is reserved by
Hosting (`/__/auth/handler`). `/expenses`, `/events`, `/groups` become
Hosting `redirects` to `/…/list` (applied before rewrites). Links are built
with Inceptor's `withBase()` (from `src/lib/href.ts`); no subpath is used on
Firebase Hosting, so `ASTRO_BASE` stays unset and `withBase` is an identity,
but every internal `href` still goes through it for parity with the
scaffold's layout/header.

### D3. One island per route, Nano Stores for shared state, no React Context.
Per Inceptor rule 3 we do **not** wrap the app in one `client:load` island.
Each page is an Astro page (shell, `<BaseLayout>`, header, footer, `FeedbackFAB`)
with exactly one route island under `src/components/islands/`
(`DashboardIsland`, `ExpenseListIsland`, `ExpenseFormIsland`, …). Islands that
need auth-gated data render `client:only="react"` with a static
`slot="fallback"` skeleton; marketing pages (`/landing`, `/about`, `/help`)
are plain Astro with no route island and no Firebase chunk (layout-level JS —
theme toggle, `FeedbackFAB`, PWA islands — is allowed and budgeted). This
deliberately departs from COMPONENTS.md's "last resort" note on `client:only`
and follows `docs/recipes/auth-supabase.md` §5; the trade-off (no SSR HTML) is
paid back by the fallback slot.

**Navigation model:** Inceptor is an MPA (no `ClientRouter`; CSS
cross-document view transitions only). Each route load re-initialises
Firebase and re-subscribes. To keep this cheap: `client.ts` initialises
Firestore with `initializeFirestore(app, { localCache: persistentLocalCache({
tabManager: persistentMultipleTabManager() }) })` (modern replacement for the
deprecated `enableIndexedDbPersistence` in `src/firebase/config.ts`), so
first snapshots resolve from IndexedDB; Auth keeps `browserLocalPersistence`
so `$user` resolves without a round-trip. Offline: the Firestore persistent
cache is enabled in `client.ts`; stores read from it transparently. View
Transitions/`transition:persist` are explicitly out of scope (CLAUDE.md
lifecycle warning).

Cross-island state moves from Context to Nano Stores under `src/stores/`:

- `auth.ts` — `$user` (Firebase `User | null`), `$authReady`, `$profile`. On
  auth change it **ensures `users/{uid}` exists** (getDoc → setDoc with
  provider name/email/photo, `preferredCurrency: 'USD'`, as `AuthContext`
  does today) before setting `$authReady`. Actions: `signIn`, `signUp`
  (creates the profile), `signInWithGoogle` (popup, redirect fallback in
  standalone), `signOut`, `resetPassword`, `updateProfile` (Firestore merge +
  Auth `displayName`/`photoURL`). Dropped explicitly: Facebook/Twitter buttons
  and `linkAccount` (confirm in the Firebase console that the providers are
  disabled before removing). Persistence: `browserLocalPersistence`, falling
  back to session when the corruption flag is set (see plan B17b). Plus a
  `toGuardUser()` adapter to Inceptor's `GuardUser` (roles: `['user']` from
  the Auth session; flags only from custom claims — the Firestore profile is
  user-writable and never a permission source). Started once via `onMount`.
- `firestore.ts` — one `map`/`atom` store per collection
  (`$users`, `$events`, `$expenses`, `$settlements`, `$groups`,
  `$friendships`). Each store's `onMount` listens to `$user` and (re)binds
  `onSnapshot` on every user change, unsubscribing and clearing on sign-out
  and on last-listener unmount — this replaces the 866-line `AppContext`
  reducer with ~150 lines and makes the listeners' lifecycle automatic
  (Inceptor "island lifecycle discipline"). Queries are the ones the rules
  permit, not the ones `AppContext` used; the `$events`/`$settlements`/
  `$friendships` queries are defined by the plan B2b ADR, not by copying
  `AppContext`.
- `preferences.ts` — `$preferredCurrency` derived from
  `$profile.preferredCurrency` (Firestore is the source of truth;
  `@nanostores/persistent` — an explicit new dependency added in plan B1, not
  part of the scaffold, whose only alternative is the `stores/theme.ts`
  `onMount` + `localStorage` pattern — only mirrors the last value for first
  paint) and `$rateCache` (the 6 h exchange-rate cache, persisted under a new
  key `justsplit:rates`, with a one-time migration from
  `justSplitData.exchange_rates`).
- `notifications.ts` — toast queue: thin wrapper over Inceptor's `toast()`
  (`src/components/ui/toast.tsx`, module-level `toastManager` singleton).
  Decision gated on a test (plan B17b): if a `toast()` call from island A
  reaches a `<Toaster />` mounted in island B on the same page, keep ONE
  layout-level `<ToasterIsland client:idle />` in `BaseLayout`; otherwise
  each route island renders `<Toaster />` once inside its own tree (same-tree
  contract per `ShowcaseToast.tsx`) and `notifications.ts` becomes a Nano
  Store `$toasts` drained by exactly one island per page.

Writes (`addDoc`/`updateDoc`/`deleteDoc`) live in `src/lib/firebase/repo.ts`
as plain async functions validated by Zod schemas in `src/schemas/`, keeping
the exact write types the Next app uses (`serverTimestamp()` where a
`Timestamp` is stored today).

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
| `ImageUploader`/`AvatarUploader` | `FileUpload` (`file-upload.tsx`) + `Avatar` (`avatar.tsx`) + Firebase Storage (**new** — today images are base64 data-URLs inside Firestore docs; needs bucket + Blaze plan check + `storage.rules` + `firebase.json` `storage` block; islands render both `data:` and `https:` values; legacy docs are not migrated). The decision is recorded in an ADR in plan B5b, whose alternative is keeping base64 data-URLs (zero backend change, parity, 1 MiB doc cap) |
| hand-rolled dashboard charts | `src/components/ui/charts/` Recharts wrappers (rebuilt, nothing to port from chart.js) |
| MUI `DatePicker` | `DatePicker` (`date-picker.tsx`; add `react-day-picker` — also needed by `calendar.tsx` and `lib/field-type.ts`) |
| `framer-motion` | `motion/react` (`LazyMotion` + `domAnimation`) |

None of these are emitted by `create-inceptor-app`; plan B1 copies them (plus
`hover-card.tsx`, `popover.tsx`, `calendar.tsx`, `tabs.tsx`, `sheet.tsx`,
`checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `skeleton.tsx`) from the
Inceptor checkout with their tests, taking dependency versions from
Inceptor's `package.json`.

### D5. Integration branch + issue-per-feature, cutover in one PR.
`main` keeps deploying the Next app until cutover. Track B work lands on a
long-lived `inceptor` integration branch via issue-driven PRs
(`phase-N/issue-NNN-slug` → `inceptor`). Firebase Hosting PR previews already
run on `pull_request`, so every PR gets a preview URL. When the acceptance
checklist in §6 is green, one PR `inceptor → main` cuts over. Rollback is
`git revert` of that merge plus a redeploy; Firestore document shapes are
untouched by the frontend migration (writes keep today's types), so data
needs no rollback. Preview channels share production Auth/Firestore — there
is no staging project. Smoke tests on previews must not write. Merges into
`inceptor` deploy to a long-lived `staging` preview channel; PR channels are
for per-PR review only. `ci.yml` must list `inceptor` in both `push.branches`
and `pull_request.branches`; the integration branch gets the same
required-status-check protection as `main` for the life of Track B.

### D6. Scaffold via `create-inceptor-app`, then graft, not in-place edits.
`scripts/init.mjs` refuses an existing target directory, so we generate a
fresh lean project (`--archetype static --name JustSplit --repo
ArtemioPadilla/JustSplit`) into a sibling directory and copy its tree into
this repo on the integration branch, replacing `src/`, `next.config.js`,
`jest.*`, `tsconfig.json`, `package.json`. The Next tree is available from
`main` / git history for reference; nothing is kept under a `legacy/` folder.
`init.mjs` emits only the core subset (18 ui components, 6 lib files,
`ErrorBoundary`/`QueryProvider`/`ThemeToggle`/`FeedbackFAB`, `ci.yml`, a
GitHub-Pages `deploy.yml` that must not be copied); everything else in the D4
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
`vitest.setup.ts`. Firestore is mocked via a tiny in-memory `repo` double,
not `firebase/firestore` mocks. Every Jest suite has an owning task (plan
Phase 2 table). Target: **no regression in covered behaviour**, not
line-for-line parity.

### D8. Node 22, SHA-pinned actions, one deploy workflow.
`ci.yml` is copied from Inceptor keeping only the `build` and `actionlint`
jobs (`server-node`/`server-flask` deleted), with `inceptor` added to its
branch globs. `firebase-deploy.yml` and `firebase-hosting-merge.yml` collapse
into one `deploy.yml` on push to `main` (one service-account secret, build
env passed, rules deployed explicitly); `firebase-hosting-pull-request.yml`
stays for previews and gets the build env; `deploy-staging.yml` deploys
`inceptor` to the `staging` channel. All `uses:` refs SHA-pinned.

## 4. Target architecture

```
src/
  pages/                      Astro shells (no route island unless placed; layout JS budgeted)
    index.astro               → DashboardIsland (client:only, fallback slot; redirects to /landing when logged out)
    landing.astro about.astro help.astro          (static)
    auth/signin.astro auth/signup.astro auth/reset-password.astro → LoginForm / SignUpForm / ResetPasswordIsland
    expenses/list.astro new.astro view.astro edit.astro   (/expenses → /expenses/list is a Hosting redirect)
    events/…  groups/…  friends/…  settlements.astro  profile.astro
    showcase.astro            reusable widgets (CLAUDE.md quality bar)
    llms.txt.ts  llms-full.txt.ts  (from Inceptor, re-branded)
  components/
    islands/                  one island per route + AuthGate + ErrorBoundary + QueryProvider + HydrationCanary
    ui/                       shadcn (owned)  · ui/charts/ Recharts wrappers
    common/                   Header.astro FeedbackFAB.astro ThemeToggle.astro SiteFooter.astro
    features/                 domain widgets shared by islands (ExpenseSplitter, BalanceOverview, events/EventTimeline…)
  stores/                     auth.ts firestore.ts preferences.ts notifications.ts theme.ts install.ts online.ts
  lib/                        firebase/{client,repo,storage,recovery}.ts route-guard.tsx disposer.ts utils.ts href.ts site-meta.ts …
  schemas/                    zod: user.ts expense.ts event.ts group.ts settlement.ts friendship.ts (from live fixtures)
  domain/                     expenseCalculator.ts currency.ts formatters.ts csvExport.ts fileUtils.ts timeline/*
  styles/global.css
firebase.json                 hosting.public = dist, trailingSlash false, ordered rewrites + redirects, storage block; rules reconciled in B2b
firestore.rules               deployed ruleset captured in B2b (repo root)
storage.rules                 new (B5b)
```

## 5. Risks

| Risk | Mitigation |
|---|---|
| `firebase` SDK is heavy (~250 kB gz for auth+firestore) and lands in every authenticated island | Import from `firebase/app`, `firebase/auth`, `firebase/firestore` (modular); one shared `client.ts` chunk; marketing pages import nothing. Lighthouse budget split by route family (plan B19); marketing routes keep the scaffold's 150 kB script budget |
| Auth flash: `client:only` islands render nothing until JS runs and auth resolves | Each route island is mounted as `<XIsland client:only="react"><div slot="fallback"><RouteSkeleton /></div></XIsland>` (Astro renders the fallback slot statically); inside the island, `$authReady === false` renders the same `Skeleton`. `useClientPreference` is only needed in the SSR'd islands (`UserMenuIsland`, `ToasterIsland`) |
| Existing deep links (`/expenses/abc123`) break | `firebase.json` rewrites (D2) + Vitest test asserting each dynamic route family has a rewrite, `edit/**` precedes `**`, destinations exist in `dist/`, `trailingSlash === false`; the PWA service worker must not capture rewritten routes (plan B19 `navigateFallbackDenylist`) |
| Google sign-in popup blocked in PWA/standalone mode | Use `signInWithRedirect` fallback when `display-mode: standalone`, **and** set `authDomain` to the domain the app is served from (`justsplit-eef51.web.app` or the custom domain; Hosting serves `/__/auth/*` for every domain of the project) — the `firebaseapp.com` default breaks redirect sign-in under third-party-storage blocking. Both domains stay in Auth → Authorized domains and `https://<domain>/__/auth/handler` is registered as an OAuth redirect URI in Google Cloud. Handle `getRedirectResult` on `/auth/signin` mount |
| `firestore.rules` rely on `participants` arrays that the new Zod schemas must keep identical | Plan B2b reconciles rules ↔ data first; schemas are derived from live fixtures |
| `friendships` has no rule and `groups` rule is syntactically wrong (`request.data`) → Friends/Groups parity is impossible without a rules PR | Dedicated rules issue in Phase 1 (plan B2b), emulator-tested, deployed by `deploy.yml` |
| Feature parity silently drops something (e.g. CSV export, exchange ticker) | Feature-parity checklist (§6) is the cutover gate; each row maps to an issue |
| Two deploy workflows racing on `main` | Collapse to one (D8) in Track A, before any Track B work |
| Stores must unsubscribe on last-listener unmount (StrictMode/tests) | Nano Stores `onMount` + `createDisposer()`; Vitest asserts `onMount` teardown calls each `onSnapshot` unsubscribe and that `$user` transitions leave exactly one live listener |
| Full-page navigations re-fetch collections | Firestore persistent local cache (D3); plan B18 measures time-to-data on a warm navigation ≤ 300 ms on the staging channel |

## 6. Feature-parity checklist (cutover gate)

- [ ] Sign in / sign up (email+password, Google), sign out, password reset (new page — today's link is dead), profile auto-creation on first sign-in, profile edit incl. avatar upload
- [ ] Dashboard (as wired today): welcome screen, header with CSV export + currency selector + refresh rates, exchange ticker, financial summary (totalSpent/unsettledCount only), recent expenses, recent settlements
- [ ] Dashboard (new — components exist but are not rendered or fed real data): monthly trends, expense distribution, balance overview, upcoming events — scope decided in plan B8a/B8b
- [ ] Expenses: list (filter/sort), create (equal/custom/percentage split, images; category is new on create — today only edit has it), detail, edit, delete (new — no page calls `deleteExpense` today)
- [ ] Events: list, create, detail (timeline + expenses), edit
- [ ] Groups: list, create, detail (members, events, expenses)
- [ ] Friends: list, request/accept/reject/remove (Firestore `friendships`), detail, **add = invite by email (new; replaces local-only add-by-name)**
- [ ] Settlements: who-owes-whom, minimal-transaction algorithm, mark as paid **persisted to Firestore (new — today it is local-only and lost on the next snapshot)**, multi-currency conversion, `?event=` deep link
- [ ] Currency: preferred currency (Firestore profile is the source of truth), live exchange ticker with fallback table, rate cache
- [ ] CSV export
- [ ] Notifications/toasts (topology per plan B17b ADR)
- [ ] IndexedDB persistence reset / database-recovery UX ported (required by the persistent cache in D3; ADR records why it stays)
- [ ] Existing URLs resolve via rewrites; `/expenses`, `/events`, `/groups` redirect to `/…/list`; dead links fixed
- [ ] `npm run check`, `npm run test`, Lighthouse budgets (split by route family) green; axe smoke clean
- [ ] Firebase `staging` channel manually smoke-tested (read-only) on desktop + mobile viewport; Google sign-in verified on the channel domain

## 7. Out of scope

Supabase; payment integrations; E2E encryption (README claim, never built);
Tauri desktop/mobile packaging (available later via Inceptor's
`add-tauri*.mjs`); redesign beyond what the shadcn mapping implies;
migrating legacy base64 images to Storage; Astro View Transitions /
`ClientRouter`.
