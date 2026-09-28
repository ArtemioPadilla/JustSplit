/**
 * Client-only dynamic routes (spec D2, plan B2c).
 *
 * GitHub Pages has no rewrites, so a URL whose id is user data
 * (`/expenses/<id>`) is served by `dist/404.html`: the app shell, whose
 * AppRouterIsland maps `location.pathname` to a route island with this pure
 * matcher. Static routes (`/expenses/list`, `/expenses/new`, …) are real Astro
 * pages and never reach it.
 */
export type RouteName =
  | 'expense-detail'
  | 'expense-edit'
  | 'event-detail'
  | 'event-edit'
  | 'group-detail'
  | 'friend-detail'
  | 'not-found';

export interface RouteMatch {
  name: RouteName;
  /** The decoded id segment; absent for `not-found`. */
  id?: string;
}

interface RoutePattern {
  name: Exclude<RouteName, 'not-found'>;
  /** Literal path segments before the id, e.g. ['expenses', 'edit']. */
  prefix: readonly string[];
}

/** Order matters: `/expenses/edit/:id` must win over `/expenses/:id`. */
export const DYNAMIC_ROUTES: readonly RoutePattern[] = [
  { name: 'expense-edit', prefix: ['expenses', 'edit'] },
  { name: 'expense-detail', prefix: ['expenses'] },
  { name: 'event-edit', prefix: ['events', 'edit'] },
  { name: 'event-detail', prefix: ['events'] },
  { name: 'group-detail', prefix: ['groups'] },
  { name: 'friend-detail', prefix: ['friends'] },
];

/**
 * Segments that are static pages (or will be, in Phase 2) under a route
 * family. If one of them reaches the shell the page is missing, which is a
 * not-found, never "an expense whose id is `list`".
 */
export const RESERVED_SEGMENTS: ReadonlySet<string> = new Set(['list', 'new', 'edit', 'index', 'index.html']);

/** Removes Astro's `base` (e.g. `/JustSplit/`) from the front of a pathname. */
export function stripBase(pathname: string, base: string): string {
  const b = base.replace(/\/+$/, '');
  if (!b) return pathname;
  if (pathname === b) return '/';
  return pathname.startsWith(`${b}/`) ? pathname.slice(b.length) : pathname;
}

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function matchRoute(pathname: string, base = '/'): RouteMatch {
  const segments = stripBase(pathname, base)
    .split('/')
    .filter((s) => s.length > 0);

  for (const route of DYNAMIC_ROUTES) {
    if (segments.length !== route.prefix.length + 1) continue;
    if (!route.prefix.every((p, i) => segments[i] === p)) continue;
    const id = decode(segments[route.prefix.length]!);
    if (!id || id.includes('/') || RESERVED_SEGMENTS.has(id)) return { name: 'not-found' };
    return { name: route.name, id };
  }
  return { name: 'not-found' };
}
