import { describe, expect, it } from 'vitest';
import { matchRoute, stripBase } from './app-routes';

describe('matchRoute (spec D2, plan B2c)', () => {
  it.each([
    ['/expenses/abc123', 'expense-detail', 'abc123'],
    ['/expenses/edit/abc123', 'expense-edit', 'abc123'],
    ['/events/ev-1', 'event-detail', 'ev-1'],
    ['/events/edit/ev-1', 'event-edit', 'ev-1'],
    ['/groups/g-1', 'group-detail', 'g-1'],
    ['/friends/f-1', 'friend-detail', 'f-1'],
  ] as const)('%s → %s', (path, name, id) => {
    expect(matchRoute(path)).toEqual({ name, id });
  });

  it('tolerates a trailing slash', () => {
    expect(matchRoute('/expenses/abc/')).toEqual({ name: 'expense-detail', id: 'abc' });
  });

  it('strips the Pages base path', () => {
    expect(matchRoute('/JustSplit/groups/g-1', '/JustSplit/')).toEqual({ name: 'group-detail', id: 'g-1' });
    expect(matchRoute('/JustSplit/expenses/edit/x/', '/JustSplit')).toEqual({ name: 'expense-edit', id: 'x' });
  });

  it('decodes the id segment', () => {
    expect(matchRoute('/friends/a%20b')).toEqual({ name: 'friend-detail', id: 'a b' });
  });

  it.each([
    '/',
    '/nope',
    '/expenses',
    '/expenses/',
    '/expenses/list',
    '/expenses/new',
    '/expenses/edit',
    '/expenses/a/b',
    '/expenses/edit/a/b',
    '/groups/edit/g-1',
    '/friends/%E0%A4%A',
    '/friends/a%2Fb',
    '/Expenses/abc',
  ])('%s → not-found', (path) => {
    expect(matchRoute(path)).toEqual({ name: 'not-found' });
  });

  it('a path outside the base is not-found', () => {
    expect(matchRoute('/other/expenses/abc', '/JustSplit/')).toEqual({ name: 'not-found' });
  });
});

describe('stripBase', () => {
  it.each([
    ['/JustSplit/x', '/JustSplit/', '/x'],
    ['/JustSplit', '/JustSplit/', '/'],
    ['/JustSplitter/x', '/JustSplit/', '/JustSplitter/x'],
    ['/x', '/', '/x'],
  ])('%s with base %s → %s', (path, base, out) => {
    expect(stripBase(path, base)).toBe(out);
  });
});
