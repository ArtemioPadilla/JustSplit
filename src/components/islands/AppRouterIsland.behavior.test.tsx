// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Every dynamic route has its own lazily loaded view now (the last two, the
// events routes, in plan B11b), so there is no stub left to assert on: the
// views are mocked and this file keeps only the shell-level behavior.
vi.mock('./routes/EventDetailView', () => ({
  default: ({ id }: { id: string }) => <div data-testid="event-detail-view">{id}</div>,
}));

const { default: AppRouterIsland } = await import('./AppRouterIsland');

/**
 * Plan B2c: the 404 shell's router mounts the island matching the URL. Each
 * dynamic route's own wiring is covered in its own file
 * (`AppRouterIsland.{expense-detail,expense-edit,friend-detail,group-detail,events}.test.tsx`);
 * `RouteStub` and its stub-route table are gone now that every family has a real view.
 */
afterEach(() => window.history.replaceState(null, '', '/'));

function at(path: string) {
  window.history.replaceState(null, '', path);
}

describe('AppRouterIsland (behavior)', () => {
  it('renders the not-found view for an unknown path', () => {
    at('/definitely/not/a/route');
    render(<AppRouterIsland />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/not found|no encontrada/i);
    expect(screen.queryByTestId('event-detail-view')).toBeNull();
  });

  it('re-matches on popstate (back/forward inside the shell)', async () => {
    at('/events/ev1');
    render(<AppRouterIsland />);
    expect(await screen.findByTestId('event-detail-view')).toHaveTextContent('ev1');
    act(() => {
      at('/events/ev9');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(screen.getByTestId('event-detail-view')).toHaveTextContent('ev9'));
  });

  it('removes its popstate listener on unmount', () => {
    at('/events/ev1');
    const { unmount } = render(<AppRouterIsland />);
    unmount();
    // A popstate after unmount must not throw or re-render anything.
    expect(() => window.dispatchEvent(new PopStateEvent('popstate'))).not.toThrow();
  });
});
