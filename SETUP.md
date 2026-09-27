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

`npm run check` needs no secret: the Next-era build gate exports placeholder
`NEXT_PUBLIC_FIREBASE_*` values when they are unset (`scripts/build-check.sh`).
Nothing built by that script is ever deployed.

## 2. Secrets and tokens

Repository → Settings → Secrets and variables → Actions.

| Secret | Needed by | Where to get it | Status |
|---|---|---|---|
| `GH_PACKAGES_TOKEN` | `ci.yml` (`npm ci` of `@cyber-eco/*` from GitHub Packages, from B1) | A **classic** PAT with `read:packages`, created as a member of the `cyber-eco` org with read access to `cyber-eco/cybereco-hub`. GitHub Packages' npm registry does not accept fine-grained PATs today. `GITHUB_TOKEN` cannot read packages owned by another org. Pre-check: `NODE_AUTH_TOKEN=<pat> npm view @cyber-eco/types@0.2.1 --registry=https://npm.pkg.github.com` prints `0.2.1` | ☐ owner |
| `SUPABASE_DB_URL` | `db-migrate.yml` (from B2) | Supabase dashboard → Project Settings → Database → Connection string → **Session pooler** → URI, with `?sslmode=require`. Not "Direct connection" (IPv6-only; runners are IPv4-only) | ☐ owner, after the Supabase project exists (B2a) |
| `ANTHROPIC_API_KEY` | `claude.yml` (AI issue triage, from A5) | console.anthropic.com → API Keys | ☐ owner |
| `FIREBASE_SERVICE_ACCOUNT*` | nothing (the Firebase workflows were deleted in #2) | — | ☐ owner: delete |

Contributors put the same `read:packages` token in `~/.npmrc`:

```ini
@cyber-eco:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<pat>
```

## 3. Workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` — `Build & Check` + `Lint workflows (actionlint)` | push to `main`, `inceptor`, `phase-*/**`, `feat/**`, `fix/**`, `docs/**`, `chore/**`, `claude/**`; PRs to `main` / `inceptor` | `npm ci` + `npm run check`; actionlint + unpinned-action scan |
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
| A4 | Delete the `FIREBASE_SERVICE_ACCOUNT*` secrets | ☐ |
| A4 | Create `GH_PACKAGES_TOKEN` (classic PAT, `read:packages`, `cyber-eco` member) | ☐ |
| A5 | Create `ANTHROPIC_API_KEY` | ☐ |
| B2a | Create the JustSplit Supabase project; store `SUPABASE_DB_URL` | ☐ |
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
