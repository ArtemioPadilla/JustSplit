import { stripBase } from './app-routes';

/**
 * The signed-in app's primary navigation (plan B6b). Profile is deliberately
 * absent: it lives in the account menu (UserMenuIsland).
 *
 * `section` is the first path segment the item owns ('' is the site root, the
 * dashboard). It is emitted as each link's `data-section`, which is how the
 * one tiny inline script in SiteHeader.astro marks a dynamic route
 * (`/expenses/<id>`, served by 404.html, so the build cannot know it) without
 * carrying a copy of this table.
 */
export const APP_NAV = [
  { href: '/', label: 'Dashboard', section: '' },
  { href: '/expenses/list', label: 'Expenses', section: 'expenses' },
  { href: '/events/list', label: 'Events', section: 'events' },
  { href: '/groups/list', label: 'Groups', section: 'groups' },
  { href: '/friends', label: 'Friends', section: 'friends' },
  { href: '/settlements', label: 'Settlements', section: 'settlements' },
] as const;

export type AppNavItem = (typeof APP_NAV)[number];

/** First path segment after Astro's `base` ('' for the site root). */
export function sectionOfPath(pathname: string, base: string): string {
  return stripBase(pathname, base).split('/').find((s) => s.length > 0) ?? '';
}

/**
 * The nav item whose section owns `pathname`, or null (Profile, the 404
 * shell's `/404`, anything unknown). Whole-segment match, never a string
 * prefix: `/friendship` is not Friends.
 */
export function activeNavItem(pathname: string, base: string): AppNavItem | null {
  const section = sectionOfPath(pathname, base);
  return APP_NAV.find((item) => item.section === section) ?? null;
}
