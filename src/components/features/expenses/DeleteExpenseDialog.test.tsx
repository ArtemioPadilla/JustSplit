// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteExpenseDialog } from './DeleteExpenseDialog';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

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
    // Plan B17b amendment (cross-navigation toasts): notify-then-navigate
    // is a full page load in this static MPA — afterNavigation queues it.
    expect(notifySuccess).toHaveBeenCalledWith('Expense deleted', expect.objectContaining({ afterNavigation: true }));
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

/** Plan B19c (risk:high, ADR 0015): see `ExpenseForm.test.tsx` for the contract; a delete is the write that must never half-apply. */
describe('DeleteExpenseDialog — offline (plan B19c)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  it('the trigger is blocked and explained offline and opens nothing; it opens again on reconnect', async () => {
    const user = userEvent.setup();
    renderDialog();
    setOnLine(false);
    const trigger = screen.getByRole('button', { name: /delete expense/i });
    expectBlocked(trigger);
    expect(visibleNotices()).toHaveLength(1);
    await user.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    setOnLine(true);
    expectWritable(trigger);
    await user.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('a dialog open when the connection drops blocks Delete, deletes nothing, and works on reconnect', async () => {
    remove.mockResolvedValue(undefined);
    const assign = vi.fn();
    const realLocation = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, assign } });
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /delete expense/i }));
    const confirm = await screen.findByRole('button', { name: /^delete$/i });

    setOnLine(false);
    expectBlocked(confirm);
    await user.click(confirm);
    expect(remove).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();

    setOnLine(true);
    expectWritable(confirm);
    await user.click(confirm);
    await waitFor(() => expect(remove).toHaveBeenCalledWith('e1'));
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('a connection that drops mid-delete shows the plain failure, never success', async () => {
    remove.mockImplementation(async () => {
      setOnLine(false);
      throw new TypeError('Failed to fetch');
    });
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /delete expense/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not delete this expense'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('the repo refusing an offline write reads as the shared sentence', async () => {
    remove.mockRejectedValue(new OfflineWriteError());
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /delete expense/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(OFFLINE_SENTENCE));
  });
});
