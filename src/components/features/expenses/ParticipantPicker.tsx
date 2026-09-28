import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

export interface Candidate {
  id: string;
  name: string;
}

export interface ParticipantPickerProps {
  /** The registered-users-only candidate pool (B13 ADR) the form already resolved — group members, event members, or accepted friends + self. */
  candidates: Candidate[];
  participantIds: string[];
  onParticipantIdsChange: (ids: string[]) => void;
  /** Chosen from the SAME `candidates` pool. Need not be one of `participantIds` (spec D10: the payer need not be in `splits`). */
  paidBy: string;
  onPaidByChange: (id: string) => void;
}

/**
 * The expense form's participant picker (plan B10, B13's ADR pulled
 * forward). Participants are registered users only — there is no free-text
 * "add a participant" input; every option here comes from `candidates`,
 * which the form resolves from `?group=`/`?event=`/`?friend=` or accepted
 * friends + self.
 */
export function ParticipantPicker({
  candidates,
  participantIds,
  onParticipantIdsChange,
  paidBy,
  onPaidByChange,
}: ParticipantPickerProps) {
  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No one to add yet — add a friend first, or start this expense from a group or event.
      </p>
    );
  }

  function toggle(id: string, checked: boolean) {
    onParticipantIdsChange(checked ? [...participantIds, id] : participantIds.filter((p) => p !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="expense-form-paid-by" className="text-sm font-medium text-foreground">
          Paid by
        </label>
        <select
          id="expense-form-paid-by"
          value={paidBy}
          onChange={(e) => onPaidByChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {!paidBy && <option value="">Choose who paid…</option>}
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Split with</legend>
        {candidates.map((candidate) => (
          <label key={candidate.id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={participantIds.includes(candidate.id)}
              onCheckedChange={(checked) => toggle(candidate.id, checked === true)}
              aria-label={candidate.name}
            />
            {candidate.name}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
