// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseSplitter } from './ExpenseSplitter';

/**
 * Plan B10: the form edits SHARES, never `splits[].amount` directly
 * (`materializeSplits` is the only writer, spec D10). This suite proves the
 * three split types render, a live/polite sum announcement never lets an
 * inconsistent split look valid, and every share input is labeled by the
 * participant's name (a11y).
 */
const NAMES = { u1: 'Ana', u2: 'Beto' };

describe('ExpenseSplitter', () => {
  it('equal: shows a balanced status with no per-participant share inputs', () => {
    render(
      <ExpenseSplitter
        splitType="equal"
        onSplitTypeChange={vi.fn()}
        participantIds={['u1', 'u2']}
        amount={100}
        shares={{}}
        onSharesChange={vi.fn()}
        names={NAMES}
      />,
    );
    expect(screen.queryByLabelText(/Ana.?s share/i)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/balanced/i);
  });

  it('exact: labels each share input by name and reports how much is left to assign', () => {
    render(
      <ExpenseSplitter
        splitType="exact"
        onSplitTypeChange={vi.fn()}
        participantIds={['u1', 'u2']}
        amount={100}
        shares={{ u1: 60 }}
        onSharesChange={vi.fn()}
        names={NAMES}
      />,
    );
    expect(screen.getByLabelText(/Ana.?s share/i)).toHaveValue(60);
    expect(screen.getByLabelText(/Beto.?s share/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/\$40\.00 left to assign/i);
  });

  it('exact: reports "over the total" when shares exceed the amount, and marks the status as not a plain balanced message', () => {
    render(
      <ExpenseSplitter
        splitType="exact"
        onSplitTypeChange={vi.fn()}
        participantIds={['u1', 'u2']}
        amount={100}
        shares={{ u1: 90, u2: 90 }}
        onSharesChange={vi.fn()}
        names={NAMES}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/over the total/i);
  });

  it('percentage: reports the balanced status once shares sum to 100', () => {
    render(
      <ExpenseSplitter
        splitType="percentage"
        onSplitTypeChange={vi.fn()}
        participantIds={['u1', 'u2']}
        amount={100}
        shares={{ u1: 70, u2: 30 }}
        onSharesChange={vi.fn()}
        names={NAMES}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/balanced/i);
  });

  it('the live status region announces politely (aria-live)', () => {
    render(
      <ExpenseSplitter
        splitType="exact"
        onSplitTypeChange={vi.fn()}
        participantIds={['u1']}
        amount={10}
        shares={{}}
        onSharesChange={vi.fn()}
        names={NAMES}
      />,
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('calls onSharesChange with the updated share when a participant\'s amount is edited', async () => {
    const onSharesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ExpenseSplitter
        splitType="exact"
        onSplitTypeChange={vi.fn()}
        participantIds={['u1', 'u2']}
        amount={100}
        shares={{ u1: 60, u2: 40 }}
        onSharesChange={onSharesChange}
        names={NAMES}
      />,
    );
    const input = screen.getByLabelText(/Beto.?s share/i);
    await user.clear(input);
    await user.type(input, '50');
    expect(onSharesChange).toHaveBeenLastCalledWith({ u1: 60, u2: 50 });
  });

  it('calls onSplitTypeChange when a different split method is picked', async () => {
    const onSplitTypeChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ExpenseSplitter
        splitType="equal"
        onSplitTypeChange={onSplitTypeChange}
        participantIds={['u1', 'u2']}
        amount={100}
        shares={{}}
        onSharesChange={vi.fn()}
        names={NAMES}
      />,
    );
    await user.click(screen.getByRole('radio', { name: /percentage/i }));
    expect(onSplitTypeChange).toHaveBeenCalledWith('percentage');
  });
});
