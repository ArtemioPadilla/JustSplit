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

**Spec:** `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md` (decisions D1–D10; D9 is the post-cutover Track D, D10 the data model and RLS). Track D **issue** ids are also written `D<n>`; wherever a spec decision and a Track D issue appear in the same sentence the issue is written "issue D<n>" and the decision "spec D<n>", and `create-issues.sh --track d` titles the issues `Track D — D<n>: …` so GitHub titles are self-disambiguating.

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
  every table in `public` has RLS, every table the adapter touches is listed in
  `src/lib/data/schema-map.ts`, and the update rules a policy cannot express (old-vs-new row) live
  in the `guard_<table>` BEFORE UPDATE triggers (spec D10). No `DataLayerService` and no
  `createDataLayer` call exist, so the doctrine's `permissions: { enabled: false }` is met
  structurally (a test greps `src/` for `createDataLayer(`). Schema, policies and triggers change
  only through dbmate migrations under `db/migrations/` (never the CLI's `supabase/migrations/`)
  shipped in `risk:high` issues with the B2b RLS suite green against `supabase start`;
  `db-migrate.yml` applies them.
- **Never document mode for shared data**: `public.documents` RLS is owner-only (any shared
  document would be readable and writable by every authenticated user). Every collection is a
  relational-mode table through `SchemaMap`; if relational mode is not merged upstream when B5a
  starts, the contingency adapter `src/lib/data/relational-adapter.ts` ships behind the same
  `StorageAdapter` interface (spec D1) — repos never import `SupabaseStorageAdapter` directly.
  Enforced by tests, not convention: no `public.documents` table (B2b), every repo collection
  string is a `SchemaMap` key and `adapter.ts` always passes `schemaMap` (B5a), kept green in B22.
- **GitHub Packages**: the `@cyber-eco/*` packages are owned by the `cyber-eco` org
  (`cyber-eco/cybereco-hub`, private), so this repo's `GITHUB_TOKEN` can never read them. The
  committed `.npmrc` holds **only** `@cyber-eco:registry=https://npm.pkg.github.com` (a committed
  `_authToken=${VAR}` line breaks every npm command for anyone without the variable). Repo secret
  `GH_PACKAGES_TOKEN` = a **classic** PAT with `read:packages` from a `cyber-eco` member (GitHub
  Packages' npm registry does not take fine-grained PATs), fed to `npm ci` through
  `actions/setup-node` (`registry-url: https://npm.pkg.github.com`, `scope: '@cyber-eco'`) +
  `NODE_AUTH_TOKEN: ${{ secrets.GH_PACKAGES_TOKEN }}` in `ci.yml`, `deploy.yml`,
  `deploy-staging.yml`; the same token feeds Dependabot's `registries` entry and each
  contributor's `~/.npmrc`. Owner action in A4, pre-checked there with `npm view`.
- **Inceptor rules apply from Track B onward**: no React Context across islands, no whole-app
  island, no `@radix-ui/*`, no `framer-motion`, no `@astrojs/tailwind`, no `@tremor/react`,
  no `@mui/*`, no `firebase` (`.claude/checklists/forbidden-imports.json` is enforced by `centinela`).
- **Branch naming**: `phase-N/issue-NNN-slug`. Track A PRs target `main`; Track B PRs target
  `inceptor`; Track C PRs live in the `inceptor` repo; Track C' PRs live in the `cybereco-hub`
  repo; Track D PRs (`phase-4/…`) target `main` after cutover.
- **Track D never changes the schema or the policies**: it adds only JustSplit-only top-level
  fields with no mapped column (overflow keys the SchemaMap stores in the `extra` jsonb column of
  existing tables — the app never reads or writes a field named `extra`) or writes columns that
  exist since B2 (spec D9), no new table, column, index, policy or server-side code; every touched
  table is re-covered by the RLS suite;
  if a migration ever adds a `check` constraint or policy that inspects `extra`, Track D opens
  with a conditional `risk:high` migration issue (D0) through the same RLS-tested path.
- **Commits**: Conventional Commits + issue ref.
- **Every PR**: `npm run check` green (the umbrella script; Track A adds the gate, B1 swaps its
  body for the Astro one so `ship.sh`/`centinela` never change).
- **No secrets in the repo**; the browser config is `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_KEY`
  (the anon/publishable key — browser-safe by design, RLS is the defence), read from GitHub
  repository variables at build time; `SUPABASE_DB_URL` (migrations) and `GH_PACKAGES_TOKEN`
  (package install) are secrets; `ASTRO_BASE` is a repository **variable** (`vars.ASTRO_BASE`), not
  a secret. No Firebase secret is needed: the Firebase workflows were deleted in the docs PR (#2,
  commit `0ba4348`, branch `claude/inceptor-migration-t6bkmv`). From #2's merge until A3b merges,
  `main` and every PR run zero workflows — A2 and A3a are merged on review only, and the
  `Build & Check` required status check is enabled on `main` only after A3b's first green run.
- **`withBase()` everywhere**: `ASTRO_BASE` is unset for the custom domain and `/JustSplit` for
  both the production fallback and staging (the same Pages site, spec D2); no internal link,
  redirect or asset skips `withBase()`, and a `?next=` value goes through `safeNext()` first.

## Milestones and labels

| Milestone | Track | Issues |
|---|---|---|
| `v0.2 - Inceptor workflow` | A | A1, A2, A3a, A3b, A4, A5, A6 |
| `v0.3 - Foundation on Astro` | B, phase 1 | B1, B2a, B2, B2c, B2b, B3, B4, B5a, B5b, B6, B7, B16 |
| `v0.4 - Feature islands` | B, phase 2 | B8a, B8b, B9–B15, B17a, B17b |
| `v0.5 - Cutover` | B, phase 3 | B18–B22 |
| `v0.6 - Upstream to Inceptor` | C (lives in the `inceptor` repo) | C1–C3 |
| `v0.6 - JustSplit consumer` | C' (lives in the `cybereco-hub` repo) | H1–H3 |
| `v0.7 - Relationship kinds` | D, post-cutover (`phase-4`) | D1–D12 (+ D0 only if a migration ever constrains `extra`) |

Track A issues carry `phase-0`. Labels created by A5 (17): `phase-0..phase-3`,
`type:chore|feat|docs`, `track:workflow`, `track:stack`, `risk:high` (B2a, B2, B2b, B4, B5a, B5b,
B13, B16, B20, D2), `ai-approved` (claude.yml gate), `bug`, `enhancement`, `question`
(issue-template defaults), `tdd-tier:strict`, `tdd-tier:smoke`, `tdd-tier:exempt` (centinela §3.1
reads these; story.yml only offers them as a dropdown, a maintainer/prometeo applies the label).
Issue count: 36 in this repo (7 Track A + 29 Track B) + 4 milestones; 3 issues + 1 milestone in `inceptor`;
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
`0011-supabase-via-cybereco-data-layer` (B2a; records spec D1 incl. the gate-C1 contingency and
the GitHub Packages fallback — numbered after 0010 because the list above was fixed before the
backend decision; ADR numbers are allocation order, not merge order).

---

## Track A — Adopt the Inceptor workflow (no app code changes)

### A1. Repo hygiene
- [x] Delete: `git-diff.txt`, `report.txt`, `tree.txt`, the `'` directory, `reports/`,
      `src/utils/debug-firebase.js`, `src/pages/_app.tsx`, `src/app/events/new/page-fixed.tsx`,
      `src/app/**/page.tsx.{new,bak}`, `src/app/components/EventList.tsx`,
      `src/app/landing.module.css`, `src/components/ui/ProgressBar/` (the directory is the unused
      copy: `@/components/ui/ProgressBar` resolves to `ProgressBar.tsx`, whose `showPercentage`
      default the pages and `progressBar.test.tsx` rely on — keep that file), `src/components/Button/`, `src/utils/testUtils.tsx` +
      `src/test-utils/withAppContext.tsx` (keep `src/test-utils.tsx`, imported by 10 tests),
      `src/docs/`, `apphosting*.yaml` (after the B20 backend check has been run once — see B20's
      first bullet; if a backend is connected, delete the files only after disconnecting it)
- [x] Add `.nvmrc` (`22`), `.editorconfig`, `.prettierignore` from Inceptor; add `.prettierrc.json`
      WITHOUT the `plugins` entry and the `*.astro` override (re-added in B1 with
      `prettier-plugin-astro`); `npm i -D prettier@^3` + `"format": "prettier --write ."`
- [x] `git rm --cached reports/test-report.html` and add `reports/` to `.gitignore` (`.firebase/`
      is already ignored); leave `.firebaserc`, `firebase.json`, `firestore.*` untouched — B20
      deletes them with the project
- [x] Acceptance: `git ls-files | grep -E '\.(txt|new|bak)$|^reports/|^src/pages/|page-fixed'` is
      empty && `npx tsc --noEmit` reports errors only in `__tests__`/`*.test.*` files (157
      pre-existing errors on `main`, all in test files; app code is clean) && `npx jest --ci`
      matches the `main` baseline (7 failed / 25 passed suites) — the shadow files must go before
      A3 because `tsconfig` includes every `*.tsx`

### A2. `CLAUDE.md` + `.claude/` for JustSplit
- [x] Generate `CLAUDE.md` from Inceptor's template (`scripts/init.mjs` output), re-branded:
      purpose, current stack (Next.js **until Track B lands**, then Astro), file organization,
      commands, conventions, critical warnings, auth-gating rules, link to this plan
- [x] `prometeo.md`: `INTEGRATION-PLAN.md` → `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
      (4 places: description, §1, §4, Rules); example issue ids `#001–#003` → `A1–A3`
- [x] `forja.md`: same path swap (3 places: description, Inputs, §1); delete the
      `src/content/gallery.ts` rule, replace with "add reusable widgets to `src/pages/showcase.astro`"
- [x] Copy `.claude/agents/centinela.md` and edit: (a) §1 anchors on this plan instead of
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
- [x] Copy `.claude/checklists/{ethics,governance,forbidden-imports}.*`; `governance.md`: required
      status check → `Build & Check` (ci.yml job name; B2b adds `RLS & contract (supabase start)`)
- [x] Copy `.claude/commands/{doctor,monday,ship}.md` + `scripts/{doctor,monday,ship}.sh`; add to
      `package.json` scripts: `"doctor": "bash scripts/doctor.sh"`, `"monday": "bash scripts/monday.sh"`,
      `"ship": "bash scripts/ship.sh"`, `"type-check": "tsc --noEmit"` (moved here from A3 so the
      umbrella resolves) and `"check": "npm run lint && npm run type-check && npm run test -- --ci
      && npm run build"` (the Next-era umbrella; B1 replaces its body with the Astro one so
      `ship.sh`/`centinela` never change)
- [x] `doctor.sh`: guard the Astro-only checks — `if [ -f astro.config.mjs ] || [ -f next.config.js ];
      then ok …` and skip the `src/env.d.ts` check when `next.config.js` exists (both with a
      `TODO(track-b): drop the Next branch` comment); downgrade the `http://localhost` placeholder
      hit in `src/firebase/config.ts` to a warning
- [x] Create `docs/decisions/` with Inceptor's `TEMPLATE.md` + `0001-adopt-inceptor-workflow.md`
      (records Track A)
- [x] Acceptance: after `npm ci`, `npm run doctor` exits 0 on a clean checkout of `main` (doctor
      also fails on a missing `node_modules`); `grep -rn 'INTEGRATION-PLAN\|gallery.ts\|ux:check\|npm
      run a11y' .claude` is empty; `npm run check` exiting 0 is A3a's acceptance, not A2's

### A3a. Make the existing gate runnable (pre-CI)
- [x] Add `.eslintrc.json` = `{ "extends": "next/core-web-vitals" }` (eslint ^8 +
      eslint-config-next 15.3.1 are already devDeps); run `npm run lint`; fix what fires, or
      disable a rule only in the config with a one-line reason (Track A is run by the main
      session, so forja's "never disable a rule" clause is not yet in force); goal: `next lint`
      exits 0 non-interactively
- [x] `jest.config.js`: set `collectCoverage: false` and delete `coverageThreshold` (coverage is
      re-baselined under Vitest in Track B; a 70 % gate on a 19.78 % codebase blocks every PR)
- [x] Fix or `test.skip` (with `TODO(track-b)` + issue ref) the 7 failing suites
      (`timeline`, `timelineCalculations` ×2, `page`, `ExpenseDistribution`, `RecentSettlements`,
      `UpcomingEvents`; baseline measured 2026-09-27 on `main`: 7 failed / 25 passed, 23 failing
      tests) so `npx jest --ci` exits 0; list them in the PR body
- [x] `type-check` must exit 0: either exclude `**/__tests__/**` and `**/*.test.*` from the
      type-check (`tsconfig.typecheck.json` extending `tsconfig.json`; Jest transpiles tests
      without type-checking anyway) or fix the 157 test-file type errors — prefer the exclusion
      with a `TODO(track-b)` note, since every Jest suite is rewritten under Vitest in Track B
- [x] Remove `build:firebase --no-lint`; add `scripts/build-check.sh` (`npm run build:check`): the
      Next tree initialises Firebase at module load, so the build gate exports syntactically valid
      `NEXT_PUBLIC_FIREBASE_*` placeholders when unset — never a deploy; deleted with the tree in B1
- [x] Acceptance: `npm ci && npm run lint && npx tsc --noEmit && npx jest --ci && npm run build`
      exits 0 locally on Node 22 (i.e. `npm run check` from A2 is green)

### A3b. CI quality gate (depends on A3a)
- [x] Add `.github/workflows/ci.yml` from Inceptor keeping only the `build` and `actionlint` jobs
      (delete `server-node` and `server-flask`); `build` runs `npm ci` + `npm run check` (= `lint
      && type-check && test -- --ci && build`, from A2/A3a). Keep the `push.branches` globs and
      the concurrency group
- [x] In `ci.yml`: `on.push.branches: [main, inceptor, 'phase-*/**', 'feat/**', 'fix/**',
      'docs/**', 'chore/**']` and `on.pull_request.branches: [main, inceptor]`; change the
      actionlint job condition to `if: github.event_name == 'pull_request' || github.ref ==
      'refs/heads/main' || github.ref == 'refs/heads/inceptor'`
- [ ] After B1 opens the branch: `gh api -X PUT repos/ArtemioPadilla/JustSplit/branches/inceptor/protection`
      with required check `Build & Check` (must equal the job `name:` in the adapted ci.yml —
      Inceptor's `docs/governance/branch-protection.md` and `.claude/checklists/governance.md`
      still list `build`/`test`/`type-check`/`visual`, which match no job; update both when
      copying); B2b adds `RLS & contract (supabase start)` to the same list, and both move to
      `main` at cutover
- [x] In `ci.yml`'s `build` job: `actions/setup-node` with `registry-url: https://npm.pkg.github.com`
      and `scope: '@cyber-eco'`, and `NODE_AUTH_TOKEN: ${{ secrets.GH_PACKAGES_TOKEN }}` on the
      `npm ci` step — inert until B1 adds the packages (the secret arrives in A4); written here so
      `ci.yml` is authored once
- [x] Also land `.github/workflows/db-migrate.yml` on `main` now, copied from
      `cybereco-hub/.github/workflows/db-migrate.yml` with `paths: ['db/migrations/**',
      '.github/workflows/db-migrate.yml']`, the docker mount `-v "$PWD/db:/db"`
      (`--migrations-dir /db/migrations`), the `command`/`confirm=TEARDOWN` gating kept,
      `actions/checkout` SHA-pinned. It is inert until the `SUPABASE_DB_URL` secret exists (the
      guard step warns and skips). GitHub registers `workflow_dispatch` only for files on the
      default branch, so this is what lets B2 run `gh workflow run db-migrate.yml --ref inceptor
      -f command=migrate` (the run checks out and uses the workflow + migrations from `inceptor`)
- [x] Node 22 everywhere; SHA-pin `actions/checkout`, `actions/setup-node`
- [ ] Acceptance: CI green on the PR (the first workflow run on `main` since the Firebase workflows
      were deleted in #2); a deliberate type error in a throwaway commit turns it red; enable the
      `Build & Check` required status check on `main` after the first green run

### A4. Owner actions: secrets and package registry
- [ ] The Firebase workflows (`firebase-deploy.yml`, `firebase-hosting-merge.yml`,
      `firebase-hosting-pull-request.yml`) were already deleted in the docs PR (#2, commit
      `0ba4348`): nothing deploys `main` any more and `.github/` did not exist until A3b. The live
      Next site stays on Firebase Hosting exactly as last deployed until B20 retires the project.
      Here: delete the now-unused `FIREBASE_SERVICE_ACCOUNT*` repository secrets (owner action)
- [x] Create `SETUP.md` (skeleton from Inceptor's `SETUP.md`: prerequisites, tokens, owner-actions
      log) — B1/B2a/B2/B4 append to it; the file does not exist in this repo and
      `create-inceptor-app` does not emit it
- [x] Owner actions, documented in `SETUP.md` (owner-actions log §4; the actions themselves are pending) (not scripted): the `@cyber-eco/*` packages belong to
      the `cyber-eco` org (`cyber-eco/cybereco-hub`, private repo ⇒ private packages), so create a
      **classic** PAT with `read:packages` as a member of the `cyber-eco` org with read access to
      `cyber-eco/cybereco-hub` (GitHub Packages' npm registry does not accept fine-grained PATs;
      if the org allows them and GitHub adds support, a fine-grained PAT with resource owner
      `cyber-eco` and Packages: read is the alternative to verify) and store it as repo secret
      `GH_PACKAGES_TOKEN`. The same token is what Dependabot's `registries` entry (B1) and every
      contributor's local `~/.npmrc` use. Pre-check before B1 starts: `NODE_AUTH_TOKEN=<pat> npm
      view @cyber-eco/types@0.2.1 --registry=https://npm.pkg.github.com` must print the version.
      `GITHUB_TOKEN` is not tried: a workflow token from `ArtemioPadilla/JustSplit` can never read
      packages owned by a different account or org. The vendoring fallback stays recorded in
      ADR 0011 (B2a)
- [ ] Acceptance: `gh secret list` shows `GH_PACKAGES_TOKEN` and no `FIREBASE_*`; `gh workflow
      list` shows only `CI` (ci.yml, containing the build and actionlint jobs) and `Database
      migrations` (db-migrate.yml, A3b) — `claude.yml` arrives in A5; no workflow references
      `FirebaseExtended/*`, `NEXT_PUBLIC_*` or `FIREBASE_*`; `npm ci` in CI still green (no scoped
      package yet)

### A5. Issue-driven loop
- [x] Copy `.github/ISSUE_TEMPLATE/{bug_report,feature_request,question,story,config}.yml`,
      `CODEOWNERS`; `PULL_REQUEST_TEMPLATE.md` with Mechanical checks → only `npm run check`
- [x] `dependabot.yml`: copy only the `github-actions` ecosystem block in Track A; the npm block
      (with Inceptor's ignore/group rules) is added in B1 together with the new `package.json`
- [x] Copy `claude.yml` (AI triage) **with the three security layers intact**: `ai-approved`
      gate for non-collaborators, `contents: read`, untrusted-data framing
- [x] `scripts/create-issues.sh` → thin wrapper over `scripts/plan-issues.mjs`, which **parses this
      plan** (every `### <id>. <title>` section = one issue, body = the section, labels from the
      heading tags + track/phase, milestone from the table above) instead of duplicating 36 bodies
      by hand; labels as in "Milestones and labels"; milestones `v0.2`–`v0.5` here; A1–A6 + B1–B22
      with the splits = 36 in this repo (verified by `--json`); issue body links
      `docs/superpowers/plans/2026-09-18-inceptor-migration.md#<anchor>` and says "Ask Claude
      Code: Land <id> from the migration plan" (idempotent, dry-run by default)
- [x] Add `--repo ArtemioPadilla/inceptor` mode (overrides the `gh repo view` default) that
      creates C1–C3 + milestone `v0.6 - Upstream to Inceptor` there, and
      `--repo cyber-eco/cybereco-hub` (the hub lives in the `cyber-eco` org, not under
      `ArtemioPadilla`) that creates H1–H3 + milestone `v0.6 - JustSplit consumer` there (hub
      labels only; no `phase-*`/`track:*` labels are created in the hub)
- [x] Add repo secret `ANTHROPIC_API_KEY` (needed by claude.yml) — documented in `SETUP.md` §2/§4 (owner action pending)
- [ ] Acceptance: `bash scripts/create-issues.sh --apply` → 36 issues + 4 milestones + 17 labels
      here; `--repo ArtemioPadilla/inceptor --apply` → 3 issues + 1 milestone there;
      `--repo cyber-eco/cybereco-hub --apply` → 3 issues + 1 milestone there;
      `grep -rn 'ux:check\|npm run a11y' .github` is empty

### A6. Docs realignment
- [x] `docs/INDEX.md` pointing to spec/plan; move `docs/known-bugs.md` items into issues (#8–#11);
      mark `docs/refactor-plan.md` and `docs/development/assesment-202505.md` as superseded
- [x] README: replace "Development" section with the Inceptor loop summary
- [x] Create `ROADMAP.md` (points to this plan's tracks; Inceptor's `ROADMAP.md` as the shape) and
      `CHANGELOG.md` (Keep a Changelog, `Unreleased` section; Inceptor has none — start fresh);
      neither exists in the repo today, so B20/B22/D2/D12 only append to them
- [x] Also `SECURITY.md` + `CODE_OF_CONDUCT.md` (governance checklist rows); `LICENSE` is an owner decision (the README says open source but no license file exists; the hub uses open-core) — recorded in `SETUP.md` §4
- [ ] Acceptance: no doc references Jest/Next as *future* work once Track B starts

---

## Track B — Stack migration (integration branch `inceptor`)

### Phase 1 — Foundation

### B1. Scaffold with `create-inceptor-app` and graft
- [x] In the Inceptor checkout: `node scripts/init.mjs --name JustSplit --archetype static
      --repo ArtemioPadilla/JustSplit --out ../justsplit-astro` (record the Inceptor commit SHA
      in the PR)
- [x] `cd ../justsplit-astro && npm install && npm run check` BEFORE grafting. Known gap:
      init.mjs copies `src/components/ui/data-table.tsx` (and `use-data-table-url-state.ts`)
      without its import closure. Copy from the Inceptor checkout:
      `src/components/ui/{action-bar,checkbox,download-trigger,empty-state,error-state}.tsx`,
      `src/components/ui/field-type/**`, `src/lib/{field-type,use-listing,format-date}.ts`
      (+ their `*.test.*`), and add `react-day-picker` to dependencies (`field-type.ts` has a
      type import from it, which `tsc` still resolves). Alternatively delete `data-table.tsx` +
      `use-data-table-url-state.ts` from the graft and re-add the full closure in B9
- [x] If `tsc` reports TS5103 on `ignoreDeprecations: '6.0'`, set `typescript` to `^6.0.3` (what
      Inceptor itself uses) in the merged `package.json` rather than dropping the flag
- [x] On branch `inceptor` (from `main` after Track A): remove `src/`, `next.config.js`,
      `jest.config.js`, `jest.setup.js`, `.eslintrc.json`; `package.json` deps merged: keep
      `date-fns`, `uuid`; add `@supabase/supabase-js` and `@cyber-eco/{types,auth,supabase}@^0.2.1`
      (caret on 0.x = patch-only, so the H2 minor is an explicit bump in B22, moving the three
      together); drop `firebase`, `next`, `@mui/*`, `@emotion/*`, `framer-motion`, `chart.js`,
      `react-chartjs-2`, `react-intersection-observer`, `jest*`, `@testing-library/jest-dom`
      (Vitest equivalent added), `eslint-config-next`. Commit `.npmrc` containing **only**
      `@cyber-eco:registry=https://npm.pkg.github.com` — never an `_authToken=${VAR}` line, which
      aborts every npm command (`npm run dev`, `npm test`, `doctor.sh`, Dependabot) for anyone
      without the variable; the token goes in `~/.npmrc` locally
      (`//npm.pkg.github.com/:_authToken=<pat>`, documented in `SETUP.md`) and reaches CI through
      `actions/setup-node` + `NODE_AUTH_TOKEN` (A3b). `doctor.sh` warns when `npm config get
      //npm.pkg.github.com/:_authToken` is empty. First CI run verifies `GH_PACKAGES_TOKEN`
      installs the packages; record the outcome in ADR 0011 (B2a)
- [x] Graft — copy from the generated tree ONLY: `src/` (includes `site-meta.ts`, `llms.txt.ts`,
      `env.d.ts`), `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`,
      `.env.example`, `docs/decisions/TEMPLATE.md` (if A2 did not already add it), and from the
      generated `.github/workflows/` ONLY `deploy.yml` — Inceptor's GitHub Pages workflow, which
      is the production deploy (spec D2): change its `ASTRO_BASE` expression to
      `${{ vars.ASTRO_BASE || '/JustSplit' }}` (a repository **variable** per the Global constraints
      — a base path is public config and secrets are masked in logs; at cutover the owner sets it
      to `/` for a custom domain), add the `npm ci` registry/`NODE_AUTH_TOKEN` step from A3b and
      the `PUBLIC_SUPABASE_*` build env (B2a), SHA-pin it. Do **not** copy the generated `ci.yml`
      (`server-node`/`server-flask` jobs fail here — keep A3b's) or its `CLAUDE.md`
- [x] Graft manifest — copied from the Inceptor checkout (same commit), verbatim, with their
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
- [x] Test: `src/tests/scaffold-manifest.test.ts` asserts every file in that manifest exists (so
      a future re-graft cannot silently drop one)
- [x] Replace the generated `astro.config.mjs` with Inceptor's minus `i18n`, `mdx`, `redirects`,
      with `site: SITE_ORIGIN` from `site.config.mjs` (= the custom domain, or
      `https://artemiopadilla.github.io` with `base` `/JustSplit` as the fallback — spec D2),
      `base: process.env.ASTRO_BASE ?? '/'`, `trailingSlash: 'ignore'`, PWA/sitemap integrations
      retained, and `vite.define` for `process.env.NODE_ENV` and `process.env.NEXT_PUBLIC_HUB_URL`
      (the `@cyber-eco/auth` static-build requirement, `cybereco-hub/examples/static-app/README.md`)
- [x] Resolve `TODO(agent)` in `src/lib/site-meta.ts`, `src/pages/llms.txt.ts`,
      `public/robots.txt`, `PUBLIC_REPO_SLUG`; ADD `site:` (the generated config has none) via
      `site.config.mjs` `SITE_ORIGIN` + `src/lib/site-meta.ts` `SITE_ORIGIN`, asserted equal by
      the copied `src/tests/site-meta.test.ts`
- [x] `package.json` `check` = `npm-run-all --parallel check:astro type-check test lint
      check:pragmas --serial build` (same script name as A2, so `ship.sh`, `centinela` and
      `ci.yml` are unchanged)
- [x] Delete `package-lock.json`, run `npm install`, commit the regenerated lockfile (forja must
      not hand-edit it; `npm ci` fails on a stale lock)
- [x] `CLAUDE.md` stack table switched to the Astro stack; `forbidden-imports.json`: restore the
      `framer-motion` ban, add `@mui/` (reason "replaced by Base UI/shadcn in B10") and
      `firebase` (reason "backend retired, spec D1"); restore centinela's `framer-motion` grep
      line and whole-tree scan (the copied `src/tests/forbidden-imports.test.ts` reads the JSON);
      `dependabot.yml`: add Inceptor's npm block (+ a `registries` entry for `npm.pkg.github.com`
      using `GH_PACKAGES_TOKEN` so `@cyber-eco/*` bumps resolve)
- [x] Test: `src/tests/with-base.test.ts` greps `src/` for `href="/` and `src="/` outside a
      `withBase(` call (the subpath fallback and the staging site are real, spec D2); a build
      test asserts `dist/` links carry the configured base; a Vitest asserts `deploy.yml` is the
      only workflow that runs `actions/deploy-pages` against the `github-pages` environment on
      push to `main` (`ci.yml` and `db-migrate.yml` also run on push to `main` by design;
      `deploy-staging.yml` deploys the same environment from `inceptor` only)
- [x] Acceptance: `npm run check` green with the scaffold's landing page (37 test files / 389 tests,
      3 pages built); `scaffold-manifest.test.ts` green. **Deviation:** `@cyber-eco/*` is NOT yet a
      dependency — the packages are private on GitHub Packages and `GH_PACKAGES_TOKEN` is an owner
      action still pending; B1 landed `.npmrc` (scope only), the CI/deploy registry steps and the
      Dependabot registry, and B2a adds the three packages when the token exists (or vendors them
      via `npm pack` from the hub checkout, the ADR 0011 fallback). Also recorded: npm 10.9.x needs
      `--legacy-peer-deps` (or npm ≥ 11) to regenerate the lockfile (`SETUP.md` §1); `npm ci` is fine

### B2a. Supabase project (owner actions), guarded client, `adapter.ts`, env, staging deploy, ADR 0011 (`risk:high`)
- [ ] Owner actions (documented in `SETUP.md`, not scripted): create Supabase project `justsplit`
      (region closest to MX); enable Email + Google providers. Site URL = the production origin;
      **additional redirect URLs** = `https://artemiopadilla.github.io/JustSplit/auth/callback/`
      (staging = the production fallback URL, spec D2) and, once it exists, the custom domain's
      `/auth/callback/`; the same origins in the Google OAuth client. Registering a URL only
      *allows* it — the return target is chosen per call through `redirectTo` (B4), which is what
      makes each origin land on itself. Copy the project URL and the anon/publishable key into
      repository **variables** `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY`; copy the **session
      pooler** URI (IPv4, `?sslmode=require`) into repository **secret** `SUPABASE_DB_URL` (this
      arms the A3b `db-migrate.yml`); in Settings → Environments → `github-pages`, add `inceptor`
      to the allowed deployment branches (the default policy allows only `main`, and
      `actions/deploy-pages` fails with an environment-protection error otherwise)
- [x] `src/lib/data/client.ts`: guarded client following the `supabaseEnabled` snippet in
      Inceptor `docs/recipes/auth-supabase.md` §2 — `supabaseEnabled = Boolean(PUBLIC_SUPABASE_URL
      && PUBLIC_SUPABASE_KEY)`; `createClient(url, key, { auth: { persistSession: true,
      flowType: 'pkce', detectSessionInUrl: true } })`, `null` when disabled; islands render an
      `Alert` instead of crashing. Also exports a typed `rpc(name, args)` helper so the
      `find_profile_by_email` / `find_profiles_by_ids` calls (B5a `repos.profiles`) stay inside
      this file's import boundary. `.env.example` with both keys + `PUBLIC_SUPABASE_LOCAL=true`
      (points the client at `supabase start`'s URL/anon key in dev)
- [x] `src/lib/data/adapter.ts`: the single place that constructs the `StorageAdapter`. Until
      relational mode (H2) is published it exports the contingency `RelationalSupabaseAdapter`
      (B5a); after H2 it becomes `new SupabaseStorageAdapter(() => client, { schemaMap })` — the
      constructor takes a client **getter** (`(getClient: () => SupabaseClient, config?)`; passing
      the client instance is a type error and `this.getClient()` throws at runtime), and
      `schemaMap` is the option H2 adds (today's `SupabaseStorageAdapterConfig` has only
      `table`/`schema`, i.e. document mode, which writes `public.documents` under owner-only RLS —
      exactly what spec D1 forbids for shared data). A unit test asserts `adapter.ts` never
      constructs the upstream adapter without a `schemaMap`. The same file exports the
      `SupabaseAuthAdapter` / `SupabaseProfileStore` pair (B4). Nothing else imports
      `@cyber-eco/supabase`
- [x] Workflows: `deploy.yml` (B1) and the new `deploy-staging.yml` pass `PUBLIC_SUPABASE_URL` /
      `PUBLIC_SUPABASE_KEY` from repository variables at build time; `ci.yml` builds **without**
      them on purpose (exercises the guarded `supabaseEnabled === false` path); a Vitest asserts
      each deploying workflow's build step has both and that `ci.yml` has neither
- [x] New `deploy-staging.yml` = Inceptor's `deploy.yml` with `on: push: branches: [inceptor]`,
      `concurrency: pages`, `permissions: pages: write, id-token: write`, the `NODE_AUTH_TOKEN`
      step, the `PUBLIC_SUPABASE_*` vars and `ASTRO_BASE: ${{ vars.ASTRO_BASE || '/JustSplit' }}`;
      it publishes the `inceptor` branch to **this repository's** Pages site with
      `actions/deploy-pages` (no second repo, no `gh-pages` branch, no deploy key, no
      `.nojekyll`, no second OAuth origin — spec D2). The resulting
      `https://artemiopadilla.github.io/JustSplit/` is the B18/B19 target; the two deploy
      workflows never run concurrently because nothing pushes `main` before cutover. Document the
      staging origin and callback (`/JustSplit/auth/callback/`) in `docs/runbooks/staging.md`
- [x] ADR `docs/decisions/0011-supabase-via-cybereco-data-layer.md`: spec D1 verbatim (rationale,
      rejected alternatives, the two identity contexts, gate C1 and the contingency adapter, the
      GitHub Packages access outcome from B1 — classic PAT, `cyber-eco` org, the vendoring
      fallback); Stakeholder Analysis (user data now lives in Supabase's `aws` region of choice;
      retention/erasure through RLS delete policies + a documented owner runbook)
- Landed (code half): `src/lib/data/{env,client,adapter}.ts` + tests (`env.test.ts`,
      `client.test.ts`, `src/tests/data-boundary.test.ts`, `src/tests/supabase-workflow-env.test.ts`);
      `adapter.ts` exports `storageAdapter = null` until B5a wires the contingency adapter, plus
      the auth adapter / profile store pair. `@cyber-eco/*@0.2.1` are **vendored** in `vendor/`
      (`file:` tarballs + `overrides`, ADR 0011 §6) because `GH_PACKAGES_TOKEN` does not exist yet.
      Owner actions and the staging acceptance stay open (deferred to the end by the owner).
- [ ] Acceptance: `ci.yml`'s `supabaseEnabled === false` build passes; `gh secret list` shows
      `SUPABASE_DB_URL` and `gh variable list` shows `PUBLIC_SUPABASE_*`; the staging site serves
      the scaffold landing page under `https://artemiopadilla.github.io/JustSplit/`

### B2. Bootstrap migrations: schema, RLS, guard triggers, Realtime, storage, functions (`risk:high`, reviewed together with B2b)
- [x] `db/migrations/` bootstrap (dbmate, `YYYYMMDDHHMMSS_name.sql`, `-- migrate:up` /
      `-- migrate:down`) — **never** under the Supabase CLI's `supabase/migrations/`, which the
      CLI would execute whole on `start`/`db reset` (down section included, so every table would
      be created and dropped) while tracking them in its own `supabase_migrations` table — in this
      order:
      1. `schema_migrations` hardening: `alter table public.schema_migrations enable row level
         security; revoke all on table public.schema_migrations from anon, authenticated;` with a
         comment that dbmate creates the table before applying migrations, that Supabase's default
         privileges grant ALL on `public` to `anon`/`authenticated` (so an anonymous
         `DELETE /rest/v1/schema_migrations` would otherwise make `db-migrate.yml` re-run every
         migration), and that the `postgres` owner bypasses RLS so dbmate keeps working
         (alternative: `DBMATE_MIGRATIONS_TABLE=dbmate.schema_migrations` in a non-exposed schema,
         set in both `db-migrate.yml` and the local script, and assert that instead)
      2. `profiles` copied verbatim from
         `cybereco-hub/packages/supabase/db/migrations/20260715000001_profiles.sql` (quoted
         camelCase columns, no `extra`; **not** a `SchemaMap` collection, spec D10)
      3. JustSplit tables `expense_groups`, `expenses`, `settlements`, `events`, `friendships`
         with the spec D10 columns (`id text pk`, snake_case universal columns, `extra jsonb not
         null default '{}'`, `member_ids text[]` + GIN, `created_at`/`updated_at timestamptz
         default now()` + one `updated_at` trigger, `numeric(14,2)`, `char(3)`, `split_type`
         check, `events.kind text not null default 'event'`, index on `group_id` and on
         `(extra->>'eventId')`) plus `create unique index friendships_pair_uniq on friendships
         ((least(users[1], users[2])), (greatest(users[1], users[2])))`
      4. RLS: `alter table … enable row level security` + the spec D10 policy table, one named
         policy per command, every policy `to authenticated` and written against
         `(select auth.uid())::text`; the insert/update `with check` clauses of `expenses`,
         `events` and `settlements` carry the **membership mirror** (`group_id` → `member_ids <@
         g.member_ids` of a group the actor is in; otherwise every other `member_ids` entry is an
         accepted friend in `friendships`); `expense_groups` insert requires every other member
         to be an accepted friend of the creator
      5. Guard triggers: one `guard_<table>()` (`security invoker`, `set search_path = public,
         pg_temp`) `before update for each row` per table — `created_by` immutable everywhere;
         `expense_groups`: a change to `member_ids`/`admin_ids` by `uid <> all(old.admin_ids)`
         raises `insufficient_privilege`, and every id newly added to `member_ids` must be an
         accepted friend of the acting admin; `friendships`: `users`/`requested_by` immutable and a
         `status` change by `old.requested_by` raises. No column-level `revoke update (col)` (a
         no-op while table UPDATE is granted, and it would break every upsert path)
      6. `alter publication supabase_realtime add table …` for every JustSplit table (never
         `replica identity full`)
      7. Storage bucket `receipts` (private, 5 MiB, `image/*`) + `storage.objects` policies with
         the spec D10 paths `expenses/{expenseId}/{uuid}.jpg` and `avatars/{uid}/{uuid}.jpg`, all
         pinned to `bucket_id = 'receipts'` and to the first folder segment
      8. Relational `batch_write(ops jsonb) returns integer`, `security invoker`, `set search_path
         = public, pg_temp`, `revoke execute … from public, anon; grant execute … to
         authenticated, service_role` (kept from the hub template, `documents.sql:144-145`). Op
         shape is the upstream `{ type, collection, id, data, merge }`, but `data` is
         **pre-translated by the adapter** to row shape (snake_case column keys + an `extra`
         object holding the overflow keys) so the SQL stays generic. Per op: a fixed `case
         op_collection when 'expense_groups' then … when 'expenses' … when 'settlements' … when
         'events' … when 'friendships' … else raise exception end` (one arm per SchemaMap table;
         no dynamic SQL on caller-supplied names; an unmapped collection such as
         `schema_migrations` raises and applies nothing); `set` → `insert … select * from
         jsonb_populate_record(null::<table>, op_data || jsonb_build_object('id', op_id)) on
         conflict (id) do update set <every column> = excluded.<column>, extra = case when
         op_merge then <table>.extra || excluded.extra else excluded.extra end`; `update` → dynamic
         SQL built with `format()` from `jsonb_each(op_data - 'extra')` (`%I = (%L::jsonb #>>
         '{}')::<coltype>` per present key, column types read from `information_schema.columns`)
         plus `extra = extra || coalesce(op_data->'extra', '{}')`, `where id = op_id`, `if not
         found then raise`; `delete` → `delete from <table> where id = op_id`
      9. `find_profile_by_email(p_email text)` — `security definer`, `stable`, `set search_path =
         public, pg_temp`; matches `lower(u.email) = lower(p_email)` on **`auth.users u`** with
         `u.email_confirmed_at is not null`, never on the user-writable `profiles.email`; returns
         `p.id, p.name, p."avatarUrl"` from `profiles p join auth.users u on u.id = p.id`; returns
         nothing when `p_email` does not match `^[^@\s]+@[^@\s]+$`; `revoke execute on function
         public.find_profile_by_email(text) from public, anon; grant execute … to authenticated`
         (the `set search_path = ''` + fully-qualified-names variant is an acceptable equivalent)
      10. `find_profiles_by_ids(ids text[])` — same `security definer`/`stable`/`search_path` and
          grant/revoke pair; returns `id, name, "avatarUrl"` only for ids that share at least one
          row with the caller in `friendships.users`, `expense_groups.member_ids`,
          `events.member_ids`, `expenses.member_ids` or `settlements.member_ids`, always including
          the caller; `cardinality(ids) <= 200`. This is the only read path for other users'
          names/avatars (spec D10); widening `profiles` select is banned
- [ ] Apply to the shared `justsplit` project: `gh workflow run db-migrate.yml --ref inceptor -f
      command=migrate` — the workflow already exists on `main` (A3b), there is no `ref` input, the
      ref is the dispatch branch and the run uses the migrations from `inceptor`. At cutover the
      `push` trigger on `main` re-runs `migrate`, which is idempotent
- [x] Local: `supabase/config.toml` with **both** `[db.migrations] enabled = false` and
      `[db.seed] enabled = false` (otherwise `supabase start`/`db reset` would run
      `supabase/seed.sql` against a blank database before dbmate has run, and fail);
      `npm run db:start` (`supabase start -x studio,imgproxy,mailpit,edge-runtime,logflare,vector`),
      `npm run db:migrate` (`DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
      dbmate --no-dump-schema migrate` — `DATABASE_URL` is the local URL; `SUPABASE_DB_URL` is
      only the production secret and is never referenced locally or in `ci.yml`), `npm run
      db:seed` (psql applies `supabase/seed.sql` after `db:migrate`), `npm run db:reset`
      (`supabase db reset` → `db:migrate` → `db:seed`); seed with two test users, one accepted
      friendship and one group per fixture; `npm run db:audit` (read-only: dumps `pg_policies`,
      `pg_class.relrowsecurity`, `pg_trigger`, function grants and
      `information_schema.role_table_grants` for `public` from a given URL; B18 diffs the project
      against `supabase start`); document in `SETUP.md`
- [x] Open a small issue in `cyber-eco/cybereco-hub`: the hub has the same `schema_migrations`
      exposure through the same `db-migrate.yml`
- Landed: nine dbmate files `db/migrations/20260928000001…000009` in the order above. Deviations,
      recorded in ADR 0002: `batch_write` builds its column lists from `information_schema` for
      the allowlisted table instead of one hand-written arm per table, and `set` updates a visible
      row first and inserts only when none matched (an upsert evaluates the INSERT policy against
      the proposed row even when it exists); calendar dates are `date` columns; no `check`
      constraint reads `extra`. Hub issue: cyber-eco/cybereco-hub#31. Verified locally:
      `supabase start` → `db:migrate` → `db:seed`, rollback of all nine files and re-apply, and
      `npm run db:audit`. The `--ref inceptor` dispatch and the project audit wait for the owner's
      `SUPABASE_DB_URL` (SETUP.md §4)
- [ ] Acceptance: `supabase start && npm run db:migrate && npm run db:seed` applies the bootstrap
      cleanly and `dbmate rollback` reverts the last file; the `--ref inceptor` dispatch applied it
      to the `justsplit` project; `npm run db:audit` against the project equals the local dump;
      no file under `supabase/migrations/` exists

### B2c. `404.astro` shell + `AppRouterIsland` + redirect pages (`phase-1`, `type:feat`)
- [x] `src/pages/404.astro` shell + `src/components/islands/AppRouterIsland.tsx` (spec D2): maps
      `location.pathname` (minus `import.meta.env.BASE_URL`) to the route islands (stubs until
      Phase 2; a real not-found view otherwise); `src/pages/{expenses,events,groups}/index.astro`
      = `<meta http-equiv="refresh">` + JS redirect to `withBase('/…/list')`. Inceptor's
      `scripts/init.mjs` does not emit `404.astro`, so the shell is new code independent of the
      database work
- [x] Test: `src/tests/app-router.test.ts` asserts every dynamic route family
      (`/expenses/:id`, `/expenses/edit/:id`, `/events/:id`, `/events/edit/:id`, `/groups/:id`,
      `/friends/:id`) resolves to an island, that `dist/404.html` exists after build and contains
      the shell, that the three redirect pages exist, and that no `src/pages/auth/v1/**` route
      collides with the Supabase auth path
- Landed: `src/lib/app-routes.ts` (pure matcher; reserved `list`/`new`/`edit` segments are
      not-found), `AppRouterIsland` + `routes/{RouteStub,NotFoundView}`, the 404 shell with a
      skeleton fallback and `noindex` (BaseLayout gains a `noindex` prop), and the three redirect
      pages. `dist/404.html` is asserted after the build by `scripts/check-dist.mjs`, now the last
      step of `npm run check` (unit tests run before the build). Verified in Chromium against
      `astro preview` with `ASTRO_BASE=/JustSplit`: `/JustSplit/expenses/abc` and
      `/JustSplit/groups/g-1/` mount their routes, `/JustSplit/nope` shows the not-found view,
      `/JustSplit/expenses` forwards to `/JustSplit/expenses/list/`
- [x] Acceptance: `npm run check` green; a deep link such as `/expenses/abc` on `npm run preview`
      renders the shell and the not-found view (islands arrive in Phase 2)

### B2b. RLS test suite — every table × every command × member/non-member/anonymous (`risk:high`, blocks B3/B5a)
- [x] `src/tests/rls/*.test.ts` Vitest suite (`// @vitest-environment node`) run against
      `supabase start`: `rls/fixtures.ts` creates three users through the local GoTrue admin API
      (member `A`, non-member `B`, `C` = A's accepted friend) and keeps an anonymous client; each
      test uses a `@supabase/supabase-js` client signed in as the actor (real JWTs, publishable
      key). The `service_role` key is used only by the fixtures for setup/teardown against
      `supabase start` and never leaves it — RLS parity with the real project is proven by
      `npm run db:audit` (B18), not by running this suite remotely. Optional (only if the owner
      wants the suite run remotely): a `remote` fixture provider with two pre-created accounts
      listed in `docs/runbooks/staging.md`, credentials in local env only, teardown through the
      actors' own RLS-permitted deletes and a final zero-leftover assertion
- [x] Runner mechanics: `vitest.config.ts` gets `exclude: [...configDefaults.exclude,
      'src/tests/rls/**']` so `npm run check` (`Build & Check`, no database) never runs the suite;
      `vitest.rls.config.ts` (`include: ['src/tests/rls/**/*.test.ts']`, `environment: 'node'`) +
      `test:rls` = `vitest run --config vitest.rls.config.ts` (a CLI path filter alone would not
      override the exclude); the real-adapter contract run (B5a) is `test:contract:live`, gated on
      `PUBLIC_SUPABASE_LOCAL=true`. `ci.yml` adds a second job `name: RLS & contract (supabase
      start)`: `supabase/setup-cli` (SHA-pinned) → `supabase start -x
      studio,imgproxy,mailpit,edge-runtime,logflare,vector` → `DATABASE_URL=postgresql://postgres:
      postgres@127.0.0.1:54322/postgres npm run db:migrate` (dbmate binary from the release
      tarball, or `docker run --network host …` — the container must reach `127.0.0.1:54322`) →
      `npm run test:rls && PUBLIC_SUPABASE_LOCAL=true npm run test:contract:live`. The job is
      added to the required checks on `inceptor` (A3b protection) and, after cutover, on `main`
- [x] Per table (`expense_groups`, `expenses`, `settlements`, `events`, `friendships`,
      `profiles`) and per command (select / insert / update / delete): the spec D10 policy table
      is the oracle — one `it()` per cell asserting allowed for the member/party/owner and denied
      (`PGRST` error or empty result) for the non-member and for anonymous; the `with check`
      clauses are asserted explicitly (creator not in `member_ids`, `paid_by` outside
      `member_ids`, a `splits[].userId` outside `member_ids`, `cardinality(users) <> 2`, a member
      removing themselves from `expense_groups`); the guard-trigger cells: a non-admin member
      cannot change `admin_ids`/`member_ids` (trigger), no one can change `created_by` on any
      table, `paid_by`/`splits[]` outside `member_ids` rejected on update, the requester cannot
      change `status`, `users`/`requested_by` immutable; the membership-mirror cells: an
      ungrouped expense/event/settlement with a non-friend uid in `member_ids` → denied, a group
      expense whose `member_ids ⊄ group.member_ids` → denied, an admin adding a non-friend to a
      group → denied, a second friendship request for the same pair → unique violation
- [x] Realtime: for each table, a subscription as `A` receives `A`'s insert and update; as `B`:
      receives no INSERT/UPDATE for `A`'s rows and at most `{ id }` for `A`'s DELETE (Supabase does
      not apply RLS to deletes) — the test asserts the DELETE payload carries no other column;
      asserts every `SchemaMap` table is in `supabase_realtime` (`pg_publication_tables`)
- [x] Coverage guard: every table in `pg_tables where schemaname = 'public'` has
      `relrowsecurity = true` (this covers `profiles` and `schema_migrations`, which are not in
      the `SchemaMap`); every `SchemaMap` table has ≥ 1 policy per command and a `guard_<table>`
      trigger; `schema_migrations` has RLS and zero grants to `anon`/`authenticated`
      (`information_schema.role_table_grants`); no function in `public` is executable by `anon`
      (`has_function_privilege('anon', p.oid, 'execute') = false` for every `pg_proc` in
      `public`); `public.documents` does not exist (`pg_tables`) and no file under
      `db/migrations/` creates a `documents` table (source grep); no policy body and no `check`
      constraint references the `extra` column (the Track D forward-compat guard, spec D9)
- [x] Storage: `receipts` policies — `A` uploads under `expenses/<A's expense>/`, `B` cannot read
      it; an upload to `expenses/<unknown-id>/…` is denied; `A` uploads `avatars/<A>/x.jpg`, `B`
      can read it, `B` cannot upload to `avatars/<A>/…` or overwrite it; the remove flow deletes
      the objects under a deleted expense before the row
- [x] Functions: anon cannot call `find_profile_by_email` (permission denied); a user who sets
      `profiles.email = B's email` is not returned for B's email — B is; an unconfirmed email is
      not returned; `find_profiles_by_ids`: a co-member and an accepted friend resolve, a stranger
      returns no row, anon cannot call it, `B` cannot select `A`'s `profiles` row directly;
      `batch_write`: an op with `collection: 'schema_migrations'` (or any unmapped name) raises and
      applies nothing, anon cannot call the function, a partial `update` leaves untouched columns
      and unknown overflow keys intact
- [x] Track D forward-compat cases (tests only): a row of each table carrying the spec D9 fields
      as overflow keys (`kind`/`settings`/`concepts`, `settings.budget`, `conceptId`/`settledAt`
      inside `extra`) is readable and writable by a member and denied to a non-member — the proof
      that Track D needs no migration
- [x] `batch_write` under RLS: a batch containing one denied operation writes nothing (atomic,
      SECURITY INVOKER; `storage-adapter-contract.md` §3)
- [x] ADR `docs/decisions/0002-canonical-schema-and-rls.md`: the collection → table → policy →
      trigger inventory (the `SchemaMap` plus `profiles`), the `member_ids` array decision vs the
      junction-table + `is_member()` alternative and the membership mirror (spec D10; if the owner
      ever rejects the mirror the ADR records "authenticated ≠ trusted: any signed-in user can push
      rows into any other user's lists" as an accepted risk and a block/hide-user issue is filed
      before cutover), the canonical query per collection (`array-contains` on
      `member_ids`/`users`, `==` on `group_id`/`eventId`), "no policy or constraint inspects
      `extra`", the `settledAt` overflow-key decision, the trust statement (every overflow key is
      writable by any member of the row and never protected by RLS; `settledAt` and `settlements`
      rows are attestations by `created_by`, not verified payments — B14 shows "marcado como
      pagado por <name>" and the ETHICS checklist for B14 and Track D issue D7 records it), and
      the statement that a missing policy fails CI (coverage guard)
- Landed: 12 files / 159 tests under `src/tests/rls/`; fixtures read the stack's keys from the
      environment or `supabase status` (no key is committed); the optional remote fixture provider
      was not built. `test:contract:live` joins the CI job in B5a. `npm run test:rls:mutation`
      (baseline-guarded) kills 33/33 mutations: every public and `receipts` storage policy and
      every `guard_<table>` trigger
- [ ] Acceptance: the suite is green in CI against `supabase start` and red when any single
      policy or any `guard_<table>` trigger is dropped (mutation check in the PR body); the ADR
      lists every table with its policies and triggers

### B3. Zod schemas + domain layer
- [x] `src/schemas/`: re-export the universal types from `@cyber-eco/types` (`Expense`,
      `Settlement`, `ExpenseGroup`, `Friendship`, `SplitType`) and wrap them in Zod:
      `expense.ts` (`ExpenseSchema` = universal fields with `groupId: z.string().nullable()` and
      `memberIds: z.array(z.string()).min(1)` — the JustSplit row type of spec D10 — plus the
      JustSplit-only **top-level** optional fields `eventId: z.string().optional()`,
      `conceptId: z.string().optional()`, `settledAt: z.string().nullable().optional()`; the
      SchemaMap stores fields with no mapped column in the `extra` overflow column and rehydrates
      them flat, so no schema ever declares a field named `extra`), `settlement.ts` (`groupId`
      nullable, top-level `expenseIds`, `eventId`), `group.ts` (universal; `members[]` items are
      the universal `ExpenseGroupMember` with required `role: AppRole` and `joinedAt`; top-level
      opaque `kind`, `settings`, `concepts`), `event.ts` (JustSplit-local: `id`, `name`,
      `description?`, `date`, `startDate?`, `endDate?`, `location?`, `groupId?`, `memberIds`,
      `preferredCurrency`, `kind: z.string()`, `createdBy`, timestamps, opaque `settings`),
      `friendship.ts` (universal), `profile.ts` (`JustSplitProfile`, the hub's `profiles` row:
      `preferences: z.object({ preferredCurrency: z.string(), phoneNumber: z.string().optional()
      }).passthrough()` — the phone number lives inside `preferences` because the hub's `profiles`
      table has no such column and `SupabaseProfileStore` writes top-level keys as columns).
      Timestamps are ISO strings on read (the adapter rehydrates `timestamptz` — no `Timestamp`
      union); `z.infer` types replace `src/types`
      > Note (B3): each schema also re-exports/imports the corresponding `@cyber-eco/types` type
      > and carries a compile-time-only `_ExpectTrue<... extends ... ? true : false>` guard so a
      > future drift from the upstream package fails `npm run type-check` instead of silently
      > dropping a field. Uses zod v4's `.loose()` (the non-deprecated equivalent of
      > `.passthrough()`) throughout — same "never `.strict()`" semantics the plan calls for.
      > `group.ts`'s universal `settings` sub-object is typed as an opaque `z.record` rather than
      > the strict `{ defaultSplitType, simplifyDebts, maxMembers }`, per the file's own
      > "Forward-compatible extra keys" bullet below; Track D issue D1 narrows it for real.
- [x] Move pure logic to `src/domain/`: `expenseCalculator`, `formatters`, `csvExport`,
      `fileUtils`, `timeline/*`; `currencyExchange` becomes `domain/currency.ts` (pure:
      `SUPPORTED_CURRENCIES`, `FALLBACK_RATES`, `getExchangeRate` with fetch + cache injected);
      its `useExchangeRate` hook is **not** ported — it has no caller in the app; islands wrap
      `domain/currency.getExchangeRate` in `useQuery`. Consolidate on one `formatCurrency` (the
      symbol-based one used by 6 pages + `HoverCard` + `BalanceOverview`); `FinancialSummary`
      (the only Intl consumer) and its test switch to it
      > Note (B3): `FinancialSummary`/`HoverCard`/`BalanceOverview` don't exist in this tree yet
      > (Track B islands land later); `domain/formatters.ts` ships the consolidated
      > `formatCurrency` now so those future ports have one implementation to switch to.
- [x] `expenseCalculator` is **re-typed onto the universal `Expense`** (spec D10): both balance
      paths (formerly `src/utils/expenseCalculator.ts:36` and `:136`) consume `splits[].amount`
      instead of `amount / participants.length`; `participants` = `splits.map(s => s.userId)`;
      `settled` = `settledAt != null`. This fixes the old share bug by construction; a
      `materializeSplits(amount, splitType, input)` helper (equal → remainder cents on the payer;
      percentage → rounded) is the only writer of `splits[].amount` and is used by B10/B14.
      Tests: equal results unchanged on the ported fixtures; exact 40/30/30; percentage 50/25/25;
      remainder-cent placement. Track D D2 adds the edge-case suite
      > Note (B3): signature is `materializeSplits(amount, input)` with `splitType` as a
      > discriminant field on `input` (a discriminated union), not a separate third parameter —
      > same behavior, TS narrows `input.shares`/`input.participantIds` per branch. Percentage
      > gets the same remainder-cent-on-the-payer rule as equal (not specified by the plan, but
      > the natural generalization so `splits[]` always sums to exactly `amount`).
- [x] Port the 4 `src/utils/__tests__` suites + `src/__tests__/timelineCalculations.test.tsx` to
      Vitest via the D7 codemod (`vi.hoisted()` for `jest.mock` factories with outer refs,
      `global.fetch = vi.fn()`), adapting fixtures from `participants`/`splitMethod` to
      `splits[]`/`splitType`; add tests for `formatters` and `fileUtils`
      > Note (B3): `currencyExchange.test.ts`'s port needed neither `vi.hoisted()` nor
      > `global.fetch = vi.fn()` — `domain/currency.ts`'s pure, injected-fetch design (see above)
      > lets each test pass its own mock `fetchImpl` directly. Both timeline suites (the
      > `src/utils/__tests__` one and the `src/__tests__/timelineCalculations.test.tsx` one) are
      > ported but stay `describe.skip`: both document a real, pre-existing bug (future-start
      > progress, off-by-one-day date formatting) with an explicit "rewritten in plan issue B11a"
      > baseline note; un-skipping without that fix would just re-introduce a red suite B11a
      > already expects to inherit and rewrite on fixed-TZ fixtures.
- [x] Copy Inceptor's `scripts/check-ts-pragmas.mjs` + `check:pragmas` script (in the B1 `check`
      umbrella) so missing `// @vitest-environment jsdom` pragmas fail `npm run check`
      > Note (B3): already present from plan B1 (verified, no changes needed). It enforces banned
      > TypeScript suppression pragmas (`@ts-nocheck`/`@ts-expect-error` without a `-- reason`),
      > not literally the jsdom pragma; the jsdom-vs-node environment switch is vitest 4's own
      > per-file `// @vitest-environment` mechanism, already wired in `vitest.config.ts`.
- [x] Forward-compatible `extra` keys (spec D9; written by nobody before Track D): `group.ts`
      `kind: z.string().optional()`, `settings: z.record(z.string(),
      z.unknown()).optional()`, `concepts: z.array(z.unknown()).optional()`; `event.ts`
      `settings: z.record(z.string(), z.unknown()).optional()`; `expense.ts`
      `conceptId: z.string().optional()`, `category: z.string().optional()` (string, never
      an enum). No `.default()` on any of them: derived defaults are Track D selectors
      (`parseKind`, `normalizeCategory`)
- [ ] Every read schema is `.passthrough()` (never `.strict()`); the write-input schemas
      (`CreateExpenseInput` etc.) `.omit()` the spec D9 fields until Track D issue D1 deletes the
      omit. Tests: (1) the write-input **overflow key set** — the set of top-level input keys with
      no mapped column in `schema-map.ts` — equals the declared list per collection; this
      mechanically enforces "no undeclared key reaches `extra`"; (2) a row with an unknown
      top-level key survives parse → in-memory `repos.*.update` of one field → the unknown key is
      intact (`updateDocument` merges the patch's overflow keys into `extra`, B5a contract test)
      > Note (B3): left unticked because test (2) is explicitly deferred (see below) — everything
      > else here is done: every read schema is `.loose()` (zod v4's non-deprecated
      > `.passthrough()`), never `.strict()`; write-input schemas `.omit()` exactly the D9
      > forward-compatible fields above; `schema-map.ts` doesn't exist yet (that's B5a), so
      > `src/schemas/overflow.ts` declares the per-collection list instead and
      > `src/schemas/overflow.test.ts` (test 1) parses
      > `db/migrations/20260928000003_justsplit_tables.sql` directly and proves the write-input
      > overflow-key set matches it, for all five SchemaMap collections — green. Test (2) needs an
      > in-memory `repos.*.update` that doesn't exist before B5a; deferred there.
- [ ] Synthetic fixtures under `src/tests/fixtures/*.synthetic.json`: `group.couple` (`kind`,
      `settings`, `concepts`), `event.trip`, `expense.with-conceptId`, plus one row with an
      unknown `kind` and a non-taxonomy `category`; the round-trip test parses all of them
      without throwing; `supabase/seed.sql` (B2) is generated from the same fixtures
      > Note (B3): left unticked only for the last clause — `supabase/seed.sql` (hand-written in
      > B2) is not regenerated from these fixtures here; deferred to B5a once the adapter exists to
      > do the generation. Everything else is done: `group.couple.synthetic.json`,
      > `event.trip.synthetic.json`, `expense.with-conceptId.synthetic.json` (also carries the
      > non-taxonomy `category: 'not-a-taxonomy-key'`), plus a fourth fixture,
      > `group.unknown-kind.synthetic.json` (`kind: 'polycule'`), for the unknown-`kind` case —
      > `src/schemas/fixtures.test.ts` parses all four without throwing, green.
- [x] `src/domain/categories.ts` stub exporting the five legacy keys (`food`, `transportation`,
      `accommodation`, `entertainment`, `other`) as the only options B10 may write; Track D D1
      replaces the file, not the form
- [ ] Test: schema round-trip against the synthetic fixtures and against rows read back from
      `supabase start` (the adapter's rehydration is part of the contract)
      > Note (B3): the synthetic-fixture round-trip half is done (`src/schemas/fixtures.test.ts`,
      > green). Left unticked because the `supabase start` half needs the B5a adapter's
      > rehydration, which doesn't exist yet; deferred there.
- [x] Acceptance: `npm run test` ≥ 7 ported/new suites green; overflow key-set and passthrough
      round-trip tests green; `expenseCalculator` share tests green
      > Note (B3): far exceeded — 16 new test files (8 `src/schemas/*.test.ts`, 8
      > `src/domain/**/*.test.ts`), 55 passed + 2 intentionally skipped (timeline, see above) at
      > the `npm run test` level; `src/schemas/overflow.test.ts` and `src/schemas/fixtures.test.ts`
      > green; `src/domain/expenseCalculator.test.ts` (13 tests, incl. `materializeSplits`) green.

### B4. Auth: `@cyber-eco/auth` `<AuthProvider>` + store bridge + RouteGuard adapter (`risk:high`)
- [x] `src/lib/data/adapter.ts` exports `authAdapter = new SupabaseAuthAdapter(client)` and
      `profileStore = new SupabaseProfileStore(client)` (`cybereco-hub/packages/supabase/src/auth/`);
      `src/lib/auth-context.ts` builds the typed context with `createAuthContext<JustSplitProfile>()`
      (exported by `@cyber-eco/auth`) so `useAuth().userProfile` is the B3 `profile.ts` type instead
      of `BaseUserConstraint`, and exports two **module-level constants** —
      `createJustSplitProfile = (u) => ({ id: u.uid, name: u.displayName ?? 'User', email: u.email
      ?? undefined, avatarUrl: u.photoURL ?? undefined, apps: ['justsplit'], permissions: [],
      preferences: { preferredCurrency: 'USD' }, createdAt: now, updatedAt: now, lastLoginAt: now })`
      and `onProfileLoaded = (p) => $profile.set(p)` (the provider's effect lists both props in its
      dependency array, so inline callbacks would re-subscribe the adapter listener on every
      render). `src/components/islands/AuthIsland.tsx` = `<AuthProvider config={{ adapter:
      authAdapter, profileStore }} createUserProfile={createJustSplitProfile}
      onUserProfileLoaded={onProfileLoaded}>` (`packages/auth/src/context/AuthContext.tsx`;
      `enableIndexedDBRecovery` omitted) + `<AuthBridge />`, a child that **mirrors `useAuth()`**
      into the Nano Stores (`currentUser` → `$user`, `userProfile` → `$profile`, `!isLoading` →
      `$authReady`) — it never subscribes to `adapter.onAuthStateChanged` itself, because the
      provider already owns that listener and the `profileStore.get → set` bootstrap; a second
      listener would double the `INITIAL_SESSION` callbacks and race the profile creation. Because
      `AuthProvider` is React Context, every route island renders `AuthIsland` at its own root
      (`ErrorBoundary > AuthIsland > AuthGate > Content`); layout islands (`UserMenuIsland`) read
      the stores only
      - Deviation: `createAuthContext<AuthProfile>()`, not literally `<JustSplitProfile>` —
        `JustSplitProfile` (`.loose()`, nullable `name`) doesn't satisfy `BaseUserConstraint`
        (`name: string`); `AuthProfile` (`src/schemas/profile.ts`) is `JustSplitProfile` intersected
        with the five fields narrowed non-null, structurally still assignable to `JustSplitProfile`.
        See ADR 0003 §1.
- [x] `src/stores/auth.ts`: `$user` (`AuthUser | null` — import the type from `@cyber-eco/types`,
      which exports it; `@cyber-eco/auth` does not, and `HubUser` is the wrong type), `$authReady`,
      `$profile` (the `profiles` row, `JustSplitProfile`); actions `signIn`, `signUp(email,
      password, displayName)`, `signInWithGoogle(next?)` (**redirect** flow; the page unloads and
      supabase-js finishes the PKCE exchange on return, `detectSessionInUrl: true` from B2a).
      Google bypasses the adapter on purpose: `SupabaseAuthAdapter.signInWithProvider` calls
      `signInWithOAuth({ provider })` with no `options.redirectTo` and the `AuthAdapter` interface
      cannot pass one, so the return would land on the project's single Site URL — the wrong origin
      for one of staging/production (one shared project) and unusable there because the PKCE
      verifier lives in the originating origin's localStorage. `signInWithGoogle` therefore calls
      `client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: new
      URL(withBase('/auth/callback/'), location.origin).href } })` directly (H1 requests a
      `signInWithProvider(provider, { redirectTo? })` overload upstream). `next` is written to
      `sessionStorage` before the call and read back on the callback page — never passed through
      the provider round-trip. `/auth/callback.astro` renders the skeleton and then
      `location.replace(withBase(safeNext(next)))`, where `safeNext` (in `src/lib/href.ts`,
      unit-tested) returns `'/'` unless `next` matches
      `/^\/(?!\/)[A-Za-z0-9_\-\/]*(\?[A-Za-z0-9_\-=&%.]*)?$/` and its first path segment is one
      of the app's route families (`expenses|events|groups|friends|settlements|profile`) — with
      `ASTRO_BASE` unset, `withBase('//evil.example')` is a protocol-relative URL and an open
      redirect that the subpath deploy masks. `signOut` (the adapter's `signOut()` is Supabase's
      default **global** scope — every session is revoked), `resetPassword(email, { redirectTo:
      withBase('/auth/reset-password/') })`, `updatePassword`, `updateDisplayProfile`
- [x] Profile bootstrap is **one writer**: `AuthProvider` runs `profileStore.get(uid)` →
      `profileStore.set(uid, createUserProfile(user))` on the first authenticated
      `onAuthStateChanged` (own-row RLS lets the client do it) and flips `isLoading` — hence
      `$authReady` — only afterwards; `AuthBridge` performs no bootstrap of its own.
      `updateProfile` writes `profileStore.update`, mirrors `name`/`avatarUrl` into
      `adapter.updateDisplayProfile` and refreshes `$profile`. Test: a first Google sign-in against
      a memory `ProfileStore` records exactly one `set`, carrying `apps: ['justsplit']` and
      `preferences.preferredCurrency` (the RLS suite covers the policy; this test covers the flow)
- [x] `toGuardUser(user, profile)` returns `{ id: user.uid, roles: ['user'], flags: {} }`
      whenever `user` is non-null — roles come from the session, never from the user-writable
      `profiles` row (`isAdmin`, `permissions` there grant nothing in JustSplit); `profile` only
      feeds display data (name, avatar, preferredCurrency). Test: a user with no profile row still
      passes `<RouteGuard allow={['user']}>`; a profile row with `isAdmin: true` or
      `permissions: ['admin']` grants nothing
- [x] `src/components/islands/AuthGate.tsx` — a readiness/navigation wrapper only; every
      allow/deny decision stays in `RouteGuard` (CLAUDE.md: `route-guard.tsx` is the only gating
      module): renders `Skeleton` while `!$authReady`; when `$authReady && !$user` runs
      `location.replace(withBase('/landing/'))` (parity with `ProtectedRoute.tsx`; PUBLIC_PATHS
      `/landing`, `/auth/*`, `/about`, `/help` stay public); otherwise `<RouteGuard
      user={toGuardUser($user, $profile)} allow={['user']} fallback={<SignInPrompt/>}>{children}</RouteGuard>`.
      The guard is UX only; RLS is the authorization (`examples/static-app/README.md`)
      - Alternative (lower priority): redirect to `/auth/signin/?next=<path>` instead of `/landing`
        (the `next` value always goes through `safeNext()`); record whichever is chosen in ADR 0003
        — not taken; `/landing` chosen (parity with today), recorded in ADR 0003 §5.
- [x] Redirect rules: unauthenticated on a guarded page → `/landing` (current `ProtectedRoute`
      behaviour); signed-in on `/auth/*` → decide `/profile` (today) or `/` and record it in ADR
      0003; B8b's `/` follows the same rule
      — `/` chosen, recorded in ADR 0003 §5. `/` itself is still the Phase-0 placeholder page
      (no `AuthGate`) — B8b wires it.
- [x] Copy `src/components/islands/LoginForm.tsx` (+ `.test.tsx`),
      `src/components/ui/password-input.tsx` (+ `.behavior.test.tsx`), `src/schemas/login.ts`
      (+ `.test.ts`) from Inceptor; replace `handleLogin` with `signIn()` from
      `src/stores/auth.ts`, add a Google button calling `signInWithGoogle()`, and add a sibling
      `SignUpForm` on the same pattern (schema `RegisterSchema` mirroring
      `docs/recipes/auth-supabase.md` §4, with `displayName`). Mount both as `client:only="react"`
      with a fallback slot on `auth/signin.astro` / `auth/signup.astro` (start from
      `src/pages/login.astro`, swapping its `client:visible`). No Facebook/Twitter buttons, no
      `linkProvider`
      - Note: `src/components/ui/password-input.tsx` + `.behavior.test.tsx` were already ported
        (identical to Inceptor's) by an earlier phase — nothing to copy there.
- [x] `/auth/reset-password.astro` + `ResetPasswordIsland` (request form → `resetPassword`; on
      return with a recovery session → `updatePassword` form; today's link from signin is dead)
- [x] ADR `docs/decisions/0003-cybereco-auth-islands.md` with the Stakeholder Analysis section
      (centinela §5.1 requires it for `/auth` routes): one `AuthProvider` per island tree + store
      bridge, redirect-only OAuth, roles from the session
- [x] Auth-chunk measurement (not deferred to B19): a Vitest over `npm run build` output sums the
      gz size of the `dist/_astro/*.js` chunks loaded by `/auth/signin/` and reports the one
      containing `@cyber-eco/auth` + `@supabase/supabase-js` (the package ships one client entry
      with `splitting: false`, no `sideEffects` flag, `jose`, and `zod@^3` next to the app's
      `zod@^4` — two `zod` copies); record the numbers in ADR 0003 and seed
      `lighthouse-budgets.json`'s `/auth/*` entry from them (measured, not guessed). ADR 0003 also
      records the fallback if the auth chunk alone pushes `/auth/signin/` over Inceptor's 150 kB
      script budget: keep `SupabaseAuthAdapter`/`SupabaseProfileStore` from `@cyber-eco/supabase`
      but drive them from `src/stores/auth.ts` directly (no `<AuthProvider>` import), since the
      stores are what islands read anyway; file a hub follow-up to add `sideEffects: false` and
      widen the `zod` range. Peer deps need no `--legacy-peer-deps` (`react >=18` optional,
      `@supabase/supabase-js >=2.45`)
      - Deviation: `scripts/check-auth-bundle.mjs` (chained after `check:dist` in `npm run check`),
        not a Vitest — it and test (6)'s build half both read `dist/`, which doesn't exist yet when
        Vitest runs (before `build` in the `check` pipeline). `@cyber-eco/auth` is not present in any
        built chunk today (see ADR 0003) — nothing shipped mounts `AuthIsland` yet.
- [x] Tests: (1) `AuthBridge` mirrors `useAuth()` into `$user`/`$profile`, `$authReady` flips only
      after `isLoading` is false, and a memory `ProfileStore` records exactly one `set` on first
      sign-in; (2) `hasFlag` absent-field denies; (3) AuthGate renders Skeleton while not ready and
      does not redirect; (4) redirects to `/landing` once ready with no user; (5) RouteGuard denies
      an unknown role even when `$user` is set; port `src/app/client-layout-wrapper.test.tsx`
      (guard/redirect behaviour) — `src/components/islands/AuthGate.test.tsx` covers the equivalent
      Astro-tree behaviour (Skeleton/redirect/deny), not a line-for-line Jest→Vitest port: the Next
      tree's component (`ClientLayoutWrapper`, route-based Header/`ProtectedRoute` composition) has
      no direct analog once routing moves to Astro pages + one route island each;
      (6) a build test greps `dist/_astro/*.js` for the two unguarded
      reads only — regex `process\.env\.(NEXT_PUBLIC_HUB_URL|NODE_ENV)` — and asserts zero hits
      (guarded `typeof process !== 'undefined' && process.env…` reads from `@cyber-eco/auth`'s
      `useHubAuth.ts`/`logger.ts` survive in the bundle by design and are allowed; both `define`
      keys stay in `astro.config.mjs` because `usePermissions.tsx` and the logger/performance/error
      utilities read unguarded), plus a jsdom smoke test that imports `@cyber-eco/auth` with
      `globalThis.process` deleted and mounts `<AuthProvider>` without a `ReferenceError`; (7)
      `safeNext('//evil.example')`, `safeNext('https://evil.example')`, `safeNext('/\\evil.example')`
      and `safeNext('/unknown/x')` all yield `/`; `safeNext('/expenses/abc-1?event=x')` is returned
      unchanged; (8) `signInWithGoogle` passes a `redirectTo` equal to
      `withBase('/auth/callback/')` on the current origin
- [ ] Acceptance: `/auth/signin` (email+password and Google) works against `supabase start`
      (Google needs the local GoTrue provider config; email+password is the CI path). On the
      staging site (`https://artemiopadilla.github.io/JustSplit/`), Google sign-in returns to
      `/JustSplit/auth/callback/` — not to the project's Site URL — verified manually before B18,
      with that origin and callback registered in the Supabase project's redirect URLs and in
      Google Cloud (B2a; documented in `docs/runbooks/staging.md`). `/` redirects to `/landing`
      when logged out; the auth-chunk numbers are in ADR 0003
      - [x] auth-chunk numbers are in ADR 0003
      - [x] manual verification of email+password against the local `supabase start` stack: signUp
        + signInWithPassword succeed, and an own-row `profiles` upsert (the exact shape
        `createJustSplitProfile` produces) is accepted under RLS — run ad hoc against
        `127.0.0.1:54321` in this session (not committed; no files added under `src/tests/rls/`
        per instruction)
      - [ ] manual verification of Google sign-in against `supabase start` — needs the local GoTrue
        provider config (owner action); not run in this session
      - [ ] staging Google callback + redirect-URL registration — owner action, explicitly out of
        scope here (needs the real Supabase project + Google Cloud console)
      - [ ] `/` redirects to `/landing` when logged out — `/` has no `AuthGate` yet (still the
        Phase-0 placeholder page); this becomes true once B8b wires it

### B5a. Repos over `StorageAdapter` + `SchemaMap` + Realtime → TanStack Query (`risk:high`)
- [x] `src/lib/data/schema-map.ts`: the `SchemaMap` of spec D10 (`expense_groups`, `expenses`,
      `settlements`, `events`, `friendships` → table, `idColumn: 'id'`, `columnMap` camelCase →
      snake_case, `jsonbColumn: 'extra'`, `metadata: { createdAt: { field: 'createdAt', column:
      'created_at', strategy: 'server' }, updatedAt: … }`) per
      `cybereco-hub/docs/design/schema-map-strategy.md`, typed against `SchemaMap`/`CollectionMapping`
      (local copies until H2 exports them from `@cyber-eco/types`). **`profiles` is not in the
      map**: its columns are quoted camelCase `text` (`"avatarUrl"`, `"createdAt"`, …) written
      flat by `SupabaseProfileStore`, it has no `extra` column and `metadata.strategy: 'server'`
      expects `timestamptz` — the shared defaults would address non-existent columns (PostgREST
      400/404). Nothing needs it through the `StorageAdapter`: own-row access goes through
      `SupabaseProfileStore`, cross-user lookup through the B2 functions. A test asserts the map's
      table list equals the tables created by `db/migrations/` minus `profiles` and
      `schema_migrations`, and that the B2b coverage guard sees every one of them
      [deviation: `CollectionMapping` gained a local-only `columns: readonly string[]` field —
      the physical column allowlist per table, beyond `table`/`idColumn`/`columnMap`/`jsonbColumn`/
      `metadata`. The contingency adapter needs it client-side to decide "real column vs `extra`
      overflow" per field, a decision `batch_write` makes server-side via `information_schema.columns`
      that the browser can't. Pinned to the migration by `schema-map.test.ts`; documented as a
      JustSplit-only extension in `schema-map.ts` and ADR 0004 so it's dropped, not upstreamed, at H2]
- [x] `src/lib/data/repos/{groups,expenses,settlements,events,friendships}.ts`: plain async
      functions over the `StorageAdapter` interface **only** (`getDocument`, `setDocument`,
      `updateDocument`, `deleteDocument`, `query`, `batchWrite`, `subscribeToQuery`,
      `generateId`; types from `@cyber-eco/types`), Zod-validated input (B3). Canonical queries
      (ADR 0002): expenses / settlements / events / groups → `[{ field: 'memberIds', operator:
      'array-contains', value: uid }]`; friendships → `users array-contains uid`; group expenses →
      `groupId == id`; event expenses → `where('eventId', '==', id)` (`eventId` has no column, so
      the adapter resolves it to `extra->>'eventId'`; the app never spells `extra`). Writers
      always set `memberIds` (group context → the group's `memberIds`; otherwise the split
      participants ∪ payer, every one an accepted friend or a co-member — the RLS membership
      mirror rejects anything else) and `createdBy = uid`; `updateDocument` patches are partial.
      Plus `src/lib/data/repos/profiles.ts`: `byEmail(email)` → `rpc('find_profile_by_email')`
      and `byIds(ids)` → `rpc('find_profiles_by_ids')` through the `rpc` helper of `client.ts`
      (`profiles` is not a `SchemaMap` collection); `src/tests/collections-mapped.test.ts` extracts
      every string literal passed as `collection` in `src/lib/data/repos/*` and every
      `BatchOperation.collection`, and asserts each is a key of `schemaMap`; `adapter.ts` is
      asserted (source grep) to pass `{ schemaMap }`; the memory adapter and the real/contingency
      adapter wrapper throw on an unmapped collection instead of falling back to document mode
      [`settlements.ts` has no `update` export at all, not just an untested one — D10's RLS has no
      update policy on `settlements` ("immutable; correct by delete + insert"), so there is no
      partial-patch function to write]
- [x] `src/lib/data/hooks/`: `useExpenses(uid)`, `useGroup(id)`, … = `useQuery` with
      `queryKey: [collection, scope]`, `staleTime` per collection; `useCreateExpense()` etc. =
      `useMutation` invalidating the affected keys; Realtime: `useLiveQuery(key, collection,
      filters)` is the **single network source** for a live key: it subscribes
      `adapter.subscribeToQuery` inside `useEffect` with `createDisposer()` (the first emission
      **is** the initial fetch — `subscribeToQuery` is FETCH-THEN-LISTEN; later emissions →
      `queryClient.setQueryData(key, rows)`), and the paired `useQuery` is configured with
      `enabled: false` (or `staleTime: Infinity` + `refetchOnMount: false`) so its `queryFn` never
      runs while the subscription is active — otherwise every island mount issues two identical
      PostgREST requests; the idb persister still hydrates the key before the first emission.
      Non-live keys (detail pages) use `repos.*` through a normal `useQuery`. Torn down on unmount
      and on `$user` change. Collection queries set `meta: { persist: true }` (Inceptor's
      persister is opt-in via `shouldPersistQuery`); exactly one `QueryProvider` per page — the
      route island — with the single shared `idbKey='justsplit:query'`, so a warm navigation to
      any route reuses collections fetched on another (Inceptor's default is one client per island
      under one `tanstack-query-cache` key, where two providers on one page clobber each other);
      layout islands (`UserMenuIsland`, `ToasterIsland`) read Nano Stores only and never mount
      `QueryProvider`. `useProfiles(ids)` = `useQuery` over `repos.profiles.byIds` with a sorted,
      de-duplicated key and a long `staleTime` (1 h) — used by B9, B11b, B13, B14 and CSV export
      for other users' names/avatars. Hooks are the only thing islands import from `src/lib/data`.
      Tests: exactly one adapter `query()` call per mount of a live island; a source-text test
      asserts `QueryProvider` is imported only by route islands and never by a
      `src/components/common/*` or layout island
      [`src/lib/data/hooks/hooks.test.tsx` covers the wiring (useExpenses/useGroupExpenses/
      useEventExpenses/useEvents/useGroupEvents/useGroup/useCreateExpense/useProfiles) against a
      spied `useLiveQuery`; deferred to the feature-island issues that first need them (B10-B14):
      useGroups, useSettlements, useFriendships and their mutations — same two-line pattern, not
      worth adding unused now. No route island exists yet (Phase 2), so
      `query-provider-boundary.test.ts`'s "importers exist" side is currently vacuous — a dedicated
      case proves the regex itself works]
- [x] Listener-leak test: a Vitest fakes `$user` transitions `null → A → B → null` and asserts
      exactly one live subscription per key at any time (the memory adapter counts channels);
      StrictMode double-mount leaves one
      [`src/lib/data/hooks/useLiveQuery.test.tsx`, against a small counting fake adapter rather than
      the memory adapter — the memory adapter's own subscription counting is exercised directly in
      `memory-adapter.test.ts` instead]
- [x] `src/tests/memory-adapter.ts`: in-memory `StorageAdapter` implementing every method
      (filters incl. `array-contains`, `batchWrite` atomicity, `subscribeToQuery` emitting on
      writes); the contract suite `src/tests/storage-adapter-contract.test.ts`
      (`storage-adapter-contract.md` §5: `batchWrite` atomicity, fetch-then-listen initial
      emission, `serverTimestamp` rehydration as ISO, **`updateDocument` with overflow keys in
      the patch merges them into `extra` — `extra = extra || <overflow keys>` — and a key with a
      real column updates that column; an update of `settledAt` leaves `eventId` intact**, an
      unmapped collection throws) runs against the memory adapter always and against the real
      adapter as `test:contract:live` when `PUBLIC_SUPABASE_LOCAL=true` (the `RLS & contract
      (supabase start)` CI job, B2b)
      [deviation: `test:contract:live` doesn't read `PUBLIC_SUPABASE_LOCAL` at all — it reuses
      `src/tests/rls/fixtures.ts`'s actor client (never `client.ts`), which discovers the local
      stack's keys via `supabase status`, exactly like `test:rls` already does. Setting
      `PUBLIC_SUPABASE_LOCAL=true` on the CI step broke
      `src/tests/supabase-workflow-env.test.ts`'s "`ci.yml` builds without any `PUBLIC_SUPABASE_*`
      value" invariant (kept so the `build` job's coverage of `client.ts`'s guarded/disabled path
      stays meaningful) — dropped it instead of relaxing that test. Verified locally against
      `supabase start` (migrations applied): `npm run test:rls` 159/159, `npm run test:contract:live`
      8/8, both exit 0, 5/5 clean repeats on the Realtime-push case; 9/9 after the orchestrator's
      review fix below, 3/3 clean runs]
      [Review fix: `setDocument`/`updateDocument` read `extra`, merged it client-side and wrote it
      back (lost updates under concurrent writers, reproduced 3/3 live), and `setDocument` used a
      client upsert (denied for a non-creator member by the INSERT policy check). Both now send
      one op through the atomic `batch_write` RPC — red `15c2e8b`, fix `ece7804`; ADR 0004 updated]
- [x] **Contingency (conditional — only if relational mode is not merged in `@cyber-eco/supabase`
      when this issue starts, spec D1):** `src/lib/data/relational-adapter.ts` implements
      `StorageAdapter` over `@supabase/supabase-js` per the `SchemaMap` design — a `toRow()` that
      maps `columnMap` fields to snake_case columns and folds every other top-level field into an
      `extra` object (and `fromRow()` that rehydrates them flat); `updateDocument` → `update set
      <columns>, extra = extra || <overflow keys>` (merge, never replace); a filter or sort field
      with no mapped column resolves to `extra->>'<field>'`; `query` → PostgREST filters
      (`eq/neq/lt/lte/gt/gte/in`, `array-contains` → `cs` on `text[]` or `@>` on jsonb);
      `batchWrite` runs each op's `data` through the same `toRow()` used by
      `setDocument`/`updateDocument` before `rpc('batch_write')` (the B2 function expects the
      pre-translated row shape); `subscribeToQuery` → fetch, then on **any** `postgres_changes`
      event re-run the query and re-emit (hub adapter semantics — DELETE payloads carry only the
      PK and are not RLS-filtered, so a client-side predicate cannot evaluate them); a Vitest with
      a fake channel covers INSERT, UPDATE and a PK-only DELETE; `serverTimestamp()` → omit the
      column so `default now()` applies; `array-contains-any` throws (unused); an unmapped
      collection throws. Tests: the collection list parsed from the `batch_write` migration's
      `case` arms equals `Object.keys(schemaMap)`; an unmapped collection raises; a partial
      `update` leaves untouched columns and unknown overflow keys intact. Same contract suite;
      `adapter.ts` selects it. Upstreamed as Track C' H2 when gate C1 clears; deleted here
      afterwards (B22)
      [confirmed at issue start: relational mode is not in `@cyber-eco/supabase@0.2.1`
      (`node_modules/@cyber-eco/supabase/dist/index.d.ts` — document mode only, no `schemaMap`
      config) — the contingency applies, per the D1 spec text and scope decision 1]
- [x] Port `src/context/__tests__/AppContext.test.tsx` against the hooks + memory adapter
      [`src/lib/data/hooks/app-context.port.test.tsx`; ported: default-empty state, "adds an
      expense/event/settlement correctly" (the last at the repo level — no `useSettlements` hook
      yet, deferred). Not ported, with reasons in the file header: "initializes with provided
      initialState" (no TanStack Query equivalent to a component-prop initial state),
      "adds/updates a user" (no generic `users` collection in the target schema — identity is
      `profiles` + `repos.profiles`), "throws when used outside a provider" (no Context to be
      outside of, CLAUDE.md rule 2)]
- [x] ADR `docs/decisions/0004-tanstack-query-over-storage-adapter.md` incl. Stakeholder Analysis
      (Query cache persisted to IndexedDB = user data on the device; cleared on sign-out; no
      offline writes in v1): layering per `tradepilot-pilot-integration.md` Seam 2, no
      `DataLayerService` and no `createDataLayer` call (so the doctrine's `permissions: { enabled:
      false }` is met structurally — a Vitest greps `src/` for `createDataLayer(` and
      `DataLayerService`), Realtime → refetch → `setQueryData`, one `QueryProvider` per page, the
      contingency adapter and its upstreaming
- [x] Acceptance: an island using `useExpenses` shows live rows from the local seed and updates
      when a second client inserts; contract suite green against the memory adapter and the real
      one; listener-leak test green; `grep -rn "@cyber-eco/supabase\|@supabase/supabase-js" src
      --include=*.ts --include=*.tsx` hits only `src/lib/data/{client,adapter,relational-adapter}.ts`
      [no route island/page exists yet (Track B's feature islands are Phase 2), so "an island using
      `useExpenses`" is proved at the hooks level instead, split across two tests for an
      environment reason: `src/lib/data/hooks/hooks.test.tsx` proves the wiring (useExpenses calls
      useLiveQuery with the right collection/filters) against a spied useLiveQuery, and
      `src/tests/storage-adapter-contract.live.test.ts`'s "subscribeToQuery Realtime push" case
      proves — against a real `supabase start` stack, under `environment: 'node'` — that
      `adapter.subscribeToQuery` (the exact call `useLiveQuery` makes) shows the local seed AND
      re-emits when a second client (the service-role admin connection, a distinct
      `SupabaseClient`/session) inserts a row. A THIRD, React-rendered version of this under jsdom
      was written and dropped: `@supabase/realtime-js`'s WebSocket client and jsdom's own
      `Event`/`WebSocket` globals are different realms in this Vitest/Node combo, so any Realtime
      message arriving while jsdom is active crashes inside undici's `dispatchEvent`
      ("the 'event' argument must be an instance of Event. Received an instance of Event") — an
      environment incompatibility (reproduces even for the fetch-only half), not a
      `RelationalSupabaseAdapter` defect. The grep command's raw output additionally hits comment-only
      mentions (`repos/groups.ts`'s doc comment, `storage-adapter-contract.live.test.ts`'s doc
      comment) and test files that legitimately import the SDK under `src/lib/data/` or
      `src/tests/rls/` (already-allowed exceptions); the automated, comment-aware check
      (`src/tests/data-boundary.test.ts`) is what actually enforces the invariant and is green]

### B5b. Supabase Storage helpers + `preferences.ts` + `notifications.ts` (store only) (`risk:high`)
- [x] ADR `docs/decisions/0005-supabase-storage-images.md`: private bucket `receipts` with the
      spec D10 object-path layout and `storage.objects` policies (B2 migration) vs base64 in
      `extra` (zero backend surface, row bloat). Default: Storage, as below
- [x] `src/lib/data/storage.ts`: `uploadReceipt(expenseId, file)` →
      `expenses/{expenseId}/{uuid}.jpg` — the expense row must already exist (the storage policy
      checks `public.expenses` for the folder id), so callers insert the row first (B10);
      `uploadAvatar(uid, file)` → `avatars/{uid}/{uuid}.jpg` (a flat `avatars/{uid}.jpg` has no
      second folder segment and the policy would deny it), the previous avatar object removed
      after the profile update succeeds; `removeReceipts(expenseId)` deletes every object under
      `expenses/{expenseId}/` and is called by `repos.expenses.remove` **before** the row delete
      (no policy can reach the objects afterwards); client-side resize to ≤ 1600 px / ≤ 1 MiB
      before upload (`fileUtils`); `signedUrl(path, 3600)` with a small in-memory cache;
      `Expense.images[]` and `profiles."avatarUrl"` store the object path; an `<ReceiptImage path>`
      component resolves it. Policies are tested in the B2b suite
      — **deviations**: (1) `resizeImage` lives in `storage.ts` itself, not `fileUtils.ts` — it
      needs injectable `createImageBitmap`/canvas parameters to be unit-testable, which would pull
      a browser-API-shaped dependency into `fileUtils.ts`'s otherwise framework-free, Node-safe
      surface (today just `ensureCSVExtension`); `fileUtils.ts` is unchanged. (2) `uploadAvatar`
      uploads only — it does not itself call the profile-update-then-remove-old-avatar sequence,
      since no caller (profile-edit UI) exists yet to own that ordering; `removeAvatar(path)` is
      exported as the building block, documented as "call only after the profile update succeeds,"
      for that future caller (plan B10+) to use. `uploadAvatar`'s `uid` is a parameter, not read
      from `$user` directly (avoids a `src/lib/data/` -> `src/stores/` dependency): it is
      re-verified against the live session's `auth.getUser()` and refused on a mismatch, tested in
      `storage.test.ts`, per the RLS invariant `(storage.foldername(name))[2] = auth.uid()`.
- [x] `src/stores/preferences.ts`: `$preferredCurrency` derived from
      `$profile.preferences.preferredCurrency` (`profiles.preferences` is the source of truth),
      mirrored for first paint with `@nanostores/persistent` (added in B1; the `stores/theme.ts`
      `onMount` + `localStorage` pattern is the alternative) and `$rateCache` (6 h exchange-rate
      cache under `justsplit:rates`)
- [x] `src/stores/notifications.ts` (toast queue): thin wrapper over Inceptor's `toast()`;
      B8–B16 fire toasts via `notifications.ts` only, so the topology decided in B17b can change
      without touching feature islands
- [x] Tests: `$preferredCurrency` follows `$profile`; storage helper path layout and resize;
      signed-URL cache expiry
- [x] Acceptance: an upload against `supabase start` lands under `receipts/expenses/…` and renders
      through a signed URL (`src/tests/storage.live.test.ts`, `npm run test:contract:live`); the
      B2b storage cases stay green (`npm run test:rls`, `src/tests/rls/storage.test.ts`, unchanged)

### B6. Layout, header, theme, FeedbackFAB
- [x] `BaseLayout.astro` re-branded (title, JSON-LD `WebApplication`, description); `Header.astro`
      with nav + `UserMenuIsland` (avatar, sign-out) + `ThemeToggle`; `FeedbackFAB` wired to
      `ArtemioPadilla/JustSplit` issues; port `src/components/Header/__tests__/Header.test.tsx`
      — done as `src/components/islands/UserMenuIsland.test.tsx` (signed-out/signed-in/sign-out
      behavior) + `src/tests/site-header.test.ts` (mount + nav), not a literal file-for-file port:
      the legacy Header rendered its own nav/auth links directly off `AppContext`; the Astro+island
      split moves that into `SiteHeader.astro` (static nav) + `UserMenuIsland` (session). Nav is
      deliberately just `Home` for now — `About`/`Help` are B7, the rest of the app's sections are
      Phase 2; adding them now would be new dead links (B7's job to fix, not this issue's to add).
      `FeedbackFAB` was already correct by coincidence (a duplicated `'ArtemioPadilla/JustSplit'`
      literal); now single-sourced from `site-meta.ts`.
- [x] `global.css` tokens: JustSplit palette mapped onto shadcn CSS vars, from
      `src/styles/theme.css` (74 custom properties, primary token source), then
      `src/app/globals.css` (33) and `docs/design/style-guide.md`
      — style-guide.md conflicts with theme.css on which hue is "primary" vs "secondary";
      resolved in theme.css's favor (documented inline in global.css's mapping comment).
      `--muted-foreground` is one notch darker than the literal `#757575` (contrast fix against
      the new `--card` tint). No dedicated unit test — a CSS token substitution has no branching
      logic to assert; verified by the axe-core contrast rule in the new `check:a11y` script.
- [x] Every route island wraps its inner component in `<ErrorBoundary name="<Island>">` inside
      the island file (Inceptor pattern, see `LoginForm.tsx`); `HydrationCanary` stays in
      `BaseLayout` only for the SSR'd islands (`UserMenuIsland`, `ToasterIsland`); it is inert
      for `client:only` islands
      — enforced by `src/tests/mounted-island-error-boundary.test.ts` (source-text scan of every
      `client:*` mount under pages/layouts/components/common). `ToasterIsland` does not exist yet
      (not in this issue's scope; a later notifications issue adds it — B6 only asks for
      `UserMenuIsland`).
- [x] Acceptance: axe smoke clean on `/landing`; theme persists across reloads without flash
      — `/landing` doesn't exist yet (B7 builds it); `scripts/axe-smoke.mjs` / `npm run check:a11y`
      instead covers `/`, `/404`, `/auth/signin/`, `/showcase` (all pages that exist today) and is
      clean on all four (0 violations) — running it surfaced a real `page-has-heading-one` failure
      on `/auth/signin/`, fixed by promoting `LoginForm`'s (and `SignUpForm`'s) heading from `h2`
      to `h1`. `/landing` joins the `check:a11y` page list in B7 once it exists. Deliberately its
      own npm script + CI step, not wired into `npm run check` (too heavy/environment-dependent
      for the local umbrella gate — same reasoning `npm run check` already applies to `test:rls`).
      Theme-persists-without-flash: `src/stores/theme.test.ts` (new — no test existed) covers the
      dynamic "persists" half; `src/tests/base-layout-theme-script.test.ts` asserts the "no flash"
      half at the source level (pre-paint script is `is:inline`, first in `<head>`, synchronous) —
      a real paint-timing browser test isn't practical against jsdom (no rendering pipeline).
- Review fix (orchestrator): `UserMenuIsland` statically imported `stores/auth.ts`, pulling
      `@supabase/supabase-js` into every page. The session atoms moved to `src/stores/session.ts`
      (no data-layer import) and the island loads the auth actions lazily on sign-out;
      `scripts/check-auth-bundle.mjs` now fails the build if `/` or `/404` statically loads the SDK
      (red `0a29db1`). B7 adds `/landing`, `/about` and `/help` to its `PUBLIC_PAGES`

### B7. Static pages
- [x] `/landing`, `/about`, `/help` as Astro pages with no route island; `motion/react` only where
      the old `framer-motion` animations are worth keeping (otherwise `tailwindcss-motion`)
      — deviation: none of the ported animations were worth a React island (about's
      `whileInView` fades and help's `useState` fades/accordion were all decorative or
      replaceable by native `<details>`), so all three pages ship `tailwindcss-motion`
      (`motion-preset-fade`) only, zero `motion/react`, zero JS beyond `ThemeToggle`'s script.
- [x] Fix dead links: `/auth/register` → `/auth/signup/` (landing ×2, about),
      `/auth/reset-password` → new page (B4); remove `/tos` `/privacy` `/contact` from the
      public-path list (`ProtectedRoute` lines 8-16) — deviation: `ProtectedRoute.tsx` was
      already deleted in B1 (Next-tree file, replaced by `route-guard.tsx`/RouteGuard); the
      actual action was not introducing links to those three non-existent routes in the ported
      copy, which `src/tests/marketing-pages.test.ts` asserts.
- [x] Acceptance: `dist/landing/index.html` contains no `<astro-island>` for a route island and
      references no chunk that includes `@supabase/` or `@cyber-eco/` (assert with a Vitest that
      greps the built HTML + `dist/_astro/*.js` manifest); layout-level JS (theme, FeedbackFAB, PWA islands) is
      allowed and budgeted at ≤ 40 kB gz — deviation: implemented as a post-build step in
      `scripts/check-auth-bundle.mjs` (chained after `astro build` in `npm run check`, same
      precedent as B2c's `check-dist.mjs` and this file's own B4 checks), not a Vitest — unit
      tests run *before* the build in the `check` pipeline and can't grep `dist/`. Also required
      making `/landing`, `/about`, `/help` ship literally zero React (BaseLayout's new
      `marketing` prop skips both `UserMenuIsland` and `HydrationCanary`): the shared
      `@astrojs/react` client runtime alone is ~66 kB gz, which blows the 40 kB budget on its own
      regardless of `UserMenuIsland`'s own chunk size — see the B19 "Header weight" bullet below,
      pulled forward into this issue. Measured: 1.18 kB gz layout JS on each of the three pages.
- [x] Add `/landing` to the `PAGES` list in `scripts/axe-smoke.mjs` (`npm run check:a11y`, plan
      B6) — that check currently covers `/`, `/404`, `/auth/signin/`, `/showcase` only, because
      `/landing` doesn't exist before this issue — also added `/about` and `/help`; `npm run
      check:a11y` reports 0 violations on all seven pages.

### Phase 2 — Feature islands (one issue each; all `type:feat`, `phase-2`)

Each island: `src/components/islands/<Name>Island.tsx` + feature widgets under
`src/components/features/<domain>/`, shadcn components only, `AuthGate`/`RouteGuard`-wrapped
(`ErrorBoundary > AuthIsland > AuthGate > Content`, B4), data only through the B5a hooks, mounted `client:only="react"` with a fallback-slot
skeleton, Vitest tests ported/rewritten from the corresponding Jest suites, toasts only via
`notifications.ts`, appears in `/showcase` if it introduces a reusable widget. Shared widgets
(`CurrencySelector`, `Editable`, `ProgressBar`, `CurrencyExchangeTicker`) come from B16 and the
`ExportCsvButton` from B17a — both land before Phase 2 and islands never ship their own copies;
every list island owns a local display-currency selector + conversion pass (spec §6 Currency) and
resolves other users' names through `useProfiles` (B5a).

**Jest suite → owning task** (every row must be ticked in B18):

| Jest suite | Task |
|---|---|
| `src/utils/__tests__/*` (4) + `src/__tests__/timelineCalculations.test.tsx` | B3 |
| `src/app/client-layout-wrapper.test.tsx` | B4 |
| `src/context/__tests__/AppContext.test.tsx` | B5a |
| `src/components/Header/__tests__/Header.test.tsx` | B6 |
| `src/components/Dashboard/__tests__/*` (10; 2 chart tests) | B8a (`MonthlyTrendsChart`, `ExpenseDistribution`, `BalanceOverview`) / B8b (`DashboardHeader`, `FinancialSummary`, `RecentExpenses`, `RecentSettlements`, `UpcomingEvents`, `WelcomeScreen`; `UserSummary`'s test dropped with the component — unused by any page, no equivalent selector) |
| `src/app/__tests__/page.test.tsx` (Home) | B8b |
| `src/app/expenses/__tests__/ExpenseDetail.test.tsx` | B9 |
| `src/components/ImageUploader/__tests__/ImageUploader.test.tsx` | B10 |
| `src/__tests__/{hoverCard,timeline,timelineEvents,postEventExpenses,expenseGroups}.test.tsx` | B11a |
| `src/app/events/__tests__/EventDetail.test.tsx`, `src/app/__tests__/page.test.tsx` (EventList part) | B11b |
| `src/context/__tests__/SettlementCurrency.test.tsx` | B14 |
| `src/components/ui/__tests__/{CurrencySelector,EditableText}.test.tsx`, `src/__tests__/progressBar.test.tsx` | B16 |
| `src/app/__tests__/exampleTest.tsx` | drop |

### B8a. Recharts wrappers + chart widgets
- [x] `MonthlyTrendsChart`, `ExpenseDistribution`, `BalanceLine` rebuilt on `ui/charts/`
      Recharts wrappers (nothing to port — chart.js is installed but unused; today's charts are
      hand-rolled CSS/SVG), lazy chunk asserted by a build test — deviation: `BalanceLine` is an
      accessible CSS bar, not a Recharts wrapper (see the sub-decision below); `MonthlyTrendsChart`
      (`ui/charts/bar-chart.tsx`) and `ExpenseDistribution` (`ui/charts/donut-chart.tsx`) are.
      `DashboardCharts.lazy.tsx` (default export) is the single `React.lazy(() => import(...))`
      boundary all three compose behind; `ShowcaseDashboardCharts.tsx` (`/showcase`, `client:visible`)
      is the only mount site until B8b wires `DashboardIsland`.
      `scripts/check-charts-bundle.mjs` (chained into `npm run check` after `check:auth-bundle`,
      same precedent as `check-dist.mjs`/`check-auth-bundle.mjs`) asserts `dist/showcase/index.html`'s
      static import graph never contains the `recharts-responsive-container` marker and that the
      Recharts chunk is reached only through a dynamic `import()`; verified genuinely red by
      temporarily replacing the island's `React.lazy` call with a static import, rebuilding, and
      confirming the script failed, then reverting.
- [x] Sub-decision per widget (recorded in the issue): `MonthlyTrends` / `ExpenseDistribution` /
      `BalanceOverview` / `UpcomingEvents` get real selectors over the B5a hooks or are dropped
      (today `page.tsx` imports the first two but never renders them and feeds the others
      placeholder state); if `ExpenseDistribution` is kept, group by the raw `category` string for
      now — Track D D8 re-keys it to the taxonomy — decided (orchestrator, all four **kept**, fed by
      real pure selectors in `src/domain/dashboard.ts`, not the B5a hooks directly — selectors take
      domain objects + an injected synchronous `convert`/`names` map, B8b wires them from the hooks):
      **MonthlyTrends** — `monthlyTotals`, last 6 months oldest-first including zero months.
      **ExpenseDistribution** — `categoryDistribution`, grouped by the raw `category` string
      (missing/empty → `'Uncategorized'`); Track D D8 re-keys it to the taxonomy as planned.
      **BalanceOverview** — `balancesWithUser`, net balance between the current user and each other
      person (positive = they owe you, negative = you owe them), derived directly from `splits[]`
      rather than `calculateSettlements`'s greedy pairing (a settlement suggestion matches the
      largest debtor with the largest creditor globally, which doesn't answer "who owes whom" for a
      specific relationship). `BalanceLine` (the diverging row) is an **accessible CSS bar, not a
      Recharts wrapper** — a diverging bar is one value per person, not a series; the only
      Recharts-native rendering would be one `ResponsiveContainer`/`BarChart` per row, which isn't
      justified over a styled `<div>`. Its text label ("Alex owes you $50.00" / "You owe Alex
      $50.00") is the primary owe/owed signal (never color alone, CLAUDE.md a11y rule); the colored
      bar is a secondary, `aria-hidden` reinforcement. **UpcomingEvents** — B8a ships only the pure
      selector, `upcomingEvents` (events starting today or later, soonest first, capped at 3); its
      widget is B8b's (composes the 9 non-chart widgets).
- [x] Port the 2 existing chart tests + a new `BalanceLine` test — `MonthlyTrendsChart.test.tsx`
      rewritten onto the props-based widget (dropped: the event/spender toggle, hover-card
      drill-down, `isConvertingCurrencies` — none survive the rebuild, conversion is always on).
      `ExpenseDistribution.test.tsx` was `describe.skip`'d in A3a (TODO(track-b): it passed an
      `expenses` prop the component never took) — un-skipped and rewritten the same way. Both drop
      the `AppContext` mocking. New: `BalanceLine.test.tsx` (direction/sign, the owe/owed text
      label, proportional bar width) + a light `BalanceOverview` suite (row composition order, empty
      state) + `src/domain/dashboard.test.ts` (all four selectors: zero months, `Uncategorized`,
      mixed currencies through `convert`, a payer outside the participants, past-vs-upcoming events)
      + `DashboardCharts.lazy.test.tsx` (composition wiring).
### B8b. Dashboard island (`/`)
- [x] **Tagged `risk:high` after the fact** (centinela review): the coordinator-review round below
      touched `src/lib/data/relational-adapter.ts` and `src/lib/data/hooks/useLiveQuery.ts` (a
      `src/lib/data/*` change trips the risk:high trigger) to fix live-query failure surfacing.
      Documented as an amendment to ADR 0004 (`docs/decisions/0004-tanstack-query-over-storage-adapter.md`,
      "Amendment (2026-09-28, plan B8b): live-query failure surfacing"), not a new ADR, since it
      extends 0004's own `useLiveQuery`/`StorageAdapter` decision rather than a new layering choice.
- [x] `DashboardIsland` (`ErrorBoundary > AuthIsland > AuthGate > Content`, the same composition as
      the B4 auth pages) composes `DashboardHeader`, `CurrencyExchangeTicker` (B16),
      `FinancialSummary`, `RecentExpenses`, `RecentSettlements`, `UpcomingEvents`, `WelcomeScreen`
      and the B8a lazy chart bundle — **`UserSummary` is dropped**, per B8a's "keep or drop": no
      page ever rendered it, and its `AppContext`-derived `users[].balance` has no equivalent
      selector, so its legacy test is not ported either (recorded in the Jest-suite table's notes
      column). `DashboardHeader` mounts `ExportCsvButton` (B17a; all expenses, `all-expenses.csv`)
      and the preferred-currency `CurrencySelector` (B16); refresh-rates is a separate "Refresh
      rates" button (**deviation**: `domain/currency.ts` has no `clearExchangeRateCache` — the
      plan text's guess was wrong; the real cache lives in `src/stores/preferences.ts`'s
      `$rateCache`, so this issue adds `clearRateCache()` there instead, paired with
      `useDisplayConversion`'s `refresh()`); `isConvertingCurrencies` prop/state plumbing is
      dropped entirely — conversion is always on. `DashboardHeader` also drops the legacy "Add
      Expense"/"Create Event" quick-action links: their targets (`/expenses/new`, `/events/new`)
      don't exist until B10/B11b, and adding them now would be new dead links (same reasoning B6
      already applied to the header nav). `WelcomeScreen` is the decided exception for those two
      CTAs — it is the dashboard's OWN empty state (no expenses AND no events), not the legacy
      marketing landing page (that content lives only in `landing.astro`, B7).
      `src/domain/dashboard.ts` gains two selectors, `totalSpent`/`unsettledCount` — the only two
      figures the legacy `FinancialSummary` actually computed from real data (spec §6); every
      other legacy prop (`compareWithLastMonth`, `avgPerDay`, `mostExpensiveCategory`,
      `activeEvents`/`activeParticipants`, `highestExpense`) was fed a hardcoded default by
      `page.tsx` and is **not ported**.
- [x] Data: `useExpenses(uid)`/`useEvents(uid)`/`useProfiles(ids)` (B5a) plus a new
      `useSettlements(uid)` (`src/lib/data/hooks/useSettlements.ts`) mirroring the exact
      `useLiveQuery` wiring of `useExpenses`/`useEvents` — `settlements` had a repo (B5a) but no
      hook until this issue's "recent settlements" widget needed one.
- [x] Display-currency conversion: `src/lib/currency/useDisplayConversion.ts` resolves a rate per
      distinct expense currency (via B16's `fetchExchangeRate`, already coalesced per base) against
      `$preferredCurrency` and returns a synchronous `convert`, `ready`, `approximate` (the ticker's
      honesty marker: "\* Some amounts use approximate rates") and `refresh()`. Every
      conversion-dependent widget is gated on `ready` — a skeleton renders until then, never a
      converted number computed too early.
- [x] `src/pages/index.astro` = shell wrapping `<DashboardIsland client:only="react" />` in a
      `<main id="main-content">` (axe `landmark-one-main`/`region` — every other page in the tree
      already had one, this page didn't at first) with a static skeleton + no-JS `<noscript>`
      message in the island's `slot="fallback"`. The redirect-to-`/landing` behavior for
      `$authReady && !$user` is `AuthGate`'s own generic logic (plan B4, unchanged) — `DashboardIsland`
      doesn't reimplement it, only composes `AuthGate` like every other protected route island.
      The `<h1>` ("Dashboard", screen-reader-only) lives in `DashboardIsland` itself, OUTSIDE the
      auth-gated subtree, so it is present in every auth state (not-ready skeleton, the
      unconfigured-build "Sign-in is not configured" Alert, or real content) — needed for axe's
      `page-has-heading-one` rule to pass regardless of which state a given build/environment
      renders.
- [x] Ported the 6 non-chart, non-`UserSummary`, non-`BalanceOverview` dashboard tests
      (`DashboardHeader`, `FinancialSummary`, `RecentExpenses`, `RecentSettlements`,
      `UpcomingEvents`, `WelcomeScreen`) rewritten onto props (no `AppContext`) — `BalanceOverview`
      was already ported in B8a (its own light suite); `UserSummary`'s test is dropped with the
      component (see above). Plus `src/components/islands/DashboardIsland.test.tsx`, the "Home
      part" of the legacy `src/app/__tests__/page.test.tsx`: skeleton while not ready, the redirect
      for an unauthenticated visit (driven through the real `AuthProvider`/`AuthBridge` wiring, a
      test double `AuthAdapter`/`ProfileStore` — not a mocked `AuthGate`), no redirect for a
      signed-in user, `WelcomeScreen` for a signed-in user with no data, and the composed content
      once data arrives. Dropped rather than ported: the loading-spinner and 8-column raw-table
      assertions (`RecentExpenses`/`RecentSettlements` — conversion is synchronous once `ready`,
      so there is no per-widget loading state), the locale-formatted-date assertion in the legacy
      `RecentSettlements` test (already marked failing/skipped since A3a), and every MUI-styled
      assertion.
- [x] `scripts/check-charts-bundle.mjs` extended to also assert `dist/index.html` never statically
      loads Recharts (alongside `dist/showcase/index.html`) — verified genuinely red by temporarily
      replacing `DashboardIsland`'s `React.lazy` call with a static import, rebuilding, and
      confirming the script failed with the expected message, then reverting.
      `scripts/check-auth-bundle.mjs`'s public-pages check drops `index.html`: `/` is now the first
      AUTHENTICATED route island and is expected to load `@supabase/supabase-js` up front, same as
      `/auth/signin/` — that script's section 2 now measures and prints `/`'s own static-only chunk
      graph (informational, no budget yet: 253.46 kB gz across 33 chunks, verified against a real
      build) the same way it already measured `/auth/signin/`; `/landing`, `/about`, `/help`, `/404`
      stay enforced.
- [x] Acceptance: `npm run check:a11y` reports 0 violations on all 7 pages including `/`.
      `/landing` HTML still contains no supabase-js / `@cyber-eco` chunk (unchanged, B7's
      `MARKETING_PAGES` check). What axe actually scans for `/` in this environment (CI has no
      `PUBLIC_SUPABASE_*` vars, same as every other `npm run check` build): `AuthIsland`'s "Sign-in
      is not configured for this build" `Alert` — `AuthGate`'s redirect is never reached in that
      state, but it is still a real, deterministic, accessible page (the sr-only `<h1>` plus the
      `<main>` landmark added by this issue are exactly what make it pass 0 violations). Against a
      configured build, an anonymous visit reaches `AuthGate`'s existing redirect and lands on
      `/landing` within one `location.replace` (no new history entry) — the same behavior
      `AuthGate.test.tsx` already covered generically, exercised here again end-to-end through
      `DashboardIsland.test.tsx`.
- [x] **Coordinator/centinela review round** (two defects, then a risk:high re-review with two more
      concerns): (1) `useDisplayConversion` could show `ready: true` with the PREVIOUS target's
      resolved rates for one render after a currency change — fixed by keying `resolved` to the
      exact request (`target|distinctCurrencies|nonce`) it answers, `ready` derived by comparing
      that key during render, never from a separate state flag. (2) a failed live query
      (`useExpenses`/`useEvents`/`useSettlements`) was silently indistinguishable from a
      legitimately empty result (`RelationalSupabaseAdapter.subscribeToQuery`'s catch swallowed the
      error into `callback([])`), so `DashboardIsland`'s `dataLoading` (`data === undefined`) never
      resolved and rendered an endless skeleton — fixed end to end: `LiveQueryCallback<T>` forwards
      the error, `useLiveQuery` exposes real `isError`/`error`/`refetch`, `DashboardIsland` checks
      `isError` before `dataLoading` and renders `ErrorState` + Retry, generic message only (never
      raw error/RLS/SQL text). Re-review (centinela `NEEDS_HUMAN`, risk:high — see the `risk:high`
      bullet above) added: `refetch()` bounded to one in-flight retry (`isRetrying`, ref-tracked so
      two clicks across separate render cycles never stack a second re-subscribe) with the Retry
      button disabled/`aria-busy` for that window; a second line in the error state naming the
      FeedbackFAB ("Report an issue") as the path forward for a failure Retry can't fix, without
      inventing a support channel; the `LiveQueryCallback<T>` extension formalized as a named,
      documented, exported type instead of an inline widened signature.
### B9. Expense list + detail islands (`/expenses/list`, `/expenses/<id>`) (`risk:high`)
- [x] **Tagged `risk:high`** (orchestrator, up front — not after the fact like B8b): this issue
      changes `src/lib/data/repos/expenses.ts`'s `remove()`. **Deviation from the plan text**: the
      detail route is `/expenses/<id>` (the client-only dynamic route through `dist/404.html` →
      `AppRouterIsland` → `expense-detail`, plan B2c), not `/expenses/view` — the plan text's guess
      was wrong; `app-routes.ts`'s `DYNAMIC_ROUTES` already named it `expense-detail` with prefix
      `['expenses']` before this issue. `AppRouterIsland`'s `expense-detail` case now loads
      `ExpenseDetailView` through its own `React.lazy(() => import(...))` boundary (a `Suspense`
      fallback skeleton) instead of `RouteStub` — the first dynamic route with a real view; every
      other one (`expense-edit`, `event-detail`, `event-edit`, `group-detail`, `friend-detail`)
      is unchanged until its own Phase-2 issue lands. An id that resolves to no row (missing, or an
      RLS-hidden expense) renders the SAME `NotFoundView` the shell already uses for an unknown
      path — the query layer and the route never let a caller distinguish "doesn't exist" from
      "exists but you can't see it" (ADR 0002's leaked-id reasoning).
- [x] **Data-loss bug fixed** (the risk:high part, ADR 0005 amendment "delete ordering preflight"):
      `repos.expenses.remove` ran `removeReceipts(id)` (storage's `receipts_expenses_delete` policy
      is member-wide by design — B10 relies on it for image edits) BEFORE the row delete
      (`expenses_delete`: creator or payer only). A member who was neither could destroy every
      receipt and then have the row delete silently denied by RLS — permanent, partial loss.
      `remove()` now fetches the fresh row via `get(id)` and refuses BEFORE touching storage —
      `ExpenseNotFoundError` for a missing/already-deleted row, `ExpenseDeleteNotAllowedError` for a
      caller who is neither `createdBy` nor `paidBy` — using the uid from a new `requireUid()`
      (`require-adapter.ts`, reads the `$user` session store, never a function argument). Explicitly
      a client-side safety preflight against a destructive PARTIAL operation, not authorization: RLS
      still independently denies the row delete either way (CLAUDE.md rule 8). Red tests first
      (`src/lib/data/repos/expenses.remove.test.ts`): a member who is neither creator nor payer never
      calls `removeReceipts` and gets the typed error; the creator and the payer still delete in that
      order; a storage failure still stops the row delete (existing behavior, preserved). A new RLS
      test (`src/tests/rls/storage.test.ts`) documents the storage side of the same asymmetry (a
      non-creator/payer member CAN still delete a receipt object, by design) — not run against a live
      Supabase stack in this environment; `npm run test:rls` is its own CI job, never part of `check`.
- [x] List (`ExpenseListIsland`, `/expenses/list`): `useExpenses(uid)` + `useEvents(uid)` +
      `useProfiles(ids)`, same `ErrorBoundary > AuthIsland > AuthGate > Content` composition and
      error/retry handling as `DashboardIsland` (B8b). `<DataTable>` (`ui/data-table.tsx`) with
      `syncToUrl` for sort/global-filter URL state; the event filter is its OWN URL param
      (`?event=<id>`) via a new, smaller sibling hook, `src/lib/use-url-param.ts` — `DataTable`'s own
      `useDataTableUrlState` covers sort/global-filter/visibility/sizing but not a value outside the
      table, and its per-column `meta.filterOptions` select isn't URL-synced either. A local display-
      currency `CurrencySelector` (initialised from `$preferredCurrency`, never written back to the
      profile) feeds `useDisplayConversion`'s new optional `targetOverride` parameter (test-first,
      the B8b dashboard's own call — no override — is unchanged). Every amount converted with an
      "(Originally: …)" caption when the expense's currency differs, gated on `ready`. Settled badge;
      links to the detail page and the event. `ExportCsvButton` (B17a) over the FILTERED rows,
      `all-expenses.csv` or `<event name>-expenses.csv` when an event filter is active. A zero-
      expenses empty state is distinct from a "no results for this filter" state.
      **Test-infra note**: `@tanstack/react-virtual`'s `useVirtualizer` measures the scroll
      container's real height (0 in jsdom), so `<DataTable>`'s virtualized `<tbody>` renders zero
      rows under Testing Library — verified directly against the bare component. Every DataTable-
      based test in this issue mocks `useVirtualizer` with a "render every row" stand-in (documented
      inline in `ExpenseListIsland.test.tsx`); copy it for any future DataTable-based island's tests.
- [x] Detail (`ExpenseDetailView`, `src/components/islands/routes/`): loads via a new `useExpense(id)`
      hook (a plain `useQuery` over `repos.expenses.get`, per `useLiveQuery`'s own "non-live keys use
      a normal `useQuery`" doc comment — same pattern as the pre-existing `useGroup`; a new `useEvent(id)`
      closes the same gap for the event link). `Editable` (B16) description/notes commit through a new
      `useUpdateExpense` mutation hook (a partial `repos.expenses.update`), toast on failure via
      `notifications.ts`, and the displayed text reverts to the pre-edit draft — found and fixed while
      turning this file's tests green: a CONTROLLED `Editable value=` prop froze typing entirely (the
      zag-js machine only accepts external input through `onValueChange`, which nothing fed back);
      the fix uses `Editable` uncontrolled (`defaultValue`, matching its own `editable.behavior.test.tsx`
      precedent) with a local draft-state + `key`-remount pattern, which is also what makes a failed
      commit visibly revert. Amount in the local display currency with the original caption (same
      `useDisplayConversion` override as the list); split type + `splits[]` per participant with names
      via `useProfiles`; event link/name; settled badge. Receipt gallery via a new `ReceiptGallery`
      widget (`src/components/features/expenses/`) composing `<ReceiptImage path>` (B5b signed URLs);
      clicking a thumbnail resolves the signed URL again (cheap — `signedUrl`'s own cache) and opens
      it via `window.open(url, '_blank', 'noopener,noreferrer')` — the programmatic equivalent of a
      real anchor's `rel`, since the href isn't known until the signed URL resolves. `ExportCsvButton`
      for `[expense]` (`expense-<id>.csv`). Delete with confirm: `DeleteExpenseDialog`
      (`src/components/features/expenses/`), a Base UI `Dialog` whose whole trigger+content
      composition lives in one component (CLAUDE.md's compound-component rule) via a new
      `useDeleteExpense` mutation hook wrapping `repos.expenses.remove` (this issue's ADR 0005
      preflight and typed errors, above); shown only to the creator or payer (UX only, RLS is the
      authority) — on success, toasts and navigates to `withBase('/expenses/list')`; on failure,
      toasts one generic message covering both the typed preflight errors and a genuine backend
      failure.
- [x] Ported `src/app/expenses/__tests__/ExpenseDetail.test.tsx`'s surviving behavior onto
      `ExpenseDetailView.test.tsx`: rendering the description/amount/paid-by name/notes/date, editing
      the description, editing the notes. Dropped: the `AppContext` mocking (this tree has no
      Context, spec D3), a `toFixed(2)`-on-a-raw-prop assertion (the amount is now a converted,
      `ready`-gated number, not the raw prop), and the `detailItem` CSS-class DOM query (no such class
      exists in this rebuild; `screen.getByText` on the resolved name is used instead).
- [x] `npm run check:a11y`: 0 violations on `/expenses/list` (added to `scripts/axe-smoke.mjs`'s page
      list) alongside the existing 7 pages.
- [x] Bundle: `ExpenseDetailView` (20.43 kB / 7.21 kB gz) is reached only through `AppRouterIsland`'s
      `React.lazy` — `dist/404.html`'s own static reference stays the tiny `AppRouterIsland` loader
      chunk (0.23 kB gz); the real `ExpenseDetailView` chunk never appears in its static HTML/script
      tags (verified: no `ExpenseDetailView` filename anywhere in `dist/404.html`). Neither
      `ExpenseListIsland` (109.87 kB / 31.99 kB gz, `/expenses/list`'s own `client:only` bundle) nor
      `ExpenseDetailView` contains the Recharts marker (`check-charts-bundle.mjs`'s existing
      `showcase`/`/` checks are unaffected; a direct grep of both chunks for the
      `recharts-responsive-container` marker found nothing).
### B10. Expense form island (`/expenses/new`, `/expenses/edit`) (`risk:high`)
- [x] **Tagged `risk:high` up front** (orchestrator): this issue writes expenses and uploads
      receipt objects through `src/lib/data/`. Routes: `/expenses/new` is a real Astro page shell
      (`src/pages/expenses/new.astro`, same `client:only="react"` + skeleton-fallback pattern as
      B9's `list.astro`) mounting `ExpenseFormIsland`; `/expenses/edit/<id>` is the dynamic
      `expense-edit` route (already named in `app-routes.ts` since B2c) — `AppRouterIsland`'s
      `expense-edit` case now loads `ExpenseEditView` through its own `React.lazy` boundary,
      the second dynamic route with a real view after B9's `expense-detail`. Both wrap the shared
      `ExpenseForm` component (`mode="create" | "edit"`). An id that resolves to no row (missing or
      RLS-hidden) renders the same `NotFoundView` as every other dynamic route (ADR 0002's
      leaked-id reasoning). Added, now that the routes exist: an "Add expense" link on
      `/expenses/list` (in the page's own header row, next to the `<h1>`) and in `DashboardHeader`
      (restoring the CTA B8b dropped as a dead link; "Create event" stays dropped, `/events/new` is
      still B11b), and an "Edit" link on the B9 detail view — shown to ANY member (RLS `update` =
      member is the authority, no client-side gate), unlike Delete (creator/payer only). All via
      `withBase`.
- [x] `ExpenseSplitter` (`src/domain/expenseSplitter.ts` pure `validateSplit`/`buildSplits` +
      `src/components/features/expenses/ExpenseSplitter.tsx`) rewritten without MUI over the
      universal `splitType` (equal / exact / percentage) — the form edits shares,
      `buildSplits` wraps `materializeSplits` (B3), never re-implementing its cent-rounding. A
      single `role="status" aria-live="polite"` region announces balanced/remaining/over — never
      color alone. Receipts via a new `ReceiptUploader` (`ui/file-upload.tsx` + object-URL
      previews + a `maxImages` limit) + B5b storage helpers with the fixed order — the storage
      policy for `expenses/{id}/…` requires the expense row to exist, so create is **insert the row
      (client-generated id via `repos.expenses.generateId()`, `images: []` — the D10 insert policy
      is satisfied by the row alone, images are not gated) → upload objects →
      `updateDocument(id, { images })`** (a partial patch, RLS update = member), all inside one new
      repo function, `repos.expenses.createWithReceipts` (never scattered in the component); a
      same-id retry or a double submit never duplicates the row (`setDocument` upserts); a failed
      upload is skipped, not thrown — `failedUploadCount` drives an honest partial-failure toast
      ("Expense saved, but N receipt(s) couldn't be uploaded. You can add it again from Edit."),
      the row still navigates to the detail page; only the insert step itself failing shows a
      generic error and leaves the form's values intact. Edit uploads directly via
      `repos.expenses.addReceipts` (the row exists); removing a receipt
      (`repos.expenses.removeReceipt`) patches `images` BEFORE deleting the object — the mirror
      order from the whole-expense delete path (B9's ADR 0005 amendment), documented as this
      issue's own **ADR 0005 amendment "create/edit write ordering"** with Stakeholder Analysis
      rows (creating user, other members, orphaned objects/storage cost). Test: the memory adapter
      + a fake storage double whose `uploadReceipt` rejects unless the row already exists (looked
      up through the SAME adapter) proves the ordering — `src/lib/data/repos/expenses.receipts.test.ts`.
      Category on create (new — today only edit has it; `CreateExpenseInputSchema` no longer omits
      it, it was never an overflow key), `DatePicker` (`date-picker.tsx`) + a new
      `domain/dates.ts#formatCalendarDate` (the local-date inverse of `parseCalendarDate`).
- [x] Participant picker (`ParticipantPicker.tsx`) = registered users only (pulled forward from
      B13's own ADR, not yet written — this issue does not author `0006-registered-participants.md`,
      B13 still owns its full scope): the group's members when `?group=` is set, the event's
      members when `?event=` is set, self + that friend when `?friend=` resolves to an accepted
      friend, otherwise accepted friends (a new `useFriends(uid)` hook, `friendships` repo filters)
      + self; no free-text participant creation; `paidBy` ∈ the same candidate pool always (not
      necessarily in `splits`/checked as a participant, spec D10) — the "Paid by" select and the
      "Split with" checkboxes share one resolved candidate list, names via `useProfiles`.
- [x] Category select reads its five options from the B3 `src/domain/categories.ts` stub, on create
      too (see above). `?group=`/`?event=`/`?friend=` resolved through `useGroup`/`useEvent`/
      `useFriends`: `?group=` pre-selects the group's members and currency and **writes `groupId` +
      `memberIds` = the group's `memberIds`**; `?friend=` pre-selects self + that friend
      (`memberIds` = `participants ∪ paidBy ∪ self`, spec D10's "not the payer necessarily in
      splits" note). An id that doesn't resolve (missing, RLS-hidden, or — for `?friend=` — not
      actually an accepted friend of the caller) is ignored, with a small non-blocking notice ("We
      couldn't find that group/event/friend — showing your friends instead.") that never reveals
      which of those three reasons applied. Context defaults (currency/paidBy/participants) are
      applied exactly once, only while the user hasn't touched the form yet. Default currency: the
      resolved group/event currency, otherwise `$preferredCurrency`. Track D issue D4 still extends
      the defaults per kind later.
- [x] **`?event=` is RLS-aware** (coordinator review, risk:high — the plan text's original "pre-
      selects the event's members" guess offered participants `expenses_insert`/`expenses_update`
      would reject: `eventId` has no column, spec D9, so RLS knows nothing about event membership,
      only about a row's OWN `group_id`/`member_ids`). `domain/expenseParticipants.ts#resolveEventParticipants`
      mirrors the policy's two branches directly (`db/migrations/20260928000004_rls_policies.sql`):
      an event with a `groupId` (`src/schemas/event.ts`'s field name) is a GROUP expense — same rule
      as `?group=`, candidates are the event's members intersected with the group's (falling back to
      the whole group if that's empty), `memberIds` on submit is the group's own `memberIds`; a
      no-group event restricts candidates to the caller's accepted friends + self and shows a
      count-only notice ("N people in this event aren't in your friends yet, so they can't be added
      to this expense.") when anyone got excluded — a count, never names. A new
      `domain/expenseParticipants.ts#violatesNoGroupInvariant` mirrors the `group_id is null` WITH
      CHECK directly as a defensive pre-submit check on every no-group create/update (create AND
      edit): if `memberIds` ever contains someone who isn't the caller/editor's accepted friend
      (e.g. a friendship revoked out from under an already-selected participant, which nothing
      auto-prunes from form state), the submit is refused with a generic inline message instead of
      sending a request RLS was always going to deny.
- [x] **Edit-mode friendship gap** (coordinator review): editing a no-group expense denies the save
      (`expenses_update`) whenever the CURRENT editor isn't an accepted friend of every other member
      already on it. `ExpenseForm` now checks this upfront (derived from `useFriends`, the same
      `violatesNoGroupInvariant`) and disables Save with "You can view this expense, but only
      someone who is friends with everyone on it can edit it here." — UX only, RLS stays the
      authority; scoped to the edit form only (B9's own inline `Editable` renames on the detail view
      are unchanged, still a generic post-submit error toast). Group expenses are unaffected — any
      member may edit one.
- [x] **Known limitation, escalated as a follow-up decision (not part of B10, recorded in the ADR
      0005 addendum)**: because `eventId` has no column, a no-group event's expenses are visible and
      editable purely by `member_ids`/friendship, not by "belongs to this event" — event-wide totals
      can differ by viewer (each expense's `member_ids` can be a different subset of the event's real
      members depending on who was friends with whom when it was created), and a non-friend event
      member can never edit a no-group expense from that event. A real fix needs a schema/RLS
      change: an `event_id` column with its own event-membership RLS clauses (mirroring
      `group_id`/`expense_groups`), and/or an `expenses_update` WITH CHECK keyed on `created_by` or
      the row's OLD `member_ids` instead of solely the current editor's friendships. Neither is
      decided here.
- [x] Edit re-materialises `splits[]` when amount or shares change (`buildSplits` again); the
      partial `updateDocument` patch never includes `settledAt` (preserved by the D9 overflow-merge
      contract — the patch object simply never spells the key).
- [x] Ported `src/components/ImageUploader/__tests__/ImageUploader.test.tsx` onto the new
      `ReceiptUploader` (`ui/file-upload.tsx` over `File[]`, not base64 data-URLs — spec D1/D10:
      base64 images are gone with the clean schema). Kept: empty state, add/remove a file, a
      `maxImages` limit (generalised to also count an edit session's `existingCount`). Dropped: the
      `FileReader`/base64 mocking (no encoding step exists anymore) and the "renders with existing
      images" case (the form renders those via `ReceiptGallery`, B9, with its own remove action).
      New: object-URL previews, and client-side rejection of a non-image file (drag-and-drop
      bypasses the file picker's own `accept` filter). Form tests
      (`ExpenseForm.test.tsx`): validation, the splitter sum gate blocking submit, query-param
      defaults (including an unresolved id's fallback+notice), the create ordering (id generated
      once, `createWithReceipts` called with it, navigation), honest partial-failure reporting, a
      generic insert failure leaving the form's values intact, and edit mode never touching
      `settledAt`. `/expenses/new` added to `scripts/axe-smoke.mjs`.
- **Deviation, flagged for centinela**: `ExpenseEditView.tsx` was scaffolded alongside
  `AppRouterIsland.expense-edit.test.tsx`'s routing-wiring red, which mocks the whole module and
  never exercises its own content logic. `ExpenseEditView.test.tsx` (loading/error+retry/not-found/
  loaded states) was added green, verified against the already-shipped implementation, not
  red-then-green — documented inline in that test file's own doc comment. (`ExpenseFormIsland.tsx`
  did get its own dedicated red-first suite, `ExpenseFormIsland.test.tsx`.)
### B11a. `EventTimeline` widget port + timeline suites
- [x] `src/components/features/events/EventTimeline.tsx` takes `event`, `expenses`, `users`,
      `convert`/`currency` (a display-currency conversion pair, e.g. `useDisplayConversion`) and
      `onNavigate` as props (no store access, no portal of its own — the Inceptor `ui/hover-card.tsx`
      it composes does its own); named `EventTimeline`, not `Timeline`, to avoid colliding with
      Inceptor's `ui/timeline.tsx` (vertical feed) — **deviation: `ui/timeline.tsx` does not exist in
      this tree** (checked; Inceptor hasn't shipped it here yet), so the "lower-priority alternative"
      of extending it was not applicable, not merely deprioritized. Positioning is 100% delegated to
      the pure `domain/timeline` helpers (`groupNearbyExpenses`/`calculateTimelineProgress`) — the
      component only turns `.position` into CSS. Every marker is a real `<button>`
      (`HoverCardTrigger`'s `render` prop, not the default `<a>`) with an `aria-label`; the hover card
      opens on hover AND keyboard focus (`delay={0}` — the default 600ms hover-intent delay is a poor
      fit for a keyboard user tabbing onto an already-interactive marker); every expense is ALSO
      listed in a permanently-present `sr-only` list wired to the same `onNavigate`, so nothing is
      reachable by hover alone (CLAUDE.md a11y rule). Settlement status (settled/unsettled/mixed) and
      pre-/post-event placement are conveyed by `aria-label` + a text legend, never marker color
      alone. Added to `/showcase` (`ShowcaseEventTimeline`, `client:visible`, obviously fictional
      sample data) per the quality bar; `src/tests/showcase.test.ts` extended.
- [x] Ported `src/__tests__/{timeline,timelineEvents,postEventExpenses,hoverCard,expenseGroups}.test.tsx`
      onto `src/components/features/events/EventTimeline.test.tsx`, against the REAL widget and the
      REAL `domain/timeline` helpers — every legacy suite except `timeline.test.tsx` tested a
      hand-rolled stand-in component instead of the real one, which this port replaces. Kept: the
      10-day-event fixture shape, same-day grouping into one marker, settled/unsettled/mixed
      distinction, pre-/post-event expenses shown distinctly, a hover card revealing per-expense
      detail with a working navigate action. Dropped: `AppContext`/`next/navigation` mocking (this
      tree has neither, spec D3 — `onNavigate` is a prop), MUI/CSS-module class assertions, and
      `timeline.test.tsx`'s imprecise `expenseMarkers.length >= mockExpenses.length` assertion
      (grouping intentionally produces FEWER markers than expenses when dates coincide; replaced with
      an exact count). New: the permanently-present `sr-only` accessible-alternative suite (no legacy
      equivalent existed) and a dedicated keyboard-focus-only test. Full kept/dropped/new breakdown in
      the test file's own header comment.
- [x] Note (B8a review): `src/domain/timeline/*` parsed calendar-date strings with a bare
      `new Date(...)`, the same UTC-midnight bug fixed in `dashboard.ts`/`csvExport.ts`/
      `formatters.ts` (B8a) — adopted `src/domain/dates.ts#parseCalendarDate` throughout, and removed
      the `formatTimelineDate`/`formatDateRange` `+1 day` hack (a workaround for the same bug, not an
      independent one — TZ-invariant noise once the underlying parsing is correct). Also gave the
      module its deferred "real types" (B3's note): `TimelineExpenseInput`/`TimelineEventInput` are
      now `Pick`s of the real `Expense`/`Event` schemas, `settled: boolean` → `settledAt: string |
      null` (the project-wide `settledAt == null` convention), and `calculateTimelineProgress`/
      `calculatePositionPercentage` gained an injectable `now` (dashboard.ts's own pattern) for
      deterministic tests. Two genuine timezone divergences fixed and covered (TZ pinned to
      America/Mexico_City, `src/domain/timeline/index.test.ts`): `calculateTimelineProgress` no
      longer reports a "today"-started event as already underway before local midnight has passed,
      and `calculatePositionPercentage`'s no-end-date fallback now measures elapsed time against the
      correct local start. **Documented, not fixed as a "bug"**: two calendar-date-only strings
      compared against each other can never diverge by timezone (`parseCalendarDate`'s local-midnight
      offset is constant across the subtraction and cancels out) — only a comparison against a real
      clock reading (`now`) can disagree, which is what the two divergence tests exercise; this is
      recorded in the module's own header comment so a future maintainer doesn't go looking for a
      bug that provably can't exist in the pure calendar-to-calendar paths.
- [x] **Coordinator review fix**: the permanently-`sr-only` expense list let a sighted keyboard user
      tab onto controls they couldn't see (WCAG 2.4.7 Focus Visible), and it was also the only
      dependable keyboard path into a same-day grouped marker's individual expenses — a Base UI
      `PreviewCard` isn't a reliable container for interactive content (tabbing out of the trigger
      closes it). Fixed: the list is now an "Expenses in this event" panel that starts `sr-only` and
      drops that class (a plain `onFocus`/`onBlur` React-state toggle, not CSS `:focus-within` — kept
      testable without a real browser/compiled CSS) as soon as focus lands inside it, restoring it on
      blur; every button keeps its default/focus-visible ring. The hover-card popup's own per-expense
      buttons are now `tabIndex={-1}` (opted out of the tab order, still mouse-clickable) — the panel
      is the one dependable keyboard path, the popup stays a hover/mouse quick preview only. Red test
      commit first (`fcb771b`), fixed green (`c25fcee`).
### B11b. Events islands (list, new, view, edit)
- [ ] `events` is the JustSplit-local table (spec D10, B2/B3): list = `events where memberIds
      array-contains uid`; creation writes `memberIds` (creator included — every other member an
      accepted friend or a co-member of `?group=`, per the RLS membership mirror), `kind: 'event'`,
      `preferredCurrency`, optional `groupId` from `?group=`, `createdBy`; event expenses =
      `expenses where eventId == id` (B10 writes `eventId`; the adapter resolves it to
      `extra->>'eventId'`)
- [ ] List: sort by date/name/total with order toggle, date filter, per-event `EventTimeline`
      (B11a), per-event total converted to the display currency (`CurrencySelector`, B16),
      "Create event" button
- [ ] Detail: `Editable` name (B16) → partial `repos.events.update` (description is static
      today), `EventTimeline`, Settlement Progress `ProgressBar` (B16; `domain/timeline`
      `calculateSettledPercentage`), total/unsettled stats and per-member balances over `splits[]`
      in the display currency (default `event.preferredCurrency`), member names via `useProfiles`,
      expense list with settled badges, "View Settlements" → `/settlements?event=<id>`,
      "Add expense" → `/expenses/new?event=<id>` (B10), `ExportCsvButton` (B17a,
      `<event.name>-expenses.csv`)
- [ ] Participant picker = registered users only (see B13 ADR): accepted friends, or the group's
      members when `?group=` is set; no free-text participant creation
- [ ] Delete event: **not built** (no page calls `deleteEvent` today). If it is ever built:
      `deleteDocument('events')` (RLS: creator), leaving its expenses with a dangling `eventId`
      that lists ignore
- [ ] Port `EventDetail.test.tsx` + `page.test.tsx` (EventList part)
### B12. Groups islands (list, new, view) (`risk:high`)
- [x] Decision (orchestrator; ADR 0002 amendment "group membership lifecycle"): routes match
      `/expenses`'s shape — `/groups/index.astro` redirects to `/groups/list` (`GroupsListIsland`,
      with a "New group" link present in every content state), `/groups/new.astro` mounts
      `GroupFormIsland`, and the already-named `group-detail` dynamic route is wired to a real
      `GroupDetailView` through `AppRouterIsland`'s fourth `React.lazy` boundary (a missing or
      RLS-hidden group renders the same `NotFoundView` every other dynamic route uses).
- [x] Queries per ADR 0002: `useGroups(uid)` = `expense_groups` by `memberIds array-contains uid`
      (new B5a-shaped live-query hook, `src/lib/data/hooks/useGroups.ts`); creation writes the
      universal `ExpenseGroup` exactly per the field list below, built by the pure
      `src/domain/groups.ts#buildCreateGroupInput` (its own test coverage) and wired through the
      new `useCreateGroup` mutation: `type: 'friends'` until Track D, `currency` = the creator's
      preferred currency, `members[]` — the creator `{ userId, displayName, role: 'owner',
      joinedAt: now }`, every invitee `{ userId, displayName, role: 'member', joinedAt: now,
      invitedBy: uid }` — `displayName` filled from `useProfiles` at add time; `memberIds`;
      `adminIds = members.filter(m => hasMinimumRole(m.role, 'admin')).map(m => m.userId)` via
      `domain/groups.ts#computeAdminIds`, so `adminIds` and `members[].role` never drift;
      `settings: { defaultSplitType: 'equal', simplifyDebts: true, maxMembers: 50 }`,
      `totalExpenses: 0`, `createdBy`. Members are picked from accepted friends only
      (`GroupForm`, the B13 model — the `expense_groups_insert` RLS check and
      `guard_expense_groups` reject anyone else); `maxMembers` is enforced client-side before any
      mutation call.
- [x] `GroupDetailView`: the group's expenses/events via the already-shipped `useGroupExpenses(id)`/
      `useGroupEvents(id)` (B5a); member names/role badges via `useProfiles` in `MembersSection`;
      "Add expense" links `/expenses/new?group=<id>` (B10 writes `groupId` + `memberIds`). Member
      management (`MembersSection`, admins only in the UI — `guard_expense_groups`'s BEFORE UPDATE
      trigger is the actual authority): **Add** — a Dialog offering the admin's accepted friends
      who are not already members, writing `memberIds`/`members[]`/`adminIds` together via
      `domain/groups.ts#withAddedMembers` + the new `useUpdateGroup` mutation (a partial patch).
      **Remove/leave** (an admin action in v1, spec D10) — preflight-blocked with an honest inline
      count (`memberRemovalBlockerCount`: "Alex is still part of 3 expenses in this group, so they
      can't be removed yet.") when the member still appears in any group expense's/event's
      `memberIds`, and the sole remaining admin can never remove or demote themselves
      (`isLastAdmin`) — both are UX-only client-side preflights, recorded in the ADR 0002
      amendment alongside the RLS reasoning that makes them necessary.
- [x] Attach existing rows (`AttachRowsPanel`): attach an expense offers only ungrouped expenses
      whose `splits[].userId ∪ {paidBy} ⊆ group.memberIds` (`domain/groups.ts#isExpenseAttachable`/
      `filterAttachableExpenses`) and writes `{ groupId, memberIds: group.memberIds }`; attach an
      event offers only ungrouped events whose `memberIds ⊆ group.memberIds`
      (`isEventAttachable`/`filterAttachableEvents`) and writes `groupId` only (its own expenses
      stay keyed by `eventId`). `repos.groups.attachExpenses`/`attachEvents` run one `batchWrite`
      per call and then re-read every attempted row, returning `{ attached, skipped }` — a row the
      batch didn't actually change is never reported as attached; `AttachRowsPanel`'s toast
      summarizes both counts honestly instead of claiming every checked row succeeded.
- [x] Delete group (`DeleteGroupDialog`, admin-only two-step confirm): `repos.groups.remove`
      preflights BEFORE any write — the fresh-read caller must be in `adminIds`
      (`GroupDeleteNotAllowedError` otherwise) and ungrouping must never leave a row whose other
      members fail the no-group friendship invariant (`violatesNoGroupInvariant`, plan B10;
      `GroupDeleteBlockedByFriendshipError`, surfaced as "This group can't be deleted yet: some of
      its expenses include people you aren't friends with."). Then one `batchWrite` nulls
      `groupId` on every group expense/event and deletes the group row. Then a re-read verifies
      the group is actually gone: `batch_write`'s DELETE op is a silent no-op when denied or not
      visible, so a reported "success" is never trusted on its own
      (`GroupDeleteVerificationFailedError` otherwise, surfaced honestly rather than claiming the
      delete worked). Tests (`src/lib/data/repos/groups.remove.test.ts`): a non-admin is denied and
      nothing changes; the friendship-block case; the honest post-write-verification-failure case
      (a mocked `batchWrite` that reports success without actually deleting); the happy path.
- [x] Display-currency selector (`CurrencySelector`, already shipped) on the detail page, seeded
      from `group.currency` (one-way seed, same pattern as every other detail island — never
      written back to the group), with converted amounts and an "(Originally: …)" caption per
      expense row.
- [x] **Deviation from the plan text's `totalExpenses`-as-a-maintained-display-cache** (orchestrator
      decision, ADR 0002 amendment): `totalExpenses` is written as `0` at create (the write-input
      schema still requires the field) and then IGNORED by the UI — nothing keeps it in sync (B9's
      expense delete and B10's expense create/attach don't touch it, and it carries no currency for
      a multi-currency group), so a maintained-cache number would drift from day one. The detail
      page instead shows the SUM OF THE CURRENTLY LOADED expense rows, converted to the viewer's
      chosen display currency. Fixing `totalExpenses` for real (a trigger/RPC that maintains it
      transactionally across every write path that touches `group_id`, or dropping the column
      entirely) is deferred as a Track D/D1 question, named but not solved here. Legacy-kind logic
      (`parseKind`) stays out of scope until Track D — this page has no kind logic.
- [x] Tests: `src/domain/groups.test.ts` (create-payload derivation, member add/remove patches, the
      removal/last-admin preflights, the attach filters); `src/lib/data/repos/groups.remove.test.ts`
      and `groups.attach.test.ts` (against the in-memory adapter); hook wiring tests in
      `src/lib/data/hooks/hooks.test.tsx` (`useGroups`, `useCreateGroup`, `useUpdateGroup`,
      `useDeleteGroup`, `useAttachExpensesToGroup`, `useAttachEventsToGroup`); component tests for
      `GroupForm`, `MembersSection`, `DeleteGroupDialog`, `AttachRowsPanel`, `GroupsListIsland` and
      `GroupDetailView`; `AppRouterIsland.group-detail.test.tsx`; `/groups/list` and `/groups/new`
      page-shell tests. No legacy groups tests existed to port (`origin/main`'s
      `src/__tests__/expenseGroups.test.tsx` tests an unrelated, ungrouped-by-date helper; the
      legacy `src/app/groups/new/page.tsx` is a local-only, free-text member-add form with no
      analogue in the registered-users-only model here). `/groups/list` and `/groups/new` added to
      `scripts/axe-smoke.mjs`.
### B13. Friends islands (list, add, view) — friendship request flow (`risk:high`)
- [x] Decision (ADR `docs/decisions/0006-registered-participants.md`): participants/friends must
      be registered users found by exact email through `find_profile_by_email` (B2; the lookup is
      by `auth.users` email, never the user-writable `profiles.email`, and the result is only used
      to create the pending friendship). What exists today and is kept: the `/friends` list page
      already sends persisted friend requests by exact email, shows Friend Requests / Friends /
      Sent Requests (with Cancel) sections — `/friends` keeps that email form, now via
      `find_profile_by_email` through a new `repos.friendships.request`/`useSendFriendRequest`
      (the repo's `byEmail` lookup already existed since B2/B5a, unused until this issue). What is
      **dropped** and recorded in the ADR: the browsable directory search over all users by name or
      email (own-row `profiles` RLS, no `users` list); `/friends/add` — the only local-only form,
      whose `ADD_USER` dispatch never persisted anything — now redirects to `/friends/`
      (`src/pages/friends/add.astro`, the same redirect pattern as `expenses/index.astro`); the
      legacy `User.friends`/`friendRequestsSent`/`friendRequestsReceived` arrays and
      `friendsReducer`. New: an unregistered email offers a mailto/copy-link invitation
      (`AddFriendForm`'s `InvitePanel` — no token, no avatar/name preview before sending either
      outcome). A registered email creates the `friendships` row (`status: 'pending'`,
      `requestedBy: uid`, `users: [uid, other]`) via `repos.friendships.request`, which pre-checks
      `existsForPair` and throws a typed `FriendshipAlreadyExistsError` for a duplicate pair instead
      of catching Postgres's `23505` — `RelationalSupabaseAdapter.setDocument` discards the
      original error's `.code`, so there's nothing to catch by code from the repo layer (recorded as
      an accepted gap in the ADR, not silently claimed closed); Cancel = the requester deletes the
      pending row via the same `useRemoveFriendship` mutation Remove uses (delete: either party).
      **Deviation, routes**: `/friends` is the list shell directly (`src/pages/friends/index.astro`,
      same shape as `/expenses/list.astro`) rather than a redirect to a separate `/friends/list` —
      matching the legacy tree's own `/friends` page and the plan text's own "`/friends` keeps that
      email form" phrasing, unlike `/expenses`/`/events`/`/groups`'s redirect-to-`/list` pattern.
- [x] Rows are the universal `Friendship` (`@cyber-eco/types`, `packages/types/src/friendship.ts`);
      accept/reject = recipient-only `status` update (`useUpdateFriendshipStatus`); remove = delete
      by either party (`useRemoveFriendship`) — all enforced by the `friendships` policies plus the
      `guard_friendships` trigger shipped in the **B2 migration** and asserted by the B2b suite
      (`cardinality(users) = 2`, `requested_by = uid` on insert, `users`/`requested_by` immutable,
      `status` changes only by the recipient, one row per pair). This issue adds no migration.
      **Resolved (coordinator review; ADR 0006)**: `friendships_pair_uniq` has no partial predicate,
      so a `status: 'rejected'` row permanently blocks a fresh request for that pair unless it is
      deleted — kept as-is on purpose (it's what stops the requester re-spamming a pair the recipient
      already declined), but the recipient is not left stuck: `partitionFriendships` gained a fourth
      bucket, `declined` — populated ONLY for the recipient (`requestedBy !== uid`) — rendered as
      `/friends`' own "Declined requests" section with an **Undo** button
      (`useRemoveFriendship` — a delete, never a status change) that frees the pair whenever the
      recipient decides they're ready. The original requester's view of the same row stays in NO
      bucket at all (recipient privacy: no "declined" indicator ever reaches their side); retrying
      gets the existing generic "You already have a request or friendship with this person" message,
      which ADR 0006 now names as its own small, accepted enumeration leak ("a row exists for this
      pair," never which status). The dead end this bullet used to flag as a follow-up is resolved,
      not deferred.
- [x] Friends list and friend detail render names/avatars through `useProfiles(ids)` (B5a;
      `friendships.users` carries bare uids; the "other user in a 2-person `users[]`" logic is one
      pure helper, `src/domain/friends.ts#otherUser`, shared with B10's `ExpenseForm` via a pure
      refactor — its own 16 tests stayed green unmodified). Friend detail (`FriendDetailView`,
      `/friends/<id>` — the dynamic `friend-detail` route already named in `app-routes.ts` since
      B2c, wired to a real view through `AppRouterIsland`'s own `React.lazy` boundary, the third
      after B9's `expense-detail`/B10's `expense-edit`): shared expenses = `useExpenses(uid)`
      filtered client-side to rows whose `memberIds` include the friend; "Add shared expense" →
      `/expenses/new?friend=<id>` (B10); Remove behind `RemoveFriendDialog`'s confirm. **Deviation
      from the plan text's "balances from `expenseCalculator`"** (orchestrator decision, matching
      B8a's own reasoning): the balance uses `src/domain/dashboard.ts#balancesWithUser` (already
      shipped in B8a for the dashboard's `BalanceOverview`), filtered to this one friend, over the
      caller's full expense list — never re-derived from `calculateSettlements`'s greedy minimal-
      transactions pairing, which answers "who should settle with whom overall," not "what do these
      two specific people owe each other." An id that resolves to no ACCEPTED friendship of the
      caller — unknown entirely, a stranger, or someone with a pending (not yet accepted) request
      either direction — renders the same `NotFoundView` every other dynamic route uses (ADR 0002's
      leaked-id reasoning, extended here to "does this user even exist").
- [x] Tests: request/accept/reject/remove/cancel against the memory adapter
      (`src/lib/data/repos/repos.test.ts`, `src/lib/data/hooks/hooks.test.tsx`); the unregistered
      email path, self-email local refusal (no RPC call), and the duplicate-pair mapping
      (`AddFriendForm.test.tsx`); not-found hiding existence (`FriendDetailView.test.tsx`); the
      detail balance using the selector; `ExpenseForm.test.tsx`'s existing 16 cases stayed green
      after the `domain/friends.ts` refactor. `domain/friends.test.ts` covers the `declined` bucket's
      asymmetry test-first (a rejected row lands there only for the recipient, never the requester);
      `FriendsIsland.test.tsx` covers the Declined requests section rendering with the requester's
      name and an Undo button, Undo calling `useRemoveFriendship` and toasting, and the requester's
      own view showing nothing at all for the same row. The `friendships` RLS suite in
      `src/tests/rls/` is unchanged by this issue (no migration) and stays green in its own CI job —
      not runnable here. `/friends` added to `scripts/axe-smoke.mjs`.
### B14. Settlements island (`/settlements`, reads `?event=` from `location.search`)
- [ ] Tabs pending / balance / history (port from `settlements/page.tsx`); display-currency
      selector (`CurrencySelector`, B16) + the exchange-rates table with every amount converted;
      party names via `useProfiles` ("X owes Y")
- [ ] "Settle up" calls `repos.settlements.settle()` → one `batchWrite`: `set` a universal
      `Settlement` `{ id, groupId (null outside a group scope), fromUserId, toUserId, amount,
      currency, date, memberIds: [from, to], createdBy, expenseIds, eventId? }` (`expenseIds` and
      `eventId` are overflow keys; `createdAt`/`updatedAt` come from `metadata.strategy: 'server'`
      in the B5a `SchemaMap` and are omitted from the literal — the Zod write-input schema marks
      them optional) **and** `update` each settled expense with `settledAt = now` (mirrors
      `AppContext.addSettlement`, which the current UI never calls — today it dispatches a
      local-only `ADD_SETTLEMENT` that the next snapshot wipes). The update is a partial patch
      whose overflow key merges into `extra`, so the settled expense **keeps** its `eventId` and
      stays in its event. Atomic under RLS via `batch_write`; a denied operation rolls back the
      whole batch and surfaces a toast
- [ ] Trust statement (ADR 0002): `settledAt` and `settlements` rows are attestations by
      `created_by`, not verified payments — any member may write them. History shows "marcado como
      pagado por <name>" (names via `useProfiles`), never "paid"; the ETHICS checklist in the PR
      records it
- [ ] `useSettlements(uid)` = `settlements where memberIds array-contains uid` (one query; both
      directions, ADR 0002)
- [ ] `?group=` (already linked from today's group page) is out of scope here: the island ignores
      it with a visible "próximamente" note; Track D D7 implements the group scope and writes
      `settlement.groupId`
- [ ] `expenseCalculator` minimal-transactions, multi-currency conversion (over `splits[]`, B3)
- [ ] Tests: settle-up persists and marks expenses settled in one batch (port
      `context/__tests__/SettlementCurrency.test.tsx` against the memory adapter); the settled
      expense keeps its `eventId`; a rejected batch leaves every expense unsettled; history lists
      settlements for both directions
### B15. Profile island — editable profile, avatar upload, preferred currency
- [x] `updateProfile` = `profileStore.update(uid, partial)` + `adapter.updateDisplayProfile`
      (B4); avatar via `FileUpload` + B5b `uploadAvatar` (object path
      `avatars/{uid}/{uuid}.jpg` in `profiles."avatarUrl"`, previous object removed after the
      update succeeds); `preferences.preferredCurrency` written to the profile (source of truth);
      phone number edited with today's validation and stored as `preferences.phoneNumber` (B3
      `profile.ts`) — no top-level key beyond the hub's `profiles` columns is ever written through
      `profileStore.set/update` (`profiles` is copied verbatim, spec D10, and the store writes
      top-level keys as columns); "Restablecer datos locales" button wired in B17b — done:
      `/profile` (`ProfileIsland`, `ErrorBoundary > AuthIsland > AuthGate > Content`, same
      composition as `GroupFormIsland`/`ExpenseFormIsland`), a "Profile" link added to
      `UserAccountMenu`'s dropdown. `ProfileForm` composes `AvatarUploadField` (upload -> row
      update -> ONLY THEN remove the old object; a failed row update removes the NEW object
      instead; a failed old-object removal is `notifyInfo`, not an error; a defensive
      `avatars/{uid}/` path-prefix check before ever calling `removeAvatar`, since `avatarUrl` is
      user-writable) + the name/phone form (`ProfileEditSchema`, phone regex ported from the
      legacy `/app/profile` page — no legacy tests existed to port) + `CurrencySelector` (B16).
      **Preferences-merge bug guard**: every write of `preferences` (phone, currency here;
      `DashboardIsland`'s currency selector too, refactored in this issue) goes through the new
      `buildPreferencesPatch` (`src/domain/profile.ts`) — `SupabaseProfileStore.update` upserts
      `preferences` as a whole jsonb COLUMN, never a merge, so a bare `{ phoneNumber }` write would
      silently wipe `preferredCurrency` (and the reverse); asserted by a pure unit test and a
      `ProfileForm` integration test that a save of one field never observably changes the other.
      ADR `docs/decisions/0012-profile-and-account-settings.md` (numbered 0012, not the issue
      text's suggested 0009 — the plan's own pre-assignment table reserves 0009 for B20's future
      ADR; 0012 is the next number actually free, per the same "check pre-assignments first" rule).
- [x] Account: change password (`updatePassword`); sign out — the adapter's `signOut()` takes no
      arguments and is already Supabase's default **global** scope (every session revoked), so
      "sign out everywhere" is the plain button; a single-device sign-out would need
      `client.auth.signOut({ scope: 'local' })` directly and is not built — done: `AccountSettings`
      mounts a change-password form (`ChangePasswordSchema`, reusing `RegisterSchema.shape.password`
      plus a `confirmPassword` match check; no "current password" field — the session is already
      authenticated, the copy states this), the "Sign out everywhere" button (`signOut()` +
      `withBase('/landing')` with the toast queued `{ afterNavigation: true }`, ADR 0008), and the
      already-built `ResetLocalDataButton` (B17b) — mounted, not duplicated.
- [x] **Coordinator-review follow-up (regression this issue itself introduced)**: `profiles
      .avatarUrl` (and the mirrored auth `photoURL`) only ever held an `https:` URL before this
      issue; avatar upload made it sometimes hold a private `avatars/{uid}/…` storage path
      instead, but no OTHER avatar render site was migrated to resolve it — every uploaded avatar
      rendered broken everywhere else it was shown. Fixed with one shared resolver, `UserAvatar`
      (`src/components/features/profile/UserAvatar.tsx`): an `avatars/…` path resolves to a
      signed URL via the new `useSignedUrl` hook (`src/lib/data/hooks/useSignedUrl.ts`, extracted
      out of `ReceiptImage.tsx` so both share one resolution implementation — `ReceiptImage` is
      refactored onto it, behavior-preserving); an `https:` URL passes through unchanged (Google
      OAuth's `photoURL`); anything else (`http:`, `javascript:`, `data:`, another path shape,
      empty/null) or a failed signed-URL resolution renders the initials fallback, never placed in
      an `<img src>` — `avatarUrl` is user-writable with no server-side format check, so this is a
      real safety guard against a stored-XSS-shaped value, not just broken-image UX. Migrated every
      render site an exhaustive grep found: `UserAccountMenu` (header dropdown), `FriendsIsland`'s
      `PersonBadge` (friend requests/friends/sent-requests lists), `FriendDetailView`, and a fourth
      site found during the same audit — `AvatarUploadField`'s own "current avatar" display, which
      used `ReceiptImage` directly and so broke for any user still on the `https:` Google
      `photoURL` (never uploaded a custom photo). No group-members avatar render exists yet
      (`MembersSection`, B12, shows names only) — nothing to migrate there. One assertion per
      migrated site proves it renders through `UserAvatar`. Recorded as an amendment to ADR 0012
      with its own Stakeholder Analysis rows.
### B16. Currency exchange ticker + `CurrencySelector` + shared widgets (`risk:high`, `v0.3`)
- [x] Sequenced in Phase 1 (after B5b, alongside B6/B7) because almost every Phase 2 island depends
      on it: `CurrencySelector` (dashboard header, expenses list/detail, events list/detail,
      settlements, group detail, profile), `CurrencyExchangeTicker` (`/`), `Editable` (expense,
      event and group detail), `ProgressBar` (event detail); islands never re-invent or stub them
      — landed immediately after B7 (still Phase 1, before any Phase 2 island starts), not
      literally "alongside" B6/B7 in the same PR.
- [x] Harvest check: `src/components/ui/combobox.tsx` is in the B1 manifest (not in the
      create-inceptor-app core set; `select` is); extend `items` to `{code,symbol,name}` with a
      `renderItem` — done: `items` widens to `string[] | {code,symbol,name}[]`, resolved to/from
      plain string codes at the public `value`/`onValueChange` boundary via
      `itemToStringLabel`/`itemToStringValue`/`isItemEqualToValue`; plain string-item callers are
      unaffected (no caller exists yet either way).
- [x] Ticker reads `$rateCache`/`$preferredCurrency` (B5b) and `domain/currency.ts` (B3) —
      through one new call site, `src/lib/currency/rates.ts#fetchExchangeRate(from, to)`, added by
      this issue: hands `getExchangeRate` a COPY of `$rateCache`'s Map (mutating the atom's own Map
      in place would neither notify subscribers nor persist) and persists a fresh entry through
      `setRateCacheEntry`. Every widget in this issue, and every later Phase 2 island, is expected
      to use this helper rather than reaching into `domain/currency.ts` directly.
- [x] Shared widgets: `ProgressBar` (`progress-bar.tsx`), `Editable` (`editable.tsx`) replacing
      `EditableText` (inline rename in 6 pages); port
      `src/components/ui/__tests__/{CurrencySelector,EditableText}.test.tsx` and
      `src/__tests__/progressBar.test.tsx` against them; all three in `/showcase` — deviations:
      `CurrencySelector`'s port drops the legacy `compact`/`showRefreshButton`/`onRefresh`/
      `isRefreshing` assertions (this issue's prop list is `value`, `onChange`, optional
      `label`/`id` only — no caller needs the rest); `EditableText`'s port drops the `as`
      (polymorphic element)/`maxLength`/custom-`className`/placeholder-display assertions (no
      plan consumer needs them) and keeps only the four behaviors actually named in the issue
      (Enter saves, Escape cancels, blur saves, empty commit rejected+reverted) — the first three
      already passed against `editable.tsx` (B1); only the empty-commit case was a real gap
      (zag-js's machine has no concept of rejecting an empty SUBMIT), fixed with a `sendRef`-based
      guard that reverts via `VALUE.SET` instead of propagating `''`. `ProgressBar`'s port drops
      the legacy `variant`/`height`/`showPercentage` assertions (`progress-bar.tsx`, B1, never grew
      those props) — every assertion the issue actually names (clamp 0–100, `role="progressbar"` +
      aria-valuenow/min/max, label) already passed with zero production changes. `CurrencySelector`
      and `CurrencyExchangeTicker` (not ported — new, no legacy `__tests__` file for the ticker)
      live under `src/components/islands/` rather than `src/components/features/currency/`:
      `src/tests/mounted-island-error-boundary.test.ts` (whole-tree rule since B6) requires every
      component mounted with a `client:*` directive from an `.astro` file to live under
      `components/islands/` and wrap `<ErrorBoundary>`; `CurrencySelector` itself (never mounted
      directly — only composed inside `ShowcaseCurrencySelector`/future feature islands) stays
      under `components/features/currency/`. The ticker's CSS-only auto-scroll
      (`global.css` `.ticker-track`) renders its rate list exactly once (no duplicated/aria-hidden
      copy for a seamless loop, unlike the legacy CSS) — simpler, and avoids a screen reader or a
      `getByText` query ever seeing the same pair twice; `overflow-x-auto` keeps every pair
      reachable by a plain scroll with the animation on OR disabled under `prefers-reduced-motion`.
- [x] Tag `risk:high` (non-same-origin fetch to the exchange-rate API); ADR
      `docs/decisions/0007-exchange-rate-provider.md` with Stakeholder Analysis — the attribution
      link text is unchanged ("Rates By Exchange Rate API") but its href moved to
      `https://www.exchangerate-api.com` (the `www` host, matching the issue's spec text; the
      legacy component linked the bare apex domain).
### B17a. CSV export (shared button, before Phase 2)
- [x] `domain/csvExport` wired to a `download-trigger` as one `ExportCsvButton` (props `expenses`,
      `users` from `useProfiles`, `events`, `filename`) + `/showcase` entry; mounted by the islands
      that own the four export sites today: `DashboardHeader` (B8b, all expenses,
      `all-expenses.csv`), the expenses list toolbar (B9, filtered rows, `all-expenses.csv` or
      `<event>-expenses.csv`), expense detail (B9, `[expense]`, `expense-<id>.csv`) and event
      detail (B11b, `<event.name>-expenses.csv`); Track D issue D8 adds the category columns —
      done: `src/components/features/export/ExportCsvButton.tsx` (data-source-agnostic: `users`
      is a plain `{id,name}[]`, so `useProfiles` stays the caller's job; the four mount sites are
      B8b/B9/B11b, not this issue) + `src/components/islands/ShowcaseExportCsvButton.tsx`, mounted
      in `/showcase`. The Blob is `text/csv;charset=utf-8` with a leading UTF-8 BOM (Excel renders
      accented names correctly) — the BOM lives only in the Blob passed to `download-trigger`,
      never in `expensesToCSV`'s string return. `filename` runs through the new
      `sanitizeFilename` (`domain/fileUtils.ts` — no existing helper before this issue) BEFORE
      `ensureCSVExtension`, not after: sanitizing after appending `.csv` could strip characters
      out of an all-hostile-input result and leave a non-fallback, extension-only string;
      `sanitizeFilename` also falls back to `'expenses.csv'` on an empty result. Export failures
      go through `notifyError` (`src/stores/notifications.ts`), not console-only.
- [x] Security addendum (not in the original bullet, added per this issue's dispatch): CSV
      formula-injection neutralization (OWASP guidance) in `domain/csvExport.ts` — any text cell
      starting with `=`, `+`, `-`, `@`, a tab or a CR gets a leading `'` before quoting, in both
      `expensesToCSV` (description, notes, payer/participant names, event name — never the
      computed date/amount/currency/status) and the generic `exportToCSV` (any cell whose
      original value is a `string`, so a negative numeric cell is untouched). Six new red cases in
      `csvExport.test.ts` covered this before the fix; all pre-existing `csvExport.test.ts` cases
      kept passing unmodified (none of their fixtures start with a neutralization-triggering
      character).
### B17b. Toaster island wiring + local-cache reset
- [x] Vitest (`@vitest-environment jsdom`): two separate `createRoot`s on one document — root B
      mounts `<Toaster />`, root A calls `toast()`; assert the toast renders in B. Record the
      result and the chosen topology (one layout-level `<ToasterIsland client:idle />` vs one
      `<Toaster />` per route island drained from `$toasts`) in ADR
      `docs/decisions/0008-toast-topology-and-cache-reset.md`; wire it — done: the two-root test
      passed (the module-singleton `toastManager` is shared across roots), confirmed against the
      real production build too (13 built island/store chunks all reference the same
      `toast.<hash>.js` chunk, recorded in the ADR) — topology is the one layout-level
      `<ToasterIsland client:idle />` in `BaseLayout.astro` (skipped on `marketing` pages: spec
      D3, and `check-auth-bundle.mjs`'s marketing budget forbids any `<astro-island>` there at
      all). Two real gaps the same test surfaced and fixed: `toast()` fired before any
      `<Toaster/>` mount was silently dropped (Base UI's manager holds no buffer) — fixed with a
      small pre-hydration queue in `ui/toast.tsx` itself, flushed on the first `<Toaster/>`
      mount; and `BaseToast.Close` had no accessible name — fixed with
      `aria-label="Dismiss notification"`. `notifyError` additionally now passes `priority:
      'high'` (assertive) and `timeout: 0` (persists until dismissed, WCAG 2.2.1) — not
      explicitly named by this bullet but required by section 2's a11y list below it.
- [x] Local-cache reset (replaces the Firestore IndexedDB corruption-recovery flow, which has no
      equivalent need): `src/lib/data/reset-local.ts` clears the TanStack Query idb-keyval
      persister store — the shared `justsplit:query` idb key plus any idb-keyval key matching
      `justsplit:*` (`keys()` from idb-keyval) and Inceptor's default `tanstack-query-cache`
      defensively — `localStorage` keys under `justsplit:*`, the supabase-js session storage
      (after `signOut`), and unregisters B19's service worker; exposed as "Restablecer datos
      locales" in the profile island (B15) and as the recovery action of `ErrorBoundary` when a
      persister hydration error is caught. The ADR records why no corruption detector is ported
      (the Query cache is disposable; a failed hydration falls back to the network) — done:
      `resetLocalData()` runs all six steps (sign out via `stores/auth`'s existing `signOut()`,
      never a direct `@supabase/supabase-js` import; the three idb-keyval sub-steps; localStorage;
      `sb-*` supabase session storage; service-worker unregistration), each isolated in its own
      `try`/`catch` so one failing step never skips the rest, then reloads to `withBase('/')`
      unconditionally; fires `notifySuccess`/`notifyError` honestly off the collected `failures`,
      never claiming a full reset on a partial one. `attachPersister` (`queryClient.ts`) now
      reports a restore failure through a typed `QueryCacheRestoreError` and an `onRestoreError`
      callback (previously an unhandled promise rejection with no caller-visible signal at all).
      `QueryProvider`'s recovery action is a nested `ErrorBoundary` that is a SIBLING of
      `children`, not an ancestor, so the banner (an `ErrorState` + the new reusable
      `ResetLocalDataButton`) appears alongside the route content instead of unmounting it — the
      app keeps fetching over the network underneath. Deviation: B19 (PWA/service worker) had not
      landed as its own issue at the time this one ran — `@vite-pwa/astro` was already installed
      and configured in `astro.config.mjs` from an earlier pass, so
      `navigator.serviceWorker.getRegistrations()` has a real registration to unregister once B19
      finishes; this issue's own step is guarded (`'serviceWorker' in navigator`) and tested
      against both cases regardless. Deviation: the profile-island mount (B15) is explicitly
      deferred — `ResetLocalDataButton` is exported, fully tested, and mounted on `/showcase`
      (`ShowcaseResetLocalDataButton`) so B15 only has to mount the already-built component, per
      this issue's own "exposed... in the profile island (B15)" framing.
- [x] Tests: reset clears every store and calls `unregister`; hydration failure renders the
      recovery action and still fetches — done (`reset-local.test.ts`'s 7 cases;
      `QueryProvider.test.tsx`'s 2 cases, the second asserting the route content stays mounted
      throughout the recovery-banner case)
- [x] **Amendment**, filed against this same issue after review: this is a static MPA (spec D2) —
      every `notify*` call immediately followed by `window.location.assign`/`.replace`/`reload()`
      was silently discarding the toast, since the whole page (and Base UI's toast manager with
      it) is torn down by the navigation. Grepping the tree found six real sites:
      `ExpenseForm`'s create/edit success AND partial-failure receipt-upload honesty message
      (B10 — the exact message this design exists to surface, always lost until this amendment),
      `DeleteExpenseDialog` (B9), `GroupForm` create (B12), `DeleteGroupDialog` (B12), and
      `resetLocalData` itself. Fixed with a cross-navigation handoff in `notifications.ts`:
      `{ afterNavigation: true }` on `notifySuccess`/`notifyError`/`notifyInfo` queues the toast
      in `sessionStorage` (`justsplit:pending-toasts`, a bounded, Zod-validated array —
      `src/schemas/pending-toast.ts`, storage-boundary schema per CLAUDE.md rule 8) instead of
      firing it; `ToasterIsland` drains the queue once on mount (its own effect, an ancestor of
      `<Toaster/>`, so React's bottom-up effect order guarantees a listener already exists),
      firing each entry through the exact same assertive/persistent rules a live toast gets.
      `resetLocalData`'s own result toast now survives the reset it's reporting on (its
      `localStorage`-only clearing steps never touch `sessionStorage`) — proven directly against
      the real `notifications.ts`, not a mock, in `reset-local-toast-survival.test.ts`.
      `RemoveFriendDialog`/`FriendDetailView` (B13) and `MembersSection` (B12) were checked and
      do NOT navigate — no migration needed. Full design record, alternatives considered, and
      Stakeholder Analysis: ADR 0008's "cross-navigation toasts" amendment section.
### Phase 3 — Cutover

### B18. Feature-parity audit
- [ ] Walk spec §6 checklist on the staging Pages site (dedicated test account), desktop + 375 px
      viewport; file an issue per gap and block cutover on them
- [ ] Every row of the Jest suite → owning task table is ticked
- [ ] Measure time-to-data on a warm navigation ≤ 300 ms on the staging site (Query persister:
      one `QueryProvider` per page, `meta.persist` on collection queries, one `justsplit:query`
      key — B5a; with `useLiveQuery` as the single network source there is exactly one request per
      live key)
- [ ] Run `npm run perf` (`@lhci/cli`, `lhci collect && lhci assert` against the absolute staging
      URLs, no local build — B19) from a developer machine, not CI; the B5a contract suite and the
      spec §6 smoke run against the **`justsplit` project** as the throwaway account (publishable
      key only); RLS parity with production is proven by `npm run db:audit` (B2), a read-only
      script that dumps `pg_policies`, `pg_class.relrowsecurity`, `pg_trigger`, function grants and
      `role_table_grants` for `public` from `SUPABASE_DB_URL` and diffs them against the same dump
      from `supabase start` (must be empty). The `service_role` key is never exported outside
      `supabase start` and no admin-created fixture user ever lands in the production `auth.users`
### B19. PWA + performance
- [ ] `@vite-pwa/astro` manifest re-branded, offline shell; the `@supabase/supabase-js` +
      `@cyber-eco/*` chunk isolated (`vite.build.rollupOptions.manualChunks`) — its size was
      already measured in B4 and recorded in ADR 0003
- [ ] Workbox: `navigateFallback: asset('404.html')` — a config-time helper built from the `BASE`
      const, because `withBase()`/`import.meta.env.BASE_URL` cannot be evaluated in
      `astro.config.mjs` — so an offline navigation to any app route gets the shell that mounts the
      route island (spec D2); `ignoreURLParametersMatching: [/.*/]` so precached pages match
      regardless of query string (Workbox's default strips only `utm_*`/`fbclid`; any other query
      string misses the precache and the NavigationRoute would serve the 404 shell for
      `/auth/callback/?code=…` — breaking Google sign-in on the second visit —
      `/settlements/?event=…`, `/expenses/new?group=…`, `?next=` and `data-table` URL state; an
      alternative `navigateFallbackAllowlist` limited to the dynamic route families is
      acceptable); `navigateFallbackDenylist: [/\/auth\/v1\//, /\/storage\/v1\//,
      /\/rest\/v1\//, /\/realtime\/v1\//]` so Supabase endpoints on the same host are never
      captured (they are cross-origin anyway; the denylist is belt-and-braces); `runtimeCaching`:
      `NetworkOnly` for `*.supabase.co`; tests: `/expenses/abc` offline → shell,
      `/settlements/?event=x` → the settlements page, `/auth/callback/?code=x` → the callback
      page, `/rest/v1/*` untouched. The same fix applies to Inceptor's own `navigateFallback:
      BASE` config — noted in C1
- [ ] Adapt `lighthouse-budgets.json` + `.lighthouserc.json` (grafted in B1) and split budgets by
      path: `/landing`, `/about`, `/help` keep Inceptor's 150 kB script budget; `/`,
      `/expenses/*`, `/events/*`, `/groups/*`, `/friends/*`, `/settlements`, `/profile` get an
      explicit budget set from the measured size of the supabase-js + `@cyber-eco` chunk plus
      the route island (expected well under the old firebase figure; write the measured numbers
      into the JSON with a comment naming the chunk). Budgets are **adjusted from the B4
      measurement** of the auth chunk, not first measured here. `.lighthouserc.json`: remove
      `staticDistDir` (lhci's static server cannot serve a `/JustSplit`-prefixed build from
      `./dist`) and set `collect.url` to the absolute staging URLs
      (`https://artemiopadilla.github.io/JustSplit/landing/`, `…/auth/signin/`, `…/`); `perf`
      script = `lhci collect && lhci assert` (no local build). `@lhci/cli` devDep (as in Inceptor's
      `package.json`); budgets are run in B18 against the live staging site, not in CI
- [x] Header weight (found in B6): `UserMenuIsland` is on every page and its chunk is ~48.6 kB gz
      (no Supabase or zod; most likely the Base UI dropdown menu and its positioning code), which
      puts `/auth/signin/` at ~236 kB gz, over the 195 kB `/auth/*` budget from B4 and Inceptor's
      150 kB page budget. Render the signed-out state (a plain link) without the menu and load the
      dropdown only when opened, or swap in a lighter menu; re-measure with `check:auth-bundle`
      and do not raise the budgets to absorb it — done, pulled forward into B7. Two changes:
      (1) the dropdown menu + avatar (`UserAccountMenu.tsx`) load via `React.lazy` + `Suspense`,
      only once `$authReady && $user`, with an accessible non-jumping fallback (real name text +
      a decorative pulse circle); (2) `/landing`, `/about`, `/help` render a fully static header
      (`SiteHeader`'s new `static` prop) with no `UserMenuIsland` mount at all, because those
      pages never run a route island so `$user` can never leave `null` there — hydrating is dead
      weight. Measured with `node scripts/check-auth-bundle.mjs` (statically-loaded gz, not the
      informational full chunk-graph total which still counts the lazy chunk's worst case):
      `/` 133.76 → 75.00 kB gz, `/auth/signin/` 237.00 → 190.32 kB gz, `/landing` 1.18 → 1.18 kB gz
      (was already static-header-free — no `UserMenuIsland` mount there before or after this
      specific fix; its own 40 kB budget is met by the B7 marketing-header change instead).
      `/auth/signin/` remains over Inceptor's 150 kB page budget (dominated by
      `@supabase/supabase-js` + `@cyber-eco/auth` + `zod`, ADR 0003's already-accepted fallback) —
      not raising that budget, per this bullet's own instruction; the remainder is B4/ADR 0003
      territory, not header weight.

### B20. Cutover PR `inceptor → main` and Firebase retirement (`risk:high`)
- [ ] Before merging: `firebase apphosting:backends:list --project justsplit-eef51`; if a backend
      is connected to this repo, disconnect it (or it auto-builds `main` after the merge);
      confirm which origin the custom domain (if any) points to today
- [ ] Merge `inceptor → main`; `deploy.yml` publishes the production Pages site; `db-migrate.yml`
      has already applied every migration (the project is shared with staging). Then DNS: the
      custom domain's CNAME → `artemiopadilla.github.io`, `CNAME` file in `public/`, HTTPS
      enforced in the Pages settings, the `ASTRO_BASE` repository **variable** set to `/`,
      Supabase redirect URLs and Google OAuth origins updated to the production domain (owner
      actions, in the runbook). Or, without a domain: production is
      `https://artemiopadilla.github.io/JustSplit/` and `ASTRO_BASE` stays `/JustSplit`
- [ ] Delete the last Next references in docs; append the `CHANGELOG.md` entry (file created in
      A6); delete `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`,
      `src/firebase/` (already gone with `src/` in B1), `apphosting*.yaml` (A1 deferred them here).
      Because the repo then holds no `firebase.json`/`.firebaserc`, every `firebase` command in
      `docs/runbooks/firebase-retirement.md` passes `--project justsplit-eef51`
- [ ] **Retire Firebase — day 0 to day 14** (owner actions, `docs/runbooks/firebase-retirement.md`):
      day 0 — the old build keeps serving on Firebase Hosting untouched (this **is** the rollback:
      re-pointing the domain back must show the Next app, so no "we moved" deploy on day 0);
      day 0 — disable Firebase Auth sign-ups (Authentication → Settings → user actions), delete
      the Hosting preview channels, delete the App Hosting backend if any; day 14, window closed —
      the owner picks one of two recorded end states: **(a)** delete project `justsplit-eef51`
      outright (the `*.web.app` URL dies; no "we moved" page; export Firestore first to a private
      archive, nothing is imported anywhere; the 30-day Google grace period is the last safety
      net), or **(b)** keep Hosting alive as a stub: deploy the static "we moved" page from a
      throwaway directory with a minimal `firebase.json` (`{"hosting":{"public":"site"}}` —
      today's `frameworksBackend` config cannot deploy a plain static page — `firebase deploy
      --only hosting --project justsplit-eef51`), then `firebase functions:delete <ssr fn>
      --region us-central1`, export and delete Firestore, disable Auth, and amend the
      definition-of-done line to "Auth, Firestore and functions deleted; Hosting serves only the
      static we-moved page". Log each step with its date in the runbook
- [ ] ADR `docs/decisions/0009-cutover-and-firebase-retirement.md`: rollback = re-point the
      domain to Firebase Hosting within the 14-day window (a `git revert` cannot bring the Next
      SSR site back on Pages), which is why the old build stays as-deployed for the whole window;
      after day 14 there is no rollback and the ADR says so; the (a)/(b) end state chosen;
      Stakeholder Analysis (users lose nothing: no data existed that they keep; the old site is a
      dead end once Auth is disabled — under (b) its landing page is replaced by the static "we
      moved" page when the window closes)
- [ ] Acceptance: production Pages site serves the Astro app on the chosen origin; Google sign-in
      works there; `db-migrate.yml` is green on `main`; the Firebase project is in its 14-day
      window with sign-ups disabled and the old build still serving
### B21. Post-cutover monitoring
- [ ] 14-day watch: GitHub Pages deploy status, `FeedbackFAB` issues, Sentry (optional, Inceptor
      `sentry.ts` guarded, grafted in B1), Supabase dashboard (auth errors, RLS denials in the
      Postgres logs, Realtime connections); day 14: execute the last retirement step of B20 and
      close the milestone
### B22. Cleanup
- [ ] Delete the `inceptor` branch, `deploy-staging.yml` and the `inceptor` entry in the
      `github-pages` environment's allowed branches (or keep staging as a permanent pre-production
      site on a second, branch-published Pages site — then add `public/.nojekyll` and an
      `ASTRO_SITE` override so `site` is the staging origin — decide and record in ADR 0009);
      archive `docs/refactor-plan.md`; append to `ROADMAP.md` (created in A6)
- [ ] Once H2 is published: bump the three `@cyber-eco/*` packages (`types`, `auth`, `supabase`)
      to the H2 release in **one commit** (the B1 caret on 0.x is patch-only, so the minor is an
      explicit bump; `types` is in the hub's changesets `fixed` group, so its version moves with
      `auth`), switch `adapter.ts` to `new SupabaseStorageAdapter(() => client, { schemaMap })`,
      then delete `src/lib/data/relational-adapter.ts`; the contract suite, the RLS suite and the
      three never-document-mode tests (`collections-mapped`, the `adapter.ts` `schemaMap` grep, the
      `public.documents` absence) stay green before and after the deletion

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
      Supabase Storage with signed URLs, `navigateFallback` to the shell with
      `ignoreURLParametersMatching: [/.*/]` (also flag that Inceptor's own `navigateFallback: BASE`
      config hijacks every navigation with a query string), `safeNext()` shipped next to
      `withBase()` in `src/lib/href.ts` so other consumers get the open-redirect guard
- [ ] Links `docs/recipes/supabase-migrations-ci.md` for the CI-applied-migrations pattern and
      states the difference (this recipe uses dbmate + `db-migrate.yml` from `cybereco-hub` under
      `db/migrations/` instead of `supabase db push` under `supabase/migrations/`); does not
      duplicate its secrets/CLI section
### C2. `docs/recipes/adopt-existing-app.md` (brownfield playbook)
- [ ] The A/B/C track structure of this plan generalized: inventory template (incl. "decide first
      whether any data is worth migrating — a clean schema removes a whole class of work"),
      decision list (D1–D8, D10 as questions), parity-checklist template, Jest→Vitest codemod
      notes, cutover/retirement pattern for a backend that is replaced rather than kept
### C3. `scripts/init.mjs --into <existing-repo>` (optional) + init.mjs fixes
- [ ] init.mjs copies the `data-table.tsx` import closure (and `react-day-picker`), and offers
      `--data cybereco-supabase` to emit `.npmrc`, `src/lib/data/{client,adapter,schema-map}.ts`
      stubs, `db/migrations/` (dbmate; never the CLI's `supabase/migrations/`) with the
      `schema_migrations` hardening + `profiles` files, `supabase/config.toml` with migrations and
      seed disabled, and `db-migrate.yml`
- [ ] Layer-in mode that grafts the scaffold into an existing repo instead of refusing, reusing
      the `add-tauri.mjs` merge-into-existing-project style; test in `src/tests/`

---

## Track C' — Upstream to `cybereco-hub` (the data layer side of this migration)

Issues live in `cyber-eco/cybereco-hub` (the hub belongs to the `cyber-eco` org), milestone
`v0.6 - JustSplit consumer`, the hub's own labels and loop. H2 is **gated on the hub's gate C1** (`docs/ROADMAP-EPICS-STORIES-TASKS.md`:
Story 0.3, Hub deploy to Render, an owner action) and is not on JustSplit's critical path (spec D1
contingency).

### H1. Written consumer commitment: JustSplit (satisfies ADR-008 gate 1)
- [ ] Add JustSplit to `docs/adr/ADR-008-supabase-storage-adapter.md` as the committed consumer,
      linking this spec (`docs/superpowers/specs/2026-09-18-inceptor-migration-design.md` D1/D10)
      and the `SchemaMap` it needs (six tables, `extra` overflow, `member_ids text[]`,
      `array-contains` on arrays and jsonb, `metadata.strategy: 'server'`, relational
      `batch_write`); record the requested tiny type changes (`Expense.groupId` /
      `Settlement.groupId` optional, `memberIds` required, `ExpenseGroup.type` widened or
      documented as app-mapped, `AuthAdapter.signInWithProvider(provider, { redirectTo? })` so a
      static app can target its own origin's callback) as a follow-up issue, not a blocker
- [ ] Request that `docs/design/schema-map-strategy.md` state the overflow merge rule for
      `updateDocument`/`batchWrite` explicitly: an update whose patch has keys with no mapped
      column does `extra = extra || <overflow keys>`, never replaces the column
- [ ] Amend the hub's gate texts, not just ADR-008: the Epic 7 gate sentence
      (`docs/ROADMAP-EPICS-STORIES-TASKS.md`, "Gate de arranque") becomes "(1) Story 4.3, Story 6.1
      **or the JustSplit consumer commitment (spec D1/D10)**"; move "JustSplit migration" out of
      the Epic 9 freezer with the note "monorepo decision taken 2026-09-27: canonical source is
      `ArtemioPadilla/JustSplit` main; PR #1 nx-refactor is not an input"; tick Story 3.2 / Tasks
      3.2.1–3.2.3 as done, citing the three 🟢 Vigente design docs (the roadmap still shows the
      story as pending although the documents exist)
- [ ] Update `docs/ROADMAP-EPICS-STORIES-TASKS.md` (the consumer story) and `docs/OWNER-ACTIONS.md`
      (Story 0.3 now unblocks a named consumer)
### H2. Relational mode (`SchemaMap`) in `@cyber-eco/supabase` — gated on C1
- [ ] Implement `docs/design/schema-map-strategy.md` in `packages/supabase/src/SupabaseStorageAdapter.ts`
      (constructor option `schemaMap: SchemaMap` on `SupabaseStorageAdapterConfig` — the
      constructor keeps its `(getClient: () => SupabaseClient, config?)` shape; `SchemaMap` /
      `CollectionMapping` types exported from `@cyber-eco/types`; per-collection
      table/columns/`jsonbColumn`/`metadata`; `updateDocument` merges a patch's overflow keys into
      the jsonb column; `array-contains` on `text[]` and jsonb; `subscribeToQuery` per table
      re-running the query on any change; relational `batch_write` migration in
      `packages/supabase/db/migrations/` that accepts JustSplit's pre-translated op shape — row
      keys + an `extra` object, fixed `case` dispatch over the mapped tables — or JustSplit's
      function is replaced by the upstream migration in B22), keeping document mode as the
      default; contract tests per `docs/design/storage-adapter-contract.md` §5 against
      `supabase start`; ship a `.changeset/*.md` (`@cyber-eco/supabase: minor`; and
      `@cyber-eco/types: minor` if the `SchemaMap`/`CollectionMapping` types land there — `types`
      is in the changesets `fixed` group, so `firebase`/`auth`/`services` bump with it); publication
      of `0.3.0` to GitHub Packages happens on merge to `main` via `publish.yml`
      (`changesets/action`) — nothing is published without the changeset file
- [ ] Alternative path: upstream JustSplit's contingency `src/lib/data/relational-adapter.ts`
      (same contract suite already green) and reconcile naming with the design doc
- [ ] Acceptance: JustSplit bumps `@cyber-eco/{types,auth,supabase}` together in B22, `npm ci`
      resolves them from GitHub Packages with the classic PAT, `adapter.ts` switches to
      `new SupabaseStorageAdapter(() => client, { schemaMap })` and its contract + RLS suites stay
      green
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

- No migration: no new table, column, index, policy, trigger or server-side code; every new field
  is a JustSplit-only top-level field with no mapped column (an overflow key the SchemaMap stores
  in the `extra` jsonb column of an existing table — the app never spells `extra`) or a write to a
  column that exists since B2 (`expenses.group_id`, `settlements.group_id`, `events.kind`). Every
  PR keeps the B2b coverage guard ("no policy or constraint inspects `extra`") and the per-table
  Track D RLS cases green.
- Stored strings are never Zod enums (`parseKind`/`normalizeCategory` fall back); read schemas stay
  `.passthrough()`; writes are partial `updateDocument` (whose overflow keys merge into `extra`) or
  one `batchWrite`; the write-input overflow key-set test allows exactly the declared spec D9 keys.
- Issue ids below are `D<n>`; when a spec decision appears in the same sentence they are written
  "issue D<n>" (the spec's decisions are "spec D<n>"), and `create-issues.sh --track d` titles them
  `Track D — D<n>: …`.
- Group scoping is the indexed `groupId == id` query; no client-side union, no `expenseIds` array.
- Every new widget appears in `/showcase`; every reminder/budget surface passes the
  `.claude/checklists/ethics` list (informational, dismissible, no push); staging smoke stays on
  the dedicated test account — couple/trip demo data comes from `supabase/seed.sql`.

**"Conceptos" reading (fixed here and in spec D9, not reopened per issue):** the Spanish accounting
sense — a named, reusable line item (rubro) between the category and the free-text description
(*Renta* under `rent`), stored as `expense_groups.concepts[]` + `expenses.conceptId` (overflow
keys; issue D9, with the label-only step in issue D4). The product-feature reading (budgets,
recurring expenses, period close) is scoped to one optional `settings.budget` (issue D10) and a
client-computed due list (issue D11); no period-close entity is built.

Increments: **1** (D1–D8: kinds, categories, couple + trip, group-scoped settlements, dashboard),
**2** (D9: conceptos), **3** (D10: budgets), **4** (D11: recurring due list), then D12 (docs).
D0 exists only if a migration ever adds a policy or `check` constraint that inspects `extra`.

### D0. (conditional) Migration: allow the spec D9 keys in `extra` (`risk:high`)
- [ ] Only if ADR 0002 (or a later migration) records a policy or `check` constraint that
      enumerates `extra` keys: add the spec D9 overflow keys (`expense_groups` →
      `kind`/`settings`/`concepts`, `events` → `settings`, `expenses` → `conceptId`/`settledAt`)
      additively, with B2b RLS cases, applied by `db-migrate.yml` before D3 is deployed; gating
      columns untouched
- [ ] Acceptance: the B2b per-table spec-D9 cases green; `git diff db/migrations` touches
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
      `settings`/`concepts` with `.catch()` fallbacks so a malformed map degrades to
      defaults instead of rejecting the row; `kind`/`category` stay `z.string()` (`splitType` is
      the universal enum)
- [ ] Delete the B3 `.omit()` on the write-input schemas; rewrite the overflow key-set test to the
      spec D9 allowlist per collection — no other unmapped key may reach `extra`
- [ ] `src/lib/use-locale.ts`: `useLocale()` on `useClientPreference` (`navigator.language`
      starting with `es` → `es`, else `en`; server default `en`) + `t(labels, locale)`
- [ ] `scripts/create-issues.sh --track d`: label `phase-4`, milestone `v0.7 - Relationship
      kinds`, issues D2–D12 titled `Track D — D<n>: …` so GitHub titles never collide with the
      spec's decision ids (idempotent, dry-run by default, skips issues that already exist; D1
      itself and the conditional D0 are filed by hand)
- [ ] ADR `docs/decisions/0010-relationship-kinds-and-conceptos.md`: trip = Event; kinds are
      presentation, not ownership or rules; conceptos inline in the group doc; fixed taxonomy (no
      custom categories); recurring = client-computed due list, never auto-created; no period
      close; visibility is per `member_ids` (every group member sees every group expense; a
      member added later does not see older rows until an admin re-shares them — spec D9), and a
      couple's 2-member rule is form-enforced only; conceptos are last-writer-wins (no conditional
      write in `StorageAdapter`) with the `group_concepts` table as the recorded append-safe
      alternative; no client backfill; rejected alternatives
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
      `settings.defaultSplitType`/`defaultShares` until this merges

### D3. Create flow: kind picker, trip routing, legacy nudge
- [ ] `GroupFormIsland` step 1 = `KindPicker` (`ui/radio-group` cards Pareja, Casa / roomies,
      Amigos, Viaje, Proyecto, Otro; one-line pitch each, es/en); **Viaje navigates to
      `/events/new?kind=trip`** (+ `&group=<id>` when opened from a group page) and never creates
      a group; step 2 = name + members (registered users, B13) + currency + kind extras (couple:
      single-friend combobox, exactly 2 members enforced by the form; project: "¿cómo se reparten
      los costos?" shares editor writing `settings.defaultShares` — D2 is merged first)
- [ ] Writes `type` (= `KINDS[kind].universalType`) + `kind` + `settings`
      (`defaultSplitType` from `KINDS`, `defaultCurrency` = creator's `$preferredCurrency`)
      through the D1 write-input schema
- [ ] Group list and detail: kind badge + icon; pre-Track-D groups (no `kind`) render as
      `friends` and show a dismissible "¿Qué tipo de grupo es?" callout that writes `kind`
      with one `updateDocument` (dismissal in `localStorage`, try/catch); the dashboard "+ Nuevo"
      button and the empty state open step 1
- [ ] `/showcase`: `KindPicker`
- [ ] Tests: Viaje creates no group; couple limits members to 2; legacy group renders as friends;
      `kind` written verbatim from the table; unknown stored kind renders as `other`
- [ ] Acceptance: against `supabase start`, one group per kind; each row = the universal columns +
      the `kind`/`settings` overflow keys only; the RLS suite green

### D4. Expense form: container defaults, `CategorySelect`, "Concepto" labels, `groupId` + `memberIds`
- [ ] `ExpenseFormIsland` reads `?group=`/`?event=` (plumbing added in B10): participants :=
      container members (or `defaultParticipants`), currency := `settings.defaultCurrency` /
      `event.preferredCurrency`, split := `settings.defaultSplitType` (+ `defaultShares`
      when every uid is still a member, else equal + warning), category options :=
      `categoriesForKind(kind)`; couple context: two-avatar `paidBy` toggle, participants hidden
      (both), split collapsed under "Personalizar"
- [ ] `CategorySelect` widget: kind subset first, "Más categorías" fold, icon + localized label via
      `src/components/features/expenses/CategoryIcon.tsx` (static lucide import map); last-used
      category per group in `localStorage` (try/catch); shown on create and edit
- [ ] Field labels through `useLocale()`: es → Categoría / Concepto / Importe / Pagó /
      Participantes / Reparto / Notas; en unchanged
- [ ] Group context writes `groupId` + `memberIds` = the group's members (as B10 already does) and
      `conceptId` when a concepto is picked; the group's `totalExpenses` cache is updated in
      the same `batchWrite` (B12); a rejected batch surfaces a toast and writes nothing; event
      context keeps writing `eventId`. RLS note (unchanged by Track D): insert requires the
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
- [ ] Acceptance: the D3 seed groups render the right hero; no file under `db/migrations/`
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
      whose `eventId` is one of the group's events (`useGroupEvents`), deduplicated by id;
      precedence documented and tested: only `settledAt == null` expenses enter any scope,
      so an expense settled from the event scope never re-enters the group scope (and vice versa)
      — no double counting
- [ ] Settle-up from a group scope writes `settlement.groupId` in the same `batchWrite` that sets
      `settledAt` on `expenseIds` (B14); history tab filters by group or event
- [ ] Couple groups: the pending tab collapses to one transfer for the net balance (D2's
      share-aware `groupBalances`); other kinds keep the minimal-transactions table
- [ ] Period presets on the same island, no new entity: "Cerrar mes" (couple/household: date range
      = current month) and "Liquidar viaje" (`?event=`) are pre-filled filters; a period is
      closed when its expenses are settled
- [ ] Tests: scope union + dedupe; settled exclusion across scopes; `groupId` written; couple
      single transfer equals the net balance; `?group=` with a group the viewer is not in shows
      nothing (RLS returns no rows; the island renders the empty state, not an error)
- [ ] Acceptance: against `supabase start`, settle a couple group → one settlement row with
      `groupId`, expenses carry `settledAt`, re-opening the trip scope shows nothing to settle

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

### D9. Conceptos: group-owned templates and `expenses.conceptId`
- [ ] Ajustes → "Conceptos": list / add / edit / archive rows (`name`, `category`,
      `defaultAmount?`, `currency?`, split override); `repos.groups.setConcepts` is a partial
      `updateDocument` of `concepts` (an overflow key merged into `extra`), caps at 50, ids
      generated client-side; per-kind presets (D1 table) offered as pre-checked rows in D3's
      step 2 — the user can uncheck them. **Last-writer-wins, accepted**: a re-read-and-retry on
      `updatedAt` narrows but cannot close the lost-update window (no conditional write in
      `StorageAdapter`; `batch_write` `update` is unconditional), so no retry is built and the
      Settings tab states that conceptos are edited by one admin at a time; ADR 0010 records
      "last-writer-wins accepted vs `group_concepts` table (append-safe) as the recorded
      alternative" — one row per concepto, RLS via `exists (select 1 from expense_groups g where
      g.id = group_id and (select auth.uid())::text = any(g.member_ids))`, shipped as a
      `risk:high` migration issue if concurrent edits prove to matter
- [ ] `ConceptCombobox` built on `ui/combobox` (Inceptor's API is `items: string[]` + value with
      built-in filtering; it is **not** creatable, so the widget appends a trailing "Guardar
      «texto» como concepto" item when the typed text matches nothing) above the description when
      a group context is set: pick → fills description, category, amount, currency, split
      override and writes `conceptId`; the trailing item appends the new concepto via
      `setConcepts`;
      an archived/deleted concepto leaves its expenses untouched (dangling id ignored)
- [ ] Group Gastos tab: "Por concepto" breakdown aggregated by `conceptId`, never by string
- [ ] `/showcase`: `ConceptCombobox`
- [ ] Tests: a single writer's add/edit/archive round-trips through the memory adapter and leaves
      every other overflow key intact; the cap; combobox fill; dangling id; trips never show the
      combobox
- [ ] Acceptance: against `supabase start`, one member adds conceptos and every other member sees
      them; the expense carries `conceptId`; the group row = universal columns + the spec D9
      overflow keys only

### D10. Budgets: `settings.budget` on groups and events, `BudgetBar`
- [ ] Ajustes (group) and the event form: optional `settings.budget` `{ amount, currency, period }` (group:
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
      `settings.budget`

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
A1 (done, 6a32c4d) → [Firebase workflows deleted in the docs PR #2, 0ba4348] → A2 → A3a → A3b (ci.yml + db-migrate.yml) → A4 (owner actions: secrets, GH_PACKAGES_TOKEN, SETUP.md) → A5 → A6
                                          (serial, one PR each, ~1 week; A1–A3a by the main session; zero workflows run on main between #2 and A3b)
B1 → B2a → B2 → B2b → B3 → B4 → B5a → B5b → B6 → B7   (foundation, serial; B2 migrations applied to the justsplit project via `--ref inceptor` before B2b; B2b RLS suite green before B3)
  B2c after B1 (parallel with B2a/B2/B2b)
  B5a: if relational mode (H2) is not published when B5a starts → ship the contingency adapter behind StorageAdapter (spec D1); never document mode
B16 after B5b (needs $preferredCurrency/$rateCache from B5b, domain/currency from B3, combobox/editable/progress-bar from the B1 manifest); may run alongside B6/B7
B17a after B7 (shared ExportCsvButton + /showcase entry; B8b/B9/B11b mount it)
B8a..B15, B17b parallelizable after B7 and B16
  (B8b after B8a; B10 after B9; B11b after B11a; B12 after B9+B11b; B14 after B9+B11b;
   B15 after B16; B13 after B5a (its policies shipped in B2); B8b/B9/B11b after B17a)
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
- Schema and RLS match ADR 0002: every table in `public` has RLS, every table in `SchemaMap` has
  a policy per command + a `guard_<table>` trigger + Realtime publication (coverage guard),
  `public.documents` does not exist, the B2b suite (incl. storage policies, functions,
  `batch_write` atomicity and the spec-D9 per-table cases) green in CI against `supabase start`,
  and `npm run db:audit` shows no diff between `supabase start` and the `justsplit` project; all
  migrations applied by `db-migrate.yml`
- Repos import only the `StorageAdapter` interface; the contract suite is green against the memory
  adapter and the real one; no `DataLayerService` and no `createDataLayer(` call in `src/` (the
  doctrine's `permissions: { enabled: false }` is met structurally — there is nothing to set);
  every repo collection string is a `SchemaMap` key and `adapter.ts` passes `schemaMap`
- B3's forward-compat items are in: optional opaque spec-D9 top-level fields (overflow keys),
  `.passthrough()` reads, the overflow key-set test and the synthetic fixtures (these are migration
  work; the features are not)
- Firebase retired: project `justsplit-eef51` deleted after the 14-day window (B20/B21) — or, under
  B20's end state (b), Auth, Firestore and functions deleted and Hosting serving only the static
  we-moved page; no Firebase workflow, config file or dependency left in the repo; `deploy.yml` is
  the only workflow that deploys Pages on push to `main` (`ci.yml` and `db-migrate.yml` also run
  on push to `main` by design)
- Inceptor `main` contains C1 and C2; `cybereco-hub` has H1 merged (H2/H3 follow the hub's gate C1
  and are not part of this definition of done)
- **Track D (D0–D12) is explicitly not part of this definition of done**: it is the first
  post-cutover feature epic, owns milestone `v0.7 - Relationship kinds`, and closes when D12 merges
