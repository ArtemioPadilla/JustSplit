// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Plan A7: Escape in the "Record payment" dialog. With the currency combobox
 * focused, Base UI's Combobox consumed the key (it clears its own input and
 * stops the event) even when its popup was closed, so the dialog could not be
 * dismissed from the keyboard there. Contract: Escape closes the combobox
 * popup if one is open, and otherwise closes the dialog. This suite uses the
 * REAL `CurrencySelector` (the main suite swaps in a `<select>`) and user-event.
 */
vi.mock('@/lib/data/repos/settlements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/data/repos/settlements')>()),
  settle: vi.fn(),
}));
vi.mock('@/stores/notifications', () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/lib/currency/useDisplayConversion', () => ({
  useDisplayConversion: () => ({ convert: (amount: number) => amount, ready: true, approximate: false, rates: {}, refresh: vi.fn() }),
}));

const { RecordPaymentDialog } = await import('./RecordPaymentDialog');

const WAIT = { timeout: 8000 };
const TEST_TIMEOUT = 20000;

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RecordPaymentDialog
        suggestion={{ fromUser: 'u1', toUser: 'u2', amount: 30 }}
        displayCurrency="USD"
        viewerId="u1"
        names={{ u1: 'Ana', u2: 'Beto' }}
      />
    </QueryClientProvider>,
  );
  await user.click(screen.getByRole('button', { name: /record payment from/i }));
  await screen.findByRole('dialog', undefined, WAIT);
  // The combobox is code-split (plan B19): a same-looking read-only stand-in shows first.
  return screen.findByRole('combobox', { name: 'Payment currency' }, WAIT);
}

afterEach(() => vi.clearAllMocks());

// Warm the code-split chunks (payment form, currency combobox) once, outside
// any test's own timeout: under a saturated full-suite run their first import
// can exceed a test's wait budget. The lazy boundaries are pinned statically
// by src/tests/lazy-boundaries.test.ts.
beforeAll(async () => {
  await Promise.all([import('./RecordPaymentDialogImpl'), import('./RecordPaymentForm'), import('@/components/features/currency/CurrencyCombobox')]);
}, 60_000);

describe('RecordPaymentDialog: Escape with the currency combobox focused (plan A7)', () => {
  it(
    'closes the dialog when the combobox has focus and its popup is closed',
    async () => {
      const user = userEvent.setup();
      const combobox = await openDialog(user);
      act(() => combobox.focus());
      expect(combobox).toHaveFocus();
      expect(combobox).toHaveAttribute('aria-expanded', 'false');

      await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), WAIT);
    },
    TEST_TIMEOUT,
  );

  it(
    'closes only the popup first when it is open, and the dialog on the next Escape',
    async () => {
      const user = userEvent.setup();
      const combobox = await openDialog(user);
      await user.click(combobox);
      await screen.findByRole('listbox', undefined, WAIT);

      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument(), WAIT);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // The chosen currency is untouched by dismissing the list.
      expect(combobox).toHaveValue('USD');

      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), WAIT);
    },
    TEST_TIMEOUT,
  );
});
