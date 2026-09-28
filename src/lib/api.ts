/**
 * Backend discovery — the single seam between the static frontend and the
 * optional self-hosted backend (`server-node/` or `server-flask/`, ADR 0006).
 *
 * Everything keys off one public env var, `PUBLIC_API_BASE`:
 *
 *   - **unset / empty** → static mode. The site behaves exactly as it did
 *     before the backend existed: forms run in demo mode and the GitHub
 *     islands hit `api.github.com` directly (rate-limited, CORS-exposed).
 *
 *   - **set** (e.g. `https://api.example.com`) → the GitHub islands route
 *     through `${PUBLIC_API_BASE}/api/issues` (token proxy, no rate limit) and
 *     the forms fall back to the backend's handlers when their own dedicated
 *     endpoint env vars are unset.
 *
 * This keeps the GitHub Pages build a no-op opt-out: the backend is additive.
 */

/** Trimmed, trailing-slash-free API origin, or '' when no backend is wired. */
export const apiBase: string = (
  (import.meta.env.PUBLIC_API_BASE as string | undefined) ?? ''
)
  .trim()
  .replace(/\/+$/, '');

/** True when a self-hosted backend is configured. */
export const apiEnabled = apiBase.length > 0;

/** Build a backend API URL: `apiUrl('/api/issues')`. Empty base → relative. */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${apiBase}${p}`;
}

/**
 * Where to read GitHub issues from. Through the backend proxy when one is
 * configured (authenticated, no 60 req/h cap); straight from GitHub otherwise.
 */
export function githubIssuesUrl(
  repo: string,
  state: 'open' | 'closed' | 'all',
  perPage = 30,
): string {
  if (apiEnabled) {
    return apiUrl(`/api/issues?state=${state}&per_page=${perPage}`);
  }
  return `https://api.github.com/repos/${repo}/issues?state=${state}&per_page=${perPage}`;
}

/** Repo stats (stars/forks/open issues). Backend proxy or GitHub direct. */
export function repoStatsUrl(repo: string): string {
  if (apiEnabled) return apiUrl('/api/repo-stats');
  return `https://api.github.com/repos/${repo}`;
}

/**
 * Resolve a form's POST target. Honors a dedicated endpoint env var first
 * (Web3Forms/Formspree/etc.), then falls back to the backend handler when a
 * backend is wired, then '' (demo mode).
 */
export function formEndpoint(dedicated: string | undefined, backendPath: string): string {
  const explicit = (dedicated ?? '').trim();
  if (explicit) return explicit;
  if (apiEnabled) return apiUrl(backendPath);
  return '';
}
