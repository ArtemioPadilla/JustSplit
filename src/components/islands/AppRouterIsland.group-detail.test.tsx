// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Plan B12: `group-detail` is the fourth dynamic route wired to a real
 * view instead of `RouteStub` — loaded through its OWN `React.lazy`
 * boundary, same reasoning as B9's `expense-detail`/B10's `expense-edit`/
 * B13's `friend-detail`. `GroupDetailView` itself is mocked here; its own
 * behavior is `GroupDetailView.test.tsx`'s job — this file only proves the
 * router's wiring: the group id reaches it, and a reserved static-page
 * segment never reaches it either.
 */
vi.mock('./routes/GroupDetailView', () => ({
  default: ({ id }: { id: string }) => <div data-testid="group-detail-view">{id}</div>,
}));

const { default: AppRouterIsland } = await import('./AppRouterIsland');

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function at(path: string) {
  window.history.replaceState(null, '', path);
}

describe('AppRouterIsland — group-detail (plan B12)', () => {
  it('lazily resolves /groups/<id> to GroupDetailView with the id', async () => {
    at('/groups/g1');
    render(<AppRouterIsland />);
    expect(await screen.findByTestId('group-detail-view')).toHaveTextContent('g1');
  });

  it('/groups/new never reaches GroupDetailView — "new" is a reserved segment (a real static page)', () => {
    at('/groups/new');
    render(<AppRouterIsland />);
    expect(screen.queryByTestId('group-detail-view')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /not found/i })).toBeInTheDocument();
  });
});
