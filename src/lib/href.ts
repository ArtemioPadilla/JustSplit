/**
 * Base-aware URL helper for internal links and public assets.
 *
 * When the site is deployed under a subpath (GitHub project pages serve at
 * `<domain>/<repo>/`), every internal link and `public/` asset reference must
 * be prefixed with Astro's `base`. Astro automatically prefixes built CSS/JS
 * and `<Image>` output, but NOT hardcoded string hrefs in markup — those go
 * through here.
 *
 * `import.meta.env.BASE_URL` is `/` in dev and at root deploys, and
 * `/<repo>/` (with trailing slash) when `base` is set for the Pages build.
 *
 *   withBase('/gallery/')   → '/gallery/'                     (dev / root)
 *                           → '/justsplit/gallery/'  (Pages)
 *   withBase('/favicon.svg')→ same idea for public assets
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, ''); // strip trailing slash
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}

/**
 * Route families the app actually serves a `?next=` redirect into (plan B4).
 * Keep in sync with `src/lib/app-routes.ts`'s dynamic-route prefixes plus the
 * static list pages/detail routes that live under the same first segment.
 */
const NEXT_ROUTE_FAMILIES: ReadonlySet<string> = new Set([
  'expenses',
  'events',
  'groups',
  'friends',
  'settlements',
  'profile',
]);

/** Same-origin path, optionally with a query string, no dot-dot, no scheme. */
const SAFE_NEXT_RE = /^\/(?!\/)[A-Za-z0-9_\-/]*(\?[A-Za-z0-9_\-=&%.]*)?$/;

/**
 * Validates a redirect target read from an untrusted source (the auth pages'
 * `?next=` query param, or the value round-tripped through `sessionStorage`
 * for the Google OAuth redirect flow). With `ASTRO_BASE` unset,
 * `withBase('//evil.example')` is a protocol-relative URL that leaves the
 * site — a classic open redirect the subpath deploy would otherwise mask —
 * so this returns `'/'` unless `next` is a same-origin path (no scheme, no
 * protocol-relative `//`, no backslashes) whose first segment is one of the
 * app's route families. The caller still passes the result through
 * `withBase()` before navigating.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !SAFE_NEXT_RE.test(next)) return '/';
  const pathname = next.split('?')[0] ?? '';
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  if (!firstSegment || !NEXT_ROUTE_FAMILIES.has(firstSegment)) return '/';
  return next;
}
