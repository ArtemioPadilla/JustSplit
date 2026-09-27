#!/usr/bin/env bash
# create-issues.sh — bootstraps labels, milestones and the migration-plan issues.
# Thin wrapper: the parsing and gh calls live in scripts/plan-issues.mjs, which reads
# docs/superpowers/plans/2026-09-18-inceptor-migration.md so issues never drift from the plan.
#
#   bash scripts/create-issues.sh                                   # dry run (this repo, A+B)
#   bash scripts/create-issues.sh --apply                           # create labels, milestones, issues
#   bash scripts/create-issues.sh --apply --issues-only
#   bash scripts/create-issues.sh --repo ArtemioPadilla/inceptor --apply    # C1–C3
#   bash scripts/create-issues.sh --repo cyber-eco/cybereco-hub --apply     # H1–H3
#   bash scripts/create-issues.sh --track d --apply                          # D2–D12 (after B22)
set -euo pipefail
command -v gh >/dev/null || { echo "ERROR: gh CLI not found. Install: https://cli.github.com" >&2; exit 1; }
if [[ " $* " != *" --json "* ]]; then
  gh auth status >/dev/null 2>&1 || { echo "ERROR: gh not authenticated. Run: gh auth login" >&2; exit 1; }
fi
exec node "$(dirname "$0")/plan-issues.mjs" "$@"
