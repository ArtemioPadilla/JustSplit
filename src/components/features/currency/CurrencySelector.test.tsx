// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencySelector } from './CurrencySelector';
import { SUPPORTED_CURRENCIES } from '@/domain/currency';

/**
 * Ported from the legacy Next tree's
 * `src/components/ui/__tests__/CurrencySelector.test.tsx` (jest + a native
 * `<select>`) onto the Base UI `Combobox` version (plan B16). The legacy
 * `compact`/`showRefreshButton`/`onRefresh`/`isRefreshing` props have no
 * caller in the target tree (plan B16's prop list is just `value`,
 * `onChange`, optional `label`/`id`) so those assertions are dropped rather
 * than ported; the accessible-label, default-currency and onChange-on-select
 * behaviors are the ones every plan B16 consumer actually needs.
 */
const WAIT_OPTS = { timeout: 8000 };
const TEST_TIMEOUT = 15000;

describe('CurrencySelector', () => {
  it('renders correctly with default props, labelled and showing the current value', () => {
    render(<CurrencySelector value="USD" onChange={vi.fn()} />);

    const input = screen.getByLabelText(/Currency/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('USD');
  });

  it('renders with a custom label', () => {
    render(<CurrencySelector value="USD" onChange={vi.fn()} label="Convert to" />);
    expect(screen.getByLabelText(/Convert to/i)).toBeInTheDocument();
  });

  it(
    'lists every SUPPORTED_CURRENCIES code as an option',
    async () => {
      const user = userEvent.setup();
      render(<CurrencySelector value="USD" onChange={vi.fn()} />);

      await user.click(await screen.findByRole('combobox', { name: /Currency/i }, WAIT_OPTS));
      for (const currency of SUPPORTED_CURRENCIES) {
        expect(await screen.findByRole('option', { name: new RegExp(`^${currency.code}\\b`) }, WAIT_OPTS)).toBeInTheDocument();
      }
    },
    TEST_TIMEOUT,
  );

  it(
    'calls onChange with the new currency code when a different currency is selected',
    async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<CurrencySelector value="USD" onChange={handleChange} />);

      await user.click(await screen.findByRole('combobox', { name: /Currency/i }, WAIT_OPTS));
      const option = await screen.findByRole('option', { name: /^EUR\b/ }, WAIT_OPTS);
      await user.click(option);

      await waitFor(() => expect(handleChange).toHaveBeenCalledWith('EUR'), WAIT_OPTS);
    },
    TEST_TIMEOUT,
  );

  it('associates the label with the input via a stable id when one is passed', () => {
    render(<CurrencySelector value="USD" onChange={vi.fn()} id="settlement-currency" />);
    const input = screen.getByLabelText(/Currency/i);
    expect(input).toHaveAttribute('id', 'settlement-currency');
  });

  // Plan B19: the Base UI combobox (about 45 kB gz with its popup stack) is code-split, so a
  // labelled, read-only stand-in with the same look shows first. These pin what a user can rely on.
  describe('code-split combobox (plan B19)', () => {
    it('shows the label and the current value at once, before the combobox has loaded', () => {
      render(<CurrencySelector value="EUR" onChange={vi.fn()} id="cs" />);
      const standIn = screen.getByLabelText(/Currency/i);
      expect(standIn).toHaveAttribute('id', 'cs');
      expect(standIn).toHaveValue('EUR');
    });

    it('swaps in the real combobox, with the same id and value, once it has loaded', async () => {
      render(<CurrencySelector value="EUR" onChange={vi.fn()} id="cs" />);
      const combobox = await screen.findByRole('combobox', { name: /Currency/i }, WAIT_OPTS);
      expect(combobox).toHaveAttribute('id', 'cs');
      expect(combobox).toHaveValue('EUR');
    });

    it('hands keyboard focus to the real combobox when the user had focused the stand-in', async () => {
      render(<CurrencySelector value="USD" onChange={vi.fn()} />);
      act(() => screen.getByLabelText(/Currency/i).focus());
      const combobox = await screen.findByRole('combobox', { name: /Currency/i }, WAIT_OPTS);
      await waitFor(() => expect(combobox).toHaveFocus(), WAIT_OPTS);
    });

    it('does not steal focus when the user had not focused the stand-in', async () => {
      render(
        <>
          <button type="button">elsewhere</button>
          <CurrencySelector value="USD" onChange={vi.fn()} />
        </>,
      );
      act(() => screen.getByRole('button', { name: 'elsewhere' }).focus());
      const combobox = await screen.findByRole('combobox', { name: /Currency/i }, WAIT_OPTS);
      expect(combobox).not.toHaveFocus();
      expect(screen.getByRole('button', { name: 'elsewhere' })).toHaveFocus();
    });
  });
});

/**
 * Plan B19c (ADR 0015): where choosing a currency writes something (the profile's preferred currency), the selector takes the page's
 * `write` state. Blocked, it is the read-only stand-in (no combobox chunk needed, nothing to open) with `aria-disabled` and the
 * description; when the connection is back the real combobox takes over.
 */
describe('CurrencySelector — write state (B19c)', () => {
  const blockedWrite = { canWrite: false, noticeId: 'why', blocked: { 'aria-disabled': true as const, 'aria-describedby': 'why' } };
  const openWrite = { canWrite: true, noticeId: 'why', blocked: undefined };

  it('is blocked and described while writes are impossible, and opens nothing', async () => {
    const user = userEvent.setup();
    render(
      <>
        <p id="why">You&apos;re offline.</p>
        <CurrencySelector value="USD" onChange={vi.fn()} write={blockedWrite} />
      </>,
    );
    const input = screen.getByLabelText(/Currency/i);
    expect(input).toHaveValue('USD');
    expect(input).toHaveAttribute('aria-disabled', 'true');
    expect(input).toHaveAttribute('readonly');
    expect(input).not.toHaveAttribute('disabled');
    expect(input).toHaveAccessibleDescription("You're offline.");

    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it(
    'becomes the real combobox again once writes are possible',
    async () => {
      const { rerender } = render(<CurrencySelector value="USD" onChange={vi.fn()} write={blockedWrite} />);
      rerender(<CurrencySelector value="USD" onChange={vi.fn()} write={openWrite} />);
      const combobox = await screen.findByRole('combobox', { name: /Currency/i }, WAIT_OPTS);
      expect(combobox).not.toHaveAttribute('aria-disabled');
      expect(combobox).not.toHaveAttribute('aria-describedby');
    },
    TEST_TIMEOUT,
  );

  it('without a write prop it behaves exactly as before (a read-only display or a local-only choice)', async () => {
    render(<CurrencySelector value="USD" onChange={vi.fn()} />);
    const input = await screen.findByRole('combobox', { name: /Currency/i }, WAIT_OPTS);
    expect(input).not.toHaveAttribute('aria-disabled');
  });
});
