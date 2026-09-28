// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AppRouterIsland from './AppRouterIsland';

/**
 * Plan B2c: the 404 shell's router mounts the island matching the URL.
 * `expense-detail` (plan B9) and `expense-edit` (plan B10) are covered
 * separately, in `AppRouterIsland.expense-detail.test.tsx` and
 * `AppRouterIsland.expense-edit.test.tsx` — they render their real, lazily-
 * loaded views now, not `RouteStub`, so both are dropped from this file's
 * stub-route table.
 */
afterEach(() => window.history.replaceState(null, '', '/'));

function at(path: string) {
  window.history.replaceState(null, '', path);
}

describe('AppRouterIsland (behavior)', () => {
  it.each([
    ['/events/ev1', 'event-detail', 'ev1'],
    ['/events/edit/ev1', 'event-edit', 'ev1'],
    ['/groups/g1', 'group-detail', 'g1'],
    ['/friends/f1', 'friend-detail', 'f1'],
  ])('%s mounts the %s route with its id', (path, route, id) => {
    at(path);
    render(<AppRouterIsland />);
    const view = screen.getByTestId('route-view');
    expect(view).toHaveAttribute('data-route', route);
    expect(view).toHaveAttribute('data-id', id);
  });

  it('renders the not-found view for an unknown path', () => {
    at('/definitely/not/a/route');
    render(<AppRouterIsland />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/not found|no encontrada/i);
    expect(screen.queryByTestId('route-view')).toBeNull();
  });

  it('re-matches on popstate (back/forward inside the shell)', () => {
    at('/groups/g1');
    render(<AppRouterIsland />);
    act(() => {
      at('/friends/f9');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByTestId('route-view')).toHaveAttribute('data-route', 'friend-detail');
    expect(screen.getByTestId('route-view')).toHaveAttribute('data-id', 'f9');
  });

  it('removes its popstate listener on unmount', () => {
    at('/groups/g1');
    const { unmount } = render(<AppRouterIsland />);
    unmount();
    // A popstate after unmount must not throw or re-render anything.
    expect(() => window.dispatchEvent(new PopStateEvent('popstate'))).not.toThrow();
  });
});
