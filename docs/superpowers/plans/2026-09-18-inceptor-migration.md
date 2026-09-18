# JustSplit → Inceptor migration — Implementation plan

> **For agentic workers:** this plan is executed issue by issue with the Inceptor loop —
> `prometeo` (decompose) → `forja` (implement, atomic commits) → `centinela` (validate) → PR.
> Every task below is one GitHub issue. Steps use `- [ ]` for tracking.
> Track A issues A1–A3a are executed by the main Claude Code session directly — the sub-agents
> only exist after A2 merges and centinela's gate is only runnable once lint/tests/build are
> green; the prometeo → forja → centinela loop starts with A3b.

**Goal:** Move JustSplit onto the Inceptor scaffold and workflow so that Inceptor is the only
base we maintain, with zero loss of user-facing functionality and no change to the Firebase
document shapes; security rules change only through the dedicated, emulator-tested issues below.

**Spec:** `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md` (decisions D1–D8).

**Tracks:** A (workflow adoption, ships first, to `main`) → B (stack migration, on the `inceptor`
integration branch, cutover PR at the end) → C (upstream reusable pieces to Inceptor).

## Global constraints

- **Firebase stays** (Auth, Firestore, Hosting). **Storage is new** (today images are base64
  data URLs stored inside Firestore docs: `expenses.images[]`, `users.avatarUrl`); adopting it is
  recorded in an ADR in B5b, whose alternative is keeping base64 (zero backend change, 1 MiB doc cap).
- **`firestore.rules`**: the deployed ruleset is captured in the repo in B2b; rules are changed
  only by B2b (and the `friendships`/`groups` block it schedules), additively, through dedicated
  `risk:high` issues with `@firebase/rules-unit-testing` tests, deployed before any Track B PR is
  previewed; `deploy.yml` deploys rules explicitly. `firestore.indexes.json` is unchanged unless
  B2b adds an index.
- **Inceptor rules apply from Track B onward**: no React Context across islands, no whole-app
  island, no `@radix-ui/*`, no `framer-motion`, no `@astrojs/tailwind`, no `@tremor/react`,
  no `@mui/*` (`.claude/checklists/forbidden-imports.json` is enforced by `centinela`).
- **Branch naming**: `phase-N/issue-NNN-slug`. Track A PRs target `main`; Track B PRs target
  `inceptor`; Track C PRs live in the `inceptor` repo.
- **Commits**: Conventional Commits + issue ref.
- **Every PR**: `npm run check` green (the umbrella script; Track A adds the gate, B1 swaps its
  body for the Astro one so `ship.sh`/`centinela` never change).
- **No secrets in the repo**; Firebase config comes from `PUBLIC_FIREBASE_*` env vars
  (build-time, browser-safe by Firebase's design) already present as GitHub secrets under the
  `NEXT_PUBLIC_*` names until B20.
- **Never set `ASTRO_BASE`** (site is served at `/`).

## Milestones and labels

| Milestone | Track | Issues |
|---|---|---|
| `v0.2 - Inceptor workflow` | A | A1, A2, A3a, A3b, A4, A5, A6 |
| `v0.3 - Foundation on Astro` | B, phase 1 | B1, B2, B2b, B3, B4, B5a, B5b, B6, B7 |
| `v0.4 - Feature islands` | B, phase 2 | B8a, B8b, B9–B16, B17a, B17b |
| `v0.5 - Cutover` | B, phase 3 | B18–B22 |
| `v0.6 - Upstream to Inceptor` | C (lives in the `inceptor` repo) | C1–C3 |

Track A issues carry `phase-0`. Labels created by A5 (17): `phase-0..phase-3`,
`type:chore|feat|docs`, `track:workflow`, `track:stack`, `risk:high` (B2b, B4, B5a, B5b, B13,
B16, B20), `ai-approved` (claude.yml gate), `bug`, `enhancement`, `question` (issue-template
defaults), `tdd-tier:strict`, `tdd-tier:smoke`, `tdd-tier:exempt` (centinela §3.1 reads these;
story.yml only offers them as a dropdown, a maintainer/prometeo applies the label). Issue count:
34 in this repo (7 Track A + 27 Track B) + 4 milestones; 3 issues + 1 milestone in `inceptor`.

ADR numbering (`docs/decisions/`): `0001-adopt-inceptor-workflow` (A2), `0002-canonical-fields`
(B2b), `0003-firebase-auth-islands` (B4), `0004-nano-stores-firestore-listeners` (B5a),
`0005-image-storage` (B5b), `0006-registered-participants` (B13), `0007-exchange-rate-provider`
(B16), `0008-toast-topology-and-recovery` (B17b), `0009-cutover-and-rollback` (B20).

---

## Track A — Adopt the Inceptor workflow (no app code changes)

### A1. Repo hygiene
- [ ] Delete: `git-diff.txt`, `report.txt`, `tree.txt`, the `'` directory, `reports/`,
      `src/utils/debug-firebase.js`, `src/pages/_app.tsx`, `src/app/events/new/page-fixed.tsx`,
      `src/app/**/page.tsx.{new,bak}`, `src/app/components/EventList.tsx`,
      `src/app/landing.module.css`, `src/components/ui/ProgressBar.tsx` (keep
      `ProgressBar/index.tsx`), `src/components/Button/`, `src/utils/testUtils.tsx` +
      `src/test-utils/withAppContext.tsx` (keep `src/test-utils.tsx`, imported by 10 tests),
      `src/docs/`, `apphosting*.yaml` (after the B20 backend check has been run once — see B20's
      first bullet; if a backend is connected, delete the files only after disconnecting it)
- [ ] Add `.nvmrc` (`22`), `.editorconfig`, `.prettierignore` from Inceptor; add `.prettierrc.json`
      WITHOUT the `plugins` entry and the `*.astro` override (re-added in B1 with
      `prettier-plugin-astro`); `npm i -D prettier@^3` + `"format": "prettier --write ."`
- [ ] `git rm --cached reports/test-report.html` and add `reports/` to `.gitignore` (`.firebase/`
      is already ignored); keep `.firebaserc` tracked (non-secret; `npm run deploy` and
      `deploy:rules` rely on it) and remove its line from `.gitignore`
- [ ] Acceptance: `git ls-files | grep -E '\.(txt|new|bak)$|^reports/|^src/pages/|page-fixed'` is
      empty && `npx tsc --noEmit` passes (`tsconfig` includes every `*.tsx`, so the shadow files
      must go before A3)

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
- [ ] Fix or `test.skip` (with `TODO(track-b)` + issue ref) the 5 failing suites so
      `npx jest --ci` exits 0; list them in the PR body
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
- [ ] Node 22 everywhere; SHA-pin `actions/checkout`, `actions/setup-node`,
      `FirebaseExtended/action-hosting-deploy`
- [ ] Acceptance: CI green on the PR; a deliberate type error in a throwaway commit turns it red

### A4. One deploy workflow
- [ ] Merge into `deploy.yml`: `on: push: branches: [main]` + `workflow_dispatch`;
      `concurrency: { group: firebase-live, cancel-in-progress: false }`; single job that runs
      `npm ci` + `npm run check` (the same gate as ci.yml — GitHub cannot `needs:` a job in another
      workflow), then `FirebaseExtended/action-hosting-deploy@<sha>` with `channelId: live`,
      `projectId: justsplit-eef51`, `firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JUSTSPLIT_EEF51 }}`,
      `env: NEXT_PUBLIC_FIREBASE_* = ${{ secrets.NEXT_PUBLIC_FIREBASE_* }}` and
      `FIREBASE_CLI_EXPERIMENTS: webframeworks` (removed in B20)
- [ ] Pick one service-account secret (`FIREBASE_SERVICE_ACCOUNT_JUSTSPLIT_EEF51`, the
      CLI-generated one); hardcode `projectId: justsplit-eef51`; add the `NEXT_PUBLIC_FIREBASE_*`
      env block to **both** `deploy.yml` and `firebase-hosting-pull-request.yml` build steps
      (previews currently build without config)
- [ ] Delete `firebase-deploy.yml` and `firebase-hosting-merge.yml`; after the first green
      `deploy.yml` run, delete the now-unused `FIREBASE_SERVICE_ACCOUNT` secret
- [ ] Keep `firebase-hosting-pull-request.yml` (previews), SHA-pinned, `if:` same-repo guard kept
- [ ] Acceptance: exactly one deploy run per push to `main`; the preview build step has all seven
      `NEXT_PUBLIC_FIREBASE_*` vars

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
      creates C1–C3 + milestone `v0.6 - Upstream to Inceptor` there
- [ ] Add repo secret `ANTHROPIC_API_KEY` (needed by claude.yml) — documented, not scripted
- [ ] Acceptance: `bash scripts/create-issues.sh --apply` → 34 issues + 4 milestones + 17 labels
      here; `--repo ArtemioPadilla/inceptor --apply` → 3 issues + 1 milestone there;
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
      `firebase`, `date-fns`, `uuid`; drop `next`, `@mui/*`, `@emotion/*`, `framer-motion`,
      `chart.js`, `react-chartjs-2`, `react-intersection-observer`, `jest*`,
      `@testing-library/jest-dom` (Vitest equivalent added), `eslint-config-next`
- [ ] Graft — copy from the generated tree ONLY: `src/` (includes `site-meta.ts`, `llms.txt.ts`,
      `env.d.ts`), `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`,
      `.env.example`, `docs/decisions/TEMPLATE.md` (if A2 did not already add it). Do **not** copy
      the generated `.github/` (its `deploy.yml` is a GitHub Pages workflow with
      `ASTRO_BASE=/justsplit`, which would collide with Track A's Firebase `deploy.yml` and break
      every asset/`withBase()` link; its `ci.yml` carries `server-node`/`server-flask` jobs that
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
      with `site: SITE_ORIGIN` from `site.config.mjs` = `https://justsplit-eef51.web.app`,
      `trailingSlash: 'never'`, and PWA/sitemap integrations retained
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
      `framer-motion` ban, add `@mui/` (reason "replaced by Base UI/shadcn in B10"); restore
      centinela's `framer-motion` grep line and whole-tree scan (the copied
      `src/tests/forbidden-imports.test.ts` reads the JSON); `dependabot.yml`: add Inceptor's npm
      block
- [ ] Test: `import.meta.env.BASE_URL === "/"` and only one workflow triggers on push to `main`
- [ ] Acceptance: `npm run check` green with the scaffold's landing page; Firebase PR preview
      serves it; `scaffold-manifest.test.ts` green

### B2. Firebase client + env + hosting config
- [ ] `src/lib/firebase/client.ts`: guarded modular init following the `supabaseEnabled` snippet
      in Inceptor `docs/recipes/auth-supabase.md` §2 (`enabled` flag + null-safe exports:
      `firebaseEnabled = every PUBLIC_FIREBASE_* present`; `auth`/`db` are `null` when disabled;
      islands render an `Alert` instead of crashing). Exposes `auth`, `db` only (`storage` is
      created in B5b's `storage.ts`). Drop `MEASUREMENT_ID` from `.env.example` (unused today, no
      `getAnalytics`); analytics, if ever wanted, goes through Inceptor's `src/lib/analytics.ts` flag
- [ ] `client.ts`: Firestore is created with `initializeFirestore(app, { localCache:
      persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })` (replaces the
      deprecated `enableIndexedDbPersistence` used in `src/firebase/config.ts`; multi-tab safe).
      Auth uses `browserLocalPersistence`. Persistence is skipped (memory cache) when
      `localStorage.firebase_db_error` is set (port of `config.ts:66-96`)
- [ ] `client.ts` sets `authDomain: location.hostname` when the hostname is one of the project's
      Hosting domains (allowlist), else `PUBLIC_FIREBASE_AUTH_DOMAIN`; `.env.example` comment:
      `PUBLIC_FIREBASE_AUTH_DOMAIN` should be the serving hostname, not `*.firebaseapp.com`
- [ ] `client.ts`: when `import.meta.env.DEV && import.meta.env.PUBLIC_FIREBASE_USE_EMULATORS ===
      "true"` call `connectAuthEmulator(auth, "http://localhost:9099")` and
      `connectFirestoreEmulator(db, "localhost", 8080)` before any read (port of
      `config.ts:52-61`); keep the `firebase.json` emulators block; add `npm run emulators`
      (`firebase emulators:start --import ./.emulator-data --export-on-exit`); document in SETUP
- [ ] `.env.example` with `PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,STORAGE_BUCKET,
      MESSAGING_SENDER_ID,APP_ID}` + `PUBLIC_FIREBASE_USE_EMULATORS`
- [ ] `deploy.yml` and `firebase-hosting-pull-request.yml` pass `PUBLIC_FIREBASE_{API_KEY,
      AUTH_DOMAIN,PROJECT_ID,STORAGE_BUCKET,MESSAGING_SENDER_ID,APP_ID}: ${{ secrets.NEXT_PUBLIC_FIREBASE_* }}`
      at build time (keep the same-repo `if:` guard and SHA pins from A4); `ci.yml` builds
      **without** them on purpose (exercises the guarded `firebaseEnabled === false` path);
      remove `FIREBASE_CLI_EXPERIMENTS: webframeworks`; add a Vitest test that each deploying
      workflow's build step has all six and that `ci.yml` has none
- [ ] New `deploy-staging.yml`: `on: push: branches: [inceptor]` → build with the same env →
      `action-hosting-deploy` with `channelId: staging`, `expires: 30d`; the resulting
      `https://justsplit-eef51--staging-*.web.app` URL is the B18/B19 target
- [ ] `firebase.json`: drop `frameworksBackend` and `frameworks`; hosting block:
  ```json
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "trailingSlash": false,
    "redirects": [
      { "source": "/expenses", "destination": "/expenses/list", "type": 301 },
      { "source": "/events",   "destination": "/events/list",   "type": 301 },
      { "source": "/groups",   "destination": "/groups/list",   "type": 301 }
    ],
    "rewrites": [
      { "source": "/expenses/edit/**", "destination": "/expenses/edit/index.html" },
      { "source": "/expenses/**",      "destination": "/expenses/view/index.html" },
      { "source": "/events/edit/**",   "destination": "/events/edit/index.html" },
      { "source": "/events/**",        "destination": "/events/view/index.html" },
      { "source": "/groups/**",        "destination": "/groups/view/index.html" },
      { "source": "/friends/**",       "destination": "/friends/view/index.html" }
    ]
  }
  ```
  (Hosting serves exact static files, incl. `dir/index.html`, before rewrites, so
  `/expenses/list|new|view|edit` are unaffected; `edit/**` must precede `**` because Hosting
  applies the first matching rule; redirects are applied before rewrites so the `/expenses/**`
  rewrite is unaffected. No `cleanUrls`. Keep Astro's default `build.format: 'directory'`; Astro
  `trailingSlash: 'never'` so dev matches production — verify the dev server serves
  `/expenses/list` under that combination, fall back to `'ignore'` if not.)
- [ ] Test: `src/tests/firebase-rewrites.test.ts` asserts: each dynamic family has a rewrite;
      every `edit/**` rule precedes its family's `**` rule; every destination exists in `dist/`
      after build; `trailingSlash === false`; the three redirects exist; no `src/pages/__/**`
      route (namespace reserved by Hosting for `/__/auth/handler`)
- [ ] Acceptance: preview channel loads with Firebase enabled; `ci.yml`'s `firebaseEnabled`
      false build still passes; `npm run emulators` boots

### B2b. Firestore reality check — reconcile rules and live data shapes (`risk:high`, blocks B3/B5a)
- [ ] Capture the **deployed** ruleset (Firebase Console → Firestore → Rules, or the Rules REST
      API) and commit it as `firestore.rules` at repo root; diff it against
      `src/firebase/firestore.rules` (last changed 2025-05-18 when the `groups` block was added;
      only manual `npm run deploy` / `deploy:rules` could have pushed it — no workflow deploys
      rules). If they differ, the deployed version is the baseline. (The committed file cannot
      deploy: `groups` uses `request.data`, which is not a rules variable.)
- [ ] Export 5 real docs per collection (`gcloud firestore export` / `firebase firestore:export`,
      or a read-only script run by the owner) into `src/tests/fixtures/firestore/*.json`,
      redacted, including at least one data-URL image. These fixtures, not `src/types/index.ts`,
      are the source of truth for B3 schemas
- [ ] Run the five listener queries from `AppContext.tsx:497-532` against the deployed rules in
      the emulator (`@firebase/rules-unit-testing`) and record which are denied. Known mismatches
      in the repo rules: expenses (`paidBy ==` queried vs `participants` rule), settlements
      (`involvedUsers` queried vs `fromUser/toUser` rule; nothing ever writes `involvedUsers`),
      groups (`request.data` is not a valid `Request` property → compile error or runtime deny),
      events (`participants` queried and required by the rule, but documents are written with
      `members`), friendships (no rule block at all → every read/write denied)
- [ ] Decide and record in ADR `docs/decisions/0002-canonical-fields.md`, per collection: fix the
      query to match the rule or fix the rule. Expenses → `where('participants','array-contains',uid)`;
      settlements → `or(where('fromUser','==',uid), where('toUser','==',uid))` **or**
      `involvedUsers: [fromUser,toUser]` on write; events → rule changed to
      `resource.data.members` / `request.resource.data.members` **or** the app writes both
      `members` and `participants`; groups → `resource.data.members` (read/update/delete) and
      `request.resource.data.members` (create); friendships → the rules block specified in B13
- [ ] Add `@firebase/rules-unit-testing` tests under `src/tests/rules/` for every collection; CI
      runs them against the emulator
- [ ] Any rules change ships as its own `risk:high` PR with emulator tests and a
      `firebase deploy --only firestore:rules` step in `deploy.yml`; deployed before any Track B
      island PR is previewed
- [ ] Acceptance: `firestore.rules` at repo root compiles and deploys; rules tests green; the ADR
      lists the canonical query per collection

### B3. Zod schemas + domain layer
- [ ] `src/schemas/{user,friendship,group,expense,event,settlement}.ts` validated against the
      B2b fixtures, not `src/types/index.ts` (rules depend on `participants`, `paidBy`,
      `fromUser`/`toUser`, `members`); Timestamp fields (`createdAt`, `updatedAt`,
      `settlements.date`, friendship timestamps) are `z.union([z.instanceof(Timestamp),
      z.string()]).transform(toISO)` on read (existing data holds Timestamps; the TS types lie);
      the schema test includes a data-URL image fixture; `z.infer` types replace `src/types`
- [ ] Move pure logic to `src/domain/`: `expenseCalculator`, `formatters`, `csvExport`,
      `fileUtils`, `timeline/*`; split `currencyExchange` into `domain/currency.ts` (pure:
      `SUPPORTED_CURRENCIES`, `FALLBACK_RATES`, `getExchangeRate` with fetch + cache injected)
      and `lib/use-exchange-rate.ts` (hook). Consolidate on one `formatCurrency` (the
      symbol-based one used by 6 pages + `HoverCard` + `BalanceOverview`); `FinancialSummary`
      (the only Intl consumer) and its test switch to it
- [ ] Port the 4 `src/utils/__tests__` suites + `src/__tests__/timelineCalculations.test.tsx` to
      Vitest via the D7 codemod (`vi.hoisted()` for `jest.mock` factories with outer refs,
      `global.fetch = vi.fn()`); add tests for `formatters` and `fileUtils`
- [ ] Copy Inceptor's `scripts/check-ts-pragmas.mjs` + `check:pragmas` script (in the B1 `check`
      umbrella) so missing `// @vitest-environment jsdom` pragmas fail `npm run check`
- [ ] Test: schema round-trip against the B2b fixtures
- [ ] Acceptance: `npm run test` ≥ 7 ported/new suites green

### B4. Auth store + RouteGuard adapter (`risk:high`)
- [ ] `src/stores/auth.ts`: `$user`, `$authReady`, `$profile` (Firestore `users/{uid}` doc),
      `onMount` → `onAuthStateChanged`, teardown on unmount; `signIn/signUp/signInWithGoogle/
      signOut/resetPassword/updateProfile` as actions; `signInWithRedirect` fallback in
      standalone display-mode; `getRedirectResult(auth)` handled in `onMount`
- [ ] Profile bootstrap: on auth change `getDoc(users/{uid})` → `setDoc` when missing (provider
      name/email/photo, `preferredCurrency: 'USD'`) before `$authReady` flips; `updateProfile`
      mirrors `name`/`avatarUrl` into Auth `displayName`/`photoURL`. Test: a first Google
      sign-in creates `users/{uid}`
- [ ] `toGuardUser(firebaseUser, profile)` returns `{ id: firebaseUser.uid, roles: ['user'],
      flags: {} }` whenever `firebaseUser` is non-null — roles come from the Auth session, never
      from the user-writable `users/{uid}` document; `profile` only feeds display data (name,
      avatar, preferredCurrency). If capability flags are ever needed they come from custom
      claims (`getIdTokenResult().claims`), not the profile. Test: a user with no profile doc
      still passes `<RouteGuard allow={['user']}>`; a profile doc containing `roles: ['admin']`
      or `flags: { admin: true }` grants nothing
- [ ] `src/components/islands/AuthGate.tsx` — a readiness/navigation wrapper only; every
      allow/deny decision stays in `RouteGuard` (CLAUDE.md: `route-guard.tsx` is the only gating
      module): renders `Skeleton` while `!$authReady`; when `$authReady && !$user` runs
      `location.replace(withBase('/landing/'))` (parity with `ProtectedRoute.tsx`; PUBLIC_PATHS
      `/landing`, `/auth/*`, `/about`, `/help` stay public); otherwise `<RouteGuard
      user={toGuardUser($user, $profile)} allow={['user']} fallback={<SignInPrompt/>}>{children}</RouteGuard>`.
      Every route island's inner component is wrapped `ErrorBoundary > AuthGate > Content`
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
      `docs/recipes/auth-supabase.md` §4). Mount both as `client:only="react"` with a fallback
      slot on `auth/signin.astro` / `auth/signup.astro` (start from `src/pages/login.astro`,
      swapping its `client:visible`). No Facebook/Twitter buttons
- [ ] `/auth/reset-password.astro` + `ResetPasswordIsland` (`sendPasswordResetEmail`; today's
      link from signin is dead)
- [ ] ADR `docs/decisions/0003-firebase-auth-islands.md` with the Stakeholder Analysis section
      (centinela §5.1 requires it for `/auth` routes)
- [ ] Tests: (1) store lifecycle (subscribe/unsubscribe); (2) `hasFlag` absent-field denies;
      (3) AuthGate renders Skeleton while not ready and does not redirect; (4) redirects to
      `/landing` once ready with no user; (5) RouteGuard denies an unknown role even when
      `$user` is set; port `src/app/client-layout-wrapper.test.tsx` (guard/redirect behaviour)
- [ ] Acceptance: `/auth/signin` (email+password and Google) works against the **emulators**.
      On a preview channel, Google sign-in depends on the CLI having added the preview hostname
      to Auth → Authorized domains (it normally does, but this has regressed before:
      firebase-tools#6828, action-hosting-deploy#347); if it fails with
      `auth/unauthorized-domain`, add the domain manually — document in
      `docs/runbooks/previews.md`. `/` redirects to `/landing` when logged out

### B5a. Firestore stores + repo + listener-leak test (`risk:high`)
- [ ] `src/stores/firestore.ts`: one store per collection bound in `onMount` with
      `createDisposer()`. Queries: users → whole collection (needed for names/friend search;
      revisit after cutover); expenses → `where('participants','array-contains',uid)` (today's
      `paidBy ==` filter hides expenses you owe on and is not even provable under the committed
      rules; B10's form must always include `paidBy` in `participants` so the payer sees their
      own expenses); events/groups/settlements/friendships per the B2b ADR (the `AppContext`
      ones are NOT provably allowed by the rules). Reference: `AppContext.tsx` lines 482–556
      (incl. the logged-out clear branch and cleanup). Pattern per store:
      `onMount($expenses, () => { let off: Unsubscribe | null = null; const stop = $user.listen((u) => { off?.(); off = null; if (!u) { $expenses.set([]); return; } off = onSnapshot(query(collection(db,'expenses'), where('participants','array-contains',u.uid)), snap => $expenses.set(...)); }); return () => { stop(); off?.(); }; })`
      — bind inside a `$user.listen`, unsubscribe + clear on sign-out; a Vitest fakes `$user`
      transitions null→A→B→null and asserts exactly one live listener at any time
- [ ] `src/lib/firebase/repo.ts`: `create/update/remove` per collection, Zod-validated input.
      **Keep the exact write types the Next app uses** so the cutover is rollback-safe (D5):
      `serverTimestamp()` for `createdAt`/`updatedAt` on expenses/events/groups/users and for
      `settlements.date`; friendships `createdAt`/`updatedAt` as `Timestamp.now()` (today
      `new Date()`, stored as a Timestamp). User-entered dates (`expenses.date`,
      `events.date/startDate/endDate`) stay ISO strings as today. Never write ISO strings where
      a Timestamp is stored today. Snapshot reads use `doc.data({ serverTimestamps: 'estimate' })`
      so latency-compensated events don't deliver `null`
- [ ] Tests: in-memory repo double; a listener-leak test asserting `onMount` teardown calls each
      `onSnapshot` unsubscribe; port `src/context/__tests__/AppContext.test.tsx` against the
      repo double
- [ ] ADR `docs/decisions/0004-nano-stores-firestore-listeners.md` incl. Stakeholder Analysis
      (persistent `preferredCurrency` mirror in B5b = localStorage write of user input)
- [ ] Acceptance: an island subscribed to `$expenses` shows live data from the emulator seed;
      manual smoke on a preview channel is read-only (previews share the production project)

### B5b. Storage helpers + `preferences.ts` + `notifications.ts` (store only) (`risk:high`)
- [ ] ADR `docs/decisions/0005-image-storage.md`: adopt Firebase Storage (new backend surface:
      bucket enabled, Blaze plan checked, CORS) vs keep base64 data-URLs in Firestore (parity,
      zero backend change, 1 MiB doc cap). Default: Storage, as below; if base64 is kept, drop
      the next bullet and B10/B15 keep writing data-URLs
- [ ] `src/lib/firebase/storage.ts` upload helpers (`expenses/{expenseId}/{uuid}.jpg`,
      `avatars/{uid}.jpg`, `getStorage` created here, not in `client.ts`) + `storage.rules`
      (owner-only write, authenticated read, size/content-type limits) + `firebase.json`
      `storage` entry; deployed with the B2b rules step (`firebase deploy --only
      firestore:rules,storage`). Islands render both `https://` and `data:` image sources
      (legacy docs are not migrated)
- [ ] `src/stores/preferences.ts`: `$preferredCurrency` derived from `$profile.preferredCurrency`
      (Firestore is the source of truth), mirrored for first paint with `@nanostores/persistent`
      (added in B1; the `stores/theme.ts` `onMount` + `localStorage` pattern is the alternative)
      and `$rateCache` (6 h exchange-rate cache under `justsplit:rates`, one-time migration from
      `justSplitData.exchange_rates`)
- [ ] `src/stores/notifications.ts` (toast queue): thin wrapper over Inceptor's `toast()`;
      B8–B16 fire toasts via `notifications.ts` only, so the topology decided in B17b can change
      without touching feature islands
- [ ] Tests: `$preferredCurrency` follows `$profile`; rate-cache migration; storage helper path
      layout
- [ ] Acceptance: an upload from the emulator UI lands under `expenses/…`; `storage.rules` tests green

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
      references no chunk that includes `firebase/` (assert with a Vitest that greps the built
      HTML + `dist/_astro/*.js` manifest); layout-level JS (theme, FeedbackFAB, PWA islands) is
      allowed and budgeted at ≤ 40 kB gz

### Phase 2 — Feature islands (one issue each; all `type:feat`, `phase-2`)

Each island: `src/components/islands/<Name>Island.tsx` + feature widgets under
`src/components/features/<domain>/`, shadcn components only, `AuthGate`/`RouteGuard`-wrapped
(`ErrorBoundary > AuthGate > Content`), mounted `client:only="react"` with a fallback-slot
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
      `BalanceOverview` / `UpcomingEvents` get real selectors from the stores or are dropped
      (today `page.tsx` imports the first two but never renders them and feeds the others
      placeholder state)
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
      HTML contains no firebase chunk
### B9. Expense list + detail islands (`/expenses/list`, `/expenses/view`)
- [ ] `data-table` with URL-state sort/filter (Inceptor `use-data-table-url-state`; the full
      import closure was grafted in B1, or is added here if B1 chose the alternative)
- [ ] Delete expense (new — no page calls `deleteExpense` today) via `repo.expenses.remove`
- [ ] Port `src/app/expenses/__tests__/ExpenseDetail.test.tsx`
### B10. Expense form island (`/expenses/new`, `/expenses/edit`)
- [ ] `ExpenseSplitter` rewritten without MUI (equal / custom / percentage), image upload via
      `FileUpload` + B5b storage helpers, category on create (new — today only edit has it),
      `DatePicker` (`date-picker.tsx`)
- [ ] Participant picker = registered users only (see B13 ADR); no free-text participant
      creation; `paidBy` always included in `participants`
- [ ] Render legacy base64 `images[]` values regardless of the B5b ADR outcome
- [ ] Port `src/components/ImageUploader/__tests__/ImageUploader.test.tsx`
### B11a. `EventTimeline` widget port + timeline suites
- [ ] `src/components/features/events/EventTimeline.tsx` takes `users`, `onNavigate`, `convert`
      as props (no store access, no portal; positioning from Inceptor `hover-card`); named to
      avoid colliding with Inceptor's `ui/timeline.tsx` (vertical feed)
      - Alternative (lower priority): extend `ui/timeline.tsx` with expense/event item renderers
        instead of a separate widget — only if its `items` API fits without forking
- [ ] Port `src/__tests__/{timeline,timelineEvents,postEventExpenses,hoverCard,expenseGroups}.test.tsx`
### B11b. Events islands (list, new, view, edit)
- [ ] Participant picker = registered users only (see B13 ADR); no free-text participant creation
- [ ] Event → settlements deep link `/settlements?event=<id>`
- [ ] Port `EventDetail.test.tsx` + `page.test.tsx` (EventList part)
### B12. Groups islands (list, new, view)
- [ ] Queries/rules per the B2b ADR (`members`)
### B13. Friends islands (list, add, view) — friendship request flow (`risk:high`)
- [ ] Decision (ADR `docs/decisions/0006-registered-participants.md`): participants/friends must
      be registered users found by email (today's "add by name" dispatches `ADD_USER`, creating
      a local-only uuid user that the next users snapshot discards and that `users` rules forbid
      persisting). `/friends/add` becomes "invite by email" (mailto or copy-link) or is removed;
      expense/event forms pick from `$users` ∪ accepted friendships only
- [ ] Rules (scheduled by B2b, shipped as its own `risk:high` rules issue, tested with
      `@firebase/rules-unit-testing`, deployed before this island is previewed):
  ```
  match /friendships/{friendshipId} {
    allow read:   if request.auth != null && request.auth.uid in resource.data.users;
    allow create: if request.auth != null
                  && request.auth.uid == request.resource.data.requestedBy
                  && request.auth.uid in request.resource.data.users
                  && request.resource.data.users.size() == 2
                  && request.resource.data.status == 'pending';
    allow update: if request.auth != null && request.auth.uid in resource.data.users
                  && request.resource.data.users == resource.data.users
                  && request.resource.data.requestedBy == resource.data.requestedBy
                  && (request.resource.data.status == resource.data.status
                      || request.auth.uid != resource.data.requestedBy); // only the recipient accepts/rejects
    allow delete: if request.auth != null && request.auth.uid in resource.data.users;
  }
  ```
  and `groups` fixed to `resource.data.members` (read/update/delete) and
  `request.resource.data.members` (create)
### B14. Settlements island (`/settlements`, reads `?event=` from `location.search`)
- [ ] Tabs pending / balance / history (port from `settlements/page.tsx`)
- [ ] "Settle up" calls `repo.settlements.create()` → writes
      `{fromUser,toUser,amount,currency,date,expenseIds,eventId}` **and** batch-updates
      `settled: true` on `expenseIds` (mirrors `AppContext.addSettlement`, which the current UI
      never calls — today it dispatches a local-only `ADD_SETTLEMENT` that the next snapshot
      wipes). Rules already allow create by either party and expense update by participants
- [ ] `$settlements` store query per the B2b ADR (two listeners merged, or `involvedUsers`)
- [ ] `expenseCalculator` minimal-transactions, multi-currency conversion
- [ ] Tests: settle-up persists and marks expenses settled (port
      `context/__tests__/SettlementCurrency.test.tsx` against the in-memory repo double);
      history lists settlements for both directions
### B15. Profile island — editable profile, avatar upload, preferred currency
- [ ] `updateProfile` (Firestore merge + Auth `displayName`/`photoURL`); avatar via `FileUpload`
      + B5b storage helpers; `preferredCurrency` written to the profile (source of truth)
- [ ] Render legacy base64 `avatarUrl` values regardless of the B5b ADR outcome
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
### B17b. Toaster island wiring + database-recovery
- [ ] Vitest (`@vitest-environment jsdom`): two separate `createRoot`s on one document — root B
      mounts `<Toaster />`, root A calls `toast()`; assert the toast renders in B. Record the
      result and the chosen topology (one layout-level `<ToasterIsland client:idle />` vs one
      `<Toaster />` per route island drained from `$toasts`) in ADR
      `docs/decisions/0008-toast-topology-and-recovery.md`; wire it
- [ ] Port the IndexedDB corruption-recovery flow (`indexedDBReset.ts` → `src/lib/firebase/recovery.ts`,
      `DatabaseRecovery` island) — it is required by the persistent cache in D3: replace
      `process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID` with `import.meta.env.PUBLIC_FIREBASE_PROJECT_ID`;
      verify the DB names against the SDK's actual `firestore/[DEFAULT]/<projectId>/main` (the
      current list is already wrong); make it unregister B19's service worker (as
      `unregisterServiceWorkers` does today); the `firebase_db_error` flag drives B2's
      memory-cache fallback and B4's session-persistence fallback. The ADR documents why it
      stays (drop only if the ADR shows the persistent cache can be disabled instead)

### Phase 3 — Cutover

### B18. Feature-parity audit
- [ ] Walk spec §6 checklist on the `staging` channel (read-only), desktop + 375 px viewport;
      file an issue per gap and block cutover on them
- [ ] Every row of the Jest suite → owning task table is ticked
- [ ] Measure time-to-data on a warm navigation ≤ 300 ms on the staging channel (persistent cache)
- [ ] Run `npm run perf` (`@lhci/cli`) against the staging channel URL (not CI)
### B19. PWA + performance
- [ ] `@vite-pwa/astro` manifest re-branded, offline shell; `firebase` chunk isolated and measured
- [ ] Workbox: `navigateFallback` must not capture the rewritten routes — set
      `navigateFallbackDenylist: [/^\/(expenses|events|groups|friends)\//, /^\/__\//]` (or drop
      `navigateFallback` entirely and rely on Hosting rewrites); add a test that a fetch for
      `/expenses/abc` is not answered by the SW fallback
- [ ] Adapt `lighthouse-budgets.json` + `.lighthouserc.json` (grafted in B1) and split budgets by
      path: `/landing`, `/about`, `/help` keep Inceptor's 150 kB script budget; `/`,
      `/expenses/*`, `/events/*`, `/groups/*`, `/friends/*`, `/settlements`, `/profile` get an
      explicit `script: 420` / `total: 700` budget with a comment naming the firebase chunk.
      Point `.lighthouserc.json` URLs at `/landing/`, `/auth/signin/`, `/` (unauthenticated
      shell). `@lhci/cli` devDep + `perf` script (as in Inceptor's `package.json`); budgets are
      run in B18 against the staging channel, not in CI
### B20. Cutover PR `inceptor → main` (`risk:high`)
- [ ] Before merging: `firebase apphosting:backends:list --project justsplit-eef51`; if a
      backend is connected to this repo, disconnect/delete it (or the cutover races with an
      auto-build of `main`) and confirm which origin the custom domain (if any) points to
- [ ] `deploy.yml` deploys `dist/` + `firebase deploy --only firestore:rules,storage`;
      `deploy.yml` + `firebase-hosting-pull-request.yml` + `deploy-staging.yml`: drop
      `FIREBASE_CLI_EXPERIMENTS`, rename the GitHub secrets to `PUBLIC_FIREBASE_*` and drop the
      `NEXT_PUBLIC_*` mapping; delete the last Next references in docs; `CHANGELOG.md` entry
- [ ] After the first `dist/` deploy: `firebase functions:list` and `firebase functions:delete
      <ssr function> --region us-central1`; confirm `firebase hosting:sites:get` shows no
      frameworks backend
- [ ] ADR `docs/decisions/0009-cutover-and-rollback.md`; rollback runbook: revert merge +
      redeploy (document in `docs/runbooks/rollback.md`)
### B21. Post-cutover monitoring
- [ ] 7-day watch: Firebase Hosting errors, `FeedbackFAB` issues, Sentry (optional, Inceptor
      `sentry.ts` guarded, grafted in B1); close the milestone
### B22. Cleanup
- [ ] Delete the `inceptor` branch and `deploy-staging.yml`; archive `docs/refactor-plan.md`;
      update `ROADMAP.md`

---

## Track C — Upstream to Inceptor (so this is reusable for the next project)

### C1. `docs/recipes/auth-firebase.md`
- [ ] Mirror of `auth-supabase.md`: guarded client, env, emulator wiring, `authDomain` on the
      serving host, `RouteGuard` adapter (roles from the Auth session), Nano Stores
      `$user.listen` + `onSnapshot` rebind pattern, persistent local cache, hosting rewrites +
      `navigateFallbackDenylist` for client-only dynamic routes, `storage.rules`
### C2. `docs/recipes/adopt-existing-app.md` (brownfield playbook)
- [ ] The A/B/C track structure of this plan generalized: inventory template (incl. "capture the
      deployed rules / live fixtures first"), decision list (D1–D8 as questions),
      parity-checklist template, Jest→Vitest codemod notes, cutover/rollback pattern
### C3. `scripts/init.mjs --into <existing-repo>` (optional) + init.mjs fixes
- [ ] init.mjs copies the `data-table.tsx` import closure (and `react-day-picker`), and does not
      emit a GitHub-Pages `deploy.yml` when `--into` an existing repo
- [ ] Layer-in mode that grafts the scaffold into an existing repo instead of refusing, reusing
      the `add-tauri.mjs` merge-into-existing-project style; test in `src/tests/`

---

## Sequencing and dependencies

```
A1 → A2 → A3a → A3b → A4 → A5 → A6        (serial, one PR each, ~1 week; A1–A3a by the main session)
B1 → B2 → B2b → B3 → B4 → B5a → B5b → B6 → B7   (foundation, serial; B2b rules deployed before B4)
B16 after B5b (needs $preferredCurrency/$rateCache, domain/currency from B3, combobox from B1)
B8a..B15, B17a, B17b parallelizable after B7
  (B8b after B8a; B10 after B9; B11b after B11a; B12 after B9+B11b; B14 after B9+B11b;
   B15 after B16; B13 rules issue before B13 island; B17a after B8b)
B18 → B19 → B20 → B21 → B22
C1, C2 after B5b; C3 after B1 (independent of cutover)
```

## Definition of done (whole migration)

- `main` deploys the Astro app; `npm run check` + Lighthouse budgets (split by route family)
  green
- Spec §6 checklist fully ticked; every Jest suite in the owning-task table ported or dropped;
  zero `@mui`, `framer-motion`, `next` in `package.json`
- Firestore rules match the B2b ADR (deployed ruleset captured in the repo, `friendships`/`groups`
  blocks added, emulator-tested); indexes unchanged unless B2b added one; `storage.rules`
  deployed per the B5b ADR
- No App Hosting backend or SSR function left for the project; one workflow deploys `main`
- Inceptor `main` contains C1 and C2
