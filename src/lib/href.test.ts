import { describe, expect, it } from 'vitest';
import { safeNext } from './href';

/**
 * `safeNext` guards the auth `?next=` redirect target (plan B4). With
 * `ASTRO_BASE` unset, `withBase('//evil.example')` is a protocol-relative
 * URL — an open redirect the subpath deploy would otherwise mask — so this
 * only ever returns `/` or a same-origin path whose first segment is a known
 * route family.
 */
describe('safeNext (plan B4, spec D2)', () => {
  it('falls back to / for a protocol-relative URL (open redirect)', () => {
    expect(safeNext('//evil.example')).toBe('/');
  });

  it('falls back to / for an absolute URL', () => {
    expect(safeNext('https://evil.example')).toBe('/');
  });

  it('falls back to / for a backslash-prefixed path (browser-normalized redirect trick)', () => {
    expect(safeNext('/\\evil.example')).toBe('/');
  });

  it('falls back to / for a path outside the known route families', () => {
    expect(safeNext('/unknown/x')).toBe('/');
  });

  it('falls back to / for null/undefined/empty', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext(undefined)).toBe('/');
    expect(safeNext('')).toBe('/');
  });

  it('returns a known route-family path with a query string unchanged', () => {
    expect(safeNext('/expenses/abc-1?event=x')).toBe('/expenses/abc-1?event=x');
  });

  it.each(['expenses', 'events', 'groups', 'friends', 'settlements', 'profile'])(
    'allows the %s route family',
    (family) => {
      expect(safeNext(`/${family}/123`)).toBe(`/${family}/123`);
    },
  );
});
