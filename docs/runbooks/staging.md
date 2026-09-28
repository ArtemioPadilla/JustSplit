# Runbook — staging (the `inceptor` branch on GitHub Pages)

Plan B2a, spec D2. Until cutover (B22) the Astro tree lives on the long-lived
`inceptor` branch and `deploy-staging.yml` publishes it on every push.

| | Value |
|---|---|
| Origin | `https://artemiopadilla.github.io` |
| Base path | `/JustSplit/` (repository variable `ASTRO_BASE`, fallback `/JustSplit`) |
| Staging URL | `https://artemiopadilla.github.io/JustSplit/` |
| OAuth callback | `https://artemiopadilla.github.io/JustSplit/auth/callback/` |
| Workflow | `.github/workflows/deploy-staging.yml` (push to `inceptor`, `workflow_dispatch`) |
| Supabase config | repository variables `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY` |

Staging and production are the **same Pages site**: `deploy.yml` runs only on
pushes to `main`, and nothing pushes `main` with the Astro tree before
cutover. Both workflows share the `pages` concurrency group. After cutover
`deploy-staging.yml` is deleted (B22) and the URL above is production (or the
custom domain's fallback).

## First-time setup (owner)

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Environments → `github-pages` → Deployment branches: add
   `inceptor` (the default rule allows only `main`; without it
   `actions/deploy-pages` fails with an environment-protection error).
3. Settings → Secrets and variables → Actions → **Variables**:
   `ASTRO_BASE=/JustSplit`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY`.
4. Supabase → Authentication → URL Configuration: add the OAuth callback above
   to **Redirect URLs**; add the same origin to the Google OAuth client.
   Registering a URL only allows it; each sign-in picks its target through
   `redirectTo` (B4).

## Deploying

Merging a PR into `inceptor` deploys it. To redeploy without a change:
Actions → *Deploy staging (inceptor → GitHub Pages)* → Run workflow on
`inceptor`.

## Checking a deploy

```sh
curl -sI https://artemiopadilla.github.io/JustSplit/ | head -1        # 200
curl -s  https://artemiopadilla.github.io/JustSplit/llms.txt | head -3
```

A build without the Supabase variables still deploys: the client is guarded
and the app shows a "not configured" notice instead of crashing.

## Rolling back

Re-run the last good *Deploy staging* run (Actions → run → Re-run all jobs),
or revert the offending merge on `inceptor`; the push redeploys.
