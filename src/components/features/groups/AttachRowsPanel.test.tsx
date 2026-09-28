// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
});
