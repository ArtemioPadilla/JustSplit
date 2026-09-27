# JustSplit → Inceptor migration — Implementation plan

> **For agentic workers:** this plan is executed issue by issue with the Inceptor loop —
> `prometeo` (decompose) → `forja` (implement, atomic commits) → `centinela` (validate) → PR.
> Every task below is one GitHub issue. Steps use `- [ ]` for tracking.
> Track A issues A1–A3a are executed by the main Claude Code session directly — the sub-agents
> only exist after A2 merges and centinela's gate is only runnable once lint/tests/build are
> green; the prometeo → forja → centinela loop starts with A3b.

**Goal:** Move JustSplit onto the Inceptor scaffold and workflow, over Supabase through the
CyberEco data layer (`@cyber-eco/*`), so that Inceptor and the data layer are the only bases we
maintain, with zero loss of user-facing functionality on a clean schema whose Postgres RLS is the
only authorization; schema and policies change only through migrations covered by the RLS suite
(B2b). Firebase is retired at cutover (B20).

**Spec:** `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md` (decisions D1–D10; D9 is the post-cutover Track D, D10 the data model and RLS).

**Tracks:** A (workflow adoption, ships first, to `main`) → B (stack migration, on the `inceptor`
integration branch, cutover PR at the end) → C (upstream reusable pieces to Inceptor) and C'
(upstream to `cybereco-hub`: consumer commitment, relational mode, example app) → D
(relationship kinds, categories and conceptos — post-cutover, to `main`, after B22; spec D9; not
part of the migration's definition of done).

## Global constraints

- **Supabase via the CyberEco data layer; Firebase retired** (spec D1). Backend = one Supabase
  project `justsplit` (own `auth.users`); packages `@cyber-eco/{types,auth,supabase}@0.2.1` +
  `@supabase/supabase-js`. No existing data is migrated; the schema is clean (spec D10). The live
  Next app keeps serving from Firebase Hosting, untouched, until B20 retires the project.
- **RLS is the only authorization** (`cybereco-hub/docs/design/permissions-rls-doctrine.md` §1.1):
  every table the adapter touches has RLS and is listed in `src/lib/data/schema-map.ts`; the data
  layer runs with `permissions: { enabled: false }`; no `DataLayerService`. Schema and policies
  change only through dbmate migrations under `supabase/migrations/` shipped in `risk:high`
  issues with the B2b RLS suite green against `supabase start`; `db-migrate.yml` applies them.
- **Never document mode for shared data**: `public.documents` RLS is owner-only (any shared
  document would be readable and writable by every authenticated user). Every collection is a
  relational-mode table through `SchemaMap`; if relational mode is not merged upstream when B5a
  starts, the contingency adapter `src/lib/data/relational-adapter.ts` ships behind the same
  `StorageAdapter` interface (spec D1) — repos never import `SupabaseStorageAdapter` directly.
- **GitHub Packages**: `.npmrc` with `@cyber-eco:registry=https://npm.pkg.github.com` and
  `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`; repo secret `GH_PACKAGES_TOKEN`
  (fine-grained PAT, `read:packages`) mapped to `NODE_AUTH_TOKEN` in every workflow that runs
  `npm ci`. Owner action in A4; whether `GITHUB_TOKEN` alone could work is verified in B1 and
  treated as a risk until then.
- **Inceptor rules apply from Track B onward**: no React Context across islands, no whole-app
  island, no `@radix-ui/*`, no `framer-motion`, no `@astrojs/tailwind`, no `@tremor/react`,
  no `@mui/*`, no `firebase` (`.claude/checklists/forbidden-imports.json` is enforced by `centinela`).
- **Branch naming**: `phase-N/issue-NNN-slug`. Track A PRs target `main`; Track B PRs target
  `inceptor`; Track C PRs live in the `inceptor` repo; Track C' PRs live in the `cybereco-hub`
  repo; Track D PRs (`phase-4/…`) target `main` after cutover.
- **Track D never changes the schema or the policies**: it adds only keys in the `extra` jsonb
  overflow of existing tables or writes columns that exist since B2 (spec D9), no new table,
  column, index, policy or server-side code; every touched table is re-covered by the RLS suite;
  if a migration ever adds a `check` constraint or policy that inspects `extra`, Track D opens
  with a conditional `risk:high` migration issue (D0) through the same RLS-tested path.
- **Commits**: Conventional Commits + issue ref.
- **Every PR**: `npm run check` green (the umbrella script; Track A adds the gate, B1 swaps its
  body for the Astro one so `ship.sh`/`centinela` never change).
- **No secrets in the repo**; the browser config is `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_KEY`
  (the anon/publishable key — browser-safe by design, RLS is the defence), read from GitHub
  repository variables at build time; `SUPABASE_DB_URL` (migrations) and `GH_PACKAGES_TOKEN`
  (package install) are secrets. No Firebase secret is needed any more: PR #2's preview CI stays
  red until A4 deletes the Firebase workflows.
- **`withBase()` everywhere**: `ASTRO_BASE` is unset for the custom domain and set to
  `/JustSplit` (production fallback) or `/JustSplit-staging` (staging, always); no internal link,
  redirect or asset skips `withBase()` (spec D2).

## Milestones and labels

| Milestone | Track | Issues |
|---|---|---|
| `v0.2 - Inceptor workflow` | A | A1, A2, A3a, A3b, A4, A5, A6 |
| `v0.3 - Foundation on Astro` | B, phase 1 | B1, B2, B2b, B3, B4, B5a, B5b, B6, B7 |
| `v0.4 - Feature islands` | B, phase 2 | B8a, B8b, B9–B16, B17a, B17b |
| `v0.5 - Cutover` | B, phase 3 | B18–B22 |
| `v0.6 - Upstream to Inceptor` | C (lives in the `inceptor` repo) | C1–C3 |
| `v0.6 - JustSplit consumer` | C' (lives in the `cybereco-hub` repo) | H1–H3 |
| `v0.7 - Relationship kinds` | D, post-cutover (`phase-4`) | D1–D12 (+ D0 only if a migration ever constrains `extra`) |

Track A issues carry `phase-0`. Labels created by A5 (17): `phase-0..phase-3`,
`type:chore|feat|docs`, `track:workflow`, `track:stack`, `risk:high` (B2, B2b, B4, B5a, B5b, B13,
B16, B20, D2), `ai-approved` (claude.yml gate), `bug`, `enhancement`, `question` (issue-template
defaults), `tdd-tier:strict`, `tdd-tier:smoke`, `tdd-tier:exempt` (centinela §3.1 reads these;
story.yml only offers them as a dropdown, a maintainer/prometeo applies the label). Issue count:
34 in this repo (7 Track A + 27 Track B) + 4 milestones; 3 issues + 1 milestone in `inceptor`;
3 issues + 1 milestone in `cybereco-hub` (H1–H3, counted separately — they follow the hub's own
labels and its gate C1).
Track D is created separately, after B22: D1 is filed by hand (it also creates the `phase-4`
label and the `v0.7 - Relationship kinds` milestone); D1 adds `scripts/create-issues.sh --track d`,
which files D2–D12 idempotently. 12 issues D1–D12 (`track:stack`, `type:feat` except D12
`type:docs`; `tdd-tier:strict` on D1, D2, D7; D0 `risk:high`, by hand only if needed) — not part
of A5's counts.

ADR numbering (`docs/decisions/`): `0001-adopt-inceptor-workflow` (A2),
`0002-canonical-schema-and-rls` (B2b), `0003-cybereco-auth-islands` (B4),
`0004-tanstack-query-over-storage-adapter` (B5a), `0005-supabase-storage-images` (B5b),
`0006-registered-participants` (B13), `0007-exchange-rate-provider` (B16),
`0008-toast-topology-and-cache-reset` (B17b), `0009-cutover-and-firebase-retirement` (B20),
`0010-relationship-kinds-and-conceptos` (D1, post-cutover),
`0011-supabase-via-cybereco-data-layer` (B2; records spec D1 incl. the gate-C1 contingency and
the GitHub Packages fallback — numbered after 0010 because the list above was fixed before the
backend decision; ADR numbers are allocation order, not merge order).

---

## Track A — Adopt the Inceptor workflow (no app code changes)

### A1. Repo hygiene
- [ ] Delete: `git-diff.txt`, `report.txt`, `tree.txt`, the `'` directory, `reports/`,
      `src/utils/debug-firebase.js`, `src/pages/_app.tsx`, `src/app/events/new/page-fixed.tsx`,
      `src/app/**/page.tsx.{new,bak}`, `src/app/components/EventList.tsx`,
      `src/app/landing.module.css`, `src/components/ui/ProgressBar/` (the directory is the unused
      copy: `@/components/ui/ProgressBar` resolves to `ProgressBar.tsx`, whose `showPercentage`
      default the pages and `progressBar.test.tsx` rely on — keep that file), `src/components/Button/`, `src/utils/testUtils.tsx` +
      `src/test-utils/withAppContext.tsx` (keep `src/test-utils.tsx`, imported by 10 tests),
      `src/docs/`, `apphosting*.yaml` (after the B20 backend check has been run once — see B20's
      first bullet; if a backend is connected, delete the files only after disconnecting it)
- [ ] Add `.nvmrc` (`22`), `.editorconfig`, `.prettierignore` from Inceptor; add `.prettierrc.json`
      WITHOUT the `plugins` entry and the `*.astro` override (re-added in B1 with
      `prettier-plugin-astro`); `npm i -D prettier@^3` + `"format": "prettier --write ."`
- [ ] `git rm --cached reports/test-report.html` and add `reports/` to `.gitignore` (`.firebase/`
      is already ignored); leave `.firebaserc`, `firebase.json`, `firestore.*` untouched — B20
      deletes them with the project
- [ ] Acceptance: `git ls-files | grep -E '\.(txt|new|bak)$|^reports/|^src/pages/|page-fixed'` is
      empty && `npx tsc --noEmit` reports errors only in `__tests__`/`*.test.*` files (157
      pre-existing errors on `main`, all in test files; app code is clean) && `npx jest --ci`
      matches the `main` baseline (7 failed / 25 passed suites) — the shadow files must go before
      A3 because `tsconfig` includes every `*.tsx`

### A2. `CLAUDE.md` + `.claude/` for JustSplit
- [ ] Generate `CLAUDE.md` from Inceptor's template (`scripts/init.mjs` output), re-branded:
      purpose, current stack (Next.js **until Track B lands**, then Astro), file organization,
      commands, conventions, critical warnings, auth-gating rules, link to this plan
- [ ] `prometeo.md`: `INTEGRATION-PLAN.md` → `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
      (4 places: description, §1, §4, Rules); example issue ids `#001–#003` → `A1–A3`
- [ ] `forja.md`: same path swap (3 places: description, Inputs, §1); delete the
      `src/content/gallery.ts` rule, replace with "add reusable widgets to `src/pages/showcase.astro`"
- [ ] Copy `.claude/agents/centinela.md` and edit: (a) §1 anchors on this plan instead of
      `INTEGRATION-PLAN.md`; (b) step 3 runs `npm run check` only (= `npm run lint && npm run
      type-check && npm run test -- --ci && npm run build`); delete the `ux:check`/`a11y`
      paragraphs (re-add in B6 if those scripts are ported); (c) step 4 scans ONLY changed files:
      `git diff --name-only main...HEAD -- src | xargs grep -nE …`, and drops the `framer-motion`
      line with a `TODO(track-b): restore in B1, once src/ is the Astro tree` marker, mirroring
      the removal in `forbidden-imports.json` (both must change together); (d) widen the Context
      grep to `\bcreateContext\s*[<(]` so named imports are caught (safe in Track A because no
      app code changes touch `src/context/*`); (e) `@mui/*` is not a scaffold ban — do NOT add it
      in Track A (`src/` still imports MUI); B1 adds it to `forbidden-imports.json` (reason
      "replaced by Base UI/shadcn in B10") and restores `framer-motion` in both places; (f) §4
      exception text → "issue B1 (the only PR that replaces the Next tree)"; (g) §5 → check
      `src/pages/showcase.astro` instead of `gallery.ts`/`demos/`
- [ ] Copy `.claude/checklists/{ethics,governance,forbidden-imports}.*`; `governance.md`: required
      status check → `Build & Check` (ci.yml job name)
- [ ] Copy `.claude/commands/{doctor,monday,ship}.md` + `scripts/{doctor,monday,ship}.sh`; add to
      `package.json` scripts: `"doctor": "bash scripts/doctor.sh"`, `"monday": "bash scripts/monday.sh"`,
      `"ship": "bash scripts/ship.sh"`, `"type-check": "tsc --noEmit"` (moved here from A3 so the
      umbrella resolves) and `"check": "npm run lint && npm run type-check && npm run test -- --ci
      && npm run build"` (the Next-era umbrella; B1 replaces its body with the Astro one so
      `ship.sh`/`centinela` never change)
- [ ] `doctor.sh`: guard the Astro-only checks — `if [ -f astro.config.mjs ] || [ -f next.config.js ];
      then ok …` and skip the `src/env.d.ts` check when `next.config.js` exists (both with a
      `TODO(track-b): drop the Next branch` comment); downgrade the `http://localhost` placeholder
      hit in `src/firebase/config.ts` to a warning
- [ ] Create `docs/decisions/` with Inceptor's `TEMPLATE.md` + `0001-adopt-inceptor-workflow.md`
      (records Track A)
- [ ] Acceptance: after `npm ci`, `npm run doctor` exits 0 on a clean checkout of `main` (doctor
      also fails on a missing `node_modules`); `grep -rn 'INTEGRATION-PLAN\|gallery.ts\|ux:check\|npm
      run a11y' .claude` is empty; `npm run check` exiting 0 is A3a's acceptance, not A2's

### A3a. Make the existing gate runnable (pre-CI)
- [ ] Add `.eslintrc.json` = `{ "extends": "next/core-web-vitals" }` (eslint ^8 +
      eslint-config-next 15.3.1 are already devDeps); run `npm run lint`; fix what fires, or
      disable a rule only in the config with a one-line reason (Track A is run by the main
      session, so forja's "never disable a rule" clause is not yet in force); goal: `next lint`
      exits 0 non-interactively
- [ ] `jest.config.js`: set `collectCoverage: false` and delete `coverageThreshold` (coverage is
      re-baselined under Vitest in Track B; a 70 % gate on a 19.78 % codebase blocks every PR)
- [ ] Fix or `test.skip` (with `TODO(track-b)` + issue ref) the 7 failing suites
      (`timeline`, `timelineCalculations` ×2, `page`, `ExpenseDistribution`, `RecentSettlements`,
      `UpcomingEvents`; baseline measured 2026-09-27 on `main`: 7 failed / 25 passed, 23 failing
      tests) so `npx jest --ci` exits 0; list them in the PR body
- [ ] `type-check` must exit 0: either exclude `**/__tests__/**` and `**/*.test.*` from the
      type-check (`tsconfig.typecheck.json` extending `tsconfig.json`; Jest transpiles tests
      without type-checking anyway) or fix the 157 test-file type errors — prefer the exclusion
      with a `TODO(track-b)` note, since every Jest suite is rewritten under Vitest in Track B
- [ ] Remove `build:firebase --no-lint`
- [ ] Acceptance: `npm ci && npm run lint && npx tsc --noEmit && npx jest --ci && npm run build`
      exits 0 locally on Node 22 (i.e. `npm run check` from A2 is green)

### A3b. CI quality gate (depends on A3a)
- [ ] Add `.github/workflows/ci.yml` from Inceptor keeping only the `build` and `actionlint` jobs
      (delete `server-node` and `server-flask`); `build` runs `npm ci` + `npm run check` (= `lint
      && type-check && test -- --ci && build`, from A2/A3a). Keep the `push.branches` globs and
      the concurrency group
- [ ] In `ci.yml`: `on.push.branches: [main, inceptor, 'phase-*/**', 'feat/**', 'fix/**',
      'docs/**', 'chore/**']` and `on.pull_request.branches: [main, inceptor]`; change the
      actionlint job condition to `if: github.event_name == 'pull_request' || github.ref ==
      'refs/heads/main' || github.ref == 'refs/heads/inceptor'`
- [ ] After B1 opens the branch: `gh api -X PUT repos/ArtemioPadilla/JustSplit/branches/inceptor/protection`
      with required check `Build & Check` (must equal the job `name:` in the adapted ci.yml —
      Inceptor's `docs/governance/branch-protection.md` and `.claude/checklists/governance.md`
      still list `build`/`test`/`type-check`/`visual`, which match no job; update both when copying)
- [ ] Node 22 everywhere; SHA-pin `actions/checkout`, `actions/setup-node`
- [ ] Acceptance: CI green on the PR; a deliberate type error in a throwaway commit turns it red

### A4. Retire the Firebase workflows (no deploys until cutover)
- [ ] Delete `firebase-deploy.yml`, `firebase-hosting-merge.yml` and
      `firebase-hosting-pull-request.yml`: nothing deploys `main` from now on. The live Next site
      stays on Firebase Hosting exactly as last deployed until B20 retires the project; PR #2's
      red preview check disappears with the workflow. Delete the now-unused
      `FIREBASE_SERVICE_ACCOUNT*` repository secrets (owner action)
- [ ] Owner actions, documented in `SETUP.md` (not scripted): create the fine-grained PAT with
      `read:packages` on `ArtemioPadilla/cybereco-hub`'s packages and store it as repo secret
      `GH_PACKAGES_TOKEN`; note the risk that `GITHUB_TOKEN` alone may not be granted access to
      `@cyber-eco/*` (B1 verifies on its first CI run and records the outcome in ADR 0011)
- [ ] `ci.yml` (A3b): add an `.npmrc`-aware setup — `actions/setup-node` with
      `registry-url: https://npm.pkg.github.com` and `scope: '@cyber-eco'`, and
      `NODE_AUTH_TOKEN: ${{ secrets.GH_PACKAGES_TOKEN }}` on the `npm ci` step — inert until B1
      adds the packages; SHA-pinned
- [ ] Acceptance: `gh workflow list` shows only `ci.yml`, `actionlint` and `claude.yml` (A5); no
      workflow references `FirebaseExtended/*`, `NEXT_PUBLIC_*` or `FIREBASE_*`; `npm ci` in CI
      still green (no scoped package yet)

### A5. Issue-driven loop
- [ ] Copy `.github/ISSUE_TEMPLATE/{bug_report,feature_request,question,story,config}.yml`,
      `CODEOWNERS`; `PULL_REQUEST_TEMPLATE.md` with Mechanical checks → only `npm run check`
- [ ] `dependabot.yml`: copy only the `github-actions` ecosystem block in Track A; the npm block
      (with Inceptor's ignore/group rules) is added in B1 together with the new `package.json`
- [ ] Copy `claude.yml` (AI triage) **with the three security layers intact**: `ai-approved`
      gate for non-collaborators, `contents: read`, untrusted-data framing
- [ ] Adapt `scripts/create-issues.sh`: labels as in "Milestones and labels"; milestones
      `v0.2`–`v0.5` only; issues A1–A6 (skipped if already present) + B1–B22 with the splits
      (A3a/A3b, B2b, B5a/b, B8a/b, B11a/b, B17a/b) = 34 in this repo; issue body links
      `docs/superpowers/plans/2026-09-18-inceptor-migration.md#<anchor>` and says "Ask Claude
      Code: Land <id> from the migration plan" instead of `/goal` (idempotent, dry-run by default)
- [ ] Add `--repo ArtemioPadilla/inceptor` mode (overrides the `gh repo view` default) that
      creates C1–C3 + milestone `v0.6 - Upstream to Inceptor` there, and
      `--repo ArtemioPadilla/cybereco-hub` that creates H1–H3 + milestone `v0.6 - JustSplit
      consumer` there (hub labels only; no `phase-*`/`track:*` labels are created in the hub)
- [ ] Add repo secret `ANTHROPIC_API_KEY` (needed by claude.yml) — documented, not scripted
- [ ] Acceptance: `bash scripts/create-issues.sh --apply` → 34 issues + 4 milestones + 17 labels
      here; `--repo ArtemioPadilla/inceptor --apply` → 3 issues + 1 milestone there;
      `--repo ArtemioPadilla/cybereco-hub --apply` → 3 issues + 1 milestone there;
      `grep -rn 'ux:check\|npm run a11y' .github` is empty

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
      --repo ArtemioPadilla/JustSplit --out ../justsplit-astro` (record the Inceptor commit SHA
      in the PR)
- [ ] `cd ../justsplit-astro && npm install && npm run check` BEFORE grafting. Known gap:
      init.mjs copies `src/components/ui/data-table.tsx` (and `use-data-table-url-state.ts`)
      without its import closure. Copy from the Inceptor checkout:
      `src/components/ui/{action-bar,checkbox,download-trigger,empty-state,error-state}.tsx`,
      `src/components/ui/field-type/**`, `src/lib/{field-type,use-listing,format-date}.ts`
      (+ their `*.test.*`), and add `react-day-picker` to dependencies (`field-type.ts` has a
      type import from it, which `tsc` still resolves). Alternatively delete `data-table.tsx` +
      `use-data-table-url-state.ts` from the graft and re-add the full closure in B9
- [ ] If `tsc` reports TS5103 on `ignoreDeprecations: '6.0'`, set `typescript` to `^6.0.3` (what
      Inceptor itself uses) in the merged `package.json` rather than dropping the flag
- [ ] On branch `inceptor` (from `main` after Track A): remove `src/`, `next.config.js`,
      `jest.config.js`, `jest.setup.js`, `.eslintrc.json`; `package.json` deps merged: keep
      `date-fns`, `uuid`; add `@supabase/supabase-js`, `@cyber-eco/types@0.2.1`,
      `@cyber-eco/auth@0.2.1`, `@cyber-eco/supabase@0.2.1`; drop `firebase`, `next`, `@mui/*`,
      `@emotion/*`, `framer-motion`, `chart.js`, `react-chartjs-2`,
      `react-intersection-observer`, `jest*`, `@testing-library/jest-dom` (Vitest equivalent
      added), `eslint-config-next`. Commit `.npmrc` (`@cyber-eco:registry=https://npm.pkg.github.com`
      + `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`); document the local token in
      `SETUP.md`. First CI run verifies `GH_PACKAGES_TOKEN` installs the packages (and whether
      `GITHUB_TOKEN` would); record the outcome in ADR 0011 (B2)
- [ ] Graft — copy from the generated tree ONLY: `src/` (includes `site-meta.ts`, `llms.txt.ts`,
      `env.d.ts`), `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`,
      `.env.example`, `docs/decisions/TEMPLATE.md` (if A2 did not already add it), and from the
      generated `.github/workflows/` ONLY `deploy.yml` — Inceptor's GitHub Pages workflow, which
      is the production deploy (spec D2): keep its `ASTRO_BASE: ${{ secrets.ASTRO_BASE || '/JustSplit' }}`
      shape (the owner sets the `ASTRO_BASE` secret to `/` once the custom domain exists), add
      the `npm ci` registry/`NODE_AUTH_TOKEN` step from A4 and the `PUBLIC_SUPABASE_*` build env
      (B2), SHA-pin it. Do **not** copy the generated `ci.yml` (`server-node`/`server-flask` jobs
      fail here — keep A3b's) or its `CLAUDE.md`
- [ ] Graft manifest — copied from the Inceptor checkout (same commit), verbatim, with their
      `*.test.*`, because `init.mjs` does not emit them and this plan depends on them:
      `src/components/ui/{hover-card,combobox,calendar,date-picker,popover,progress-bar,file-upload,editable,avatar,tabs,sheet,radio-group,switch,password-input}.tsx`
      (`skeleton`, `checkbox` come from the core set / data-table closure), `src/components/ui/charts/**`,
      `src/lib/{route-guard.tsx,disposer.ts,use-client-preference.ts,sentry.ts,analytics.ts,json-ld.ts,pwa-register.ts}`,
      `src/components/islands/{HydrationCanary,OfflineBanner,UpdateToast,InstallButton}.tsx`,
      `src/stores/{install,online}.ts`, `src/types/vite-pwa.d.ts`,
      `src/components/common/SiteFooter.astro`, `src/tests/{forbidden-imports,site-meta}.test.ts`,
      `site.config.mjs`, `components.json`, `eslint.config.mjs` + devDeps `eslint @eslint/js
      @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react-hooks
      eslint-plugin-jsx-a11y globals` + `"lint": "eslint ."`, `lighthouse-budgets.json`,
      `.lighthouserc.json`, `scripts/check-ts-pragmas.mjs`, `src/pages/llms-full.txt.ts`
      (trimmed: no content collections, static docs list), `public/robots.txt`, a minimal
      `src/pages/showcase.astro`. Dependencies at Inceptor's pinned versions: `@vite-pwa/astro`,
      `@astrojs/sitemap`, `react-day-picker`, `@zag-js/editable`, `@zag-js/react`, `@lhci/cli`,
      `prettier-plugin-astro` (restore the `.prettierrc.json` `plugins` entry + `*.astro`
      override); `npm i @nanostores/persistent` (explicit new dependency, spec D3)
- [ ] Test: `src/tests/scaffold-manifest.test.ts` asserts every file in that manifest exists (so
      a future re-graft cannot silently drop one)
- [ ] Replace the generated `astro.config.mjs` with Inceptor's minus `i18n`, `mdx`, `redirects`,
      with `site: SITE_ORIGIN` from `site.config.mjs` (= the custom domain, or
      `https://artemiopadilla.github.io` with `base` `/JustSplit` as the fallback — spec D2),
      `base: process.env.ASTRO_BASE ?? '/'`, `trailingSlash: 'ignore'`, PWA/sitemap integrations
      retained, and `vite.define` for `process.env.NODE_ENV` and `process.env.NEXT_PUBLIC_HUB_URL`
      (the `@cyber-eco/auth` static-build requirement, `cybereco-hub/examples/static-app/README.md`)
- [ ] Resolve `TODO(agent)` in `src/lib/site-meta.ts`, `src/pages/llms.txt.ts`,
      `public/robots.txt`, `PUBLIC_REPO_SLUG`; ADD `site:` (the generated config has none) via
      `site.config.mjs` `SITE_ORIGIN` + `src/lib/site-meta.ts` `SITE_ORIGIN`, asserted equal by
      the copied `src/tests/site-meta.test.ts`
- [ ] `package.json` `check` = `npm-run-all --parallel check:astro type-check test lint
      check:pragmas --serial build` (same script name as A2, so `ship.sh`, `centinela` and
      `ci.yml` are unchanged)
- [ ] Delete `package-lock.json`, run `npm install`, commit the regenerated lockfile (forja must
      not hand-edit it; `npm ci` fails on a stale lock)
- [ ] `CLAUDE.md` stack table switched to the Astro stack; `forbidden-imports.json`: restore the
      `framer-motion` ban, add `@mui/` (reason "replaced by Base UI/shadcn in B10") and
      `firebase` (reason "backend retired, spec D1"); restore centinela's `framer-motion` grep
      line and whole-tree scan (the copied `src/tests/forbidden-imports.test.ts` reads the JSON);
      `dependabot.yml`: add Inceptor's npm block (+ a `registries` entry for `npm.pkg.github.com`
      using `GH_PACKAGES_TOKEN` so `@cyber-eco/*` bumps resolve)
- [ ] Test: `src/tests/with-base.test.ts` greps `src/` for `href="/` and `src="/` outside a
      `withBase(` call (the subpath fallback and the staging site are real, spec D2); a build
      test asserts `dist/` links carry the configured base; only one workflow (`deploy.yml`)
      triggers on push to `main`
- [ ] Acceptance: `npm run check` green with the scaffold's landing page; `@cyber-eco/*` install
      green in CI with `GH_PACKAGES_TOKEN`; `scaffold-manifest.test.ts` green

### B2. Supabase project, client, env, migrations pipeline (`risk:high`)
- [ ] Owner actions (documented in `SETUP.md`, not scripted): create Supabase project `justsplit`
      (region closest to MX); enable Email + Google providers (Google OAuth client with the
      staging and production origins + `withBase('/auth/callback/')` redirect URLs); copy the
      project URL and the anon/publishable key into repository **variables**
      `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY`; copy the **session pooler** URI (IPv4,
      `?sslmode=require`) into repository **secret** `SUPABASE_DB_URL`
- [ ] `src/lib/data/client.ts`: guarded client following the `supabaseEnabled` snippet in
      Inceptor `docs/recipes/auth-supabase.md` §2 — `supabaseEnabled = Boolean(PUBLIC_SUPABASE_URL
      && PUBLIC_SUPABASE_KEY)`; `createClient(url, key, { auth: { persistSession: true,
      flowType: 'pkce', detectSessionInUrl: true } })`, `null` when disabled; islands render an
      `Alert` instead of crashing. `.env.example` with both keys + `PUBLIC_SUPABASE_LOCAL=true`
      (points the client at `supabase start`'s URL/anon key in dev)
- [ ] `src/lib/data/adapter.ts`: the single place that constructs the `StorageAdapter`
      (`new SupabaseStorageAdapter(client, { schemaMap })` once relational mode exists upstream;
      until then it exports the contingency adapter — B5a) and the `SupabaseAuthAdapter` /
      `SupabaseProfileStore` pair (B4). Nothing else imports `@cyber-eco/supabase`
- [ ] `supabase/migrations/` bootstrap (dbmate, `YYYYMMDDHHMMSS_name.sql`, `-- migrate:up` /
      `-- migrate:down`), in this order: `profiles` copied verbatim from
      `cybereco-hub/packages/supabase/db/migrations/20260715000001_profiles.sql`; JustSplit tables
      `expense_groups`, `expenses`, `settlements`, `events`, `friendships` with the spec D10
      columns (`id text pk`, snake_case universal columns, `extra jsonb not null default '{}'`,
      `member_ids text[]` + GIN, `created_at`/`updated_at timestamptz default now()` + one
      `updated_at` trigger, `numeric(14,2)`, `char(3)`, `split_type` check, `events.kind text not
      null default 'event'`); RLS (`alter table … enable row level security` + the D10 policy
      table, one named policy per command); `alter publication supabase_realtime add table …` for
      every table; storage bucket `receipts` (private, 5 MiB, `image/*`) + `storage.objects`
      policies (D10); relational `batch_write(ops jsonb)` (SECURITY INVOKER; dispatches on the
      mapped table; the hub's document-mode function is the template) and
      `find_profile_by_email(text)` (`security definer`, returns `id, name, "avatarUrl"`)
- [ ] `.github/workflows/db-migrate.yml` copied from `cybereco-hub/.github/workflows/db-migrate.yml`
      (dbmate `migrate` on push to `main` touching `supabase/migrations/**`, `workflow_dispatch`
      with `ref` for applying from `inceptor` before cutover, `rollback` input for the last
      migration; `SUPABASE_DB_URL` secret); SHA-pinned. First manual run applies the bootstrap to
      the `justsplit` project
- [ ] Local: `supabase/config.toml` + `npm run db:start` (`supabase start`), `npm run db:migrate`
      (`dbmate --url "$SUPABASE_DB_URL" migrate` against the local URL), `npm run db:reset`;
      seed script `supabase/seed.sql` with two test users and one group per fixture; document in
      `SETUP.md`
- [ ] Workflows: `deploy.yml` and `deploy-staging.yml` pass `PUBLIC_SUPABASE_URL` /
      `PUBLIC_SUPABASE_KEY` from repository variables at build time; `ci.yml` builds **without**
      them on purpose (exercises the guarded `supabaseEnabled === false` path) and runs the B2b
      RLS suite against `supabase start`; a Vitest asserts each deploying workflow's build step
      has both and that `ci.yml` has neither
- [ ] New `deploy-staging.yml`: `on: push: branches: [inceptor]` → build with
      `ASTRO_BASE=/JustSplit-staging` → push `dist/` to the `gh-pages` branch of
      `ArtemioPadilla/JustSplit-staging` with a deploy key (repo created by the owner, Pages
      enabled on `gh-pages`); the resulting `https://artemiopadilla.github.io/JustSplit-staging/`
      is the B18/B19 target
- [ ] `src/pages/404.astro` shell + `src/components/islands/AppRouterIsland.tsx` (spec D2): maps
      `location.pathname` (minus `import.meta.env.BASE_URL`) to the route islands (stubs until
      Phase 2; a real not-found view otherwise); `src/pages/{expenses,events,groups}/index.astro`
      = `<meta http-equiv="refresh">` + JS redirect to `withBase('/…/list')`
- [ ] Test: `src/tests/app-router.test.ts` asserts every dynamic route family
      (`/expenses/:id`, `/expenses/edit/:id`, `/events/:id`, `/events/edit/:id`, `/groups/:id`,
      `/friends/:id`) resolves to an island, that `dist/404.html` exists after build and contains
      the shell, that the three redirect pages exist, and that no `src/pages/auth/v1/**` route
      collides with the Supabase auth path
- [ ] ADR `docs/decisions/0011-supabase-via-cybereco-data-layer.md`: spec D1 verbatim (rationale,
      rejected alternatives, the two identity contexts, gate C1 and the contingency adapter, the
      GitHub Packages access outcome from B1 and the vendoring fallback); Stakeholder Analysis
      (user data now lives in Supabase's `aws` region of choice; retention/erasure through RLS
      delete policies + a documented owner runbook)
- [ ] Acceptance: `supabase start && npm run db:migrate` applies the bootstrap cleanly and
      `dbmate rollback` reverts the last file; `db-migrate.yml` manual run applied it to the
      `justsplit` project; `ci.yml`'s `supabaseEnabled === false` build passes; the staging site
      serves the scaffold landing page under `/JustSplit-staging/`

### B2b. RLS test suite — every table × every command × member/non-member/anonymous (`risk:high`, blocks B3/B5a)
- [ ] `src/tests/rls/` Vitest suite (`// @vitest-environment node`) run against `supabase start`
      (CI job in `ci.yml`: `supabase/setup-cli` SHA-pinned → `supabase start` → `dbmate migrate`
      → `vitest run src/tests/rls`): creates two users through the local GoTrue admin API
      (member `A`, non-member `B`) and keeps an anonymous client; each test uses a
      `@supabase/supabase-js` client signed in as the actor (real JWTs, `anon` key — never the
      `service_role` key in tests except for fixture setup/teardown)
- [ ] Per table (`expense_groups`, `expenses`, `settlements`, `events`, `friendships`,
      `profiles`) and per command (select / insert / update / delete): the D10 policy table is
      the oracle — one `it()` per cell asserting allowed for the member/party/owner and denied
      (`PGRST` error or empty result) for the non-member and for anonymous; the `with check`
      clauses are asserted explicitly (creator not in `member_ids`, `paid_by` outside
      `member_ids`, a `splits[].userId` outside `member_ids`, `cardinality(users) <> 2`,
      recipient-only `status` change, a member removing themselves from `expense_groups`)
- [ ] Realtime: for each table, a subscription as `A` receives an insert by `A`, and a
      subscription as `B` receives nothing (RLS applies to `postgres_changes`); asserts every
      `SchemaMap` table is in `supabase_realtime` (`select * from pg_publication_tables`)
- [ ] Coverage guard: a test queries `pg_class.relrowsecurity` and `pg_policies` and asserts
      every table in `src/lib/data/schema-map.ts` has RLS enabled and ≥ 1 policy per command;
      asserts no policy body and no `check` constraint references the `extra` column (the
      Track D forward-compat guard, spec D9)
- [ ] Storage: `receipts` policies — `A` uploads under `expenses/<A's expense>/`, `B` cannot read
      it; `A` uploads `avatars/<A>.jpg`, `B` can read it but not overwrite it
- [ ] Track D forward-compat cases (tests only): a row of each table carrying the spec D9 keys in
      `extra` (`kind`/`settings`/`concepts`, `settings.budget`, `conceptId`/`settledAt`) is
      readable and writable by a member and denied to a non-member — the proof that Track D
      needs no migration
- [ ] `batch_write` under RLS: a batch containing one denied operation writes nothing (atomic,
      SECURITY INVOKER; `storage-adapter-contract.md` §3)
- [ ] ADR `docs/decisions/0002-canonical-schema-and-rls.md`: the collection → table → policy
      inventory (the `SchemaMap`), the `member_ids` array decision vs the junction-table +
      `is_member()` alternative (spec D10), the canonical query per collection
      (`array-contains` on `member_ids`/`users`, `==` on `group_id`/`extra.eventId`), "no policy
      or constraint inspects `extra`", the `settledAt`-in-`extra` decision, and the statement that
      a missing policy fails CI (coverage guard)
- [ ] Acceptance: the suite is green in CI against `supabase start` and red when any single
      policy is dropped (mutation check in the PR body); the ADR lists every table with its
      policies

### B3. Zod schemas + domain layer
- [ ] `src/schemas/`: re-export the universal types from `@cyber-eco/types` (`Expense`,
      `Settlement`, `ExpenseGroup`, `Friendship`, `SplitType`) and wrap them in Zod:
      `expense.ts` (`ExpenseSchema` = universal fields with `groupId: z.string().nullable()` and
      `memberIds: z.array(z.string()).min(1)` — the JustSplit row type of spec D10 — plus
      `extra: z.object({ eventId, conceptId, settledAt }).partial().passthrough()`), `settlement.ts`
      (`groupId` nullable, `extra: { expenseIds, eventId }`), `group.ts` (universal +
      `extra: { kind, settings, concepts }` opaque), `event.ts` (JustSplit-local: `id`, `name`,
      `description?`, `date`, `startDate?`, `endDate?`, `location?`, `groupId?`, `memberIds`,
      `preferredCurrency`, `kind: z.string()`, `createdBy`, timestamps, `extra`), `friendship.ts`
      (universal), `profile.ts` (the hub's `profiles` row; `preferences.preferredCurrency`).
      Timestamps are ISO strings on read (the adapter rehydrates `timestamptz` — no `Timestamp`
      union); `z.infer` types replace `src/types`
- [ ] Move pure logic to `src/domain/`: `expenseCalculator`, `formatters`, `csvExport`,
      `fileUtils`, `timeline/*`; split `currencyExchange` into `domain/currency.ts` (pure:
      `SUPPORTED_CURRENCIES`, `FALLBACK_RATES`, `getExchangeRate` with fetch + cache injected)
      and `lib/use-exchange-rate.ts` (hook). Consolidate on one `formatCurrency` (the
      symbol-based one used by 6 pages + `HoverCard` + `BalanceOverview`); `FinancialSummary`
      (the only Intl consumer) and its test switch to it
- [ ] `expenseCalculator` is **re-typed onto the universal `Expense`** (spec D10): both balance
      paths (formerly `src/utils/expenseCalculator.ts:36` and `:136`) consume `splits[].amount`
      instead of `amount / participants.length`; `participants` = `splits.map(s => s.userId)`;
      `settled` = `extra.settledAt != null`. This fixes the old share bug by construction; a
      `materializeSplits(amount, splitType, input)` helper (equal → remainder cents on the payer;
      percentage → rounded) is the only writer of `splits[].amount` and is used by B10/B14.
      Tests: equal results unchanged on the ported fixtures; exact 40/30/30; percentage 50/25/25;
      remainder-cent placement. Track D D2 adds the edge-case suite
- [ ] Port the 4 `src/utils/__tests__` suites + `src/__tests__/timelineCalculations.test.tsx` to
      Vitest via the D7 codemod (`vi.hoisted()` for `jest.mock` factories with outer refs,
      `global.fetch = vi.fn()`), adapting fixtures from `participants`/`splitMethod` to
      `splits[]`/`splitType`; add tests for `formatters` and `fileUtils`
- [ ] Copy Inceptor's `scripts/check-ts-pragmas.mjs` + `check:pragmas` script (in the B1 `check`
      umbrella) so missing `// @vitest-environment jsdom` pragmas fail `npm run check`
- [ ] Forward-compatible `extra` keys (spec D9; written by nobody before Track D): `group.ts`
      `extra.kind: z.string().optional()`, `extra.settings: z.record(z.string(),
      z.unknown()).optional()`, `extra.concepts: z.array(z.unknown()).optional()`; `event.ts`
      `extra.settings: z.record(z.string(), z.unknown()).optional()`; `expense.ts`
      `extra.conceptId: z.string().optional()`, `category: z.string().optional()` (string, never
      an enum). No `.default()` on any of them: derived defaults are Track D selectors
      (`parseKind`, `normalizeCategory`)
- [ ] Every read schema is `.passthrough()` (never `.strict()`); the write-input schemas
      (`CreateExpenseInput` etc.) `.omit()` the spec D9 `extra` keys until Track D D1 deletes the
      omit. Tests: (1) the write-input `extra` key set equals the declared list per collection —
      this mechanically enforces "no undeclared key reaches `extra`"; (2) a row with an unknown
      `extra` key survives parse → in-memory `repos.*.update` of one field → the unknown key is
      intact (`updateDocument` merges `extra`, B5a contract test)
- [ ] Synthetic fixtures under `src/tests/fixtures/*.synthetic.json`: `group.couple` (`extra.kind`,
      `settings`, `concepts`), `event.trip`, `expense.with-conceptId`, plus one row with an
      unknown `kind` and a non-taxonomy `category`; the round-trip test parses all of them
      without throwing; `supabase/seed.sql` (B2) is generated from the same fixtures
- [ ] `src/domain/categories.ts` stub exporting the five legacy keys (`food`, `transportation`,
      `accommodation`, `entertainment`, `other`) as the only options B10 may write; Track D D1
      replaces the file, not the form
- [ ] Test: schema round-trip against the synthetic fixtures and against rows read back from
      `supabase start` (the adapter's rehydration is part of the contract)
- [ ] Acceptance: `npm run test` ≥ 7 ported/new suites green; `extra` key-set and passthrough
      round-trip tests green; `expenseCalculator` share tests green

### B4. Auth: `@cyber-eco/auth` `<AuthProvider>` + store bridge + RouteGuard adapter (`risk:high`)
- [ ] `src/lib/data/adapter.ts` exports `authAdapter = new SupabaseAuthAdapter(client)` and
      `profileStore = new SupabaseProfileStore(client)` (`cybereco-hub/packages/supabase/src/auth/`);
      `src/components/islands/AuthIsland.tsx` = `<AuthProvider config={{ adapter: authAdapter,
      profileStore }}>` (`packages/auth/src/context/AuthContext.tsx`) + `<AuthBridge />`, a child
      that copies `onAuthStateChanged` into the Nano Stores. Because `AuthProvider` is React
      Context, every route island renders `AuthIsland` at its own root
      (`ErrorBoundary > AuthIsland > AuthGate > Content`); layout islands (`UserMenuIsland`)
      read the stores only
- [ ] `src/stores/auth.ts`: `$user` (`AuthUser | null`), `$authReady`, `$profile` (the
      `profiles` row); actions `signIn`, `signUp(email, password, displayName)`,
      `signInWithGoogle()` = `adapter.signInWithProvider('google')` (**redirect** flow —
      `signInWithOAuth`; the page unloads and supabase-js finishes the PKCE exchange on return,
      `detectSessionInUrl: true` from B2; `/auth/callback.astro` renders the skeleton and then
      `location.replace(withBase(next ?? '/'))`), `signOut`, `resetPassword(email, { redirectTo:
      withBase('/auth/reset-password/') })`, `updatePassword`, `updateDisplayProfile`
- [ ] Profile bootstrap: on the first authenticated `onAuthStateChanged`, `profileStore.get(uid)`
      → `profileStore.set(uid, { id, name, email, avatarUrl, apps: ['justsplit'], preferences:
      { preferredCurrency: 'USD' }, createdAt, updatedAt, lastLoginAt })` when missing (own-row
      RLS lets the client do it) before `$authReady` flips; `updateProfile` writes
      `profileStore.update` and mirrors `name`/`avatarUrl` into `adapter.updateDisplayProfile`.
      Test: a first Google sign-in creates the `profiles` row (RLS suite covers the policy; this
      test covers the flow against the memory adapter)
- [ ] `toGuardUser(user, profile)` returns `{ id: user.uid, roles: ['user'], flags: {} }`
      whenever `user` is non-null — roles come from the session, never from the user-writable
      `profiles` row (`isAdmin`, `permissions` there grant nothing in JustSplit); `profile` only
      feeds display data (name, avatar, preferredCurrency). Test: a user with no profile row still
      passes `<RouteGuard allow={['user']}>`; a profile row with `isAdmin: true` or
      `permissions: ['admin']` grants nothing
- [ ] `src/components/islands/AuthGate.tsx` — a readiness/navigation wrapper only; every
      allow/deny decision stays in `RouteGuard` (CLAUDE.md: `route-guard.tsx` is the only gating
      module): renders `Skeleton` while `!$authReady`; when `$authReady && !$user` runs
      `location.replace(withBase('/landing/'))` (parity with `ProtectedRoute.tsx`; PUBLIC_PATHS
      `/landing`, `/auth/*`, `/about`, `/help` stay public); otherwise `<RouteGuard
      user={toGuardUser($user, $profile)} allow={['user']} fallback={<SignInPrompt/>}>{children}</RouteGuard>`.
      The guard is UX only; RLS is the authorization (`examples/static-app/README.md`)
      - Alternative (lower priority): redirect to `/auth/signin/?next=<path>` instead of `/landing`;
        record whichever is chosen in ADR 0003
- [ ] Redirect rules: unauthenticated on a guarded page → `/landing` (current `ProtectedRoute`
      behaviour); signed-in on `/auth/*` → decide `/profile` (today) or `/` and record it in ADR
      0003; B8b's `/` follows the same rule
- [ ] Copy `src/components/islands/LoginForm.tsx` (+ `.test.tsx`),
      `src/components/ui/password-input.tsx` (+ `.behavior.test.tsx`), `src/schemas/login.ts`
      (+ `.test.ts`) from Inceptor; replace `handleLogin` with `signIn()` from
      `src/stores/auth.ts`, add a Google button calling `signInWithGoogle()`, and add a sibling
      `SignUpForm` on the same pattern (schema `RegisterSchema` mirroring
      `docs/recipes/auth-supabase.md` §4, with `displayName`). Mount both as `client:only="react"`
      with a fallback slot on `auth/signin.astro` / `auth/signup.astro` (start from
      `src/pages/login.astro`, swapping its `client:visible`). No Facebook/Twitter buttons, no
      `linkProvider`
- [ ] `/auth/reset-password.astro` + `ResetPasswordIsland` (request form → `resetPassword`; on
      return with a recovery session → `updatePassword` form; today's link from signin is dead)
- [ ] ADR `docs/decisions/0003-cybereco-auth-islands.md` with the Stakeholder Analysis section
      (centinela §5.1 requires it for `/auth` routes): one `AuthProvider` per island tree + store
      bridge, redirect-only OAuth, roles from the session
- [ ] Tests: (1) `AuthBridge` writes `$user`/`$profile` and unsubscribes on unmount; (2)
      `hasFlag` absent-field denies; (3) AuthGate renders Skeleton while not ready and does not
      redirect; (4) redirects to `/landing` once ready with no user; (5) RouteGuard denies an
      unknown role even when `$user` is set; port `src/app/client-layout-wrapper.test.tsx`
      (guard/redirect behaviour); (6) a build test asserts no bare `process.env` reaches the
      bundle (the `vite.define` from B1)
- [ ] Acceptance: `/auth/signin` (email+password and Google) works against `supabase start`
      (Google needs the local GoTrue provider config; email+password is the CI path). On the
      staging site, Google sign-in depends on the staging origin and
      `/JustSplit-staging/auth/callback/` being registered in the Supabase project's redirect
      URLs and in Google Cloud — document in `docs/runbooks/staging.md`. `/` redirects to
      `/landing` when logged out

### B5a. Repos over `StorageAdapter` + `SchemaMap` + Realtime → TanStack Query (`risk:high`)
- [ ] `src/lib/data/schema-map.ts`: the `SchemaMap` of spec D10 (`expense_groups`, `expenses`,
      `settlements`, `events`, `friendships`, `profiles` → table, `idColumn: 'id'`, `columnMap`
      camelCase → snake_case, `jsonbColumn: 'extra'`, `metadata: { createdAt: { field:
      'createdAt', column: 'created_at', strategy: 'server' }, updatedAt: … }`) per
      `cybereco-hub/docs/design/schema-map-strategy.md`; a test asserts its table list equals the
      tables created by `supabase/migrations/` and the tables the B2b coverage guard sees
- [ ] `src/lib/data/repos/{groups,expenses,settlements,events,friendships}.ts`: plain async
      functions over the `StorageAdapter` interface **only** (`getDocument`, `setDocument`,
      `updateDocument`, `deleteDocument`, `query`, `batchWrite`, `subscribeToQuery`,
      `generateId`; types from `@cyber-eco/types`), Zod-validated input (B3). Canonical queries
      (ADR 0002): expenses / settlements / events / groups → `[{ field: 'memberIds', operator:
      'array-contains', value: uid }]`; friendships → `users array-contains uid`; group expenses →
      `groupId == id`; event expenses → `extra.eventId == id` (the adapter maps the jsonb path).
      Writers always set `memberIds` (group context → the group's `memberIds`; otherwise the
      split participants ∪ payer) and `createdBy = uid`; `updateDocument` patches are partial
- [ ] `src/lib/data/hooks/`: `useExpenses(uid)`, `useGroup(id)`, … = `useQuery` with
      `queryKey: [collection, scope]`, `staleTime` per collection; `useCreateExpense()` etc. =
      `useMutation` invalidating the affected keys; Realtime: `useLiveQuery(key, collection,
      filters)` subscribes `adapter.subscribeToQuery` inside `useEffect` with `createDisposer()`
      and writes `queryClient.setQueryData(key, rows)` on every emission; torn down on unmount and
      on `$user` change. Hooks are the only thing islands import from `src/lib/data`
- [ ] Listener-leak test: a Vitest fakes `$user` transitions `null → A → B → null` and asserts
      exactly one live subscription per key at any time (the memory adapter counts channels);
      StrictMode double-mount leaves one
- [ ] `src/tests/memory-adapter.ts`: in-memory `StorageAdapter` implementing every method
      (filters incl. `array-contains`, `batchWrite` atomicity, `subscribeToQuery` emitting on
      writes); the contract suite `src/tests/storage-adapter-contract.test.ts`
      (`storage-adapter-contract.md` §5: `batchWrite` atomicity, fetch-then-listen initial
      emission, `serverTimestamp` rehydration as ISO, **`updateDocument` merges the `extra`
      overflow**) runs against the memory adapter always and against the real adapter when
      `PUBLIC_SUPABASE_LOCAL=true` (CI job with `supabase start`)
- [ ] **Contingency (conditional — only if relational mode is not merged in `@cyber-eco/supabase`
      when this issue starts, spec D1):** `src/lib/data/relational-adapter.ts` implements
      `StorageAdapter` over `@supabase/supabase-js` per the `SchemaMap` design — columns from
      `columnMap`, unknown fields into `extra`, `query` → PostgREST filters (`eq/neq/lt/lte/gt/gte/
      in`, `array-contains` → `cs` on `text[]` or `@>` on jsonb), `batchWrite` → `rpc('batch_write')`,
      `subscribeToQuery` → fetch then `channel().on('postgres_changes', { table })` filtered
      client-side by the same predicate, `serverTimestamp()` → omit the column so `default now()`
      applies; `array-contains-any` throws (unused). Same contract suite; `adapter.ts` selects it.
      Upstreamed as Track C' H2 when gate C1 clears; deleted here afterwards
- [ ] Port `src/context/__tests__/AppContext.test.tsx` against the hooks + memory adapter
- [ ] ADR `docs/decisions/0004-tanstack-query-over-storage-adapter.md` incl. Stakeholder Analysis
      (Query cache persisted to IndexedDB = user data on the device; cleared on sign-out; no
      offline writes in v1): layering per `tradepilot-pilot-integration.md` Seam 2, no
      `DataLayerService`, `permissions: { enabled: false }`, Realtime → `setQueryData`, the
      contingency adapter and its upstreaming
- [ ] Acceptance: an island using `useExpenses` shows live rows from the local seed and updates
      when a second client inserts; contract suite green against the memory adapter and the real
      one; listener-leak test green; `grep -rn "@cyber-eco/supabase\|@supabase/supabase-js" src
      --include=*.ts --include=*.tsx` hits only `src/lib/data/{client,adapter,relational-adapter}.ts`

### B5b. Supabase Storage helpers + `preferences.ts` + `notifications.ts` (store only) (`risk:high`)
- [ ] ADR `docs/decisions/0005-supabase-storage-images.md`: private bucket `receipts` with the
      spec D10 object-path layout and `storage.objects` policies (B2 migration) vs base64 in
      `extra` (zero backend surface, row bloat). Default: Storage, as below
- [ ] `src/lib/data/storage.ts`: `uploadReceipt(expenseId, file)` →
      `expenses/{expenseId}/{uuid}.jpg`, `uploadAvatar(uid, file)` → `avatars/{uid}.jpg` (client-side
      resize to ≤ 1600 px / ≤ 1 MiB before upload, `fileUtils`), `signedUrl(path, 3600)` with a
      small in-memory cache; `Expense.images[]` and `profiles."avatarUrl"` store the object path;
      an `<ReceiptImage path>` component resolves it. Policies are tested in the B2b suite
- [ ] `src/stores/preferences.ts`: `$preferredCurrency` derived from
      `$profile.preferences.preferredCurrency` (`profiles.preferences` is the source of truth),
      mirrored for first paint with `@nanostores/persistent` (added in B1; the `stores/theme.ts`
      `onMount` + `localStorage` pattern is the alternative) and `$rateCache` (6 h exchange-rate
      cache under `justsplit:rates`)
- [ ] `src/stores/notifications.ts` (toast queue): thin wrapper over Inceptor's `toast()`;
      B8–B16 fire toasts via `notifications.ts` only, so the topology decided in B17b can change
      without touching feature islands
- [ ] Tests: `$preferredCurrency` follows `$profile`; storage helper path layout and resize;
      signed-URL cache expiry
- [ ] Acceptance: an upload against `supabase start` lands under `receipts/expenses/…` and renders
      through a signed URL; the B2b storage cases stay green

### B6. Layout, header, theme, FeedbackFAB
- [ ] `BaseLayout.astro` re-branded (title, JSON-LD `WebApplication`, description); `Header.astro`
      with nav + `UserMenuIsland` (avatar, sign-out) + `ThemeToggle`; `FeedbackFAB` wired to
      `ArtemioPadilla/JustSplit` issues; port `src/components/Header/__tests__/Header.test.tsx`
- [ ] `global.css` tokens: JustSplit palette mapped onto shadcn CSS vars, from
      `src/styles/theme.css` (74 custom properties, primary token source), then
      `src/app/globals.css` (33) and `docs/design/style-guide.md`
- [ ] Every route island wraps its inner component in `<ErrorBoundary name="<Island>">` inside
      the island file (Inceptor pattern, see `LoginForm.tsx`); `HydrationCanary` stays in
      `BaseLayout` only for the SSR'd islands (`UserMenuIsland`, `ToasterIsland`); it is inert
      for `client:only` islands
- [ ] Acceptance: axe smoke clean on `/landing`; theme persists across reloads without flash

### B7. Static pages
- [ ] `/landing`, `/about`, `/help` as Astro pages with no route island; `motion/react` only where
      the old `framer-motion` animations are worth keeping (otherwise `tailwindcss-motion`)
- [ ] Fix dead links: `/auth/register` → `/auth/signup` (landing ×2, about),
      `/auth/reset-password` → new page (B4); remove `/tos` `/privacy` `/contact` from the
      public-path list (`ProtectedRoute` lines 8-16)
- [ ] Acceptance: `dist/landing/index.html` contains no `<astro-island>` for a route island and
      references no chunk that includes `@supabase/` or `@cyber-eco/` (assert with a Vitest that
      greps the built HTML + `dist/_astro/*.js` manifest); layout-level JS (theme, FeedbackFAB, PWA islands) is
      allowed and budgeted at ≤ 40 kB gz

### Phase 2 — Feature islands (one issue each; all `type:feat`, `phase-2`)

Each island: `src/components/islands/<Name>Island.tsx` + feature widgets under
`src/components/features/<domain>/`, shadcn components only, `AuthGate`/`RouteGuard`-wrapped
(`ErrorBoundary > AuthIsland > AuthGate > Content`, B4), data only through the B5a hooks, mounted `client:only="react"` with a fallback-slot
skeleton, Vitest tests ported/rewritten from the corresponding Jest suites, toasts only via
`notifications.ts`, appears in `/showcase` if it introduces a reusable widget.

**Jest suite → owning task** (every row must be ticked in B18):

| Jest suite | Task |
|---|---|
| `src/utils/__tests__/*` (4) + `src/__tests__/timelineCalculations.test.tsx` | B3 |
| `src/app/client-layout-wrapper.test.tsx` | B4 |
| `src/context/__tests__/AppContext.test.tsx` | B5a |
| `src/components/Header/__tests__/Header.test.tsx` | B6 |
| `src/components/Dashboard/__tests__/*` (10; 2 chart tests) | B8a (charts) / B8b (widgets; `UserSummary`'s test follows that component's decision) |
| `src/app/__tests__/page.test.tsx` (Home) | B8b |
| `src/app/expenses/__tests__/ExpenseDetail.test.tsx` | B9 |
| `src/components/ImageUploader/__tests__/ImageUploader.test.tsx` | B10 |
| `src/__tests__/{hoverCard,timeline,timelineEvents,postEventExpenses,expenseGroups}.test.tsx` | B11a |
| `src/app/events/__tests__/EventDetail.test.tsx`, `src/app/__tests__/page.test.tsx` (EventList part) | B11b |
| `src/context/__tests__/SettlementCurrency.test.tsx` | B14 |
| `src/components/ui/__tests__/{CurrencySelector,EditableText}.test.tsx`, `src/__tests__/progressBar.test.tsx` | B16 |
| `src/app/__tests__/exampleTest.tsx` | drop |

### B8a. Recharts wrappers + chart widgets
- [ ] `MonthlyTrendsChart`, `ExpenseDistribution`, `BalanceLine` rebuilt on `ui/charts/`
      Recharts wrappers (nothing to port — chart.js is installed but unused; today's charts are
      hand-rolled CSS/SVG), lazy chunk asserted by a build test
- [ ] Sub-decision per widget (recorded in the issue): `MonthlyTrends` / `ExpenseDistribution` /
      `BalanceOverview` / `UpcomingEvents` get real selectors over the B5a hooks or are dropped
      (today `page.tsx` imports the first two but never renders them and feeds the others
      placeholder state); if `ExpenseDistribution` is kept, group by the raw `category` string for
      now — Track D D8 re-keys it to the taxonomy
- [ ] Port the 2 existing chart tests + a new `BalanceLine` test
### B8b. Dashboard island (`/`)
- [ ] `DashboardIsland` composing the 9 non-chart widgets of the 11 dashboard components
      (`UserSummary` is unused by any page — keep or drop, its test follows); `DashboardHeader`
      keeps CSV export / currency selector / refresh-rates (`clearExchangeRateCache` from
      `domain/currency.ts`); financial summary fed real selectors
- [ ] `src/pages/index.astro` = shell with a static `DashboardSkeleton` in the island's
      `slot="fallback"` + `<DashboardIsland client:only="react" />` wrapped by `AuthGate`; the
      island redirects to `/landing` when `$authReady && !$user` (B4). Landing content lives
      only in `landing.astro`
- [ ] Port the 8 non-chart dashboard tests + `page.test.tsx` (Home part)
- [ ] Acceptance: anonymous visit to `/` lands on `/landing` within one navigation; `/landing`
      HTML contains no supabase-js / `@cyber-eco` chunk
### B9. Expense list + detail islands (`/expenses/list`, `/expenses/view`)
- [ ] `data-table` with URL-state sort/filter (Inceptor `use-data-table-url-state`; the full
      import closure was grafted in B1, or is added here if B1 chose the alternative)
- [ ] Delete expense (new — no page calls `deleteExpense` today) via `repos.expenses.remove`
      (RLS: creator or payer)
- [ ] Port `src/app/expenses/__tests__/ExpenseDetail.test.tsx`
### B10. Expense form island (`/expenses/new`, `/expenses/edit`)
- [ ] `ExpenseSplitter` rewritten without MUI over the universal `splitType` (equal / exact /
      percentage) — the form edits shares, `materializeSplits` (B3) writes `splits[].amount`;
      image upload via `FileUpload` + B5b storage helpers, category on create (new — today only
      edit has it), `DatePicker` (`date-picker.tsx`)
- [ ] Participant picker = registered users only (see B13 ADR): the group's members when
      `?group=` is set, otherwise accepted friends (`friendships`) + self; no free-text participant
      creation; `paidBy` ∈ `memberIds` always (not necessarily in `splits`, spec D10)
- [ ] Category select reads its five options from the B3 `src/domain/categories.ts` stub; keep the
      `?group=`/`?event=` query-param plumbing that today's group/event pages already link:
      `?group=` pre-selects the group's members and currency and **writes `groupId` +
      `memberIds` = the group's `memberIds`** (real columns since B2; this is how B12 lists group
      expenses); `?event=` pre-selects the event's members and `preferredCurrency` and writes
      `extra.eventId`; Track D D4 extends the defaults per kind
- [ ] Edit re-materialises `splits[]` when amount or shares change; `extra.settledAt` is preserved
      (partial `updateDocument`)
- [ ] Port `src/components/ImageUploader/__tests__/ImageUploader.test.tsx`
### B11a. `EventTimeline` widget port + timeline suites
- [ ] `src/components/features/events/EventTimeline.tsx` takes `users`, `onNavigate`, `convert`
      as props (no store access, no portal; positioning from Inceptor `hover-card`); named to
      avoid colliding with Inceptor's `ui/timeline.tsx` (vertical feed)
      - Alternative (lower priority): extend `ui/timeline.tsx` with expense/event item renderers
        instead of a separate widget — only if its `items` API fits without forking
- [ ] Port `src/__tests__/{timeline,timelineEvents,postEventExpenses,hoverCard,expenseGroups}.test.tsx`
### B11b. Events islands (list, new, view, edit)
- [ ] `events` is the JustSplit-local table (spec D10, B2/B3): list = `events where memberIds
      array-contains uid`; creation writes `memberIds` (creator included), `kind: 'event'`,
      `preferredCurrency`, optional `groupId` from `?group=`, `createdBy`; event expenses =
      `expenses where extra.eventId == id` (B10 writes `extra.eventId`)
- [ ] Participant picker = registered users only (see B13 ADR); no free-text participant creation
- [ ] Event → settlements deep link `/settlements?event=<id>`
- [ ] Port `EventDetail.test.tsx` + `page.test.tsx` (EventList part)
### B12. Groups islands (list, new, view)
- [ ] Queries per ADR 0002: `expense_groups` by `memberIds array-contains uid`; creation writes
      the universal `ExpenseGroup` (`type: 'friends'` until Track D, `currency` = creator's
      preferred, `members[]` with `displayName` denormalised from `find_profile_by_email` /
      friendships, `memberIds`, `adminIds: [uid]`, `settings: { defaultSplitType: 'equal',
      simplifyDebts: true, maxMembers: 50 }`, `totalExpenses: 0`, `createdBy`)
- [ ] Group expenses through `useGroupExpenses(id)` = `expenses where groupId == id` (indexed
      column, RLS-filtered; no client-side union); group events = `events where groupId == id`;
      the "add expense" button links `/expenses/new?group=<id>` (B10 writes `groupId` +
      `memberIds`). Member management: admins edit `memberIds`/`members[]`/`adminIds` through a
      partial `updateDocument` (RLS: member, actor stays in `memberIds`); leaving is an admin
      action in v1 (spec D10)
- [ ] `totalExpenses` is a display cache: the expense create/delete mutations update it in the
      same `batchWrite`; the detail page also shows the sum of the loaded rows and a test asserts
      both agree on the seed. Legacy-kind logic (`parseKind`) only from Track D on — here the
      page has no kind logic
### B13. Friends islands (list, add, view) — friendship request flow (`risk:high`)
- [ ] Decision (ADR `docs/decisions/0006-registered-participants.md`): participants/friends must
      be registered users found by exact email through `find_profile_by_email` (B2; `profiles`
      RLS is own-row, so there is no browsable users list — today's "add by name" dispatched a
      local-only `ADD_USER` that nothing persisted). `/friends/add` = "invite by email": a
      registered email creates the `friendships` row (`status: 'pending'`, `requestedBy: uid`,
      `users: [uid, other]`); an unregistered one offers a mailto/copy-link invitation
- [ ] Rows are the universal `Friendship` (`@cyber-eco/types`, `packages/types/src/friendship.ts`);
      accept/reject = recipient-only `status` update; remove = delete by either party — all
      enforced by the `friendships` policies shipped in the **B2 migration** and asserted by the
      B2b suite (`cardinality(users) = 2`, `requested_by = uid` on insert, `users`/`requested_by`
      immutable, `status` changes only by the recipient). This issue adds no migration
- [ ] Friend detail: shared expenses = `expenses where memberIds array-contains uid` filtered
      client-side to rows that also contain the friend; balances from `expenseCalculator`
- [ ] Tests: request/accept/reject/remove against the memory adapter; unregistered email path;
      the RLS cases for `friendships` stay green
### B14. Settlements island (`/settlements`, reads `?event=` from `location.search`)
- [ ] Tabs pending / balance / history (port from `settlements/page.tsx`)
- [ ] "Settle up" calls `repos.settlements.settle()` → one `batchWrite`: `set` a universal
      `Settlement` `{ id, groupId (null outside a group scope), fromUserId, toUserId, amount,
      currency, date, memberIds: [from, to], createdBy, extra: { expenseIds, eventId? } }` **and**
      `update` each settled expense with `extra.settledAt = now` (mirrors
      `AppContext.addSettlement`, which the current UI never calls — today it dispatches a
      local-only `ADD_SETTLEMENT` that the next snapshot wipes). Atomic under RLS via
      `batch_write`; a denied operation rolls back the whole batch and surfaces a toast
- [ ] `useSettlements(uid)` = `settlements where memberIds array-contains uid` (one query; both
      directions, ADR 0002)
- [ ] `?group=` (already linked from today's group page) is out of scope here: the island ignores
      it with a visible "próximamente" note; Track D D7 implements the group scope and writes
      `settlement.groupId`
- [ ] `expenseCalculator` minimal-transactions, multi-currency conversion (over `splits[]`, B3)
- [ ] Tests: settle-up persists and marks expenses settled in one batch (port
      `context/__tests__/SettlementCurrency.test.tsx` against the memory adapter); a rejected
      batch leaves every expense unsettled; history lists settlements for both directions
### B15. Profile island — editable profile, avatar upload, preferred currency
- [ ] `updateProfile` = `profileStore.update(uid, partial)` + `adapter.updateDisplayProfile`
      (B4); avatar via `FileUpload` + B5b `uploadAvatar` (object path in `profiles."avatarUrl"`);
      `preferences.preferredCurrency` written to the profile (source of truth); "Restablecer
      datos locales" button wired in B17b
- [ ] Account: change password (`updatePassword`), sign out everywhere (`signOut({ scope:
      'global' })` through the adapter if exposed, else local)
### B16. Currency exchange ticker + `CurrencySelector` + shared widgets (`risk:high`)
- [ ] Harvest check: `src/components/ui/combobox.tsx` is in the B1 manifest (not in the
      create-inceptor-app core set; `select` is); extend `items` to `{code,symbol,name}` with a
      `renderItem`
- [ ] Ticker reads `$rateCache`/`$preferredCurrency` (B5b) and `domain/currency.ts` (B3)
- [ ] Shared widgets: `ProgressBar` (`progress-bar.tsx`), `Editable` (`editable.tsx`) replacing
      `EditableText` (inline rename in 6 pages); port
      `src/components/ui/__tests__/{CurrencySelector,EditableText}.test.tsx` and
      `src/__tests__/progressBar.test.tsx` against them; all three in `/showcase`
- [ ] Tag `risk:high` (non-same-origin fetch to the exchange-rate API); ADR
      `docs/decisions/0007-exchange-rate-provider.md` with Stakeholder Analysis
### B17a. CSV export
- [ ] `domain/csvExport` wired to a `download-trigger`; entry in `DashboardHeader` (B8b)
### B17b. Toaster island wiring + local-cache reset
- [ ] Vitest (`@vitest-environment jsdom`): two separate `createRoot`s on one document — root B
      mounts `<Toaster />`, root A calls `toast()`; assert the toast renders in B. Record the
      result and the chosen topology (one layout-level `<ToasterIsland client:idle />` vs one
      `<Toaster />` per route island drained from `$toasts`) in ADR
      `docs/decisions/0008-toast-topology-and-cache-reset.md`; wire it
- [ ] Local-cache reset (replaces the Firestore IndexedDB corruption-recovery flow, which has no
      equivalent need): `src/lib/data/reset-local.ts` clears the TanStack Query idb-keyval
      persister store, `localStorage` keys under `justsplit:*`, the supabase-js session storage
      (after `signOut`), and unregisters B19's service worker; exposed as "Restablecer datos
      locales" in the profile island (B15) and as the recovery action of `ErrorBoundary` when a
      persister hydration error is caught. The ADR records why no corruption detector is ported
      (the Query cache is disposable; a failed hydration falls back to the network)
- [ ] Tests: reset clears every store and calls `unregister`; hydration failure renders the
      recovery action and still fetches
### Phase 3 — Cutover

### B18. Feature-parity audit
- [ ] Walk spec §6 checklist on the staging Pages site (dedicated test account), desktop + 375 px
      viewport; file an issue per gap and block cutover on them
- [ ] Every row of the Jest suite → owning task table is ticked
- [ ] Measure time-to-data on a warm navigation ≤ 300 ms on the staging site (Query persister)
- [ ] Run `npm run perf` (`@lhci/cli`) against the staging site URL (not CI); the B2b RLS suite
      and the B5a contract suite are green against the **`justsplit` project** (one manual run
      with `PUBLIC_SUPABASE_LOCAL=false` and a throwaway test account), not only against
      `supabase start`
### B19. PWA + performance
- [ ] `@vite-pwa/astro` manifest re-branded, offline shell; the `@supabase/supabase-js` +
      `@cyber-eco/*` chunk isolated and measured (`vite.build.rollupOptions.manualChunks`)
- [ ] Workbox: `navigateFallback: withBase('/404.html')` so an offline navigation to any app
      route gets the shell that mounts the route island (spec D2); `navigateFallbackDenylist:
      [/\/auth\/v1\//, /\/storage\/v1\//, /\/rest\/v1\//, /\/realtime\/v1\//]` so Supabase
      endpoints on the same host are never captured (they are cross-origin anyway; the denylist
      is belt-and-braces); `runtimeCaching`: `NetworkOnly` for `*.supabase.co`; add a test that a
      fetch for `/expenses/abc` offline is answered by the shell and a fetch to `/rest/v1/*` is not
- [ ] Adapt `lighthouse-budgets.json` + `.lighthouserc.json` (grafted in B1) and split budgets by
      path: `/landing`, `/about`, `/help` keep Inceptor's 150 kB script budget; `/`,
      `/expenses/*`, `/events/*`, `/groups/*`, `/friends/*`, `/settlements`, `/profile` get an
      explicit budget set from the measured size of the supabase-js + `@cyber-eco` chunk plus
      the route island (expected well under the old firebase figure; write the measured numbers
      into the JSON with a comment naming the chunk). Point `.lighthouserc.json` URLs at
      `/landing/`, `/auth/signin/`, `/` (unauthenticated shell), all under the staging base.
      `@lhci/cli` devDep + `perf` script (as in Inceptor's `package.json`); budgets are run in
      B18 against the staging site, not in CI
### B20. Cutover PR `inceptor → main` and Firebase retirement (`risk:high`)
- [ ] Before merging: `firebase apphosting:backends:list --project justsplit-eef51`; if a backend
      is connected to this repo, disconnect it (or it auto-builds `main` after the merge);
      confirm which origin the custom domain (if any) points to today
- [ ] Merge `inceptor → main`; `deploy.yml` publishes the production Pages site; `db-migrate.yml`
      has already applied every migration (the project is shared with staging). Then DNS: the
      custom domain's CNAME → `artemiopadilla.github.io`, `CNAME` file in `public/`, HTTPS
      enforced in the Pages settings, `ASTRO_BASE` secret set to `/`, Supabase redirect URLs and
      Google OAuth origins updated to the production domain (owner actions, in the runbook). Or,
      without a domain: production is `https://artemiopadilla.github.io/JustSplit/` and
      `ASTRO_BASE` stays `/JustSplit`
- [ ] Delete the last Next references in docs; `CHANGELOG.md` entry; delete `firebase.json`,
      `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `src/firebase/` (already gone
      with `src/` in B1), `apphosting*.yaml` (A1 deferred them here)
- [ ] **Retire Firebase — day 0 to day 14** (owner actions, `docs/runbooks/firebase-retirement.md`):
      day 0 — Firebase Hosting site keeps serving the old build only for rollback; day 0 — disable
      Firebase Auth sign-ups (Authentication → Settings → user actions), delete the Hosting
      preview channels, delete the App Hosting backend if any; day 1 — `firebase functions:list`
      and `firebase functions:delete <ssr function> --region us-central1`; day 14, if no rollback
      — `firebase hosting:disable`, delete the Firestore database (export first to a private
      archive, then delete: nothing is imported anywhere), disable Auth, and delete project
      `justsplit-eef51` (Project settings → Delete project; 30-day Google grace period is the
      last safety net). Log each step with its date in the runbook
- [ ] ADR `docs/decisions/0009-cutover-and-firebase-retirement.md`: rollback = re-point the
      domain to Firebase Hosting within the 14-day window (a `git revert` cannot bring the Next
      SSR site back on Pages); after day 14 there is no rollback and the ADR says so; Stakeholder
      Analysis (users lose nothing: no data existed that they keep; the old site is a dead end
      once Auth is disabled — the landing page of the old build is replaced by a static "we
      moved" page pushed as the last Firebase Hosting deploy on day 0)
- [ ] Acceptance: production Pages site serves the Astro app on the chosen origin; Google sign-in
      works there; `db-migrate.yml` is green on `main`; the Firebase project is in its 14-day
      window with sign-ups disabled and the "we moved" page deployed
### B21. Post-cutover monitoring
- [ ] 14-day watch: GitHub Pages deploy status, `FeedbackFAB` issues, Sentry (optional, Inceptor
      `sentry.ts` guarded, grafted in B1), Supabase dashboard (auth errors, RLS denials in the
      Postgres logs, Realtime connections); day 14: execute the last retirement step of B20 and
      close the milestone
### B22. Cleanup
- [ ] Delete the `inceptor` branch and `deploy-staging.yml` (or keep staging as a permanent
      pre-production site — decide and record in ADR 0009); archive `docs/refactor-plan.md`;
      update `ROADMAP.md`; delete `src/lib/data/relational-adapter.ts` once H2 is published and
      `adapter.ts` uses the upstream relational mode

---

## Track C — Upstream to Inceptor (so this is reusable for the next project)

### C1. `docs/recipes/data-cybereco-supabase.md`
- [ ] Sibling of `auth-supabase.md`: `.npmrc` + GitHub Packages token, guarded client,
      `@cyber-eco/auth` `<AuthProvider>` inside each island tree + Nano Store bridge, `vite.define`
      for `process.env`, `RouteGuard` adapter (roles from the session; guard is UX, RLS is the
      authorization), `SchemaMap` + dbmate migrations + `db-migrate.yml`, the `member_ids` RLS
      pattern with the coverage-guard test, repos over `StorageAdapter` → TanStack Query hooks
      (per-island `QueryClient` + idb persister), `subscribeToQuery` → `setQueryData` with
      `createDisposer()`, the `404.astro` shell for client-only dynamic routes on GitHub Pages,
      Supabase Storage with signed URLs, `navigateFallback` to the shell
### C2. `docs/recipes/adopt-existing-app.md` (brownfield playbook)
- [ ] The A/B/C track structure of this plan generalized: inventory template (incl. "decide first
      whether any data is worth migrating — a clean schema removes a whole class of work"),
      decision list (D1–D8, D10 as questions), parity-checklist template, Jest→Vitest codemod
      notes, cutover/retirement pattern for a backend that is replaced rather than kept
### C3. `scripts/init.mjs --into <existing-repo>` (optional) + init.mjs fixes
- [ ] init.mjs copies the `data-table.tsx` import closure (and `react-day-picker`), and offers
      `--data cybereco-supabase` to emit `.npmrc`, `src/lib/data/{client,adapter,schema-map}.ts`
      stubs, `supabase/migrations/` with the `profiles` file and `db-migrate.yml`
- [ ] Layer-in mode that grafts the scaffold into an existing repo instead of refusing, reusing
      the `add-tauri.mjs` merge-into-existing-project style; test in `src/tests/`

---

## Track C' — Upstream to `cybereco-hub` (the data layer side of this migration)

Issues live in `ArtemioPadilla/cybereco-hub`, milestone `v0.6 - JustSplit consumer`, the hub's own
labels and loop. H2 is **gated on the hub's gate C1** (`docs/ROADMAP-EPICS-STORIES-TASKS.md`:
Story 0.3, Hub deploy to Render, an owner action) and is not on JustSplit's critical path (spec D1
contingency).

### H1. Written consumer commitment: JustSplit (satisfies ADR-008 gate 1)
- [ ] Add JustSplit to `docs/adr/ADR-008-supabase-storage-adapter.md` as the committed consumer,
      linking this spec (`docs/superpowers/specs/2026-09-18-inceptor-migration-design.md` D1/D10)
      and the `SchemaMap` it needs (six tables, `extra` overflow, `member_ids text[]`,
      `array-contains` on arrays and jsonb, `metadata.strategy: 'server'`, relational
      `batch_write`); record the requested tiny type changes (`Expense.groupId` /
      `Settlement.groupId` optional, `memberIds` required, `ExpenseGroup.type` widened or
      documented as app-mapped) as a follow-up issue, not a blocker
- [ ] Update `docs/ROADMAP-EPICS-STORIES-TASKS.md` (the consumer story) and `docs/OWNER-ACTIONS.md`
      (Story 0.3 now unblocks a named consumer)
### H2. Relational mode (`SchemaMap`) in `@cyber-eco/supabase` — gated on C1
- [ ] Implement `docs/design/schema-map-strategy.md` in `packages/supabase/src/SupabaseStorageAdapter.ts`
      (constructor option `schemaMap`; per-collection table/columns/`jsonbColumn`/`metadata`;
      `array-contains` on `text[]` and jsonb; `subscribeToQuery` per table; relational
      `batch_write` migration in `packages/supabase/db/migrations/`), keeping document mode as the
      default; contract tests per `docs/design/storage-adapter-contract.md` §5 against
      `supabase start`; publish `0.3.0` to GitHub Packages
- [ ] Alternative path: upstream JustSplit's contingency `src/lib/data/relational-adapter.ts`
      (same contract suite already green) and reconcile naming with the design doc
- [ ] Acceptance: JustSplit `adapter.ts` switches to the upstream adapter with no repo change and
      its contract + RLS suites stay green
### H3. `examples/static-app-supabase` (Inceptor + Supabase adapters)
- [ ] Sibling of `examples/static-app`: an Inceptor-generated static app wired to
      `SupabaseAuthAdapter` + `SupabaseProfileStore` + relational-mode `SupabaseStorageAdapter`
      over one `member_ids`-guarded table, `vite.define` block, dbmate migration, RLS test, GitHub
      Pages `deploy.yml`; `README.md` links Inceptor's `docs/recipes/data-cybereco-supabase.md` (C1)
      as the canonical recipe

---

## Track D — Relationship kinds, categories and conceptos (post-cutover)

Spec D9. Starts after B22, on `main` (no integration branch), branch `phase-4/issue-NNN-slug`,
milestone `v0.7 - Relationship kinds`, label `phase-4`, one PR per issue through the same
prometeo → forja → centinela loop, `npm run check` + the B2b RLS suite green on every PR.
**Track D is not part of the migration's definition of done.** Rules of the track, all inherited
from spec D9 and enforced by tests that already exist after B2b/B3/B5a:

- No migration: no new table, column, index, policy or server-side code; every new field is a key
  in the `extra` jsonb overflow of an existing table or a write to a column that exists since B2
  (`expenses.group_id`, `settlements.group_id`, `events.kind`). Every PR keeps the B2b coverage
  guard ("no policy or constraint inspects `extra`") and the per-table Track D RLS cases green.
- Stored strings are never Zod enums (`parseKind`/`normalizeCategory` fall back); read schemas stay
  `.passthrough()`; writes are partial `updateDocument` (merging `extra`) or one `batchWrite`;
  the write-input `extra` key-set test allows exactly the declared spec D9 keys.
- Group scoping is the indexed `groupId == id` query; no client-side union, no `expenseIds` array.
- Every new widget appears in `/showcase`; every reminder/budget surface passes the
  `.claude/checklists/ethics` list (informational, dismissible, no push); staging smoke stays on
  the dedicated test account — couple/trip demo data comes from `supabase/seed.sql`.

**"Conceptos" reading (fixed here and in spec D9, not reopened per issue):** the Spanish accounting
sense — a named, reusable line item (rubro) between the category and the free-text description
(*Renta* under `rent`), stored as `expense_groups.extra.concepts[]` + `expenses.extra.conceptId`
(D9, with the label-only step in D4). The product-feature reading (budgets, recurring expenses,
period close) is scoped to one optional `extra.settings.budget` (D10) and a client-computed due list
(D11); no period-close entity is built.

Increments: **1** (D1–D8: kinds, categories, couple + trip, group-scoped settlements, dashboard),
**2** (D9: conceptos), **3** (D10: budgets), **4** (D11: recurring due list), then D12 (docs).
D0 exists only if a migration ever adds a policy or `check` constraint that inspects `extra`.

### D0. (conditional) Migration: allow the spec D9 keys in `extra` (`risk:high`)
- [ ] Only if ADR 0002 (or a later migration) records a policy or `check` constraint that
      enumerates `extra` keys: add the spec D9 keys (`expense_groups.extra.kind/settings/concepts`,
      `events.extra.settings`, `expenses.extra.conceptId/settledAt`) additively, with B2b RLS
      cases, applied by `db-migrate.yml` before D3 is deployed; gating columns untouched
- [ ] Acceptance: the B2b per-table spec-D9 cases green; `git diff supabase/migrations` touches
      no policy `using`/`with check` on a gating column

### D1. Domain layer: kinds, categories, selectors, typed schemas, ADR 0010 (`tdd-tier:strict`)
- [ ] `src/domain/kinds.ts`: `KINDS` table (`couple|household|friends|project|other` → label
      `{en,es}`, `universalType` (the fixed map onto `ExpenseGroup.type`, spec D9),
      `defaultSplitType`, `defaultParticipants: 'all'|'pick'`, `categoryOrder`,
      `presetConcepts`, `budgetPeriod`, `showEvents`, `heroWidget`), `EVENT_KINDS` (`trip|event`),
      `parseKind()` / `parseEventKind()` with fallbacks `friends` / `event`; never throw
- [ ] `src/domain/categories.ts` replaces the B3 stub with the 16-key taxonomy from spec D9
      (`{ key, labels: {en, es}, icon: string, color: number }`), `normalizeCategory()`,
      `categoriesForKind()`, `distributionByCategory(expenses, convert)`; snapshot test of the key
      list (add-only; the five legacy keys verbatim); `src/domain` imports no `lucide-react`
- [ ] `src/domain/groupSelectors.ts`: `groupBalances(group, expenses, members)` over `splits[]`,
      `settlementScopeForGroup` (D7), `budgetProgress` (D10 stub); pure functions over rows the
      B5a hooks already load (`useGroupExpenses`, `useGroupEvents`)
- [ ] `src/schemas/shared.ts`: `GroupSettingsSchema`, `EventSettingsSchema`, `ConceptSchema`,
      `BudgetSchema`, `RecurrenceSchema` (inner fields optional except `Concept.id/name/category`
      and `Budget.amount/currency/period`); `group.ts`/`event.ts` narrow the opaque B3
      `extra.settings`/`extra.concepts` with `.catch()` fallbacks so a malformed map degrades to
      defaults instead of rejecting the row; `kind`/`category` stay `z.string()` (`splitType` is
      the universal enum)
- [ ] Delete the B3 `.omit()` on the write-input schemas; rewrite the `extra` key-set test to the
      spec D9 allowlist per collection — no other key may reach `extra`
- [ ] `src/lib/use-locale.ts`: `useLocale()` on `useClientPreference` (`navigator.language`
      starting with `es` → `es`, else `en`; server default `en`) + `t(labels, locale)`
- [ ] `scripts/create-issues.sh --track d`: label `phase-4`, milestone `v0.7 - Relationship
      kinds`, issues D2–D12 (idempotent, dry-run by default, skips issues that already exist;
      D1 itself and the conditional D0 are filed by hand)
- [ ] ADR `docs/decisions/0010-relationship-kinds-and-conceptos.md`: trip = Event; kinds are
      presentation, not ownership or rules; conceptos inline in the group doc; fixed taxonomy (no
      custom categories); recurring = client-computed due list, never auto-created; no period
      close; visibility is per participant; no client backfill; rejected alternatives
      (trip-as-Group, Event-as-Group, `categories` collection/subcollection, presets stored in
      documents, `closedAt`); Stakeholder Analysis
- [ ] Acceptance: pure code only (no island touched); `npm run check` green; snapshot, `extra`
      key-set and `groupBalances` tests green; the B2b RLS suite unchanged and green

### D2. Share-aware balance edge cases in `domain/expenseCalculator` (`risk:high`, `tdd-tier:strict`)
- [ ] The calculator has consumed the universal `splits[].amount` since B3 (spec D10); this issue
      pins the edge cases before any kind writes a non-equal default: `materializeSplits` for
      `exact` shares that do not sum to `amount` (reject at the form, fall back to equal in the
      calculator with a `warnings[]` entry), `percentage` shares that do not sum to 100, a
      participant missing from `splits`, a payer outside `splits`, rounding to cents with the
      remainder on the payer, the multi-currency path, and `simplifyDebts` on/off
- [ ] Tests: equal unchanged byte-for-byte on the B3 fixtures; exact 40/30/30; percentage
      50/25/25; the non-summing and missing-participant cases; the multi-currency path
- [ ] `CHANGELOG.md` entry "balances honour exact/percentage splits; edge cases now warn instead of
      silently equalising"; PR body lists the affected flows (`/settlements`, group/trip heroes);
      ETHICS checklist line (money outcomes)
- [ ] Acceptance: `npm run check` green; sequenced before D3 — nothing in Track D writes
      `extra.settings.defaultSplitType`/`defaultShares` until this merges

### D3. Create flow: kind picker, trip routing, legacy nudge
- [ ] `GroupFormIsland` step 1 = `KindPicker` (`ui/radio-group` cards Pareja, Casa / roomies,
      Amigos, Viaje, Proyecto, Otro; one-line pitch each, es/en); **Viaje navigates to
      `/events/new?kind=trip`** (+ `&group=<id>` when opened from a group page) and never creates
      a group; step 2 = name + members (registered users, B13) + currency + kind extras (couple:
      single-friend combobox, exactly 2 members enforced by the form; project: "¿cómo se reparten
      los costos?" shares editor writing `extra.settings.defaultShares` — D2 is merged first)
- [ ] Writes `type` (= `KINDS[kind].universalType`) + `extra.kind` + `extra.settings`
      (`defaultSplitType` from `KINDS`, `defaultCurrency` = creator's `$preferredCurrency`)
      through the D1 write-input schema
- [ ] Group list and detail: kind badge + icon; pre-Track-D groups (no `extra.kind`) render as
      `friends` and show a dismissible "¿Qué tipo de grupo es?" callout that writes `extra.kind`
      with one `updateDocument` (dismissal in `localStorage`, try/catch); the dashboard "+ Nuevo"
      button and the empty state open step 1
- [ ] `/showcase`: `KindPicker`
- [ ] Tests: Viaje creates no group; couple limits members to 2; legacy group renders as friends;
      `kind` written verbatim from the table; unknown stored kind renders as `other`
- [ ] Acceptance: against `supabase start`, one group per kind; each row = the universal columns +
      `extra.{kind,settings}` only; the RLS suite green

### D4. Expense form: container defaults, `CategorySelect`, "Concepto" labels, `groupId` + `memberIds`
- [ ] `ExpenseFormIsland` reads `?group=`/`?event=` (plumbing kept in B10): participants :=
      container members (or `defaultParticipants`), currency := `extra.settings.defaultCurrency` /
      `event.preferredCurrency`, split := `extra.settings.defaultSplitType` (+ `defaultShares`
      when every uid is still a member, else equal + warning), category options :=
      `categoriesForKind(kind)`; couple context: two-avatar `paidBy` toggle, participants hidden
      (both), split collapsed under "Personalizar"
- [ ] `CategorySelect` widget: kind subset first, "Más categorías" fold, icon + localized label via
      `src/components/features/expenses/CategoryIcon.tsx` (static lucide import map); last-used
      category per group in `localStorage` (try/catch); shown on create and edit
- [ ] Field labels through `useLocale()`: es → Categoría / Concepto / Importe / Pagó /
      Participantes / Reparto / Notas; en unchanged
- [ ] Group context writes `groupId` + `memberIds` = the group's members (as B10 already does) and
      `extra.conceptId` when a concepto is picked; the group's `totalExpenses` cache is updated in
      the same `batchWrite` (B12); a rejected batch surfaces a toast and writes nothing; event
      context keeps writing `extra.eventId`. RLS note (unchanged by Track D): insert requires the
      creator ∈ `memberIds`, which holds for any group member; a project-kind `pick` split where
      the creator is not in `splits` is fine (`paidBy`/creator need only be in `memberIds`)
- [ ] `/showcase`: `CategorySelect`, `CategoryIcon`
- [ ] Tests: batch carries the expense and the `totalExpenses` update; rejected batch → no partial
      write; defaults per kind; a non-taxonomy category renders verbatim in the uncategorized
      bucket
- [ ] Acceptance: against `supabase start`, an expense created from a couple group carries
      `groupId` and `memberIds` = the group's members and appears in `useGroupExpenses`

### D5. Group detail by kind: hero widgets, tabs, Settings tab
- [ ] `GroupDetailIsland` hero chosen by `KINDS[kind].heroWidget`: `BalanceCard` (couple: one
      sentence + **Liquidar** → `/settlements?group=<id>`; degrades to `TotalByCategory` when
      `members.length !== 2`) or `TotalByCategory` (friends/household/project/other: donut from
      `ui/charts` + totals + balances list from `groupBalances`); expenses via `useGroupExpenses`;
      "solo ves los gastos compartidos contigo" hint when the group has members added after some
      expenses were written (spec D9 consequence) plus an admin-only "compartir con todos" action
      that re-shares them in one `batchWrite`
- [ ] Tabs Gastos / Miembros / Eventos / Ajustes; Eventos hidden for couple/project until an event
      exists; "Nuevo viaje" (→ `/events/new?kind=trip&group=<id>`) always reachable
- [ ] Ajustes: kind (change allowed; rewrites `type` from the map), default currency, default split
      (`equal`/`exact`/`percentage`, share-aware since D2), `defaultShares` editor; writes are
      partial `updateDocument` merges into `extra`
- [ ] Dashboard group cards: kind icon + hero number (couple: net balance; others: total this month)
- [ ] `/showcase`: `BalanceCard`, `TotalByCategory`
- [ ] Tests: hero per kind; the degrade case; pre-Track-D group = friends layout; unknown `kind` =
      other; the re-share batch touches only `memberIds`
- [ ] Acceptance: the D3 seed groups render the right hero; no file under `supabase/migrations/`
      changes in the PR

### D6. Trips: `event.kind = 'trip'`, `TripSummary`, settle this trip
- [ ] `/events/list`: "Nuevo viaje" beside "Nuevo evento"; `EventFormIsland` with `?kind=trip`
      requires `startDate`/`endDate`/`location`, prompts `preferredCurrency` (default creator's),
      pre-fills `groupId` from `?group=`; writes `kind: 'trip'`; plain events unchanged (`kind`
      absent → `event`)
- [ ] `EventDetailIsland` for trips: `TripSummary` hero (dates, total converted to the trip
      currency with a "tipo de cambio del día" caption, per-person spend, category donut,
      "Liquidar viaje" → `/settlements?event=<id>`), then the existing `EventTimeline` (B11a);
      "Trip ended — settle up" `ui/callout` when `endDate < today` and unsettled expenses exist;
      computed "Liquidado" badge when none remain (nothing stored); plain events keep B11b's view
- [ ] Events list marks trips with an icon; the parent group's Eventos tab lists them
- [ ] `/showcase`: `TripSummary`
- [ ] Tests: trip validation; callout/badge logic on fixture dates; `kind` absent → event; expense
      form opened from a trip pre-sets `eventId`, members and currency (D4 path)
- [ ] Acceptance: against `supabase start`, create a trip from a group; row = the B2 `events`
      columns with `kind = 'trip'` (+ `groupId`/`preferredCurrency` as today)

### D7. Settlements: `?group=` scope, `settlement.groupId`, couple single transfer, period presets (`tdd-tier:strict`)
- [ ] `SettlementsIsland` reads `?group=` beside `?event=`; group scope =
      `settlementScopeForGroup` (D1) = **unsettled** expenses with `groupId === id` ∪ expenses
      whose `extra.eventId` is one of the group's events (`useGroupEvents`), deduplicated by id;
      precedence documented and tested: only `extra.settledAt == null` expenses enter any scope,
      so an expense settled from the event scope never re-enters the group scope (and vice versa)
      — no double counting
- [ ] Settle-up from a group scope writes `settlement.groupId` in the same `batchWrite` that sets
      `extra.settledAt` on `extra.expenseIds` (B14); history tab filters by group or event
- [ ] Couple groups: the pending tab collapses to one transfer for the net balance (D2's
      share-aware `groupBalances`); other kinds keep the minimal-transactions table
- [ ] Period presets on the same island, no new entity: "Cerrar mes" (couple/household: date range
      = current month) and "Liquidar viaje" (`?event=`) are pre-filled filters; a period is
      closed when its expenses are settled
- [ ] Tests: scope union + dedupe; settled exclusion across scopes; `groupId` written; couple
      single transfer equals the net balance; `?group=` with a group the viewer is not in shows
      nothing (RLS returns no rows; the island renders the empty state, not an error)
- [ ] Acceptance: against `supabase start`, settle a couple group → one settlement row with
      `groupId`, expenses carry `extra.settledAt`, re-opening the trip scope shows nothing to settle

### D8. Dashboard and lists keyed by the taxonomy
- [ ] `ExpenseDistribution` fed by `distributionByCategory` (labels/icons/colours from
      `categories.ts`; uncategorized bucket rendered distinctly); `FinancialSummary`'s
      most-expensive category uses the localized label; `MonthlyTrends` unchanged
- [ ] `/expenses/list` data-table: category column with icon + label, URL-state filters by
      category key and by group (`use-data-table-url-state`); `/expenses/view` shows category and
      a link to the group
- [ ] CSV export (B17a): add `category_key` + `category_label` columns; existing columns untouched
- [ ] Tests: distribution sums per key; URL filter round-trip; CSV columns
- [ ] Acceptance: the dashboard donut renders the seed data; Lighthouse budgets unchanged
      (recharts stays a lazy chunk)

### D9. Conceptos: group-owned templates and `expenses.extra.conceptId`
- [ ] Ajustes → "Conceptos": list / add / edit / archive rows (`name`, `category`,
      `defaultAmount?`, `currency?`, split override); `repos.groups.setConcepts` is an
      `updateDocument` merge of `extra.concepts` with a re-read-and-retry on `updatedAt` (the
      adapter has no transactions; a lost concurrent append is detected and retried once, then
      surfaced), caps at 50, ids generated client-side; per-kind presets (D1 table) offered as
      pre-checked rows in D3's step 2 — the user can uncheck them. If the retry proves lossy in
      practice, the recorded fallback is a `group_concepts` table (one row per concepto, RLS via
      `exists (select 1 from expense_groups g where g.id = group_id and auth.uid()::text =
      any(g.member_ids))`) shipped as a `risk:high` migration issue — ADR 0010 alternative
- [ ] `ConceptCombobox` built on `ui/combobox` (Inceptor's API is `items: string[]` + value with
      built-in filtering; it is **not** creatable, so the widget appends a trailing "Guardar
      «texto» como concepto" item when the typed text matches nothing) above the description when
      a group context is set: pick → fills description, category, amount, currency, split
      override and writes `extra.conceptId`; the trailing item appends the new concepto via
      `setConcepts`;
      an archived/deleted concepto leaves its expenses untouched (dangling id ignored)
- [ ] Group Gastos tab: "Por concepto" breakdown aggregated by `conceptId`, never by string
- [ ] `/showcase`: `ConceptCombobox`
- [ ] Tests: the retry recovers a concurrent add (memory adapter with an injected stale write);
      the cap; combobox fill; dangling id; trips never show the combobox
- [ ] Acceptance: against `supabase start`, two members add conceptos concurrently and none is
      lost; the expense carries `extra.conceptId`; the group row = universal columns + spec D9
      `extra` keys only

### D10. Budgets: `extra.settings.budget` on groups and events, `BudgetBar`
- [ ] Ajustes (group) and the event form: optional `extra.settings.budget` `{ amount, currency, period }` (group:
      `monthly`/`total`; event: whole event); project hero switches to `BudgetBar` ("Gastado $940
      de $1,500 (63 %)" + by-category beneath); couple/household show the bar under their hero;
      trips show it inside `TripSummary`
- [ ] `budgetProgress(container, expenses, convert)` in `groupSelectors.ts`; multi-currency uses
      the B16 rate cache with an "as of" caption; "sin conversión" when a rate is unavailable
- [ ] Informational only: a colour change plus one sentence when over budget; no alerts,
      notifications or streaks (ETHICS checklist in the PR)
- [ ] Dashboard: project cards show the remaining budget as their hero number
- [ ] `/showcase`: `BudgetBar`
- [ ] Tests: progress math incl. the monthly period filter and a missing rate; the over-budget
      state is a single style token
- [ ] Acceptance: a seed project with a budget renders the bar; row = universal columns +
      `extra.settings.budget`

### D11. Recurring conceptos and the "Cuentas por agregar" due list (Stakeholder Analysis)
- [ ] `Concept.recurrence` editor in the Conceptos tab (weekly/monthly/yearly, day of month,
      interval); `src/domain/recurrence.ts`: pure `nextDueDate(concept, lastExpenseDate, today)`
      and `dueConcepts(group, expenses, today)` — due when the next date ≤ today and no expense
      with that `conceptId` exists in the current period (from the expenses Query cache)
- [ ] `DueBillsList` = household hero (and couple, when any concepto recurs): rows with "Agregar"
      (opens the expense form pre-filled through `ConceptCombobox`) and "Omitir este mes"
      (per-viewer `localStorage`, try/catch); dashboard strip "Cuentas por agregar" across groups;
      **no document is ever auto-created** — nothing runs on mount but a selector
- [ ] Duplicate guard: a row disappears once any member's expense with that `conceptId` lands in
      the period; the form shows a soft "ya existe este mes" hint
- [ ] ETHICS checklist + Stakeholder Analysis section in the PR (reminder surface: informational,
      dismissible, no push)
- [ ] `/showcase`: `DueBillsList`
- [ ] Tests: `nextDueDate` across month ends, leap years and `interval > 1`; period membership;
      the row hides after an expense exists; rendering performs no write (repo double untouched)
- [ ] Acceptance: a seed household with Renta/Luz shows the due rows and one tap creates exactly
      one expense

### D12. Docs, help copy, showcase audit (`type:docs`)
- [ ] `docs/COMPONENTS.md` entries for every Track D widget; `/showcase` audit (all D widgets
      present); `/help` copy explaining kinds, that a trip is an event inside any group, and how
      "Cerrar mes" / "Liquidar viaje" work; `llms.txt` / `llms-full.txt` mention kinds
- [ ] `docs/JustSplit Consolidated Feature Matrix and Detailed Roadmap.markdown`: categories,
      kinds, conceptos, budgets and recurring rows → Implemented; `ROADMAP.md` updated;
      `CHANGELOG.md` for `v0.7`
- [ ] The `v0.7` milestone description carries the "explicitly not built" list from spec D9
- [ ] Acceptance: `npm run check` green; no doc still lists categories as Planned

---

## Sequencing and dependencies

```
A1 → A2 → A3a → A3b → A4 → A5 → A6        (serial, one PR each, ~1 week; A1–A3a by the main session; A4 includes the GH_PACKAGES_TOKEN owner action)
B1 → B2 → B2b → B3 → B4 → B5a → B5b → B6 → B7   (foundation, serial; B2 migrations applied to the justsplit project before B2b; B2b RLS suite green before B3)
  B5a: if relational mode (H2) is not published when B5a starts → ship the contingency adapter behind StorageAdapter (spec D1); never document mode
B16 after B5b (needs $preferredCurrency/$rateCache, domain/currency from B3, combobox from B1)
B8a..B15, B17a, B17b parallelizable after B7
  (B8b after B8a; B10 after B9; B11b after B11a; B12 after B9+B11b; B14 after B9+B11b;
   B15 after B16; B13 after B5a (its policies shipped in B2); B17a after B8b)
B18 → B19 → B20 → B21 → B22               (B20 opens the 14-day Firebase window; B21 closes it; B22 drops the contingency adapter once H2 is in)
C1, C2 after B5b; C3 after B1 (independent of the cutover)
H1 after this spec is approved (no code; unblocks ADR-008 gate 1) → H2 after the hub's gate C1 (Story 0.3) — or upstream the B5a contingency adapter → H3 after H2 + C1
D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8     (Track D increment 1, all after B22, on main; D2 before any default split is written)
  D0 only if a migration ever constrains `extra`, before D3 is deployed
  D9 after D4 + D5; D10 after D5 + D6; D11 after D9 + D10; D12 last
```

## Definition of done (whole migration)

- `main` deploys the Astro app to GitHub Pages (custom domain or `/JustSplit`); `npm run check`
  + Lighthouse budgets (split by route family) green; every internal link goes through `withBase()`
- Spec §6 checklist fully ticked; every Jest suite in the owning-task table ported or dropped;
  zero `@mui`, `framer-motion`, `next`, `firebase` in `package.json`
- Schema and RLS match ADR 0002: every table in `SchemaMap` has RLS + Realtime publication, no
  table without a policy per command (coverage guard), the B2b suite (incl. storage policies,
  `batch_write` atomicity and the spec-D9 per-table cases) green in CI against `supabase start`
  and once against the `justsplit` project; all migrations applied by `db-migrate.yml`
- Repos import only the `StorageAdapter` interface; the contract suite is green against the memory
  adapter and the real one; `permissions: { enabled: false }`; no `DataLayerService`
- B3's forward-compat items are in: optional opaque spec-D9 `extra` keys, `.passthrough()` reads,
  the `extra` key-set test and the synthetic fixtures (these are migration work; the features are not)
- Firebase retired: project `justsplit-eef51` deleted after the 14-day window (B20/B21), no
  Firebase workflow, config file or dependency left in the repo; one workflow deploys `main`
- Inceptor `main` contains C1 and C2; `cybereco-hub` has H1 merged (H2/H3 follow the hub's gate C1
  and are not part of this definition of done)
- **Track D (D0–D12) is explicitly not part of this definition of done**: it is the first
  post-cutover feature epic, owns milestone `v0.7 - Relationship kinds`, and closes when D12 merges
