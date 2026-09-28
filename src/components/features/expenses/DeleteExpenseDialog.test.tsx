// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteExpenseDialog } from './DeleteExpenseDialog';

/**
 * Plan B9: the expense detail island's delete-with-confirm — a Base UI
 * Dialog, the WHOLE composition (trigger + content) in one file/component
 * per CLAUDE.md's compound-component rule (it never spans a `client:*`
 * boundary since it's composed inside a single island, not mounted
 * separately). Behavior contracts:
 *   1. Opening the trigger shows a confirmation with the expense's own
 *      description, not a generic "are you sure".
 *   2. Confirming calls repos.expenses.remove (via useDeleteExpense),
 *      toasts success, and navigates to /expenses/list.
 *   3. A failure toasts a generic message (never the raw/typed error) and
 *      leaves the dialog able to retry.
 */
const { remove } = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock('@/lib/data/repos/expenses', () => ({ remove }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

function renderDialog() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <DeleteExpenseDialog id="e1" description="Dinner" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('DeleteExpenseDialog', () => {
  it('shows a confirmation naming the expense once opened', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /delete expense/i }));

    expect(await screen.findByText(/dinner/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });

  it('confirming deletes, toasts success, and navigates to /expenses/list', async () => {
    remove.mockResolvedValue(undefined);
    const assign = vi.fn();
    const realLocation = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, assign } });

    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /delete expense/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith('e1'));
    expect(notifySuccess).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith('/expenses/list');

    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('a failure toasts a generic message, never the raw error', async () => {
    remove.mockRejectedValue(new Error('permission denied for table expenses'));

    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /delete expense/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(notifyError.mock.calls[0]![0]).toEqual(expect.any(String));
    expect(notifyError.mock.calls[0]![0]).not.toMatch(/permission denied/i);
  });
});
