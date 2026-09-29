// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

/**
 * `AttachRowsPanel` (plan B12) — the group detail island's "attach
 * existing rows" panel. Offered candidates are already filtered by the
 * caller (`domain/groups.ts`'s `filterAttachableExpenses`/
 * `filterAttachableEvents` — its own test coverage); this component is the
 * checkbox picker + the honest attached/skipped summary toast (never
 * claiming every checked row succeeded).
 */
const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

const { useAttachExpensesToGroup, useAttachEventsToGroup } = vi.hoisted(() => ({
  useAttachExpensesToGroup: vi.fn(),
  useAttachEventsToGroup: vi.fn(),
}));
vi.mock('@/lib/data/hooks/useAttachExpensesToGroup', () => ({ useAttachExpensesToGroup }));
vi.mock('@/lib/data/hooks/useAttachEventsToGroup', () => ({ useAttachEventsToGroup }));

const { GroupNotFoundError } = await import('@/lib/data/repos/groups');
const { AttachRowsPanel } = await import('./AttachRowsPanel');

let attachExpensesMutateAsync: ReturnType<typeof vi.fn>;
let attachEventsMutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  attachExpensesMutateAsync = vi.fn().mockResolvedValue({ attached: ['e1'], skipped: [] });
  useAttachExpensesToGroup.mockReturnValue({ mutateAsync: attachExpensesMutateAsync, isPending: false });
  attachEventsMutateAsync = vi.fn().mockResolvedValue({ attached: ['ev1'], skipped: [] });
  useAttachEventsToGroup.mockReturnValue({ mutateAsync: attachEventsMutateAsync, isPending: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('AttachRowsPanel', () => {
  it('shows a message when there is nothing attachable', () => {
    render(<AttachRowsPanel groupId="g1" attachableExpenses={[]} attachableEvents={[]} />);
    expect(screen.getByText(/nothing to attach/i)).toBeInTheDocument();
  });

  it('attaches checked expenses and toasts success when every id attached', async () => {
    render(
      <AttachRowsPanel groupId="g1" attachableExpenses={[{ id: 'e1', description: 'Tacos' }]} attachableEvents={[]} />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tacos' }));
    await userEvent.click(screen.getByRole('button', { name: /attach expenses/i }));

    await waitFor(() => expect(attachExpensesMutateAsync).toHaveBeenCalledWith({ groupId: 'g1', expenseIds: ['e1'] }));
    expect(notifySuccess).toHaveBeenCalled();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('reports honestly when some checked expenses could not be attached', async () => {
    attachExpensesMutateAsync.mockResolvedValue({ attached: ['e1'], skipped: ['e2'] });
    render(
      <AttachRowsPanel
        groupId="g1"
        attachableExpenses={[
          { id: 'e1', description: 'Tacos' },
          { id: 'e2', description: 'Pizza' },
        ]}
        attachableEvents={[]}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tacos' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Pizza' }));
    await userEvent.click(screen.getByRole('button', { name: /attach expenses/i }));

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith(expect.stringMatching(/1 could not be attached/i)),
    );
  });

  it('attaches checked events independently of expenses', async () => {
    render(<AttachRowsPanel groupId="g1" attachableExpenses={[]} attachableEvents={[{ id: 'ev1', name: 'Trip' }]} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Trip' }));
    await userEvent.click(screen.getByRole('button', { name: /attach events/i }));

    await waitFor(() => expect(attachEventsMutateAsync).toHaveBeenCalledWith({ groupId: 'g1', eventIds: ['ev1'] }));
    expect(notifySuccess).toHaveBeenCalled();
  });

  it('disables the attach button until at least one row is checked', () => {
    render(
      <AttachRowsPanel groupId="g1" attachableExpenses={[{ id: 'e1', description: 'Tacos' }]} attachableEvents={[]} />,
    );
    expect(screen.getByRole('button', { name: /attach expenses/i })).toBeDisabled();
  });

  it('shows "This group no longer exists" and restores the button when the group was deleted mid-session, with no unhandled rejection', async () => {
    attachExpensesMutateAsync.mockRejectedValueOnce(new GroupNotFoundError('g1'));
    render(
      <AttachRowsPanel groupId="g1" attachableExpenses={[{ id: 'e1', description: 'Tacos' }]} attachableEvents={[]} />,
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Tacos' });
    await userEvent.click(checkbox);
    const button = screen.getByRole('button', { name: /attach expenses/i });
    await userEvent.click(button);

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('This group no longer exists'));
    expect(notifySuccess).not.toHaveBeenCalled();
    // Restored: the selection survives a failure (so a retry doesn't start
    // from scratch), the button stays enabled and not stuck busy.
    expect(checkbox).toBeChecked();
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'false');
  });

  it('shows a generic toast for any other failure, never leaking raw error text', async () => {
    attachExpensesMutateAsync.mockRejectedValueOnce(new Error('relation "expenses" violates row-level security policy'));
    render(
      <AttachRowsPanel groupId="g1" attachableExpenses={[{ id: 'e1', description: 'Tacos' }]} attachableEvents={[]} />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tacos' }));
    await userEvent.click(screen.getByRole('button', { name: /attach expenses/i }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith("Couldn't attach these items. Please try again."));
  });

  it('the events section has the same catch/restore behavior as the expenses section', async () => {
    attachEventsMutateAsync.mockRejectedValueOnce(new Error('boom'));
    render(<AttachRowsPanel groupId="g1" attachableExpenses={[]} attachableEvents={[{ id: 'ev1', name: 'Trip' }]} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Trip' });
    await userEvent.click(checkbox);
    const button = screen.getByRole('button', { name: /attach events/i });
    await userEvent.click(button);

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith("Couldn't attach these items. Please try again."));
    expect(checkbox).toBeChecked();
    expect(button).not.toBeDisabled();
  });
});

/** Plan B19c (risk:high, ADR 0015): a batch attach is a multi-row write; see `ExpenseForm.test.tsx` for the contract. */
describe('AttachRowsPanel — offline (plan B19c)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  function renderPanel() {
    return render(
      <AttachRowsPanel
        groupId="g1"
        attachableExpenses={[{ id: 'e1', description: 'Tacos' }]}
        attachableEvents={[{ id: 'ev1', name: 'Trip' }]}
      />,
    );
  }

  it('blocks both attach buttons with one visible explanation, keeps the selection, and re-enables on reconnect', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tacos' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Trip' }));

    setOnLine(false);
    const attachExpenses = screen.getByRole('button', { name: /attach expenses/i });
    const attachEvents = screen.getByRole('button', { name: /attach events/i });
    expectBlocked(attachExpenses);
    expectBlocked(attachEvents);
    expect(visibleNotices()).toHaveLength(1);
    expect(visibleNotices()[0]).toHaveTextContent(OFFLINE_SENTENCE);

    await userEvent.click(attachExpenses);
    await userEvent.click(attachEvents);
    expect(attachExpensesMutateAsync).not.toHaveBeenCalled();
    expect(attachEventsMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: 'Tacos' })).toBeChecked();

    setOnLine(true);
    expectWritable(attachExpenses);
    expectWritable(attachEvents);
    expect(visibleNotices()).toHaveLength(0);
    await userEvent.click(attachExpenses);
    await waitFor(() => expect(attachExpensesMutateAsync).toHaveBeenCalledWith({ groupId: 'g1', expenseIds: ['e1'] }));
  });

  it('a connection that drops mid-attach shows the plain failure, never success, and keeps the selection', async () => {
    attachExpensesMutateAsync.mockImplementation(async () => {
      setOnLine(false);
      throw new TypeError('Failed to fetch');
    });
    renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tacos' }));
    await userEvent.click(screen.getByRole('button', { name: /attach expenses/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith("Couldn't attach these items. Please try again."));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: 'Tacos' })).toBeChecked();
  });

  it('the repo refusing an offline write reads as the shared sentence', async () => {
    attachEventsMutateAsync.mockRejectedValueOnce(new OfflineWriteError());
    renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Trip' }));
    await userEvent.click(screen.getByRole('button', { name: /attach events/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(OFFLINE_SENTENCE));
  });
});
