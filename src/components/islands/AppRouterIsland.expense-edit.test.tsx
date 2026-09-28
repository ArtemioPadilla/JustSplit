// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Plan B10: `expense-edit` is the second dynamic route wired to a real view
 * instead of `RouteStub` (after `expense-detail`, plan B9) — loaded through
 * its OWN `React.lazy` boundary. `ExpenseEditView` itself is mocked here
 * (`ExpenseEditView.test.tsx`, if any, is its own job) — this only proves
 * the router's wiring, and that `/expenses/edit/:id` wins over
 * `/expenses/:id` (route pattern order in `app-routes.ts`, unchanged by
 * this issue but re-asserted at the router level).
 */
vi.mock('./routes/ExpenseEditView', () => ({
  default: ({ id }: { id: string }) => <div data-testid="expense-edit-view">{id}</div>,
}));
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

describe('AppRouterIsland — expense-edit (plan B10)', () => {
  it('lazily resolves /expenses/edit/<id> to ExpenseEditView with the id', async () => {
    at('/expenses/edit/abc');
    render(<AppRouterIsland />);
    expect(await screen.findByTestId('expense-edit-view')).toHaveTextContent('abc');
    expect(screen.queryByTestId('expense-detail-view')).not.toBeInTheDocument();
  });

  it('/expenses/edit/:id wins over /expenses/:id — never mistaken for an expense whose id is "edit"', async () => {
    at('/expenses/edit/abc');
    render(<AppRouterIsland />);
    expect(await screen.findByTestId('expense-edit-view')).toBeInTheDocument();
  });
});
