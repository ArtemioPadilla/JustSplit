// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParticipantPicker } from './ParticipantPicker';

/**
 * Plan B10, decision pulled forward from B13's ADR
 * (`docs/decisions/0006-registered-participants.md`): participants are registered users only — the
 * candidate POOL is resolved by the form (group members / friends + self /
 * event members) and passed in; this widget only renders it. `paidBy` is
 * chosen from the SAME candidate pool and need not be one of the checked
 * participants (spec D10: the payer need not be in `splits`).
 */
const CANDIDATES = [
  { id: 'u1', name: 'Ana' },
  { id: 'u2', name: 'Beto' },
  { id: 'u3', name: 'Caro' },
];

describe('ParticipantPicker', () => {
  it('renders a checkbox per candidate, labeled by name, checked for the current participants', () => {
    render(
      <ParticipantPicker
        candidates={CANDIDATES}
        participantIds={['u1', 'u2']}
        onParticipantIdsChange={vi.fn()}
        paidBy="u1"
        onPaidByChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'Ana' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Beto' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Caro' })).not.toBeChecked();
  });

  it('renders "Paid by" as a select over the same candidate pool, defaulting to the current value', () => {
    render(
      <ParticipantPicker
        candidates={CANDIDATES}
        participantIds={['u1']}
        onParticipantIdsChange={vi.fn()}
        paidBy="u2"
        onPaidByChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/paid by/i)).toHaveValue('u2');
  });

  it('calls onParticipantIdsChange when a candidate is checked/unchecked', async () => {
    const onParticipantIdsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ParticipantPicker
        candidates={CANDIDATES}
        participantIds={['u1']}
        onParticipantIdsChange={onParticipantIdsChange}
        paidBy="u1"
        onPaidByChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'Beto' }));
    expect(onParticipantIdsChange).toHaveBeenCalledWith(['u1', 'u2']);

    await user.click(screen.getByRole('checkbox', { name: 'Ana' }));
    expect(onParticipantIdsChange).toHaveBeenCalledWith([]);
  });

  it('calls onPaidByChange when a different payer is picked, even one not currently checked as a participant', async () => {
    const onPaidByChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ParticipantPicker
        candidates={CANDIDATES}
        participantIds={['u1', 'u2']}
        onParticipantIdsChange={vi.fn()}
        paidBy="u1"
        onPaidByChange={onPaidByChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText(/paid by/i), 'u3');
    expect(onPaidByChange).toHaveBeenCalledWith('u3');
  });

  it('shows an empty-candidates hint instead of an unusable picker when there are no candidates yet', () => {
    render(
      <ParticipantPicker candidates={[]} participantIds={[]} onParticipantIdsChange={vi.fn()} paidBy="" onPaidByChange={vi.fn()} />,
    );
    expect(screen.getByText(/no one to add yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
