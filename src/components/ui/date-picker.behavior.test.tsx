// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker, DateRangePicker } from './date-picker';

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

// Warm the code-split chunk once, outside any test's own timeout: under a
// saturated full-suite run its first transform + import can exceed the WAIT
// budget (a test-harness cost, not the user's). The lazy boundary itself is
// pinned statically by src/tests/lazy-boundaries.test.ts; these tests pin the
// behaviour across it, which a warm module cache does not change.
beforeAll(async () => {
  await import('@/components/ui/date-picker-impl');
}, 60_000);

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

  // B19b: the calendar used to open on today's month whatever was selected, so editing an expense from
  // last quarter meant paging back to find the selected day. It now opens on the selected date's month.
  describe('opens on the month of the selected date (B19b)', () => {
    // Far enough from today to be a different month (and, around January, a different year).
    const EARLIER = new Date(YEAR, MONTH - 4, 12);
    const EARLIER_LABEL = `${EARLIER.toLocaleString('en-US', { month: 'long' })} ${EARLIER.getFullYear()}`;
    const LATER = new Date(YEAR, MONTH + 3, 8);
    const LATER_LABEL = `${LATER.toLocaleString('en-US', { month: 'long' })} ${LATER.getFullYear()}`;
    const TODAY_LABEL = `${MONTH_NAME} ${YEAR}`;

    it(
      'shows the month of a past selected date, with that day selected',
      async () => {
        const user = userEvent.setup();
        render(<DatePicker value={EARLIER} triggerProps={{ 'aria-label': 'Expense date' }} />);
        await user.click(screen.getByRole('button', { name: 'Expense date' }));

        const grid = await screen.findByRole('grid', undefined, WAIT);
        expect(grid).toHaveAccessibleName(EARLIER_LABEL);
        const day = screen.getByRole('button', { name: new RegExp(`${EARLIER.toLocaleString('en-US', { month: 'long' })} 12`) });
        expect(day.closest('[role="gridcell"]')).toHaveAttribute('aria-selected', 'true');
      },
      TEST_TIMEOUT,
    );

    it(
      'shows the month of a future selected date',
      async () => {
        const user = userEvent.setup();
        render(<DatePicker value={LATER} triggerProps={{ 'aria-label': 'Expense date' }} />);
        await user.click(screen.getByRole('button', { name: 'Expense date' }));
        expect(await screen.findByRole('grid', undefined, WAIT)).toHaveAccessibleName(LATER_LABEL);
      },
      TEST_TIMEOUT,
    );

    it(
      'follows an uncontrolled defaultValue too',
      async () => {
        const user = userEvent.setup();
        render(<DatePicker defaultValue={EARLIER} triggerProps={{ 'aria-label': 'Expense date' }} />);
        await user.click(screen.getByRole('button', { name: 'Expense date' }));
        expect(await screen.findByRole('grid', undefined, WAIT)).toHaveAccessibleName(EARLIER_LABEL);
      },
      TEST_TIMEOUT,
    );

    it(
      'opens on today\'s month when nothing is selected',
      async () => {
        const user = userEvent.setup();
        render(<DatePicker triggerProps={{ 'aria-label': 'Expense date' }} />);
        await user.click(screen.getByRole('button', { name: 'Expense date' }));
        expect(await screen.findByRole('grid', undefined, WAIT)).toHaveAccessibleName(TODAY_LABEL);
      },
      TEST_TIMEOUT,
    );

    it(
      'still lets the caller choose the month with calendarProps.defaultMonth',
      async () => {
        const user = userEvent.setup();
        render(<DatePicker value={EARLIER} calendarProps={{ defaultMonth: LATER }} triggerProps={{ 'aria-label': 'Expense date' }} />);
        await user.click(screen.getByRole('button', { name: 'Expense date' }));
        expect(await screen.findByRole('grid', undefined, WAIT)).toHaveAccessibleName(LATER_LABEL);
      },
      TEST_TIMEOUT,
    );

    it(
      'a range opens with its first month on the start of the selected range',
      async () => {
        const user = userEvent.setup();
        render(<DateRangePicker value={{ from: EARLIER, to: new Date(YEAR, MONTH - 4, 20) }} triggerProps={{ 'aria-label': 'Period' }} />);
        await user.click(screen.getByRole('button', { name: 'Period' }));
        const grids = await screen.findAllByRole('grid', undefined, WAIT);
        expect(grids[0]).toHaveAccessibleName(EARLIER_LABEL);
      },
      TEST_TIMEOUT,
    );

    it(
      'a range with nothing selected opens on today\'s month',
      async () => {
        const user = userEvent.setup();
        render(<DateRangePicker triggerProps={{ 'aria-label': 'Period' }} />);
        await user.click(screen.getByRole('button', { name: 'Period' }));
        const grids = await screen.findAllByRole('grid', undefined, WAIT);
        expect(grids[0]).toHaveAccessibleName(TODAY_LABEL);
      },
      TEST_TIMEOUT,
    );
  });
});
