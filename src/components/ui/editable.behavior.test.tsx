// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editable } from './editable';

// The @zag-js/editable machine commits state transitions (e.g. Escape ->
// revert, Enter -> submit) asynchronously rather than synchronously inside
// the event handler, so assertions on the resulting DOM need to poll instead
// of asserting immediately. Under full-suite parallel load the default 5000ms
// Vitest test timeout can be tight too, so these tests get their own budget
// (third argument to `it`) in addition to a generous `waitFor` window. The
// typed text and the follow-up special key (Enter/Escape) are also two
// separate `user.type` calls with a settle point in between — combining them
// in one `.type('text{Enter}')` call risks the last character's async input
// event racing the key event under heavy parallel-test CPU contention.
const WAIT_OPTS = { timeout: 8000 };
const TEST_TIMEOUT = 15000;

describe('Editable (behavior)', () => {
  it('starts in preview mode showing the default value, no textbox in the a11y tree', () => {
    render(<Editable defaultValue="Untitled" />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it(
    'clicking the preview enters edit mode with an input holding the current value',
    async () => {
      const user = userEvent.setup();
      render(<Editable defaultValue="Untitled" />);
      await user.click(screen.getByText('Untitled'));
      const input = await screen.findByRole('textbox', {}, WAIT_OPTS);
      expect(input).toHaveValue('Untitled');
    },
    TEST_TIMEOUT,
  );

  it(
    'Enter commits the new value and calls onValueCommit',
    async () => {
      const user = userEvent.setup();
      const onValueCommit = vi.fn();
      render(<Editable defaultValue="Untitled" onValueCommit={onValueCommit} />);
      await user.click(screen.getByText('Untitled'));
      const input = await screen.findByRole('textbox', {}, WAIT_OPTS);
      await user.clear(input);
      await user.type(input, 'Renamed');
      await waitFor(() => expect(input).toHaveValue('Renamed'), WAIT_OPTS);
      await user.type(input, '{Enter}');
      expect(await screen.findByText('Renamed', {}, WAIT_OPTS)).toBeInTheDocument();
      expect(onValueCommit).toHaveBeenCalledWith('Renamed');
    },
    TEST_TIMEOUT,
  );

  it(
    'Escape discards the in-progress edit and reverts to the previous value',
    async () => {
      const user = userEvent.setup();
      const onValueCommit = vi.fn();
      render(<Editable defaultValue="Untitled" onValueCommit={onValueCommit} />);
      await user.click(screen.getByText('Untitled'));
      const input = await screen.findByRole('textbox', {}, WAIT_OPTS);
      await user.clear(input);
      await user.type(input, 'Discarded');
      await waitFor(() => expect(input).toHaveValue('Discarded'), WAIT_OPTS);
      await user.type(input, '{Escape}');
      expect(await screen.findByText('Untitled', {}, WAIT_OPTS)).toBeInTheDocument();
      expect(onValueCommit).not.toHaveBeenCalled();
    },
    TEST_TIMEOUT,
  );
});
