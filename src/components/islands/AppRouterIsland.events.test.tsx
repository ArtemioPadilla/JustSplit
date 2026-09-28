// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Plan B11b: `event-detail` and `event-edit` are the last two dynamic routes
 * wired to a real view instead of `RouteStub`, each through its OWN
 * `React.lazy` boundary — same reasoning as B9's `expense-detail`, B10's
 * `expense-edit`, B12's `group-detail` and B13's `friend-detail`. The views are
 * mocked here (`EventDetailView.test.tsx` / `EventEditView.test.tsx` are their
 * own jobs); this file only proves the router's wiring, that
 * `/events/edit/:id` wins over `/events/:id`, and that the static pages under
 * the family (`/events/list`, `/events/new`) never reach either view.
 */
vi.mock('./routes/EventDetailView', () => ({
  default: ({ id }: { id: string }) => <div data-testid="event-detail-view">{id}</div>,
}));
vi.mock('./routes/EventEditView', () => ({
  default: ({ id }: { id: string }) => <div data-testid="event-edit-view">{id}</div>,
}));

const { default: AppRouterIsland } = await import('./AppRouterIsland');

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function at(path: string) {
  window.history.replaceState(null, '', path);
}

describe('AppRouterIsland — events (plan B11b)', () => {
  it('lazily resolves /events/<id> to EventDetailView with the id', async () => {
    at('/events/ev1');
    render(<AppRouterIsland />);
    expect(await screen.findByTestId('event-detail-view')).toHaveTextContent('ev1');
    expect(screen.queryByTestId('event-edit-view')).not.toBeInTheDocument();
  });

  it('lazily resolves /events/edit/<id> to EventEditView with the id, never to the detail view', async () => {
    at('/events/edit/ev1');
    render(<AppRouterIsland />);
    expect(await screen.findByTestId('event-edit-view')).toHaveTextContent('ev1');
    expect(screen.queryByTestId('event-detail-view')).not.toBeInTheDocument();
  });

  it.each(['/events/list', '/events/new'])('%s never reaches a route view — it is a reserved segment (a real static page)', (path) => {
    at(path);
    render(<AppRouterIsland />);
    expect(screen.queryByTestId('event-detail-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('event-edit-view')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /not found/i })).toBeInTheDocument();
  });
});
