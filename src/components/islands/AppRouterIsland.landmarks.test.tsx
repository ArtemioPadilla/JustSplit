// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Plan A7 (found by the live smoke's signed-in axe pass on `/expenses/nope`):
 * a detail route whose id resolves to no row renders `NotFoundView` from
 * inside the router's own `<main>`. A second `<main>` nested in the first
 * trips three axe rules (`landmark-main-is-top-level`,
 * `landmark-no-duplicate-main`, `landmark-unique`). The page must have
 * exactly ONE main landmark whichever way the not-found view is reached.
 * `ExpenseDetailView` is replaced by what it renders for a missing row.
 */
vi.mock('./routes/ExpenseDetailView', async () => {
  const { default: NotFoundView } = await import('./routes/NotFoundView');
  return { default: () => <NotFoundView /> };
});

const { default: AppRouterIsland } = await import('./AppRouterIsland');

afterEach(() => window.history.replaceState(null, '', '/'));

describe('AppRouterIsland landmarks (plan A7)', () => {
  it('a detail route that resolves to "not found" still has a single main landmark', async () => {
    window.history.replaceState(null, '', '/expenses/nope');
    render(<AppRouterIsland />);
    expect(await screen.findByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('an unmatched URL has a single main landmark too', () => {
    window.history.replaceState(null, '', '/definitely/not/a/route');
    render(<AppRouterIsland />);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });
});
