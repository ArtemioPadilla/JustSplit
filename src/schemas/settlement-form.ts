import { z } from 'zod';
import { round2 } from '@/domain/ledger';

/**
 * The "Record payment" dialog's own react-hook-form + zod schema (plan B14b).
 * `amount` stays a STRING (never `z.coerce.number()`): validating the raw text
 * against `^\d+(\.\d{1,2})?$` sidesteps float precision for the "at most 2
 * decimals" rule, same as the expense form; `paymentAmountToNumber` converts it
 * once it has passed. What the repo finally accepts is `SettleInputSchema`
 * (`./settlement`), which re-checks whole cents, the currency and the date.
 */
const isRealCalendarDate = (value: string): boolean => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);
  return date.getFullYear() === year && date.getMonth() === month! - 1 && date.getDate() === day;
};

export const RecordPaymentFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Enter an amount.')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to 2 decimals.')
    .refine((value) => Number(value) > 0, 'The amount must be more than 0.'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Choose a currency.'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.')
    .refine(isRealCalendarDate, 'Pick a real date.'),
});

/** Derived type. Never authored alongside the schema. */
export type RecordPaymentFormValues = z.infer<typeof RecordPaymentFormSchema>;

/** A validated amount string as a number in whole cents. */
export function paymentAmountToNumber(amount: string): number {
  return round2(Number(amount));
}
