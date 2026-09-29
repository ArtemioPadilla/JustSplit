import { describe, expect, it } from 'vitest';
import { APP_NAV, activeNavItem, sectionOfPath } from './app-nav';

/**
 * The signed-in app's primary navigation (plan B6b): the six sections the
 * header links, and which one a pathname belongs to. `SiteHeader.astro` calls
 * `activeNavItem` at build time for the static pages; the dynamic routes served
 * by 404.html (`/expenses/<id>`) are marked in the browser from the same
 * first-segment rule via each link's `data-section`.
 */
describe('APP_NAV', () => {
  it('lists Dashboard, Expenses, Events, Groups, Friends, Settlements, in that order', () => {
    expect(APP_NAV.map((i) => [i.label, i.href])).toEqual([
      ['Dashboard', '/'],
      ['Expenses', '/expenses/list'],
      ['Events', '/events/list'],
      ['Groups', '/groups/list'],
      ['Friends', '/friends'],
      ['Settlements', '/settlements'],
    ]);
  });

  it('keeps Profile out of the primary nav (it lives in the account menu)', () => {
    expect(APP_NAV.some((i) => /profile/i.test(i.href) || /profile/i.test(i.label))).toBe(false);
  });

  it('gives every item a distinct section key', () => {
    const keys = APP_NAV.map((i) => i.section);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('sectionOfPath', () => {
  it('is the first path segment after the base', () => {
    expect(sectionOfPath('/expenses/list/', '/')).toBe('expenses');
    expect(sectionOfPath('/expenses/abc123', '/')).toBe('expenses');
    expect(sectionOfPath('/events/edit/e1', '/')).toBe('events');
  });

  it('is the empty section for the site root, with or without a base', () => {
    expect(sectionOfPath('/', '/')).toBe('');
    expect(sectionOfPath('/JustSplit/', '/JustSplit/')).toBe('');
    expect(sectionOfPath('/JustSplit', '/JustSplit')).toBe('');
  });

  it('strips a subpath base before taking the segment', () => {
    expect(sectionOfPath('/JustSplit/settlements/', '/JustSplit/')).toBe('settlements');
    expect(sectionOfPath('/JustSplit/friends/f1', '/JustSplit')).toBe('friends');
  });
});

describe('activeNavItem', () => {
  const at = (path: string, base = '/') => activeNavItem(path, base)?.label ?? null;

  it('marks each static section page', () => {
    expect(at('/')).toBe('Dashboard');
    expect(at('/expenses/list/')).toBe('Expenses');
    expect(at('/events/list')).toBe('Events');
    expect(at('/groups/list')).toBe('Groups');
    expect(at('/friends/')).toBe('Friends');
    expect(at('/settlements')).toBe('Settlements');
  });

  it('keeps the section marked on its sub-pages (new, and ids served by the 404 shell)', () => {
    expect(at('/expenses/new')).toBe('Expenses');
    expect(at('/expenses/abc')).toBe('Expenses');
    expect(at('/events/new')).toBe('Events');
    expect(at('/groups/g1')).toBe('Groups');
    expect(at('/friends/f1')).toBe('Friends');
  });

  it('marks nothing on Profile, the 404 shell, or an unknown path', () => {
    expect(at('/profile')).toBeNull();
    expect(at('/404')).toBeNull();
    expect(at('/nope')).toBeNull();
  });

  it('does not mistake a longer first segment for a section (no prefix match on the string)', () => {
    expect(at('/expensesx/list')).toBeNull();
    expect(at('/friendship')).toBeNull();
  });

  it('honours the subpath base', () => {
    expect(at('/JustSplit/', '/JustSplit/')).toBe('Dashboard');
    expect(at('/JustSplit/expenses/list/', '/JustSplit/')).toBe('Expenses');
    expect(at('/JustSplit/profile', '/JustSplit/')).toBeNull();
  });
});
