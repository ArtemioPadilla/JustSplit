// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RemoveFriendDialog } from './RemoveFriendDialog';

/**
 * Plan B13: the Friends section's Remove-with-confirm — a Base UI Dialog,
 * the whole trigger+content composition in one file (CLAUDE.md
 * compound-component rule), same shape as B9's DeleteExpenseDialog.
 * Behavior contracts:
 *   1. Opening the trigger shows a confirmation naming the friend.
 *   2. Confirming calls repos.friendships.remove (via useRemoveFriendship)
 *      and toasts success — no navigation (the list re-renders in place).
 *   3. A failure toasts a generic message, never the raw error.
 */
const { remove } = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock('@/lib/data/repos/friendships', () => ({ remove }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

function renderDialog() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <RemoveFriendDialog friendshipId="f1" name="Beto" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

// B19b: the dialog opens through a load-on-first-use stand-in. Warm its chunk once, outside any test's
// own timeout (a saturated full-suite run can exceed a findBy budget on the first transform + import);
// the behaviour behind the boundary is what these tests pin, and a warm module cache does not change it.
beforeAll(async () => {
  await Promise.all([import('./RemoveFriendDialogImpl')]);
}, 60_000);

describe('RemoveFriendDialog', () => {
  it('shows a confirmation naming the friend once opened', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(await screen.findByRole('heading', { name: /remove beto\?/i })).toBeInTheDocument();
  });

  it('confirming removes the friendship and toasts success', async () => {
    remove.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: /^remove$/i }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('f1'));
    expect(notifySuccess).toHaveBeenCalled();
  });

  it('a failure toasts a generic message, never the raw error', async () => {
    remove.mockRejectedValue(new Error('permission denied for table friendships'));
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: /^remove$/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(notifyError.mock.calls[0]![0]).not.toMatch(/permission denied/i);
  });

  // B19b: the trigger is a stand-in until first use; the focus contract of a real dialog must survive the swap.
  it('offers a plain "Remove" button first, and Cancel returns focus to the (real) trigger', async () => {
    const user = userEvent.setup();
    renderDialog();
    const trigger = screen.getByRole('button', { name: /^remove$/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(trigger);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: /^remove$/i })).toHaveFocus());
  });
});
