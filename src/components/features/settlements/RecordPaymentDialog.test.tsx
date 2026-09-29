// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * `RecordPaymentDialog` (plan B14b): the small Base UI dialog form behind
 * "Record payment" on a suggestion. Behavior contracts:
 *   1. It opens pre-filled: the suggestion rounded to 2 dp (`round2`), the
 *      display currency and today's date (a native date input).
 *   2. Submitting calls `repos.settlements.settle` exactly once with the two
 *      parties, the amount, currency and date (plus `eventId` only in the event
 *      scope), toasts success and closes. A partial amount is allowed.
 *   3. An amount above what is owed shows a NON-blocking notice and can still be
 *      submitted.
 *   4. A denied insert shows a plain sentence (never the raw error) and keeps the
 *      dialog open; another failure says to try again.
 *   5. It is a real dialog: focus moves in, is trapped, and returns.
 */
const { settle } = vi.hoisted(() => ({ settle: vi.fn() }));
// Keep the real error classes (payment-errors recognises `SettlementPartyNotAllowedError`); only the write is replaced.
vi.mock('@/lib/data/repos/settlements', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/data/repos/settlements')>()), settle }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

// EUR is worth 2 USD here; everything else is 1:1.
const { useDisplayConversion } = vi.hoisted(() => ({ useDisplayConversion: vi.fn() }));
vi.mock('@/lib/currency/useDisplayConversion', () => ({ useDisplayConversion }));

// The real Combobox is slow and is covered by its own suite; a select keeps this about the dialog.
vi.mock('@/components/features/currency/CurrencySelector', () => ({
  CurrencySelector: ({ value, onChange, label, id }: { value: string; onChange: (code: string) => void; label?: string; id?: string }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {['USD', 'EUR', 'MXN'].map((code) => (
          <option key={code}>{code}</option>
        ))}
      </select>
    </div>
  ),
}));

const { RecordPaymentDialog } = await import('./RecordPaymentDialog');

const NAMES = { u1: 'Ana', u2: 'Beto' };
const TODAY = '2026-09-29';

function renderDialog(props: Partial<React.ComponentProps<typeof RecordPaymentDialog>> = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecordPaymentDialog
        suggestion={{ fromUser: 'u1', toUser: 'u2', amount: 33.333333 }}
        displayCurrency="USD"
        viewerId="u1"
        names={NAMES}
        {...props}
      />
    </QueryClientProvider>,
  );
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /record payment/i }));
  const dialog = await screen.findByRole('dialog');
  // The form is code-split (plan B19): it arrives a moment after the dialog does.
  await within(dialog).findByLabelText('Amount');
  return dialog;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 8, 29, 12, 0, 0) });
  useDisplayConversion.mockReturnValue({
    convert: (amount: number, currency: string) => (currency === 'EUR' ? amount * 2 : amount),
    ready: true,
    approximate: false,
    rates: {},
    refresh: vi.fn(),
  });
  settle.mockResolvedValue({ id: 's1' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// B19b: the dialog opens through a load-on-first-use stand-in. Warm its chunk once, outside any test's
// own timeout (a saturated full-suite run can exceed a findBy budget on the first transform + import);
// the behaviour behind the boundary is what these tests pin, and a warm module cache does not change it.
beforeAll(async () => {
  await Promise.all([import('./RecordPaymentDialogImpl'), import('./RecordPaymentForm')]);
}, 60_000);

describe('RecordPaymentDialog', () => {
  it('has a trigger whose name says who pays whom, and opens a dialog', async () => {
    const user = userEvent.setup();
    renderDialog();
    expect(screen.getByRole('button', { name: 'Record payment from you to Beto' })).toBeInTheDocument();
    const dialog = await open(user);
    expect(within(dialog).getByRole('heading', { name: /record payment/i })).toBeInTheDocument();
  });

  it('is named from the moment it opens, before the code-split form has arrived (plan B19)', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: /record payment/i }));
    expect(await screen.findByRole('dialog', { name: /record payment/i })).toBeInTheDocument();
  });

  it('opens pre-filled: the suggestion rounded to 2 dp, the display currency and today', async () => {
    const user = userEvent.setup();
    renderDialog({ displayCurrency: 'EUR' });
    const dialog = await open(user);
    expect(within(dialog).getByLabelText('Amount')).toHaveValue('33.33');
    expect(within(dialog).getByLabelText('Payment currency')).toHaveValue('EUR');
    const date = within(dialog).getByLabelText('Date');
    expect(date).toHaveValue(TODAY);
    expect(date).toHaveAttribute('type', 'date');
  });

  it('says it is a note: JustSplit does not move or check money', async () => {
    const user = userEvent.setup();
    renderDialog();
    const dialog = await open(user);
    expect(within(dialog).getByText(/doesn't move money/i)).toBeInTheDocument();
    // Others see the recorder's NAME, never "you" — the copy must say what they will read.
    expect(within(dialog).getByText(/others will see it as "Marked as paid by Ana"/i)).toBeInTheDocument();
  });

  it('inside an event it says where it is recorded, by name, and "the event" when the name is unknown', async () => {
    const user = userEvent.setup();
    const named = renderDialog({ eventId: 'ev1', eventName: 'Oaxaca trip' });
    let dialog = await open(user);
    expect(within(dialog).getByText(/Recorded in Oaxaca trip\./)).toBeInTheDocument();
    named.unmount();

    renderDialog({ eventId: 'ev1' });
    dialog = await open(user);
    expect(within(dialog).getByText(/Recorded in the event\./)).toBeInTheDocument();
  });

  it('says nothing about an event when there is none', async () => {
    const user = userEvent.setup();
    renderDialog();
    const dialog = await open(user);
    expect(within(dialog).queryByText(/recorded in/i)).not.toBeInTheDocument();
  });

  it('submits once with the suggestion, toasts success and closes', async () => {
    const user = userEvent.setup();
    renderDialog();
    const dialog = await open(user);
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
    expect(settle).toHaveBeenCalledWith({ fromUserId: 'u1', toUserId: 'u2', amount: 33.33, currency: 'USD', date: TODAY });
    expect(notifySuccess).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('passes eventId in the event scope and only then', async () => {
    const user = userEvent.setup();
    renderDialog({ eventId: 'ev1' });
    const dialog = await open(user);
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'ev1' }));
  });

  it('allows a partial amount, a different currency and a different date', async () => {
    const user = userEvent.setup();
    renderDialog();
    const dialog = await open(user);
    const amount = within(dialog).getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '10');
    await user.selectOptions(within(dialog).getByLabelText('Payment currency'), 'MXN');
    const date = within(dialog).getByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2026-09-01');
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
    expect(settle).toHaveBeenCalledWith({ fromUserId: 'u1', toUserId: 'u2', amount: 10, currency: 'MXN', date: '2026-09-01' });
    expect(within(dialog).queryByText(/more than/i)).not.toBeInTheDocument();
  });

  it('does not call settle for an invalid amount, and says why', async () => {
    const user = userEvent.setup();
    renderDialog();
    const dialog = await open(user);
    const amount = within(dialog).getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '1.234');
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    expect(await within(dialog).findByText('Enter an amount with up to 2 decimals.')).toBeInTheDocument();
    expect(settle).not.toHaveBeenCalled();
  });

  describe('paying more than is owed', () => {
    it('shows a non-blocking notice in a polite live region, and submitting still works', async () => {
      const user = userEvent.setup();
      renderDialog({ suggestion: { fromUser: 'u1', toUser: 'u2', amount: 30 } });
      const dialog = await open(user);
      const amount = within(dialog).getByLabelText('Amount');
      await user.clear(amount);
      await user.type(amount, '45');
      const notice = await within(dialog).findByText('This is more than you owe. The difference will show as owed back to you.');
      expect(notice.closest('[role="status"]')).not.toBeNull();
      const save = within(dialog).getByRole('button', { name: /save payment/i });
      expect(save).toBeEnabled();
      await user.click(save);
      await waitFor(() => expect(settle).toHaveBeenCalledWith(expect.objectContaining({ amount: 45 })));
    });

    it('compares in the display currency: 20 EUR is 40 USD, more than 30', async () => {
      const user = userEvent.setup();
      renderDialog({ suggestion: { fromUser: 'u1', toUser: 'u2', amount: 30 } });
      const dialog = await open(user);
      await user.selectOptions(within(dialog).getByLabelText('Payment currency'), 'EUR');
      const amount = within(dialog).getByLabelText('Amount');
      await user.clear(amount);
      await user.type(amount, '20');
      expect(await within(dialog).findByText(/this is more than you owe/i)).toBeInTheDocument();
    });

    it('shows no notice for an exact payment, and none until the rates it needs are ready', async () => {
      const user = userEvent.setup();
      renderDialog({ suggestion: { fromUser: 'u1', toUser: 'u2', amount: 30 } });
      const dialog = await open(user);
      const amount = within(dialog).getByLabelText('Amount');
      await user.clear(amount);
      await user.type(amount, '30');
      expect(within(dialog).queryByText(/more than/i)).not.toBeInTheDocument();

      useDisplayConversion.mockReturnValue({ convert: (a: number) => a, ready: false, approximate: false, rates: {}, refresh: vi.fn() });
      await user.clear(amount);
      await user.type(amount, '45');
      expect(within(dialog).queryByText(/more than/i)).not.toBeInTheDocument();
    });

    it('when the viewer is the payee, the notice speaks about the payer', async () => {
      const user = userEvent.setup();
      renderDialog({ viewerId: 'u2', suggestion: { fromUser: 'u1', toUser: 'u2', amount: 30 } });
      const dialog = await open(user);
      const amount = within(dialog).getByLabelText('Amount');
      await user.clear(amount);
      await user.type(amount, '45');
      expect(await within(dialog).findByText('This is more than Ana owes you. The difference will show as owed back to Ana.')).toBeInTheDocument();
    });
  });

  describe('failure', () => {
    it('a denied insert shows the plain sentence in the dialog and in a toast, never the raw error', async () => {
      settle.mockRejectedValue(new Error('RelationalSupabaseAdapter: setDocument(settlements/s1) failed: new row violates row-level security policy for table "settlements"'));
      const user = userEvent.setup();
      renderDialog();
      const dialog = await open(user);
      await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
      const sentence = "You can't record this payment. Only the two people involved can, and they must be friends or share the event.";
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(sentence);
      expect(notifyError).toHaveBeenCalledTimes(1);
      expect(notifyError).toHaveBeenCalledWith(sentence);
      expect(notifySuccess).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(document.body).not.toHaveTextContent(/row-level|violates/i);
    });

    it('any other failure says to check the connection and try again, and the form can be submitted again', async () => {
      settle.mockRejectedValueOnce(new Error('Failed to fetch'));
      const user = userEvent.setup();
      renderDialog();
      const dialog = await open(user);
      await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
      expect(await within(dialog).findByRole('alert')).toHaveTextContent("We couldn't record this payment. Check your connection and try again.");
      await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
      await waitFor(() => expect(settle).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
    });

    it('does not submit twice while a save is in flight', async () => {
      let resolve!: (row: { id: string }) => void;
      settle.mockReturnValue(new Promise((r) => (resolve = r)));
      const user = userEvent.setup();
      renderDialog();
      const dialog = await open(user);
      const save = within(dialog).getByRole('button', { name: /save payment/i });
      await user.click(save);
      await waitFor(() => expect(save).toBeDisabled());
      expect(save).toHaveAttribute('aria-busy', 'true');
      await user.click(save);
      expect(settle).toHaveBeenCalledTimes(1);
      resolve({ id: 's1' });
      await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
    });
  });

  describe('focus', () => {
    it('moves focus into the dialog and keeps Tab inside it', async () => {
      const user = userEvent.setup();
      renderDialog();
      const dialog = await open(user);
      await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
      for (let i = 0; i < 8; i += 1) {
        await user.tab();
        // Base UI's focus guards sit just outside the popup and hand focus straight back in.
        await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
      }
    });

    it('Cancel closes it and returns focus to the trigger', async () => {
      const user = userEvent.setup();
      renderDialog();
      const dialog = await open(user);
      await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      // B19b: the trigger you clicked was a stand-in; focus goes back to the REAL trigger that replaced it.
      await waitFor(() => expect(screen.getByRole('button', { name: /record payment/i })).toHaveFocus());
    });

    it('Escape closes it and returns focus to the trigger', async () => {
      const user = userEvent.setup();
      renderDialog();
      await open(user);
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      // B19b: the trigger you clicked was a stand-in; focus goes back to the REAL trigger that replaced it.
      await waitFor(() => expect(screen.getByRole('button', { name: /record payment/i })).toHaveFocus());
    });

    it('after a successful save focus goes to the element the caller named (the row is about to change)', async () => {
      const user = userEvent.setup();
      function Host() {
        const target = React.useRef<HTMLHeadingElement>(null);
        return (
          <>
            <h2 ref={target} tabIndex={-1}>
              Pending payments
            </h2>
            <RecordPaymentDialog
              suggestion={{ fromUser: 'u1', toUser: 'u2', amount: 30 }}
              displayCurrency="USD"
              viewerId="u1"
              names={NAMES}
              returnFocusTo={target}
            />
          </>
        );
      }
      const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
      render(
        <QueryClientProvider client={client}>
          <Host />
        </QueryClientProvider>,
      );
      const dialog = await open(user);
      await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Pending payments' })).toHaveFocus());
    });
  });
});
