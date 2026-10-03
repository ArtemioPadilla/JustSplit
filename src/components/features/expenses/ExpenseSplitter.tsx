import * as React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { SplitType } from '@/schemas/expense';
import { validateSplit, type Shares } from '@/domain/expenseSplitter';

export interface ExpenseSplitterProps {
  splitType: SplitType;
  onSplitTypeChange: (type: SplitType) => void;
  /** Everyone the amount is split among — NOT necessarily including the payer (spec D10). */
  participantIds: string[];
  amount: number;
  /** `exact`: dollar amounts. `percentage`: percentages. Ignored for `equal`. Keyed by participant id. */
  shares: Shares;
  onSharesChange: (shares: Shares) => void;
  names: Record<string, string>;
  /**
   * False while the participants are still being resolved (nobody is selected yet because a query has not
   * answered). The status region stays in the document but empty, so a validation sentence is never announced
   * for a state the person did not cause, and the first real sentence is spoken into a region that was already
   * there (plan B19d). Defaults to true: every other caller is unchanged.
   */
  ready?: boolean;
}

const SPLIT_TYPE_OPTIONS: { value: SplitType; label: string }[] = [
  { value: 'equal', label: 'Split equally' },
  { value: 'exact', label: 'Exact amounts' },
  { value: 'percentage', label: 'Percentage' },
];

/**
 * The expense form's split editor (plan B10, spec D10). Edits SHARES only —
 * `materializeSplits` (`domain/expenseCalculator.ts`, via this file's own
 * `domain/expenseSplitter.ts#buildSplits` wrapper) is the only writer of
 * `Expense.splits[].amount`; this component never computes a final amount
 * itself beyond the live "remaining/over" status it shows while editing.
 *
 * Accessible: every share input is labeled by the participant's name (never
 * a bare "Amount"), and the sum state is announced through a single
 * `role="status" aria-live="polite"` region — never color alone.
 */
export function ExpenseSplitter({
  splitType,
  onSplitTypeChange,
  participantIds,
  amount,
  shares,
  onSharesChange,
  names,
  ready = true,
}: ExpenseSplitterProps) {
  const validation = validateSplit(splitType, amount, participantIds, shares);

  function handleShareChange(id: string, raw: string) {
    const parsed = raw === '' ? 0 : Number(raw);
    onSharesChange({ ...shares, [id]: Number.isNaN(parsed) ? 0 : parsed });
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Split method</legend>
        {/* Wraps: three options in one non-wrapping row are wider than a 375px card (plan A7). */}
        <RadioGroup
          value={splitType}
          onValueChange={(value) => onSplitTypeChange(value as SplitType)}
          className="flex flex-wrap gap-x-4 gap-y-2"
        >
          {SPLIT_TYPE_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <RadioGroupItem value={option.value} aria-label={option.label} />
              {option.label}
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      {splitType !== 'equal' && (
        <ul className="flex flex-col gap-2">
          {participantIds.map((id) => (
            <li key={id} className="flex items-center justify-between gap-2">
              <label htmlFor={`expense-splitter-share-${id}`} className="text-sm text-foreground">
                {names[id] ?? 'Unknown'}
              </label>
              <div className="flex items-center gap-1">
                {splitType === 'exact' && <span className="text-sm text-muted-foreground">$</span>}
                <input
                  id={`expense-splitter-share-${id}`}
                  type="number"
                  min={0}
                  step={splitType === 'percentage' ? 0.1 : 0.01}
                  inputMode="decimal"
                  value={shares[id] ?? ''}
                  onChange={(e) => handleShareChange(id, e.target.value)}
                  aria-label={`${names[id] ?? 'Unknown'}'s share`}
                  className="h-9 w-24 rounded-md border border-input bg-background px-2 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {splitType === 'percentage' && <span className="text-sm text-muted-foreground">%</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p
        role="status"
        aria-live="polite"
        className={cn('text-sm', validation.valid ? 'text-muted-foreground' : 'font-medium text-destructive')}
      >
        {!ready
          ? null
          : validation.valid
            ? splitType === 'equal'
              ? `Balanced — split evenly among ${participantIds.length} participant${participantIds.length === 1 ? '' : 's'}.`
              : 'Split is balanced.'
            : validation.message}
      </p>
    </div>
  );
}
