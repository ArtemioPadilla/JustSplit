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
| **A. Workflow adoption** | `CLAUDE.md`, `.claude/agents` + checklists + commands, `ci.yml`, `claude.yml` triage, issue/PR templates, labels + milestones, repo hygiene | one PR to `main`, no app code changes |
| **B. Stack migration** | Re-platform the app on the Inceptor scaffold (Astro + islands + Tailwind + shadcn), keep Firebase as the backend | a series of issue-driven PRs on an integration branch, then one cutover PR |

After B lands, the only thing we maintain is Inceptor; JustSplit becomes a
downstream consumer of it (Track C upstreams the reusable pieces back).

## 2. Current-state inventory (what must be preserved)

**Routes (26 `page.tsx`)** — `/` (dashboard), `/landing`, `/about`, `/help`,
`/auth/signin`, `/auth/signup`, `/profile`, `/expenses` (+ `/list`, `/new`,
`/[id]`, `/edit/[id]`), `/events` (+ `/list`, `/new`, `/[id]`,
`/edit/[id]`), `/groups` (+ `/list`, `/new`, `/[id]`), `/friends`
(+ `/add`, `/[id]`), `/settlements`, `/test-notification` (dev only, drop).

**Data model (`src/types/index.ts`)** — `User`, `Friendship`, `Group`,
`Expense` (with `splitMethod`, `participantShares`, `images`), `Event`,
`Settlement`, `TimelineEvent`/`TimelineExpense`. Six Firestore collections:
`users`, `friendships`, `groups`, `events`, `expenses`, `settlements`, with
security rules in `src/firebase/firestore.rules` and indexes in
`firestore.indexes.json`.

**State** — `AppContext.tsx` (866 lines): a `useReducer` store hydrated by
five `onSnapshot` listeners (users/events/expenses/settlements/groups) that
are (re)bound whenever the auth user changes; `AuthContext.tsx`: Firebase
Auth with email/password + Google popup (Facebook/Twitter stubs);
`NotificationContext.tsx`: toast queue. All three are React Context —
**exactly the pattern Inceptor forbids across islands** (CLAUDE.md warning 2).

**Domain logic (pure, keep verbatim)** — `utils/expenseCalculator.ts`,
`utils/currencyExchange.ts` (live rates + fallback table),
`utils/formatters.ts`, `utils/csvExport.ts`, `utils/timelineUtils/*`,
`utils/fileUtils.ts`. These have the best test coverage and are
framework-free.

**UI** — 40 CSS-module files, MUI only in 2 files
(`ExpenseSplitter/index.tsx`, `app/expenses/edit/[id]/page.tsx`),
`framer-motion` in 2 files (`about`, `help`) **and** `motion` installed but
unused, `chart.js` + `react-chartjs-2` for the three dashboard charts,
`react-intersection-observer`. Dashboard: 12 components. Custom ui kit:
`Button`, `IconButton`, `CurrencySelector`, `EditableText`, `EntityList`,
`HoverCard`, `Notification`, `PageRedirect`, `ProgressBar`, `Timeline`,
`DatabaseRecovery`/`DatabaseErrorRecovery`, `ImageUploader`,
`AvatarUploader`, `CurrencyExchangeTicker`, `Header`.

**Tests** — 30 Jest + Testing Library files (dashboard, timeline, utils,
contexts). Jest config uses jsdom + CSS-module mocks.

**Hosting/CI** — Firebase Hosting with `frameworksBackend` (Next SSR via
`webframeworks` experiment) on project `justsplit-eef51`; three workflows,
two of which deploy on every push to `main` (duplicate), Node 18,
`actions/checkout@v2`, unpinned actions. No test/lint/type-check job.

**Repo hygiene debt** — committed junk: `git-diff.txt`, `report.txt`,
`tree.txt`, a directory literally named `'` containing a macOS path; a
`debug-firebase.js` util; `--no-lint` production build.

## 3. Decisions

### D1. Keep Firebase (Auth + Firestore + Hosting). Supabase is out of scope.
Inceptor's auth recipe is Supabase, but JustSplit has a live Firebase
project with real user data, working security rules, and a hosting setup.
Swapping the backend *and* the frontend in one migration doubles the risk
for no product gain. Firebase is a client-side SDK, so it fits Inceptor's
static/islands model as well as Supabase does. A later, separate epic may
evaluate Supabase; this spec neither blocks nor assumes it.

**Consequence:** Track C adds `docs/recipes/auth-firebase.md` to Inceptor so
Firebase is a first-class recipe there, mirroring the Supabase one
(guarded client, `PUBLIC_FIREBASE_*` env, `RouteGuard` adapter).

### D2. Astro `output: 'static'`; Firebase Hosting serves the built `dist/`.
No SSR adapter. The app is 100% authenticated client-side data, so there is
nothing to render on the server. Dropping `frameworksBackend` removes a Cloud
Function, cold starts, and the `webframeworks` experiment flag.

**Dynamic routes** (`/expenses/[id]`, `/events/[id]`, `/groups/[id]`,
`/friends/[id]`, `/expenses/edit/[id]`, `/events/edit/[id]`) cannot be
prerendered because ids are user data. Each becomes a single static shell
page (e.g. `src/pages/expenses/[id].astro` is **not** used; instead
`src/pages/expenses/view.astro` renders `<ExpenseDetailIsland client:only="react" />`,
which reads the id from `location.pathname`), and `firebase.json` gets
rewrites `/expenses/** → /expenses/view/index.html` (etc.) so existing URLs
keep working. Links are built with Inceptor's `href()` helper.

### D3. One island per route, Nano Stores for shared state, no React Context.
Per Inceptor rule 3 we do **not** wrap the app in one `client:load` island.
Each page is an Astro page (shell, `<BaseLayout>`, header, footer, `FeedbackFAB`)
with exactly one route island under `src/components/islands/`
(`DashboardIsland`, `ExpenseListIsland`, `ExpenseFormIsland`, …). Islands that
need auth-gated data render `client:only="react"`; marketing pages
(`/landing`, `/about`, `/help`) are plain Astro with zero JS.

Cross-island state moves from Context to Nano Stores under `src/stores/`:

- `auth.ts` — `$user` (Firebase `User | null`), `$authReady`, plus a
  `toGuardUser()` adapter to Inceptor's `GuardUser` (roles: `['user']`,
  flags from the Firestore profile). Started once via `onMount`.
- `firestore.ts` — one `map`/`atom` store per collection
  (`$users`, `$events`, `$expenses`, `$settlements`, `$groups`,
  `$friendships`). Each store's `onMount` subscribes `onSnapshot` when
  `$user` is set and unsubscribes on unmount — this replaces the 866-line
  `AppContext` reducer with ~150 lines and makes the listeners' lifecycle
  automatic (Inceptor "island lifecycle discipline").
- `preferences.ts` — `preferredCurrency`, persisted with `@nanostores/persistent`.
- `notifications.ts` — toast queue → rendered by the shadcn `Toaster` island.

Writes (`addDoc`/`updateDoc`/`deleteDoc`) live in `src/lib/firebase/repo.ts`
as plain async functions validated by Zod schemas in `src/schemas/`.

### D4. UI: shadcn/Base UI + Tailwind v4 replace MUI + CSS modules.
Mapping (owned copies under `src/components/ui/`):

| JustSplit | Inceptor |
|---|---|
| `Button`, `IconButton` | `button` (`variant="ghost" size="icon"`) |
| `CurrencySelector` | `select` + `Combobox` |
| `EditableText` | `input` + local island state |
| `EntityList` | `data-table` (TanStack) |
| `HoverCard` | `hover-card` (Base UI) |
| `Notification` | `toast` |
| `ProgressBar` | `progress` |
| `Timeline` | new `Timeline` island (ported, Tailwind-styled) |
| `ImageUploader`/`AvatarUploader` | `FileDropzone` from Inceptor gallery + Firebase Storage |
| chart.js dashboard charts | `src/components/ui/charts/` Recharts wrappers |
| MUI `DatePicker` | `calendar` + `popover` (shadcn) |
| `framer-motion` | `motion/react` (`LazyMotion` + `domAnimation`) |

### D5. Integration branch + issue-per-feature, cutover in one PR.
`main` keeps deploying the Next app until cutover. Track B work lands on a
long-lived `inceptor` integration branch via issue-driven PRs
(`phase-N/issue-NNN-slug` → `inceptor`). Firebase Hosting PR previews already
run on `pull_request`, so every PR gets a preview URL. When the acceptance
checklist in §6 is green, one PR `inceptor → main` cuts over. Rollback is
`git revert` of that merge plus a redeploy; Firestore is untouched by the
frontend migration, so data needs no rollback.

### D6. Scaffold via `create-inceptor-app`, then graft, not in-place edits.
`scripts/init.mjs` refuses an existing target directory, so we generate a
fresh lean project (`--archetype static --name JustSplit --repo
ArtemioPadilla/JustSplit`) into a sibling directory and copy its tree into
this repo on the integration branch, replacing `src/`, `next.config.js`,
`jest.*`, `tsconfig.json`, `package.json`. The Next tree is available from
`main` / git history for reference; nothing is kept under a `legacy/` folder.

### D7. Tests: Vitest replaces Jest; pure-logic tests port first.
Utils tests port nearly verbatim (rename imports). Component tests are
rewritten per island against `@testing-library/react` under Vitest + jsdom,
following Inceptor's `vitest.setup.ts`. Firestore is mocked via a tiny
in-memory `repo` double, not `firebase/firestore` mocks. Target: **no
regression in covered behaviour**, not line-for-line parity.

### D8. Node 22, SHA-pinned actions, one deploy workflow.
`ci.yml` is copied from Inceptor (build + check + tests + actionlint).
`firebase-deploy.yml` and `firebase-hosting-merge.yml` collapse into one
`deploy.yml` on push to `main`; `firebase-hosting-pull-request.yml` stays
for previews. All `uses:` refs SHA-pinned.

## 4. Target architecture

```
src/
  pages/                      Astro shells (zero-JS unless an island is placed)
    index.astro               → DashboardIsland (client:only)
    landing.astro about.astro help.astro          (static)
    auth/signin.astro auth/signup.astro           → AuthIsland
    expenses/index.astro list.astro new.astro view.astro edit.astro
    events/…  groups/…  friends/…  settlements.astro  profile.astro
    llms.txt.ts  llms-full.txt.ts  (from Inceptor, re-branded)
  components/
    islands/                  one island per route + ErrorBoundary + QueryProvider
    ui/                       shadcn (owned)  · ui/charts/ Recharts wrappers
    common/                   Header.astro FeedbackFAB.astro ThemeToggle.astro
    features/                 domain widgets shared by islands (ExpenseSplitter, BalanceOverview, Timeline…)
  stores/                     auth.ts firestore.ts preferences.ts notifications.ts theme.ts
  lib/                        firebase/{client,repo,storage}.ts route-guard.tsx utils.ts href.ts site-meta.ts …
  schemas/                    zod: user.ts expense.ts event.ts group.ts settlement.ts friendship.ts
  domain/                     expenseCalculator.ts currencyExchange.ts formatters.ts csvExport.ts timeline/*
  styles/global.css
firebase.json                 hosting.public = dist, rewrites for dynamic routes, firestore rules/indexes unchanged
```

## 5. Risks

| Risk | Mitigation |
|---|---|
| `firebase` SDK is heavy (~250 kB gz for auth+firestore) and lands in every authenticated island | Import from `firebase/app`, `firebase/auth`, `firebase/firestore` (modular); one shared `client.ts` chunk; marketing pages import nothing. Lighthouse budget in `lighthouse-budgets.json` from Inceptor |
| Auth flash / hydration: `client:only` islands render nothing until auth resolves | `$authReady` gate + `Skeleton` from shadcn; `useClientPreference` for theme/currency |
| Existing deep links (`/expenses/abc123`) break | `firebase.json` rewrites (D2) + Vitest test asserting each dynamic route family has a rewrite |
| Google sign-in popup blocked in PWA/standalone mode | Use `signInWithRedirect` fallback when `display-mode: standalone` |
| `firestore.rules` rely on `participants` arrays that the new Zod schemas must keep identical | Schema tests round-trip fixtures against the current shape; rules file is not modified in this migration |
| Feature parity silently drops something (e.g. CSV export, exchange ticker) | Feature-parity checklist (§6) is the cutover gate; each row maps to an issue |
| Two deploy workflows racing on `main` | Collapse to one (D8) in Track A, before any Track B work |
| Realtime listeners leak across page navigations | Nano Stores `onMount` + `createDisposer()`; a Vitest test asserts every store unsubscribes |

## 6. Feature-parity checklist (cutover gate)

- [ ] Sign in / sign up (email+password, Google), sign out, profile edit incl. avatar upload
- [ ] Dashboard: welcome, balance overview, financial summary, monthly trends, expense distribution, recent expenses, recent settlements, upcoming events
- [ ] Expenses: list (filter/sort), create (equal/custom/percentage split, images, category), detail, edit, delete
- [ ] Events: list, create, detail (timeline + expenses), edit
- [ ] Groups: list, create, detail (members, events, expenses)
- [ ] Friends: list, add (request/accept/reject), detail
- [ ] Settlements: who-owes-whom, minimal-transaction algorithm, mark as paid, multi-currency conversion
- [ ] Currency: preferred currency, live exchange ticker with fallback table
- [ ] CSV export
- [ ] Notifications/toasts
- [ ] IndexedDB persistence reset / database-recovery UX (or a documented removal)
- [ ] Existing URLs resolve via rewrites
- [ ] `npm run check`, `npm run test`, Lighthouse budgets green; axe smoke clean
- [ ] Firebase preview channel manually smoke-tested on desktop + mobile viewport

## 7. Out of scope

Supabase; payment integrations; E2E encryption (README claim, never built);
Tauri desktop/mobile packaging (available later via Inceptor's
`add-tauri*.mjs`); redesign beyond what the shadcn mapping implies.
