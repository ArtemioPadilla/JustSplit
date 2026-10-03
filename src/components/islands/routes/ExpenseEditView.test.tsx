// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Expense } from '@/schemas/expense';

/**
 * `ExpenseEditView` (plan B10) — the `/expenses/edit/<id>` route view. Its
 * own auth composition (`AuthIsland > AuthGate`) is already covered by
 * `AuthGate.test.tsx`/`AuthIsland.test.tsx` and by `ExpenseDetailView.test.tsx`'s
 * full-adapter-mock precedent for the sibling detail route — this file mocks
 * both as pass-throughs so it can focus on THIS view's own new behavior:
 * the loading/error/not-found/loaded states driven by `useExpense`, and
 * handing the loaded row to `ExpenseForm mode="edit"`.
 *
 * Deviation note (recorded in the B10 handoff): unlike `ExpenseDetailView`'s
 * own suite, this one was added green (verified against the already-shipped
 * implementation) rather than red-first — `ExpenseEditView.tsx` was
 * scaffolded alongside `AppRouterIsland.expense-edit.test.tsx`'s routing-
 * wiring red (which mocks this whole module), and this dedicated content
 * suite follows as a coverage addition, not a fix. Flagged for centinela.
 */
vi.mock('../AuthIsland', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../AuthGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const { useExpense } = vi.hoisted(() => ({ useExpense: vi.fn() }));
vi.mock('@/lib/data/hooks/useExpense', () => ({ useExpense }));

const { ExpenseForm } = vi.hoisted(() => ({
  ExpenseForm: vi.fn(({ mode, expense }: { mode: string; expense?: Expense }) => (
    <div data-testid="expense-form" data-mode={mode} data-expense-id={expense?.id} />
  )),
}));
vi.mock('@/components/features/expenses/ExpenseForm', () => ({ ExpenseForm }));

const { default: ExpenseEditView } = await import('./ExpenseEditView');

afterEach(() => {
  vi.clearAllMocks();
});

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    groupId: null,
    description: 'Tacos',
    amount: 100,
    currency: 'USD',
    paidBy: 'u1',
    splitType: 'equal',
    splits: [{ userId: 'u1', amount: 100 }],
    date: '2026-05-01',
    memberIds: ['u1'],
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ExpenseEditView', () => {
  it('renders a sr-only h1 and a loading skeleton while the expense is loading', () => {
    useExpense.mockReturnValue({ isError: false, isLoading: true, data: undefined, refetch: vi.fn() });
    render(<ExpenseEditView id="e1" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edit expense');
    expect(screen.queryByTestId('expense-form')).not.toBeInTheDocument();
  });

  it('renders NotFoundView for an id that resolves to no row (missing or RLS-hidden)', () => {
    useExpense.mockReturnValue({ isError: false, isLoading: false, data: null, refetch: vi.fn() });
    render(<ExpenseEditView id="does-not-exist" />);
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1); // the view's own sr-only h1; the not-found heading is an h2 under it
    expect(screen.queryByTestId('expense-form')).not.toBeInTheDocument();
  });

  it('renders an error state with a working Retry when the query fails', async () => {
    const refetch = vi.fn();
    useExpense.mockReturnValue({ isError: true, isLoading: false, data: undefined, refetch });
    render(<ExpenseEditView id="e1" />);

    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    await userEvent.setup().click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders ExpenseForm in edit mode with the loaded expense once resolved', () => {
    const expense = makeExpense();
    useExpense.mockReturnValue({ isError: false, isLoading: false, data: expense, refetch: vi.fn() });
    render(<ExpenseEditView id="e1" />);

    const form = screen.getByTestId('expense-form');
    expect(form).toHaveAttribute('data-mode', 'edit');
    expect(form).toHaveAttribute('data-expense-id', 'e1');
  });
});
