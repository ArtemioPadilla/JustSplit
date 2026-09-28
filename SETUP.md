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

## 2. Secrets and tokens

Repository → Settings → Secrets and variables → Actions.

| Secret | Needed by | Where to get it | Status |
|---|---|---|---|
| `GH_PACKAGES_TOKEN` | switching `@cyber-eco/*` from the vendored tarballs (`vendor/`, B2a) back to GitHub Packages; `ci.yml` and the deploy workflows already export it as `NODE_AUTH_TOKEN` | A **classic** PAT with `read:packages`, created as a member of the `cyber-eco` org with read access to `cyber-eco/cybereco-hub`. GitHub Packages' npm registry does not accept fine-grained PATs today. `GITHUB_TOKEN` cannot read packages owned by another org. Pre-check: `NODE_AUTH_TOKEN=<pat> npm view @cyber-eco/types@0.2.1 --registry=https://npm.pkg.github.com` prints `0.2.1` | ☐ owner |
| `SUPABASE_DB_URL` | `db-migrate.yml` (from B2) | Supabase dashboard → Project Settings → Database → Connection string → **Session pooler** → URI, with `?sslmode=require`. Not "Direct connection" (IPv6-only; runners are IPv4-only) | ☐ owner, after the Supabase project exists (B2a) |
| `ANTHROPIC_API_KEY` | `claude.yml` (AI issue triage, from A5) | console.anthropic.com → API Keys | ☐ owner |
| `FIREBASE_SERVICE_ACCOUNT*` | nothing (the Firebase workflows were deleted in #2) | — | ☐ owner: delete |

Repository **variables** (public config, visible in logs; Settings → Secrets and
variables → Actions → Variables):

| Variable | Needed by | Value | Status |
|---|---|---|---|
| `ASTRO_BASE` | `deploy.yml`, `deploy-staging.yml` | `/JustSplit` (project pages) or `/` with a custom domain | ☐ owner |
| `PUBLIC_SUPABASE_URL` | `deploy.yml`, `deploy-staging.yml` (B2a) | Supabase → Project Settings → API → Project URL | ☐ owner, after the project exists |
| `PUBLIC_SUPABASE_KEY` | `deploy.yml`, `deploy-staging.yml` (B2a) | Supabase → Project Settings → API → anon / publishable key (browser-public by design; RLS is the authorization) | ☐ owner, after the project exists |

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
| `ci.yml` — `Build & Check` + `Lint workflows (actionlint)` | push to `main`, `inceptor`, `phase-*/**`, `feat/**`, `fix/**`, `docs/**`, `chore/**`, `claude/**`; PRs to `main` / `inceptor` | `npm ci` + `npm run check`; actionlint + unpinned-action scan |
| `deploy.yml` — `Deploy to GitHub Pages` | push to `main` (after cutover); `workflow_dispatch` | production build with `ASTRO_BASE` + `PUBLIC_SUPABASE_*` variables → `actions/deploy-pages` |
| `deploy-staging.yml` — `Deploy staging (inceptor → GitHub Pages)` | push to `inceptor`; `workflow_dispatch` | same build from the integration branch to the same Pages site (`docs/runbooks/staging.md`) |
| `db-migrate.yml` — `DB Migrate (Supabase)` | push to `main` touching `db/migrations/**`; `workflow_dispatch` (`migrate` / `status` / `rollback` / `rollback-all` with `confirm=TEARDOWN`) | dbmate in a pinned container against `SUPABASE_DB_URL`; warns and skips while the secret is missing |

Branch protection (owner, once, after the first green run): Settings →
Branches → `main` → require a pull request and the `Build & Check` status
check. The same rule applies to the `inceptor` integration branch for the life
of Track B.

## 4. Owner-actions log

Actions only the repository owner can perform. Tick and date them here so the
plan's acceptance lines stay verifiable.

| Plan issue | Action | Done |
|---|---|---|
| A3b | Enable branch protection on `main` (`Build & Check` required) | ☐ |
| B1 | Set repository variable `ASTRO_BASE` (`/JustSplit`, or `/` with a custom domain) and enable GitHub Pages (Source: GitHub Actions) | ☐ |
| A4 | Delete the `FIREBASE_SERVICE_ACCOUNT*` secrets | ☐ |
| A4 | Create `GH_PACKAGES_TOKEN` (classic PAT, `read:packages`, `cyber-eco` member) | ☐ |
| A5 | Create `ANTHROPIC_API_KEY` | ☐ |
| B2a | Create Supabase project `justsplit` (region closest to MX; record it here); enable Email + Google providers | ☐ |
| B2a | Supabase Auth: Site URL = production origin; Redirect URLs += `https://artemiopadilla.github.io/JustSplit/auth/callback/` (and the custom domain's `/auth/callback/` later); same origins in the Google OAuth client | ☐ |
| B2a | Variables `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY`; secret `SUPABASE_DB_URL` (session pooler, `?sslmode=require`) | ☐ |
| B2a | Settings → Environments → `github-pages`: allow the `inceptor` branch (staging deploy) | ☐ |
| H1/H2 (hub) | Deploy the Hub (gate C1) so relational mode can be built upstream | ☐ |
| B20 | Retire the Firebase project after the 14-day rollback window | ☐ |
| A6 | Choose and add a `LICENSE` (the README claims open source; none exists; the hub uses open-core Apache-2.0 / proprietary) | ☐ |

## 5. Where things are

- Spec: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- Agent guardrails: `CLAUDE.md`, `.claude/agents/`, `.claude/checklists/`
- Decisions: `docs/decisions/`
- Issue bootstrap: `bash scripts/create-issues.sh` (dry run) / `--apply`; `--repo ArtemioPadilla/inceptor`
  for Track C, `--repo cyber-eco/cybereco-hub` for Track C', `--track d` after B22. It parses the plan,
  so re-running after a plan edit files only what is missing.
