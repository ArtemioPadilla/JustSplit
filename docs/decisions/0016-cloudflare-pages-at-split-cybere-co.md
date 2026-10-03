# 0016 — Cloudflare Pages at split.cybere.co

## Status

`Accepted` — `risk:high` (it changes where and how production is hosted and deployed, and it puts
deploy credentials in a public repository's CI). **Supersedes the hosting choice of spec D2**
(GitHub Pages) and the deploy half of spec D8 (`deploy.yml` on `actions/deploy-pages`,
`deploy-staging.yml`); the rest of D2 (static output, the `404.astro` shell, `withBase()`,
`trailingSlash: 'ignore'`) stands. GitHub Pages stays the documented fallback.

Date: 2026-10-03 (plan B20a; decided by the owner the same day)

## Context

Spec D2 chose GitHub Pages, with a custom domain preferred and `https://artemiopadilla.github.io/JustSplit/`
as the subpath fallback. Nothing about it was deployed under that name yet: the staging site was the
`inceptor` branch on the project-pages URL, and no custom domain existed. Four things changed on
2026-10-03:

1. **The domain exists.** `cybere.co` is a Cloudflare zone (proxied DNS; the apex is itself a GitHub Pages
   site behind Cloudflare). The owner wants `split.cybere.co` from day one, and `justsplit.cybere.co` to
   redirect to it because the CyberEco Hub's code already links to that name
   (`cybereco-hub` `apps/hub/src/pages/api/auth/generate-token.ts:11`, `apps/hub/src/middleware.ts:214`).
2. **Nothing needs to be preserved on Firebase.** Nobody ever used the `*.web.app` app and there is no
   data: the project is deleted, with no rollback window, no Firestore export and no "we moved" page.
3. **GitHub Pages has no per-PR previews and no response headers.** Spec D2 recorded both and named
   Cloudflare Pages as the alternative to revisit "if the lack of previews hurts". The headers matter more
   now: the app holds sessions and group financial data, and a static host that cannot send HSTS, a CSP or
   `frame-ancestors` leaves all of that to `<meta>` tags (which cannot do `frame-ancestors`).
4. **`main` protection and the cutover shape** were decided with it (see Consequences).

## Decision

**Production is Cloudflare Pages, project `justsplit`, served at `https://split.cybere.co`, from the root
(no base path).**

- **Canonical origin** `https://split.cybere.co`, single-sourced in `site.config.mjs` and
  `src/lib/site-meta.ts` (kept in sync by `site-meta.test.ts`), `public/robots.txt`, and `<link
  rel="canonical">` in `BaseLayout` (new in this issue: there was only a JSON-LD `url`). `check:dist`
  fails the build when a canonical link or a sitemap URL names any other origin.
- **`justsplit.cybere.co` is only a redirect**, a Cloudflare zone Redirect Rule (no Pages Function, no code,
  nothing in the static site): hostname equals `justsplit.cybere.co` → 301 to
  `concat("https://split.cybere.co", http.request.uri.path)` with "Preserve query string" on, behind a
  proxied placeholder DNS record (`AAAA justsplit 100::`). It never serves a page, so no canonical link,
  sitemap or JSON-LD may name it. The Hub's references can be switched to `split.cybere.co` later, in the
  Hub repository; that is not part of this change.
- **Base path.** `ASTRO_BASE` defaults to `/` everywhere. The variable survives for local experiments and
  for a fork on GitHub project pages; `withBase()` still works for any base (`production-base.test.ts`,
  `pwa-config.test.ts` for `/JustSplit` and `/`, `static-server.test.ts`, and
  `OFFLINE_SMOKE_BASE=/JustSplit npm run check:offline` for a real subpath build). The workflows have no
  `ASTRO_BASE` and no `/JustSplit` fallback; the offline smoke builds at the production base `/`.
- **Deploy** is GitHub Actions build + `wrangler pages deploy` (`cloudflare/wrangler-action` v4.1.3 pinned
  to its commit SHA, wrangler pinned to 4.147.0). `deploy-staging.yml` is deleted: previews replace it.
  - `main` → the production branch of the project (`split.cybere.co`).
  - every other branch (the ones `ci.yml` builds: `inceptor`, `phase-*/**`, `feat/**`, `fix/**`, `docs/**`,
    `chore/**`, `claude/**`) → a preview, `<branch>.justsplit.pages.dev`. Until the cutover the `inceptor`
    preview is the staging site that B18 audits.
  - The branch name reaches the CLI only through `scripts/pages-target.mjs`, which reduces it to
    `[A-Za-z0-9._/-]`, never lets it start with a dash and refuses tags and PR merge refs (a ref may legally
    contain `$`, `(`, `;`, backticks).
- **Gate: a reusable workflow called from `ci.yml` with `needs: [build, rls]`.** `deploy.yml` has only
  `on: workflow_call`; `ci.yml`'s `deploy` job runs on pushes only and only after both required jobs
  ("Build & Check" and "RLS & contract") pass for that commit. `workflow_run` was rejected: it runs the
  workflow file from the *default branch* (the frozen Next tree until the cutover, so `inceptor` previews
  would never fire), it needs extra care to deploy the commit that was tested and not whatever is at the
  branch tip, and it runs with secrets for runs triggered by fork PRs unless guarded. A second set of
  checks inside `deploy.yml` would run the whole gate twice. There is **no `workflow_dispatch`**: a manual
  deploy is a way to ship a red commit. Re-running a CI run (or an old one) re-runs the gate and the
  deploy. `pull_request`, and so every fork PR, never reaches a secret; `pull_request_target` appears in
  no workflow (`deploy-workflow.test.ts` pins both).
- **Credentials.** Secrets `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit only) and
  `CLOUDFLARE_ACCOUNT_ID`, handed to the job by name (never `secrets: inherit`) and to the action as
  inputs, which it masks; never in a shell step or an `env` block. The public config
  (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY`, `PUBLIC_AUTH_GOOGLE`) is repository **variables**: it is
  browser-public by design (RLS is the authorization). The deploy holds no `GH_PACKAGES_TOKEN` (the
  `@cyber-eco/*` packages are vendored tarballs) and passes no GitHub token to the wrangler action
  (`permissions: contents: read` only). A guard step fails the deploy, naming the variable but never a
  value, if the Supabase pair is missing: a build without it succeeds and ships an app that cannot sign in.
- **Headers: `dist/_headers`, generated at build.** An Astro integration (`pages-headers.config.mjs`, last
  in the list) writes it from the finished HTML on every build, including the private builds of
  `check:offline` and `test:live`:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`. **No `preload`**: eligibility needs
    the apex `cybere.co` to send it with `includeSubDomains`, which commits every subdomain of the zone,
    and removal from the preload list takes months. That is the zone owner's decision, not this app's.
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
    `X-Frame-Options: DENY` (and CSP `frame-ancestors 'none'`).
  - `Permissions-Policy` with every feature off, camera included: the avatar and receipt pickers are plain
    `<input type="file" accept="image/*">` (no `capture`, no `getUserMedia`), so nothing needs the camera.
    Only feature names every current browser recognises are listed, because an unknown name is a console
    error and the live smoke fails on those.
  - `Cache-Control: public, max-age=31536000, immutable` for `/_astro/*` (content-hashed); `no-cache` for
    everything else, which covers the HTML, `sw.js` and the manifest. Cloudflare Pages *joins* a header set
    by several matching rules with a comma, so the default is on `/*` and `/_astro/*` detaches it (`!`)
    before setting its own (verified with `wrangler pages dev`, which runs Pages' own asset handler).
  - **CSP, enforced** (never report-only):
    ```
    default-src 'self'; script-src 'self' 'sha256-…'×N; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: <supabase https> https://*.googleusercontent.com;
    connect-src 'self' <supabase https> <supabase wss> https://open.er-api.com; worker-src 'self'; manifest-src 'self';
    base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'
    ```
    - **`script-src` is `'self'` plus the sha256 of every executable inline script**, computed at build time
      from `dist/**/*.html` (`scripts/lib/pages-headers.mjs`), so the hashes cannot drift from the markup.
      14 distinct scripts today: the theme script, the view-transition guard (both in `BaseLayout`), the
      app-nav script, the FeedbackFAB telemetry capture, Astro's island bootstrap (one variant per `client:*`
      directive), the four redirect stubs' `location.replace`, and React's streaming-SSR completion snippets
      on `/showcase`. **JSON-LD is not executed and needs no hash** (the generator skips every `type` that is
      not JavaScript, module or an import map). No `'unsafe-inline'`, no `'unsafe-eval'`, no `wasm-unsafe-eval`,
      no host source. One policy for every path, so it carries the union (about 1.1 kB, under Cloudflare's
      2000-character line limit; a test pins that and the 100-rule limit).
    - **`style-src 'unsafe-inline'`** is kept on purpose: React SSR writes `style="…"` attributes and Astro
      inlines small stylesheets as `<style>`, both blocked without it, and a style cannot run script.
      Google Fonts serves its stylesheet from `fonts.googleapis.com` and the files from `fonts.gstatic.com`.
    - **`img-src`**: `blob:` for the photo and receipt previews, the Supabase origin for signed Storage URLs,
      `*.googleusercontent.com` for OAuth avatars. `profiles.avatarUrl` is user-writable and may hold any
      `https:` URL; other hosts no longer load (the initials fallback shows), which also closes a tracking
      pixel against everyone who views that profile.
    - **`connect-src`**: the project over https (REST, Auth, Storage) and wss (Realtime) from
      `PUBLIC_SUPABASE_URL` at build time (parsed with `new URL`, never pasted: a malformed value throws,
      and with no project configured the CSP names no Supabase host), and the exchange-rate API (ADR 0007).
  - `check:dist` re-derives the hashes from `dist/` independently of the integration's own run and fails on
    a missing hash, `unsafe-eval`, `unsafe-inline` in `script-src`, or a project origin missing from
    `connect-src`.
- **The smokes run under the real policy.** `scripts/lib/static-server.mjs` applies `dist/_headers` with
  Pages' semantics (splat, placeholders, comma-joined duplicates, `!` detach) and answers Pages'
  canonical-URL redirects (308: `/x` → `/x/`, `/x/index.html` → `/x/`, `/404.html` → `/404`, query kept), so
  `check:a11y`, `check:offline` and `test:live` run under the CSP and through the redirects the service
  worker's precache meets in production; any CSP violation is a console error that fails the live smoke.
  Running it found two things, both fixed in this issue: axe's default asset preload fetches cross-origin
  stylesheets with an XHR that `connect-src` refuses (a console error from the audit, not the app; the audits
  now pass `preload: false`), and links like `/expenses/new?event=…` now arrive as
  `/expenses/new/?event=…`.
- **404 and redirects, confirmed with `wrangler pages dev` on the real `dist/`** (Pages' own asset
  handler): an unknown path (`/expenses/abc`, `/nope/deeper/path`) is served `404.html` with status 404,
  which is exactly what the `404.astro` shell / `AppRouterIsland` design needs; the three `meta refresh`
  stubs (`/expenses/`, `/events/`, `/groups/`) still work and `_redirects` is not needed for them (the stubs
  work as they are, and a `_redirects` file would add a second place to keep in step); `/x` redirects to `/x/` with the query preserved; `/404.html` redirects to `/404`, which Pages
  serves 200 (the worker's precache follows redirects and copies the response, and `check:offline` proves
  the worker still installs and answers `/expenses/abc` offline).
- **Google sign-in is off.** The Supabase Google provider stays disabled (owner decision 2026-10-03). The UI
  follows the build-time flag `PUBLIC_AUTH_GOOGLE` (`src/lib/auth-providers.ts`): only the exact string
  `'true'` shows the button and the help-page sentence; the default is off, nothing hints at a disabled
  provider, the button's copy is not even bundled (`check:dist`), and email/password and the email
  confirmation / reset callbacks are unaffected. The flag hides UI; the disabled provider is what refuses a
  Google sign-in. To enable it later: SETUP.md "Enable Google later".
- **Supabase / OAuth origins.** Site URL `https://split.cybere.co`; Redirect URLs
  `https://split.cybere.co/auth/callback/` and `https://*.justsplit.pages.dev/auth/callback/` (previews). A
  wildcard in the redirect allow-list is acceptable here because the allow-list only *permits* a target:
  each sign-in picks its own `redirectTo` on the current origin (B4), and `*.justsplit.pages.dev` is
  Cloudflare-controlled for this account's project. When Google is enabled, the redirect URI in the Google
  OAuth client is **Supabase's own callback**, `https://<ref>.supabase.co/auth/v1/callback`, unchanged by
  this move; "Authorized JavaScript origins" are **not** needed, because the flow is a server-side PKCE
  redirect, not Google Identity Services or a popup.

## Alternatives

- **GitHub Pages (spec D2). Kept as the documented fallback.** It works with this code unchanged:
  `ASTRO_BASE=/JustSplit`, the old `deploy.yml` from git history, no `_headers` (so no HSTS/CSP/`frame-ancestors`
  from the host; only a `<meta>` CSP, which cannot do `frame-ancestors`), no per-PR previews, one shared
  `github-pages` environment to configure. Rejected because the zone is already on Cloudflare, previews are
  wanted and the headers matter.
- **Cloudflare Workers with static assets.** Cloudflare now steers new projects there (wrangler's own error
  for a missing Pages project says so). Pages is still supported and has the two features this needs with no
  extra configuration (branch previews at `<branch>.<project>.pages.dev`, `_headers`/404 semantics tested
  above); the move later would keep the same `dist/` and `_headers`. Recorded as an open question.
- **A `workflow_run`-gated deploy, a deploy of CI's own artifact.** Rejected above; CI builds without the
  Supabase variables on purpose, so its `dist/` cannot be the deployed one.
- **Netlify / Vercel / Firebase Hosting.** No advantage over a platform the zone already uses; Firebase is
  being deleted.
- **A Pages Function for `justsplit.cybere.co`.** A zone Redirect Rule does the same with no runtime and no
  code.

## Consequences

**Positive** — one canonical origin and no base path (every `withBase()` is an identity in production);
real security headers with an enforced CSP that is regenerated from the build, so it cannot go stale; per-
branch previews that replace the staging workflow; a deploy that cannot publish a red commit, a fork PR or
an unreviewed `pull_request_target` run; a faster, simpler workflow set (four workflows: `ci`, `deploy`,
`db-migrate`, `claude`).

**Negative** — a second platform to hold credentials for (an API token with Pages:Edit); the project must be
created by hand once (`wrangler pages deploy` refuses to create a project non-interactively, and a first
deploy from a preview branch would make *that* branch the production branch); the Lighthouse SEO category may
fail on a `*.pages.dev` preview if Cloudflare adds `X-Robots-Tag: noindex` to previews, which is believed but not verified
here (B18 checks the header first; the category is then read from the first production run);
a CSP must be kept true when markup changes (the build regenerates it, `check:dist` fails when it would
block a page, and the live smoke fails on any violation); `'unsafe-inline'` for styles stays.

**Neutral** — Cloudflare features that rewrite or inject into HTML must stay off for this host, because they
would change an inline script (its hash would no longer match) or add one the CSP blocks: Rocket Loader,
Email Address Obfuscation, and the automatic Web Analytics beacon (use the dashboard's manual snippet only if
`static.cloudflareinsights.com` is added to `script-src` and `connect-src` on purpose). Auto Minify no longer
exists. `Cache-Control: no-store` on 404 responses is Pages' own.

## Stakeholder Analysis

| Stakeholder | Impact | Mitigation |
|---|---|---|
| People using the app | A new, permanent URL; HTTPS everywhere; a stricter browser sandbox (no framing, no camera, images only from the project, Google avatars and the app). Nobody used the Firebase URL, so nothing breaks. An avatar URL on another host stops loading (the initials show). | The origin is the final one from day one, so there is no second move; the 404 shell, the offline shell and the redirect stubs are verified under the real policy. |
| Anyone with the old `justsplit.cybere.co` link (the Hub) | The name only redirects. | One zone Redirect Rule, 301, path and query preserved; the Hub's links can be updated later in its own repository. |
| The owner | Holds a Cloudflare API token in GitHub secrets; must create the project, add the domain and set variables once; Firebase is deleted with no way back. | The token is scoped to Account → Cloudflare Pages → Edit only; owner steps are a numbered table in SETUP.md; deleting Firebase is a decision already taken (nothing depends on it), and the code history keeps the old tree under the `next-final` tag. |
| Contributors, and anyone who can open a PR | A PR can no longer run a deploy and no fork can reach a secret; a push to a branch in this repository deploys a preview of code that already passed the gate. | Pushes only, `needs: [build, rls]`, repository guard, no `pull_request_target`, no `workflow_dispatch`, secrets by name and only as the wrangler action's inputs, SHA-pinned actions (an existing scan enforces it), actionlint, `permissions: contents: read`, a sanitised branch name. A collaborator with write access can still deploy a preview of their own branch: that is the same trust as merging to `inceptor`, and previews hold the same public config as production. |
| Search engines and agents | One canonical origin: the canonical link, sitemap, JSON-LD, robots and `llms.txt` all name `split.cybere.co`; previews are non-canonical. | `site-meta.test.ts`, `production-base.test.ts` and `check:dist`. |
| Security reviewers | Enforced CSP without script `'unsafe-inline'`/`'unsafe-eval'`, HSTS, frame denial, nosniff, referrer and permissions policies. Remaining soft spots are stated: style `'unsafe-inline'`, no HSTS preload, no COOP/COEP. | Reasons above; `check:dist` and the live smoke keep the policy honest. |
| Users who would want Google sign-in | Not offered for now (owner decision). | Email/password is complete; the flag and SETUP steps make enabling it a variable change plus a redeploy. |
| Future contributors | A new inline script or a new third-party host needs no manual CSP edit for scripts (hashed automatically) but does for hosts. | `check:dist` and the live smoke name the blocked thing; this ADR lists what each directive allows and why. |

## Rollback

- **A bad deployment:** Cloudflare dashboard → Workers & Pages → `justsplit` → Deployments → pick a previous
  production deployment → "Rollback to this deployment". Instant; nothing is rebuilt. Or re-run the CI run of
  an older commit on `main` (the gate runs again, then the deploy), or revert the merge: the push redeploys.
- **The platform:** point DNS at a GitHub Pages site built from the old workflow (git history) with
  `ASTRO_BASE=/` and a `CNAME` file, accepting the loss of headers and previews. Supabase is untouched
  either way.
- **Firebase has no rollback, by decision.** The Next tree stays reachable as the `next-final` tag.

## Owner steps

The numbered table is SETUP.md §4 ("B20a"): create the Pages project (`wrangler pages project create
justsplit --production-branch=main`), add the custom domain `split.cybere.co`, create the scoped API token,
add the secrets and the variables (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY`, and optionally
`PUBLIC_AUTH_GOOGLE`), delete the obsolete `ASTRO_BASE` variable and `github-pages` environment, set the
Supabase URL configuration, run `db-migrate.yml`, create the `justsplit.cybere.co` DNS record and Redirect
Rule, and delete the Firebase project and the `FIREBASE_SERVICE_ACCOUNT*` secrets. "Enable Google later" is
a separate row there.

## Open questions

- Cloudflare Workers static assets instead of Pages (see Alternatives): same `dist/` and `_headers`, a
  different deploy command and preview URL shape. Revisit if Pages stops being supported for new features.
- Whether a `*.pages.dev` preview carries `X-Robots-Tag: noindex` (affects Lighthouse SEO in B18 only).
- HSTS preload and COOP are zone-level decisions for the owner of `cybere.co`.

## Supersedes

The hosting choice of spec D2 (GitHub Pages) and the deploy workflows of spec D8 (`deploy.yml` on
`actions/deploy-pages`, `deploy-staging.yml`), in the spec, `CLAUDE.md`, `SETUP.md` and the plan.

## References

- Spec D2, D8: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan B18, B20, B20a, B21, B22: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- [ADR 0007](./0007-exchange-rate-provider.md) (the one third-party API), [ADR 0011](./0011-supabase-via-cybereco-data-layer.md)
- `.github/workflows/deploy.yml`, `ci.yml`, `scripts/pages-target.mjs`, `scripts/lib/pages-headers.mjs`,
  `pages-headers.config.mjs`, `scripts/check-dist.mjs`
- Cloudflare Pages: Headers, Redirects, Serving Pages (404.html), Direct Upload, Preview deployments
- `cybereco-hub` `apps/hub/src/pages/api/auth/generate-token.ts:11`, `apps/hub/src/middleware.ts:214`
