// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

      await user.click(screen.getByLabelText(/Currency/i));
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

      await user.click(screen.getByLabelText(/Currency/i));
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
});
