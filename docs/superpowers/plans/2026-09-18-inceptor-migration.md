# JustSplit → Inceptor migration — Implementation plan

> **For agentic workers:** this plan is executed issue by issue with the Inceptor loop —
> `prometeo` (decompose) → `forja` (implement, atomic commits) → `centinela` (validate) → PR.
> Every task below is one GitHub issue. Steps use `- [ ]` for tracking.

**Goal:** Move JustSplit onto the Inceptor scaffold and workflow so that Inceptor is the only
base we maintain, with zero loss of user-facing functionality and no change to the Firebase
data or security rules.

**Spec:** `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md` (decisions D1–D8).

**Tracks:** A (workflow adoption, ships first, to `main`) → B (stack migration, on the `inceptor`
integration branch, cutover PR at the end) → C (upstream reusable pieces to Inceptor).

## Global constraints

- **Firebase stays** (Auth, Firestore, Storage, Hosting). `firestore.rules` and
  `firestore.indexes.json` are **not modified** by this plan.
- **Inceptor rules apply from Track B onward**: no React Context across islands, no whole-app
  island, no `@radix-ui/*`, no `framer-motion`, no `@astrojs/tailwind`, no `@tremor/react`
  (`.claude/checklists/forbidden-imports.json` is enforced by `centinela`).
- **Branch naming**: `phase-N/issue-NNN-slug`. Track A PRs target `main`; Track B PRs target
  `inceptor`; Track C PRs live in the `inceptor` repo.
- **Commits**: Conventional Commits + issue ref.
- **Every PR**: `npm run check` + `npm run test` green (Track A adds the gate; Track B keeps it).
- **No secrets in the repo**; Firebase config comes from `PUBLIC_FIREBASE_*` env vars
  (build-time, browser-safe by Firebase's design) already present as GitHub secrets.

## Milestones and labels

| Milestone | Track | Issues |
|---|---|---|
| `v0.2 - Inceptor workflow` | A | A1–A6 |
| `v0.3 - Foundation on Astro` | B, phase 1 | B1–B7 |
| `v0.4 - Feature islands` | B, phase 2 | B8–B17 |
| `v0.5 - Cutover` | B, phase 3 | B18–B22 |
| `v0.6 - Upstream to Inceptor` | C | C1–C3 |

Labels: `phase-0` … `phase-3`, `type:chore` / `type:feat` / `type:docs`, `track:workflow`,
`track:stack`, `risk:high` (for B4, B5, B20).

---

## Track A — Adopt the Inceptor workflow (no app code changes)

### A1. Repo hygiene
- [ ] Delete `git-diff.txt`, `report.txt`, `tree.txt`, the `'` directory, `src/utils/debug-firebase.js`
- [ ] Add `.nvmrc` (`22`), `.editorconfig`, `.prettierrc.json`, `.prettierignore` from Inceptor
- [ ] `.gitignore`: add `reports/`, `*.txt` diffs, `.firebase/`
- [ ] Acceptance: `git ls-files | grep -E '\.txt$|^\x27'` is empty

### A2. `CLAUDE.md` + `.claude/` for JustSplit
- [ ] Generate `CLAUDE.md` from Inceptor's template (`scripts/init.mjs` output), re-branded:
      purpose, current stack (Next.js **until Track B lands**, then Astro), file organization,
      commands, conventions, critical warnings, auth-gating rules, link to this plan
- [ ] Copy `.claude/agents/{prometeo,forja,centinela}.md`; edit `prometeo` to read this plan
      instead of `INTEGRATION-PLAN.md`; edit `centinela` to run `npm run lint && npm run
      type-check && npm run test && npm run build`
- [ ] Copy `.claude/checklists/{ethics,governance,forbidden-imports}.*`; forbidden-imports
      initially allows `@mui/*` and `framer-motion` with a `TODO(track-b)` expiry note
- [ ] Copy `.claude/commands/{doctor,monday,ship}.md` + `scripts/{doctor,monday,ship}.sh`
- [ ] Acceptance: `bash scripts/doctor.sh` passes on a clean checkout

### A3. CI quality gate
- [ ] Add `.github/workflows/ci.yml` from Inceptor adapted to Next: `npm ci`, `npm run lint`,
      `npx tsc --noEmit`, `npm run test -- --ci`, `npm run build`; actionlint job kept verbatim
- [ ] Add `type-check` script to `package.json`; remove `build:firebase --no-lint`
- [ ] Node 22 everywhere; SHA-pin `actions/checkout`, `actions/setup-node`,
      `FirebaseExtended/action-hosting-deploy`
- [ ] Acceptance: CI green on the PR; a deliberate type error in a throwaway commit turns it red

### A4. One deploy workflow
- [ ] Merge `firebase-deploy.yml` + `firebase-hosting-merge.yml` into `deploy.yml` (push to
      `main`, `concurrency` group, needs `ci` success)
- [ ] Keep `firebase-hosting-pull-request.yml` (previews), SHA-pinned, `if:` same-repo guard kept
- [ ] Acceptance: exactly one deploy run per push to `main`

### A5. Issue-driven loop
- [ ] Copy `.github/ISSUE_TEMPLATE/{bug_report,feature_request,question,story,config}.yml`,
      `PULL_REQUEST_TEMPLATE.md`, `CODEOWNERS`, `dependabot.yml`
- [ ] Copy `claude.yml` (AI triage) **with the three security layers intact**: `ai-approved`
      gate for non-collaborators, `contents: read`, untrusted-data framing
- [ ] Adapt `scripts/create-issues.sh` to create the labels, milestones and the B/C issues of
      this plan (idempotent, dry-run by default)
- [ ] Acceptance: `bash scripts/create-issues.sh --apply` creates 25 issues + 5 milestones

### A6. Docs realignment
- [ ] `docs/INDEX.md` pointing to spec/plan; move `docs/known-bugs.md` items into issues;
      mark `docs/refactor-plan.md` and `docs/development/assesment-202505.md` as superseded
- [ ] README: replace "Development" section with the Inceptor loop summary
- [ ] Acceptance: no doc references Jest/Next as *future* work once Track B starts

---

## Track B — Stack migration (integration branch `inceptor`)

### Phase 1 — Foundation

### B1. Scaffold with `create-inceptor-app` and graft
- [ ] In the Inceptor checkout: `node scripts/init.mjs --name JustSplit --archetype static
      --repo ArtemioPadilla/JustSplit --out ../justsplit-astro`
- [ ] On branch `inceptor` (from `main` after Track A): remove `src/`, `next.config.js`,
      `jest.config.js`, `jest.setup.js`, `apphosting*.yaml`; copy the generated tree in
      (`src/`, `astro.config.mjs`, `tsconfig.json`, `vitest.*`, `components.json`,
      `package.json` deps merged: keep `firebase`, `date-fns`, `uuid`; drop `next`, `@mui/*`,
      `@emotion/*`, `framer-motion`, `chart.js`, `react-chartjs-2`, `react-intersection-observer`,
      `jest*`, `@testing-library/jest-dom` (Vitest equivalent added), `eslint-config-next`)
- [ ] Resolve every `TODO(agent)` in `src/lib/site-meta.ts`, `llms.txt`, `astro.config.mjs`
      `site` (`https://justsplit-eef51.web.app`), `public/robots.txt`, `PUBLIC_REPO_SLUG`
- [ ] `CLAUDE.md` stack table switched to the Astro stack; forbidden-imports TODO removed
- [ ] Acceptance: `npm run check` and `npm run test` green with the scaffold's landing page;
      Firebase PR preview serves it

### B2. Firebase client + env + hosting config
- [ ] `src/lib/firebase/client.ts`: guarded modular init (`firebaseEnabled` false when env is
      missing, mirrors Inceptor's `supabase.ts` pattern) exposing `auth`, `db`, `storage`
- [ ] `.env.example` with `PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,STORAGE_BUCKET,
      MESSAGING_SENDER_ID,APP_ID,MEASUREMENT_ID}`; CI/deploy workflows map the existing
      `NEXT_PUBLIC_*` secrets to these names
- [ ] `firebase.json`: `hosting.public = "dist"`, drop `frameworksBackend` and `frameworks`,
      add rewrites for `/expenses/**`, `/events/**`, `/groups/**`, `/friends/**` → the `view`/
      `edit` shells (D2); `cleanUrls: true`
- [ ] Test: `src/tests/firebase-rewrites.test.ts` asserts each dynamic route family has a rewrite
- [ ] Acceptance: preview channel loads; `firebaseEnabled` false build still passes

### B3. Zod schemas + domain layer
- [ ] `src/schemas/{user,friendship,group,expense,event,settlement}.ts` matching
      `src/types/index.ts` **field for field** (rules depend on `participants`, `paidBy`,
      `fromUser`/`toUser`, `members`); `z.infer` types replace `src/types`
- [ ] Move pure logic to `src/domain/`: `expenseCalculator`, `currencyExchange`, `formatters`,
      `csvExport`, `fileUtils`, `timeline/*` — unchanged code, imports rewired
- [ ] Port the 5 utils Jest tests + `timelineCalculations` to Vitest verbatim
- [ ] Test: schema round-trip against fixtures captured from the current app's shapes
- [ ] Acceptance: `npm run test` ≥ 6 ported suites green

### B4. Auth store + RouteGuard adapter (`risk:high`)
- [ ] `src/stores/auth.ts`: `$user`, `$authReady`, `$profile` (Firestore `users/{uid}` doc),
      `onMount` → `onAuthStateChanged`, teardown on unmount; `signIn/signUp/signInWithGoogle/
      signOut` as actions; `signInWithRedirect` fallback in standalone display-mode
- [ ] `toGuardUser(profile)` → Inceptor `GuardUser` (`roles: ['user']`, `flags` from profile);
      `<RouteGuard>` used by every authenticated island; deny-by-default per CLAUDE.md
- [ ] `src/components/islands/AuthIsland.tsx` (signin + signup via shadcn `<Form>` + zod)
- [ ] Tests: store lifecycle (subscribe/unsubscribe), guard denies when `$authReady && !$user`,
      redirect-to-signin behaviour
- [ ] Acceptance: `/auth/signin` works against the preview project; `/` redirects when logged out

### B5. Firestore stores + repo (`risk:high`)
- [ ] `src/stores/firestore.ts`: one store per collection with `onMount` binding `onSnapshot`
      queries identical to `AppContext.tsx` lines 482–540 (same `where` clauses so rules
      still pass), unsubscribed via `createDisposer()`
- [ ] `src/lib/firebase/repo.ts`: `create/update/remove` per collection, Zod-validated input,
      `serverTimestamp()` where the old code used `new Date().toISOString()` **only if** the
      rules/indexes tolerate it — otherwise keep ISO strings (verify against `firestore.rules`)
- [ ] `src/lib/firebase/storage.ts`: upload helpers for expense images and avatars
- [ ] `src/stores/preferences.ts` (`preferredCurrency`, persistent) and
      `src/stores/notifications.ts` (toast queue)
- [ ] Tests: in-memory repo double; a listener-leak test asserting all stores unsubscribe
- [ ] Acceptance: an island subscribed to `$expenses` shows live data from the preview project

### B6. Layout, header, theme, FeedbackFAB
- [ ] `BaseLayout.astro` re-branded (title, JSON-LD `WebApplication`, description); `Header.astro`
      with nav + `UserMenuIsland` (avatar, sign-out) + `ThemeToggle`; `FeedbackFAB` wired to
      `ArtemioPadilla/JustSplit` issues
- [ ] `global.css` tokens: JustSplit palette mapped onto shadcn CSS vars (from
      `docs/design/style-guide.md`)
- [ ] `ErrorBoundary` + `HydrationCanary` on every page
- [ ] Acceptance: axe smoke clean on `/landing`; theme persists across reloads without flash

### B7. Static pages
- [ ] `/landing`, `/about`, `/help` as zero-JS Astro pages; `motion/react` only where the old
      `framer-motion` animations are worth keeping (otherwise `tailwindcss-motion`)
- [ ] `/` renders `DashboardIsland` for signed-in users and the landing content otherwise
- [ ] Acceptance: `/landing` ships 0 kB JS (assert with `astro build` output + test)

### Phase 2 — Feature islands (one issue each; all `type:feat`, `phase-2`)

Each island: `src/components/islands/<Name>Island.tsx` + feature widgets under
`src/components/features/<domain>/`, shadcn components only, `RouteGuard`-wrapped, Vitest
tests ported/rewritten from the corresponding Jest suites, appears in `/showcase` if it
introduces a reusable widget.

### B8. Dashboard island
- [ ] Port the 12 dashboard components; `MonthlyTrendsChart`, `ExpenseDistribution`,
      `BalanceLine` on Recharts wrappers (`ui/charts/`), lazy chunk
- [ ] Port the 10 dashboard Jest tests
### B9. Expense list + detail islands (`/expenses`, `/expenses/list`, `/expenses/view`)
- [ ] `data-table` with URL-state sort/filter (Inceptor `use-data-table-url-state`)
### B10. Expense form island (`/expenses/new`, `/expenses/edit`)
- [ ] `ExpenseSplitter` rewritten without MUI (equal / custom / percentage), image upload,
      category, `calendar` date picker
### B11. Events islands (list, new, view, edit) incl. `Timeline` widget port + timeline tests
### B12. Groups islands (list, new, view)
### B13. Friends islands (list, add, view) — friendship request flow
### B14. Settlements island — `expenseCalculator` minimal-transactions, mark as paid, currency conversion
### B15. Profile island — editable profile, avatar upload, preferred currency
### B16. Currency exchange ticker + `CurrencySelector` (shadcn `Combobox`) shared widgets
### B17. CSV export + notifications/toasts + database-recovery UX decision
- [ ] Decide: keep IndexedDB reset flow (port) or drop it and document why (ADR)

### Phase 3 — Cutover

### B18. Feature-parity audit
- [ ] Walk spec §6 checklist on the preview channel, desktop + 375 px viewport; file an issue
      per gap and block cutover on them
### B19. PWA + performance
- [ ] `@vite-pwa/astro` manifest re-branded, offline shell; Lighthouse budgets green;
      `firebase` chunk isolated and measured
### B20. Cutover PR `inceptor → main` (`risk:high`)
- [ ] `deploy.yml` deploys `dist/`; remove Next-specific secrets mapping; delete the last Next
      references in docs; `CHANGELOG.md` entry
- [ ] Rollback runbook: revert merge + redeploy (document in `docs/runbooks/rollback.md`)
### B21. Post-cutover monitoring
- [ ] 7-day watch: Firebase Hosting errors, `FeedbackFAB` issues, Sentry (optional, Inceptor
      `sentry.ts` guarded); close the milestone
### B22. Cleanup
- [ ] Delete the `inceptor` branch; archive `docs/refactor-plan.md`; update `ROADMAP.md`

---

## Track C — Upstream to Inceptor (so this is reusable for the next project)

### C1. `docs/recipes/auth-firebase.md`
- [ ] Mirror of `auth-supabase.md`: guarded client, env, `RouteGuard` adapter, Nano Stores
      `onSnapshot` pattern, hosting rewrites for client-only dynamic routes
### C2. `docs/recipes/adopt-existing-app.md` (brownfield playbook)
- [ ] The A/B/C track structure of this plan generalized: inventory template, decision list
      (D1–D8 as questions), parity-checklist template, cutover/rollback pattern
### C3. `scripts/init.mjs --into <existing-repo>` (optional)
- [ ] Layer-in mode that grafts the scaffold into an existing repo instead of refusing, reusing
      the `add-tauri.mjs` merge-into-existing-project style; test in `src/tests/`

---

## Sequencing and dependencies

```
A1 → A2 → A3 → A4 → A5 → A6            (serial, one PR each, ~1 week)
B1 → B2 → B3 ─┬→ B4 → B5 → B6 → B7      (foundation, serial)
              └→ (B3 unblocks B16 early)
B8..B17  parallelizable after B7 (B10 depends on B9; B14 depends on B9+B11)
B18 → B19 → B20 → B21 → B22
C1, C2 after B5; C3 after B1 (independent of cutover)
```

## Definition of done (whole migration)

- `main` deploys the Astro app; `npm run check` + `npm run test` + Lighthouse budgets green
- Spec §6 checklist fully ticked; zero `@mui`, `framer-motion`, `next` in `package.json`
- Firestore rules/indexes byte-identical to today
- Inceptor `main` contains C1 and C2
