// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox } from './combobox';

/**
 * Plan B16 harvest check: `Combobox`'s `items` prop widens from `string[]`
 * to accept `{code,symbol,name}` objects too (what `CurrencySelector` needs),
 * paired with an optional `renderItem` for custom list-item markup. Existing
 * plain-string callers must keep working unchanged (no caller exists yet,
 * but the plan requires the shape stay backward compatible).
 */
const WAIT_OPTS = { timeout: 8000 };
const TEST_TIMEOUT = 15000;

describe('Combobox (object items, plan B16)', () => {
  it('still accepts plain string items and calls onValueChange with the selected string', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Combobox items={['USD', 'EUR', 'GBP']} onValueChange={onValueChange} />);

    const input = screen.getByRole('combobox');
    await user.click(input);
    const option = await screen.findByRole('option', { name: 'EUR' }, WAIT_OPTS);
    await user.click(option);

    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith('EUR'), WAIT_OPTS);
  });

  it(
    'accepts {code,symbol,name} objects, uses renderItem for list markup, and reports the code on change',
    async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const items = [
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'EUR', symbol: '€', name: 'Euro' },
      ];
      render(
        <Combobox
          items={items}
          onValueChange={onValueChange}
          renderItem={(item) => (typeof item === 'string' ? item : `${item.code} · ${item.name}`)}
        />,
      );

      const input = screen.getByRole('combobox');
      await user.click(input);
      const option = await screen.findByRole('option', { name: 'EUR · Euro' }, WAIT_OPTS);
      await user.click(option);

      await waitFor(() => expect(onValueChange).toHaveBeenCalledWith('EUR'), WAIT_OPTS);
    },
    TEST_TIMEOUT,
  );

  it('renders the code as the controlled value for an object-item list', () => {
    const items = [
      { code: 'USD', symbol: '$', name: 'US Dollar' },
      { code: 'EUR', symbol: '€', name: 'Euro' },
    ];
    render(<Combobox items={items} value="EUR" />);
    expect(screen.getByRole('combobox')).toHaveValue('EUR');
  });
});
