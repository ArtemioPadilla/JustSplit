// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from './date-picker';

/**
 * Plan B19: the calendar (react-day-picker, date-fns) is code-split, so it
 * loads when the picker opens, not with the page. These pin the behaviour a
 * user relies on across that boundary: the trigger is real and shows the value
 * from the first paint, opening it shows the calendar (a moment later on a slow
 * network), and picking a day reports it and closes the popover.
 */
const WAIT = { timeout: 8000 };
// The calendar opens on the current month, so build the fixtures from today's.
const NOW = new Date();
const YEAR = NOW.getFullYear();
const MONTH = NOW.getMonth();
const MONTH_NAME = NOW.toLocaleString('en-US', { month: 'long' });
const the = (day: number) => new Date(YEAR, MONTH, day);
const TEST_TIMEOUT = 20000;

describe('DatePicker (calendar loaded on open)', () => {
  it('shows a real, labelled trigger with the formatted value before any calendar code has loaded', () => {
    render(<DatePicker value={the(15)} onValueChange={vi.fn()} triggerProps={{ 'aria-label': 'Expense date' }} />);
    const trigger = screen.getByRole('button', { name: 'Expense date' });
    expect(trigger).toHaveTextContent(`${MONTH_NAME} 15, ${YEAR}`);
    expect(trigger).toBeEnabled();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it(
    'opens the calendar on the current month, and reports and closes on picking a day',
    async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<DatePicker value={the(15)} onValueChange={onValueChange} triggerProps={{ 'aria-label': 'Expense date' }} />);

      await user.click(screen.getByRole('button', { name: 'Expense date' }));
      expect(await screen.findByRole('grid', undefined, WAIT)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: new RegExp(`${MONTH_NAME} 15`) })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: new RegExp(`${MONTH_NAME} 20`) }));

      expect(onValueChange).toHaveBeenCalledTimes(1);
      const picked = onValueChange.mock.calls[0][0] as Date;
      expect([picked.getFullYear(), picked.getMonth(), picked.getDate()]).toEqual([YEAR, MONTH, 20]);
      await waitFor(() => expect(screen.queryByRole('grid')).not.toBeInTheDocument(), WAIT);
    },
    TEST_TIMEOUT,
  );

  it(
    'opens from the keyboard and closes on Escape, giving focus back to the trigger',
    async () => {
      const user = userEvent.setup();
      render(<DatePicker value={the(15)} triggerProps={{ 'aria-label': 'Expense date' }} />);
      await user.tab();
      expect(screen.getByRole('button', { name: 'Expense date' })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(await screen.findByRole('grid', undefined, WAIT)).toBeInTheDocument();

      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('grid')).not.toBeInTheDocument(), WAIT);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Expense date' })).toHaveFocus(), WAIT);
    },
    TEST_TIMEOUT,
  );

  it(
    'keeps the caller\'s id on the trigger throughout, so a <label htmlFor> keeps working',
    async () => {
      const user = userEvent.setup();
      render(
        <>
          <label htmlFor="expense-form-date">Date</label>
          <DatePicker value={the(15)} triggerProps={{ id: 'expense-form-date' }} />
        </>,
      );
      expect(screen.getByLabelText('Date')).toHaveAttribute('id', 'expense-form-date');
      await user.click(screen.getByLabelText('Date'));
      await screen.findByRole('grid', undefined, WAIT);
      expect(screen.getByLabelText('Date', { selector: 'button' })).toHaveAttribute('id', 'expense-form-date');
    },
    TEST_TIMEOUT,
  );

  it(
    'shows the placeholder when there is no value, and a range with both ends when there is one',
    async () => {
      const { DateRangePicker } = await import('./date-picker');
      const { unmount } = render(<DatePicker placeholder="Pick a day" />);
      expect(screen.getByRole('button', { name: /pick a day/i })).toBeInTheDocument();
      unmount();
      render(<DateRangePicker value={{ from: the(3), to: the(9) }} />);
      expect(screen.getByRole('button', { name: new RegExp(`${MONTH_NAME} 3, ${YEAR} – ${MONTH_NAME} 9, ${YEAR}`) })).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'does not open while disabled',
    async () => {
      const user = userEvent.setup();
      render(<DatePicker value={the(15)} disabled triggerProps={{ 'aria-label': 'Expense date' }} />);
      await user.click(screen.getByRole('button', { name: 'Expense date' }));
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );
});
