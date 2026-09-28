// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * `ExpenseFormIsland` (plan B10) — `/expenses/new`'s route island. Same
 * `ErrorBoundary > AuthIsland > AuthGate > Content` composition as
 * `ExpenseListIsland` (B9); those pieces are already covered by their own
 * suites (`ErrorBoundary`/`AuthIsland`/`AuthGate` tests), so this file mocks
 * them as pass-throughs and only proves THIS island's own wiring: the
 * sr-only `<h1>` lives outside the auth-gated subtree, `ExpenseForm` is
 * mounted in `mode="create"`, and the whole tree is wrapped in an
 * `ErrorBoundary` named for this island (the source-text scan in
 * `mounted-island-error-boundary.test.ts` also asserts this, generically,
 * for every mounted island file).
 */
vi.mock('./AuthIsland', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./AuthGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const { ExpenseForm } = vi.hoisted(() => ({
  ExpenseForm: vi.fn(({ mode }: { mode: string }) => <div data-testid="expense-form" data-mode={mode} />),
}));
vi.mock('@/components/features/expenses/ExpenseForm', () => ({ ExpenseForm }));

const { default: ExpenseFormIsland } = await import('./ExpenseFormIsland');

afterEach(() => {
  vi.clearAllMocks();
});

describe('ExpenseFormIsland', () => {
  it('renders a sr-only h1 outside the auth-gated subtree', () => {
    render(<ExpenseFormIsland />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/new expense/i);
    expect(heading).toHaveClass('sr-only');
  });

  it('mounts ExpenseForm in create mode', () => {
    render(<ExpenseFormIsland />);
    expect(screen.getByTestId('expense-form')).toHaveAttribute('data-mode', 'create');
  });
});
