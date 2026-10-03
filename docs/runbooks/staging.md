# Runbook — previews and staging (Cloudflare Pages)

Plan B20a, [ADR 0016](../decisions/0016-cloudflare-pages-at-split-cybere-co.md); supersedes the GitHub Pages
staging site of plan B2a / spec D2. Until the cutover (B20) the Astro tree lives on the long-lived `inceptor`
branch; its **preview** is the staging site that B18 audits. There is no staging workflow any more: every push
to a branch `ci.yml` builds is a preview.

| | Value |
|---|---|
| Production origin | `https://split.cybere.co` (the `main` deployment; empty until the cutover) |
| Staging (until cutover) | `https://inceptor.justsplit.pages.dev` |
| Any branch's preview | `https://<branch>.justsplit.pages.dev` (Cloudflare lowercases the name and turns `/` and other punctuation into `-`; the exact URL is in the job summary) |
| Base path | `/` (no `ASTRO_BASE`) |
| OAuth callbacks | `https://split.cybere.co/auth/callback/`, `https://*.justsplit.pages.dev/auth/callback/` (Supabase Redirect URLs) |
| Workflow | `.github/workflows/deploy.yml`, called by `ci.yml`'s `deploy` job after `Build & Check` and `RLS & contract` pass |
| Supabase config | repository variables `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY` |
| Google sign-in | off; `PUBLIC_AUTH_GOOGLE` unset |

A preview and production share the Supabase project and the public config, so a preview is a real client of the
real database: use the dedicated test account (B18), never real data you cannot lose.

## First-time setup (owner)

SETUP.md §4, "B20a", steps 1–6 (project, domain, token, secrets and variables, Supabase URL configuration).

## Deploying

Merging into `inceptor` (or pushing any CI-built branch) deploys it. To redeploy without a change: Actions →
**CI** → open the run for the commit → Re-run all jobs (the gate runs again, then the deploy). There is no
manual dispatch on purpose: it would be a way to publish a red commit.

## Checking a deploy

```sh
curl -sI https://inceptor.justsplit.pages.dev/ | head -1                      # 200
curl -sI https://inceptor.justsplit.pages.dev/ | grep -i -E 'content-security-policy|strict-transport|x-robots-tag'
curl -sI https://inceptor.justsplit.pages.dev/expenses/abc | head -1          # 404 (the app shell, by design)
curl -s  https://inceptor.justsplit.pages.dev/llms.txt | head -3
```

Open the preview in a browser with the console open: a Content-Security-Policy violation is a bug (the live smoke
fails on one). A build without the Supabase variables is refused by the workflow's guard step.

## Rolling back

Cloudflare dashboard → Workers & Pages → `justsplit` → Deployments → a previous deployment → Rollback to this
deployment; or re-run the CI run of an older commit; or revert the merge (the push redeploys).
