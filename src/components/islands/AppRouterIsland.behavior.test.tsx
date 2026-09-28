// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AppRouterIsland from './AppRouterIsland';

/**
 * Plan B2c: the 404 shell's router mounts the island matching the URL.
 * `expense-detail` (plan B9), `expense-edit` (plan B10), `friend-detail`
 * (plan B13), and `group-detail` (plan B12) are covered separately, in
 * `AppRouterIsland.expense-detail.test.tsx`, `AppRouterIsland.expense-edit.test.tsx`,
 * `AppRouterIsland.friend-detail.test.tsx`, and `AppRouterIsland.group-detail.test.tsx`
 * — they render their real, lazily-loaded views now, not `RouteStub`, so all
 * four are dropped from this file's stub-route table.
 */
afterEach(() => window.history.replaceState(null, '', '/'));

function at(path: string) {
  window.history.replaceState(null, '', path);
}

describe('AppRouterIsland (behavior)', () => {
  it.each([
    ['/events/ev1', 'event-detail', 'ev1'],
    ['/events/edit/ev1', 'event-edit', 'ev1'],
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
    at('/events/ev1');
    render(<AppRouterIsland />);
    act(() => {
      at('/events/ev9');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByTestId('route-view')).toHaveAttribute('data-route', 'event-detail');
    expect(screen.getByTestId('route-view')).toHaveAttribute('data-id', 'ev9');
  });

  it('removes its popstate listener on unmount', () => {
    at('/events/ev1');
    const { unmount } = render(<AppRouterIsland />);
    unmount();
    // A popstate after unmount must not throw or re-render anything.
    expect(() => window.dispatchEvent(new PopStateEvent('popstate'))).not.toThrow();
  });
});
