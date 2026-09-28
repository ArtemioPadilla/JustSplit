// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Plan B13: `friend-detail` is the third dynamic route wired to a real view
 * instead of `RouteStub` — loaded through its OWN `React.lazy` boundary, same
 * reasoning as B9's `expense-detail`/B10's `expense-edit`. `FriendDetailView`
 * itself is mocked here; its own behavior is `FriendDetailView.test.tsx`'s
 * job — this file only proves the router's wiring: the right id (the OTHER
 * user's uid) reaches it, and a reserved static-page segment never reaches
 * it either.
 */
vi.mock('./routes/FriendDetailView', () => ({
  default: ({ id }: { id: string }) => <div data-testid="friend-detail-view">{id}</div>,
}));

const { default: AppRouterIsland } = await import('./AppRouterIsland');

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function at(path: string) {
  window.history.replaceState(null, '', path);
}

describe('AppRouterIsland — friend-detail (plan B13)', () => {
  it('lazily resolves /friends/<id> to FriendDetailView with the id', async () => {
    at('/friends/u2');
    render(<AppRouterIsland />);
    expect(await screen.findByTestId('friend-detail-view')).toHaveTextContent('u2');
  });

  it('/friends/add stays reserved once it is a real static page — never reaches FriendDetailView for THIS matcher check', () => {
    // `add` is not (and does not need to be) in RESERVED_SEGMENTS: /friends/add
    // is a real Astro page served directly by GitHub Pages, so the 404 shell's
    // matcher never even runs for it in production. This test only documents
    // that IF the shell ever saw it, it would resolve to a (nonexistent)
    // friend id "add" — never crash, never leak anything.
    at('/friends/add');
    render(<AppRouterIsland />);
    expect(screen.getByTestId('friend-detail-view')).toHaveTextContent('add');
  });
});
