# Changelog

All notable changes to JustSplit are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow the
plan's milestones.

## [Unreleased]

### Added
- Inceptor workflow: `CLAUDE.md`, `prometeo` / `forja` / `centinela` sub-agents, ethics /
  governance / forbidden-imports checklists, `doctor` / `monday` / `ship` commands, ADR 0001 (#3).
- CI quality gate `Build & Check` + actionlint, and the Supabase migrations workflow (#5).
- `SETUP.md` with secrets, workflows and the owner-actions log (#6).
- Issue and PR templates, CODEOWNERS, Dependabot (GitHub Actions), AI issue triage, and a
  plan-driven issue bootstrap (`scripts/create-issues.sh`) (#7).
- `docs/INDEX.md`, `ROADMAP.md`, this changelog, `SECURITY.md`, `CODE_OF_CONDUCT.md`.

### Changed
- `npm run check` is the umbrella gate (lint → type-check → test → build) and runs without any
  secret; the production build gate uses placeholder Firebase config (#4).
- Migration spec and plan re-platformed on Supabase via the CyberEco data layer (#2).

### Removed
- Firebase Hosting deploy workflows; committed junk files, shadow pages and duplicate modules (#2).

### Known
- 7 Jest suites that already failed on `main` are skipped with the Track B issue that rewrites them (#4).
