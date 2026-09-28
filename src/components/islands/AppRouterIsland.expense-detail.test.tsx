// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Plan B9: `expense-detail` is the first dynamic route wired to a real view
 * instead of `RouteStub` — loaded through its OWN `React.lazy` boundary (not
 * a static import) so the 404 shell doesn't statically carry the detail
 * view's whole dependency graph. `ExpenseDetailView` itself is mocked here;
 * its own behavior is `ExpenseDetailView.test.tsx`'s job — this file only
 * proves the router's wiring: the right id reaches it, and `list` (a
 * reserved static-page segment, `RESERVED_SEGMENTS` in `app-routes.ts`)
 * still resolves to `NotFoundView`, never "an expense whose id is list".
 */
vi.mock('./routes/ExpenseDetailView', () => ({
  default: ({ id }: { id: string }) => <div data-testid="expense-detail-view">{id}</div>,
}));

const { default: AppRouterIsland } = await import('./AppRouterIsland');

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function at(path: string) {
  window.history.replaceState(null, '', path);
}

describe('AppRouterIsland — expense-detail (plan B9)', () => {
  it('lazily resolves /expenses/<id> to ExpenseDetailView with the id', async () => {
    at('/expenses/abc');
    render(<AppRouterIsland />);
    expect(await screen.findByTestId('expense-detail-view')).toHaveTextContent('abc');
  });

  it('/expenses/list stays reserved — never reaches ExpenseDetailView', () => {
    at('/expenses/list');
    render(<AppRouterIsland />);
    expect(screen.queryByTestId('expense-detail-view')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/not found/i);
  });
});
