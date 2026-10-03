# Setup Guide

How to get a working checkout, which secrets the repo needs, and the log of
owner actions the migration plan asks for. B1, B2a, B2 and B4 append to this
file as the Astro tree lands.

## 1. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 22 (`.nvmrc`) | build, tests, scripts |
| npm | 10+ | comes with Node 22 |
| GitHub CLI `gh` | any recent | `npm run ship`, `npm run monday`, `scripts/create-issues.sh` |
| Docker | optional | `db-migrate.yml` runs dbmate in a container; local Supabase (`supabase start`, from B2a) |

```bash
git clone https://github.com/ArtemioPadilla/JustSplit
cd JustSplit
nvm use            # or fnm use — reads .nvmrc
npm ci
npm run doctor     # preflight: node, gh auth, clean tree, branch naming, config present
npm run check      # the umbrella gate: lint → type-check → test → build
```

`npm run check` needs no secret on the Astro tree: the Supabase client is guarded
(`PUBLIC_SUPABASE_*` unset ⇒ the app renders a "not configured" notice, B2a).

> **npm 10.9.x bug.** `npm install` without a lockfile can abort with
> `Cannot read properties of null (reading 'edgesOut')` while resolving peer sets.
> `npm ci` (lockfile present) is unaffected, which is what CI runs. To regenerate the
> lockfile use **`npx npm@latest install`** (npm ≥ 11). Do not use `--legacy-peer-deps`:
> the lockfile it writes omits peer resolutions and a strict `npm ci` then rejects it.
> (The frozen Next tree on `main`-before-cutover used `scripts/build-check.sh`
> placeholders instead; that script left with the tree in B1.)

### Local database (plan B2)

Requires Docker, `psql` and the Supabase CLI (`brew install supabase/tap/supabase`,
or any install that puts `supabase` on the `PATH`; CI pins 2.118.0). dbmate
comes with `npm ci`.

| Command | What it does |
|---|---|
| `npm run db:start` | `supabase start` without studio, mail, edge runtime and logging |
| `npm run db:migrate` | applies `db/migrations/` with dbmate (`DATABASE_URL` overrides the local URL) |
| `npm run db:seed` | two confirmed users (`ana@example.test` / `beto@example.test`, password `password123`), an accepted friendship and a shared group; always the local stack |
| `npm run db:reset` | `supabase db reset` → `db:migrate` → `db:seed` |
| `npm run db:env` | writes the local URL and key from `supabase status` into `.env.local` (git-ignored) so `npm run dev` uses the local stack |
| `npm run db:audit [-- <url>]` | read-only dump of RLS, policies, triggers, function grants, table grants, Realtime and buckets; diff local against the project (B18) |
| `npm run test:rls` | the B2b RLS suite against the running stack |
| `npm run test:rls:mutation` | drops each policy and guard trigger in turn and requires the suite to fail |
| `npm run test:live` | the A7 live end-to-end smoke: builds `dist` against the running stack (keys from `supabase status`, into a temporary directory, so `dist/` is untouched), seeds and removes its own users through the service role, then drives Chromium (its offline step, plan B19c, takes the network away from one form and one dialog and checks the controls are blocked with the shared sentence and back on reconnect) — see §3 |
| `npm run db:rollback` / `db:status` / `db:stop` | dbmate rollback of the last file, status, stop the stack |

Migrations live in `db/migrations/` and **never** in `supabase/migrations/`
(the CLI would run the whole file on `start`, down section included).
`supabase/config.toml` disables the CLI's own migrations and seed for that
reason. The production project is migrated only by `db-migrate.yml`.

## 2. Secrets and tokens

Repository → Settings → Secrets and variables → Actions.

| Secret | Needed by | Where to get it | Status |
|---|---|---|---|
| `GH_PACKAGES_TOKEN` | switching `@cyber-eco/*` from the vendored tarballs (`vendor/`, B2a) back to GitHub Packages; `ci.yml` already exports it as `NODE_AUTH_TOKEN` (the deploy workflow needs none: the packages are vendored) | A **classic** PAT with `read:packages`, created as a member of the `cyber-eco` org with read access to `cyber-eco/cybereco-hub`. GitHub Packages' npm registry does not accept fine-grained PATs today. `GITHUB_TOKEN` cannot read packages owned by another org. Pre-check: `NODE_AUTH_TOKEN=<pat> npm view @cyber-eco/types@0.2.1 --registry=https://npm.pkg.github.com` prints `0.2.1` | ☐ owner |
| `SUPABASE_DB_URL` | `db-migrate.yml` (from B2) | Supabase dashboard → Project Settings → Database → Connection string → **Session pooler** → URI, with `?sslmode=require`. Not "Direct connection" (IPv6-only; runners are IPv4-only) | ☐ owner, after the Supabase project exists (B2a) |
| `ANTHROPIC_API_KEY` | `claude.yml` (AI issue triage, from A5) | console.anthropic.com → API Keys | ☐ owner |
| `CLOUDFLARE_API_TOKEN` | `deploy.yml` via `ci.yml`'s `deploy` job (plan B20a, ADR 0016) | Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom token, permission **Account → Cloudflare Pages → Edit**, scoped to this account only. Nothing else | ☐ owner (§4, B20a step 3) |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy.yml` (B20a) | Cloudflare dashboard → Workers & Pages → the Account ID in the right-hand panel | ☐ owner (§4, B20a step 4) |
| `FIREBASE_SERVICE_ACCOUNT*` | nothing (the Firebase workflows were deleted in #2) | — | ☐ owner: delete at any time; nothing depends on them |

Repository **variables** (public config, visible in logs; Settings → Secrets and
variables → Actions → Variables):

| Variable | Needed by | Value | Status |
|---|---|---|---|
| `PUBLIC_SUPABASE_URL` | `deploy.yml` (B2a) | Supabase → Project Settings → API → Project URL. The build also puts its origin in the CSP's `connect-src` / `img-src` | ☐ owner, after the project exists |
| `PUBLIC_SUPABASE_KEY` | `deploy.yml` (B2a) | Supabase → Project Settings → API → anon / publishable key (browser-public by design; RLS is the authorization) | ☐ owner, after the project exists |
| `PUBLIC_AUTH_GOOGLE` | `deploy.yml` (B20a) | **Leave unset**: Google sign-in is off (owner decision 2026-10-03). `true` shows the Google button and the help sentence; see "Enable Google later" in §4 | optional, off |
| ~~`ASTRO_BASE`~~ | nothing any more | Production is served from the root of `split.cybere.co` (ADR 0016), so the base defaults to `/`. **Delete the variable if it was created.** (Still honoured locally: `ASTRO_BASE=/x npm run build`) | ☐ owner: delete |

`ci.yml` deliberately builds **without** the Supabase variables, so every PR
exercises the guarded `supabaseEnabled === false` path.

**`@cyber-eco/*` packages.** While `GH_PACKAGES_TOKEN` does not exist they are
vendored in `vendor/` and installed from `file:` tarballs, so `npm ci` needs no
token (see `vendor/README.md`). Once the token exists, contributors put it in
`~/.npmrc`:

```ini
@cyber-eco:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<pat>
```

## 3. Workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` — `Build & Check` + `Lint workflows (actionlint)` | push to `main`, `inceptor`, `phase-*/**`, `feat/**`, `fix/**`, `docs/**`, `chore/**`, `claude/**`; PRs to `main` / `inceptor` | `npm ci` + `npm run check` (which includes the page-size budget gate, see "Performance budgets" below); then `npm run check:a11y` (axe-core smoke against the build `check` just produced — plan B6; deliberately its own step, not part of `check`, same reasoning as `test:rls` below) and `npm run check:offline` (plan B19: builds its own copy at the production base `/` under the real `_headers`, lets the service worker install in Chromium, goes offline and asserts what it answers; `OFFLINE_SMOKE_BASE=/JustSplit` runs it under a subpath); actionlint + unpinned-action scan |
| `ci.yml` — `Deploy` → `deploy.yml` (`Cloudflare Pages`) | pushes only, after `Build & Check` **and** `RLS & contract` pass for the commit (`needs`), in this repository only; `deploy.yml` itself has no trigger (reusable workflow) | builds with `PUBLIC_SUPABASE_*` / `PUBLIC_AUTH_GOOGLE` **variables** (no base path), which also writes `dist/_headers`, then `wrangler pages deploy` (`cloudflare/wrangler-action`, SHA-pinned) to the Pages project `justsplit`: `main` = production (`https://split.cybere.co`), any other branch = a preview at `https://<branch>.justsplit.pages.dev` (ADR 0016). Never on a pull request or a fork; no manual dispatch (a manual deploy would bypass the gate) |
| `ci.yml` — `RLS & contract (supabase start)` | same triggers as `Build & Check` | `supabase start` + `db:migrate` + `test:rls` (plan B2b) + `test:contract:live` (B5a) + `npx playwright-core install --with-deps chromium` and `npm run test:live` (plan A7: real sign-in, the critical flows with the database checked through the service role, and axe + 375px overflow on every signed-in page state in light, dark and 375px, failing on any console error or hydration mismatch; deliberately its own step, never part of `check`, and no secret — the keys come from `supabase status`); required on `inceptor` |
| `db-migrate.yml` — `DB Migrate (Supabase)` | push to `main` touching `db/migrations/**`; `workflow_dispatch` (`migrate` / `status` / `rollback` / `rollback-all` with `confirm=TEARDOWN`) | dbmate in a pinned container against `SUPABASE_DB_URL`; warns and skips while the secret is missing |

Branch protection (owner, once, after the first green run): Settings →
Branches → `inceptor` (for the life of Track B) and, **at the cutover, `main`**:
require a pull request and the `Build & Check` and
`RLS & contract (supabase start)` status checks. The cutover replaces the Next
tree on `main` wholesale, after tagging its last commit `next-final`; the
`inceptor` branch is deleted afterwards (plan B20, B22). There is no staging
workflow to delete: previews replace it (ADR 0016).

### Performance budgets (plan B19)

`performance-budgets.json` holds the page-size budgets and `scripts/check-budgets.mjs` enforces them
inside `npm run check`, so on every PR: it reads `dist/`, computes the gzipped JS each built page
loads **statically** (its entry script tags plus their static imports; a dynamic `import()` chunk is
excluded and shown separately as "+lazy JS"), and fails when a page is over the budget of its path
group (marketing, `/auth/*`, app pages, the `/showcase` gallery). It prints one row per page:

```bash
npm run build && npm run check:budgets            # the gate
node scripts/check-budgets.mjs --report           # the measurement, never fails on a budget
```

**Policy: never raise a budget to absorb a regression. Fix the regression.** A budget is only ever
set from a measurement taken after the reductions, with about 5% headroom, and the before and after
numbers go in the plan's B19 Landed note. Each budget carries a comment naming the chunk that
dominates it (the check warns when that stops being true). When the gate fails, look at the row's
largest chunk and at what the change added to the page's static graph: usually a component that could
load on first use (a dialog, a menu, a picker, a form inside a dialog) was imported statically.
Dialogs use the shared stand-in `src/components/ui/lazy-dialog.tsx` (plan B19b).
`src/tests/lazy-boundaries.test.ts` lists the ones that are deliberately lazy. To investigate,
build with `rollup-plugin-visualizer` in a scratch config (not committed) and read each module's
size by package. The Lighthouse budgets (`.lighthouserc.json`, `npm run perf`, run by hand against
staging for B18) are a little above the gate because Lighthouse also counts mount-time lazy chunks.

## 4. Owner-actions log

Actions only the repository owner can perform. Tick and date them here so the
plan's acceptance lines stay verifiable.

### B20a — Cloudflare Pages at `split.cybere.co` (ADR 0016), in this order

Steps 1–5 give every push a preview at `https://<branch>.justsplit.pages.dev` (until the cutover
`https://inceptor.justsplit.pages.dev` is the staging site B18 audits); production appears when `main`
carries the Astro tree (B20). Nothing below needs the code to change.

| # | Owner step | Done |
|---|---|---|
| 1 | **Create the Pages project `justsplit`** with production branch `main`. Use the CLI: `CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<id> npx wrangler pages project create justsplit --production-branch=main` (or the dashboard: Workers & Pages → Create → Pages → **Upload assets**, name `justsplit`, then set the production branch to `main` under Settings → Builds). **Do not rely on the first workflow run to create it:** in CI `wrangler pages deploy` refuses to create a missing project (verified against wrangler 4.147), and an interactive first deploy would make the *deploying branch* (e.g. `inceptor`) the production branch | ☐ |
| 2 | **Add the custom domain** `split.cybere.co`: Workers & Pages → `justsplit` → Custom domains → Set up a domain. Because `cybere.co` is already a Cloudflare zone, Cloudflare creates the proxied CNAME and issues the certificate itself (HTTPS automatic). Leave Rocket Loader, Email Address Obfuscation and automatic Web Analytics injection **off** for the zone/host: they rewrite or inject inline scripts and break the CSP's hashes | ☐ |
| 3 | **Create the API token**: My Profile → API Tokens → Create Token → Custom token, permission **Account → Cloudflare Pages → Edit**, Account Resources limited to this account. No other permission, no zone permission | ☐ |
| 4 | **GitHub → Settings → Secrets and variables → Actions.** Secrets: `CLOUDFLARE_API_TOKEN` (step 3), `CLOUDFLARE_ACCOUNT_ID`. Variables: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY` (Supabase → Project Settings → API). Leave `PUBLIC_AUTH_GOOGLE` unset. The deploy fails fast, naming the variable, if either Supabase variable is missing. Until both Cloudflare secrets exist, a preview push skips the deploy with a warning (CI stays green) and a push to `main` fails | ☐ |
| 5 | **Delete the obsolete** repository variable `ASTRO_BASE` and the `github-pages` environment (and turn GitHub Pages off in Settings → Pages) if they were created | ☐ |
| 6 | **Supabase → Authentication → URL Configuration**: Site URL `https://split.cybere.co`; Redirect URLs `https://split.cybere.co/auth/callback/` and `https://*.justsplit.pages.dev/auth/callback/` (previews). Providers: Email on; **Google stays off**. When Google is enabled later, the redirect URI in the Google OAuth client is Supabase's own `https://<ref>.supabase.co/auth/v1/callback` (unchanged by this move) and no "Authorized JavaScript origins" are needed (server-side PKCE redirect, not Google Identity Services) | ☐ |
| 7 | **`db-migrate.yml`**: run `gh workflow run db-migrate.yml --ref inceptor -f command=migrate` (migrations through `…017`) before the first production deploy; then `npm run -s db:audit -- "$SUPABASE_DB_URL"` equals the local dump | ☐ |
| 8 | **Delete the Firebase project** `justsplit-eef51` (Console → Project settings → Delete project) and the `FIREBASE_SERVICE_ACCOUNT*` secrets. Nobody used the app and there is no data: no export, no rollback window, no "we moved" page. Safe at any time; nothing depends on them | ☐ |
| 9 | **`justsplit.cybere.co` → `split.cybere.co`** (the CyberEco Hub already links to the former). In the `cybere.co` zone: **(a)** DNS → Add record → `AAAA`, name `justsplit`, value `100::`, **Proxied** (orange cloud): a placeholder that only has to exist and be proxied; **(b)** Rules → Redirect Rules → Create rule → *Custom filter expression* `(http.host eq "justsplit.cybere.co")` → Type **Dynamic**, expression `concat("https://split.cybere.co", http.request.uri.path)`, status **301**, **Preserve query string** on. Check: `curl -sI "https://justsplit.cybere.co/expenses/list/?a=1"` shows `301` and `location: https://split.cybere.co/expenses/list/?a=1`. This host never serves a page, so no canonical link or sitemap names it. The Hub's references (`cybereco-hub` `apps/hub/src/pages/api/auth/generate-token.ts:11`, `apps/hub/src/middleware.ts:214`) can be switched to `split.cybere.co` later, in the Hub repository | ☐ |
| 10 | **Enable Google later** (not now; owner decision 2026-10-03): **(a)** Google Cloud Console → APIs & Services → Credentials → OAuth client (Web), Authorized redirect URI `https://<ref>.supabase.co/auth/v1/callback`; **(b)** Supabase → Authentication → Providers → Google on, with the client id and secret; **(c)** GitHub variable `PUBLIC_AUTH_GOOGLE=true`; **(d)** redeploy (re-run the latest CI run on `main`, or push). Until (c) the button, the divider-free layout and the help sentence stay hidden | ☐ |

Cutover-time owner steps (tag `next-final`, protect `main` with a PR plus `Build & Check` and
`RLS & contract`, replace the tree, delete `inceptor`) are in the plan's B20 and B22.

| Plan issue | Action | Done |
|---|---|---|
| A3b | Enable branch protection on `main` (`Build & Check` required) | ☐ |
| B1 | ~~Set `ASTRO_BASE` and enable GitHub Pages~~ superseded by B20a: do **not** create the variable or enable Pages (delete them if they exist) | n/a |
| A4 | Delete the `FIREBASE_SERVICE_ACCOUNT*` secrets | ☐ |
| A4 | Create `GH_PACKAGES_TOKEN` (classic PAT, `read:packages`, `cyber-eco` member) | ☐ |
| A5 | Create `ANTHROPIC_API_KEY` | ☐ |
| B2a | Create Supabase project `justsplit` (region closest to MX; record it here); enable the Email provider (Google stays off, see "Enable Google later") | ☐ |
| B2a | Supabase Auth URL configuration: see B20a step 6 below (Site URL `https://split.cybere.co`; Redirect URLs `https://split.cybere.co/auth/callback/` and `https://*.justsplit.pages.dev/auth/callback/`). Providers: **Email only**; the Google provider stays disabled | ☐ |
| B2a | Variables `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY`; secret `SUPABASE_DB_URL` (session pooler, `?sslmode=require`) | ☐ |
| B2a | ~~`github-pages` environment: allow `inceptor`~~ superseded by B20a: delete the `github-pages` environment if it exists | n/a |
| B2 | Run `gh workflow run db-migrate.yml --ref inceptor -f command=migrate` once `SUPABASE_DB_URL` exists; then `npm run -s db:audit -- "$SUPABASE_DB_URL"` equals the local dump | ☐ |
| B2b | Add `RLS & contract (supabase start)` to the required checks on `inceptor` | ☐ |
| B2d | After B2d merges, run `gh workflow run db-migrate.yml --ref inceptor -f command=migrate` again (migrations `…010`–`…014`: `event_id` columns, foreign keys, membership visibility, edit guards, email-lookup rate limit; ADR 0013), before or together with the app build that reads `event_id`; then `npm run -s db:audit -- "$SUPABASE_DB_URL"` equals the local dump | ☐ |
| B19b | Run `gh workflow run db-migrate.yml --ref inceptor -f command=migrate` for migration `…016` (the `expense_groups.members[].role` check: normalises any unknown role to `member`, then adds and validates the constraint; ADR 0002, B19b amendment); then `npm run -s db:audit -- "$SUPABASE_DB_URL"` equals the local dump | ☐ |
| B19c | Run `gh workflow run db-migrate.yml --ref inceptor -f command=migrate` for migration `…017` (a member labelled `owner`/`admin` in `expense_groups.members[]` must be in `admin_ids`: demotes any forged label to `member` without touching `admin_ids`, then adds and validates the constraint; ADR 0002 and ADR 0015); then `npm run -s db:audit -- "$SUPABASE_DB_URL"` equals the local dump. The app is safe to deploy before or after it | ☐ |
| H1/H2 (hub) | Deploy the Hub (gate C1) so relational mode can be built upstream | ☐ |
| B20 | Delete the Firebase project (B20a step 8; no window, no export) | ☐ |
| A6 | Choose and add a `LICENSE` (the README claims open source; none exists; the hub uses open-core Apache-2.0 / proprietary) | ☐ |

## 5. Where things are

- Spec: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- Agent guardrails: `CLAUDE.md`, `.claude/agents/`, `.claude/checklists/`
- Decisions: `docs/decisions/`
- Issue bootstrap: `bash scripts/create-issues.sh` (dry run) / `--apply`; `--repo ArtemioPadilla/inceptor`
  for Track C, `--repo cyber-eco/cybereco-hub` for Track C', `--track d` after B22. It parses the plan,
  so re-running after a plan edit files only what is missing.
