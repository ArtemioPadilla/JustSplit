# Security policy

Only the `main` branch is supported.

## Reporting

Please do not file public issues for sensitive findings. Use:

- GitHub's private advisory flow: [report here](https://github.com/ArtemioPadilla/JustSplit/security/advisories/new)
- Or contact the maintainer, @ArtemioPadilla

Acknowledgement within ~72 hours; remediation within 14 days for confirmed issues, severity-dependent.

## Scope

In scope:

- Anything that lets a user read or change another user's expenses, groups, settlements or
  profile — Row Level Security policies, the migrations under `db/migrations/`, the data repos
- Runtime correctness bugs in app code (XSS, open redirects, prototype pollution)
- Dependency CVEs this app amplifies
- Prompt-injection vectors in the AI triage workflow that could push to `main` or exfiltrate secrets
- Build-pipeline issues that could leak repository secrets

Out of scope (file as regular issues):

- Tooling preferences
- Forbidden-import scan misses (workflow tuning, not a vulnerability)
- Upstream dependency findings — report those to the dependency

## No-penalty pledge

Researchers acting in good faith under this policy are welcome. With consent, we credit reporters in the resulting advisory.
