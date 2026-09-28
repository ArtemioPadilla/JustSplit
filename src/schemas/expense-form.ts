import { z } from 'zod';
import { LEGACY_CATEGORY_KEYS } from '@/domain/categories';
import { SplitTypeSchema } from './expense';

/**
 * The expense form's own react-hook-form + zod schema (plan B10, Spec-DD —
 * `docs/PRINCIPLES.md` §3). Covers the fixed fields only; the split's own
 * cross-field consistency (shares summing to the amount / 100%) is checked
 * separately at submit time via `domain/expenseSplitter#validateSplit` —
 * same validator `ExpenseSplitter` itself uses for its live status, so the
 * two never disagree. `amount` stays a STRING here (never `z.coerce.number()`):
 * validating the raw text against `^\d+(\.\d{1,2})?$` sidesteps float
 * precision entirely for the "at most 2 decimals" rule; callers `Number(...)`
 * it once validated.
 */
export const ExpenseFormValuesSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  amount: z
    .string()
    .min(1, 'Amount is required.')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to 2 decimals.')
    .refine((value) => Number(value) > 0, 'Amount must be greater than 0.'),
  currency: z.string().min(1, 'Choose a currency.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.'),
  category: z.enum(LEGACY_CATEGORY_KEYS),
  paidBy: z.string().min(1, 'Choose who paid.'),
  participantIds: z.array(z.string()).min(1, 'Select at least one participant.'),
  splitType: SplitTypeSchema,
  shares: z.record(z.string(), z.number()),
  notes: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof ExpenseFormValuesSchema>;
