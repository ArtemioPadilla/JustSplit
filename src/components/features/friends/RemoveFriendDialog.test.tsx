// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RemoveFriendDialog } from './RemoveFriendDialog';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

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

/** Plan B19c (risk:high, ADR 0015): see `ExpenseForm.test.tsx` for the contract. The trigger is the load-on-first-use stand-in until clicked, then the real one; both must hold. */
describe('RemoveFriendDialog — offline (plan B19c)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  it('the stand-in trigger is blocked and explained offline, loads and opens nothing, and opens on reconnect', async () => {
    const user = userEvent.setup();
    renderDialog();
    setOnLine(false);
    const trigger = screen.getByRole('button', { name: /^remove$/i });
    expectBlocked(trigger);
    expect(visibleNotices()).toHaveLength(1);
    await user.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute('aria-busy');

    setOnLine(true);
    expectWritable(trigger);
    expect(visibleNotices()).toHaveLength(0);
    await user.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('the real trigger (after the first open) is blocked offline too, and opens nothing', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^cancel$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    setOnLine(false);
    const trigger = await screen.findByRole('button', { name: /^remove$/i });
    expectBlocked(trigger);
    await user.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    setOnLine(true);
    expectWritable(trigger);
    await user.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('a dialog open when the connection drops blocks Remove with its own explanation, removes nothing, and works on reconnect', async () => {
    remove.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    const dialog = await screen.findByRole('dialog');

    setOnLine(false);
    const confirm = within(dialog).getByRole('button', { name: /^remove$/i });
    expectBlocked(confirm);
    expect(visibleNotices(dialog)).toHaveLength(1);
    await user.click(confirm);
    expect(remove).not.toHaveBeenCalled();

    setOnLine(true);
    expectWritable(confirm);
    await user.click(confirm);
    await waitFor(() => expect(remove).toHaveBeenCalledWith('f1'));
  });

  it('a connection that drops mid-remove shows the plain failure, never success', async () => {
    remove.mockImplementation(async () => {
      setOnLine(false);
      throw new TypeError('Failed to fetch');
    });
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: /^remove$/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not remove this friend'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('the repo refusing an offline write reads as the shared sentence', async () => {
    remove.mockRejectedValue(new OfflineWriteError());
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: /^remove$/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(OFFLINE_SENTENCE));
  });
});
