// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * `UndoSettlementDialog` (plan B14b): "Undo" on a settlement the viewer
 * recorded, with a confirm step. Behavior contracts:
 *   1. Opening it shows a confirmation that names the two people and the amount;
 *      nothing is removed until it is confirmed.
 *   2. Confirming calls `repos.settlements.remove` (via `useRemoveSettlement`)
 *      once, toasts success and closes.
 *   3. Keeping the payment removes nothing and returns focus to the trigger.
 *   4. A failure says so in plain words (never the raw error) and keeps the
 *      dialog open.
 */
const { remove } = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock('@/lib/data/repos/settlements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/data/repos/settlements')>()),
  remove,
}));

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

const { UndoSettlementDialog } = await import('./UndoSettlementDialog');
const { SettlementDeleteNotAllowedError, SettlementDeleteVerificationFailedError } = await import('@/lib/data/repos/settlements');

const NAMES = { u1: 'Ana', u2: 'Beto' };
const SETTLEMENT = { id: 's1', fromUserId: 'u2', toUserId: 'u1', amount: 30, currency: 'USD' };

function wrap(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderDialog(props: Partial<React.ComponentProps<typeof UndoSettlementDialog>> = {}) {
  return render(wrap(<UndoSettlementDialog settlement={SETTLEMENT} viewerId="u1" names={NAMES} {...props} />));
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /undo/i }));
  return screen.findByRole('dialog');
}

afterEach(() => {
  vi.clearAllMocks();
});

// B19b: the dialog opens through a load-on-first-use stand-in. Warm its chunk once, outside any test's
// own timeout (a saturated full-suite run can exceed a findBy budget on the first transform + import);
// the behaviour behind the boundary is what these tests pin, and a warm module cache does not change it.
beforeAll(async () => {
  await Promise.all([import('./UndoSettlementDialogImpl')]);
}, 60_000);

describe('UndoSettlementDialog', () => {
  it('has a trigger whose name says which payment, and asks for confirmation naming both people and the amount', async () => {
    const user = userEvent.setup();
    renderDialog();
    expect(screen.getByRole('button', { name: 'Undo payment from Beto to you, USD 30.00' })).toBeInTheDocument();
    const dialog = await open(user);
    expect(within(dialog).getByRole('heading', { name: 'Undo this payment?' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/Beto paid you USD 30\.00/);
    expect(remove).not.toHaveBeenCalled();
  });

  it('confirming removes the settlement once, toasts success and closes', async () => {
    remove.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDialog();
    const dialog = await open(user);
    await user.click(within(dialog).getByRole('button', { name: 'Undo payment' }));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect(remove).toHaveBeenCalledWith('s1');
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeping the payment removes nothing and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderDialog();
    const trigger = screen.getByRole('button', { name: /undo/i });
    const dialog = await open(user);
    await user.click(within(dialog).getByRole('button', { name: 'Keep it' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(remove).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('a failure says so in plain words, never the raw error, and keeps the dialog open', async () => {
    remove.mockRejectedValue(new SettlementDeleteVerificationFailedError('s1'));
    const user = userEvent.setup();
    renderDialog();
    const dialog = await open(user);
    await user.click(within(dialog).getByRole('button', { name: 'Undo payment' }));
    const sentence = "We couldn't undo this payment. Check your connection and try again.";
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(sentence);
    expect(notifyError).toHaveBeenCalledWith(sentence);
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/could not be deleted|repos\./i);
  });

  it('a payment somebody else recorded says only its creator can undo it', async () => {
    remove.mockRejectedValue(new SettlementDeleteNotAllowedError('s1'));
    const user = userEvent.setup();
    renderDialog();
    const dialog = await open(user);
    await user.click(within(dialog).getByRole('button', { name: 'Undo payment' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Only the person who recorded this payment can undo it.');
  });

  it('does not remove twice while the first request is in flight', async () => {
    let resolve!: () => void;
    remove.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const user = userEvent.setup();
    renderDialog();
    const dialog = await open(user);
    const confirm = within(dialog).getByRole('button', { name: 'Undo payment' });
    await user.click(confirm);
    await waitFor(() => expect(confirm).toBeDisabled());
    await user.click(confirm);
    expect(remove).toHaveBeenCalledTimes(1);
    resolve();
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
  });

  it('after a successful undo focus goes to the element the caller named (the row is gone)', async () => {
    remove.mockResolvedValue(undefined);
    const user = userEvent.setup();
    function Host() {
      const target = React.useRef<HTMLHeadingElement>(null);
      return (
        <>
          <h2 ref={target} tabIndex={-1}>
            Payment history
          </h2>
          <UndoSettlementDialog settlement={SETTLEMENT} viewerId="u1" names={NAMES} returnFocusTo={target} />
        </>
      );
    }
    render(wrap(<Host />));
    const dialog = await open(user);
    await user.click(within(dialog).getByRole('button', { name: 'Undo payment' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Payment history' })).toHaveFocus());
  });
});
