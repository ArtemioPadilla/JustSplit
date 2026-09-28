import { z } from 'zod';
import { validateEventDates } from '@/domain/events';

/**
 * The event form's own react-hook-form + zod schema (plan B11b, Spec-DD —
 * `docs/PRINCIPLES.md` §3), shared by create and edit. Dates stay STRINGS
 * (`YYYY-MM-DD`, exactly what `<input type="date">` produces and the `events`
 * date columns store) — the cross-field rules live in
 * `domain/events#validateEventDates`, the one place that knows what a real
 * calendar day is, and are reported on the field they belong to.
 */
export const EventFormValuesSchema = z
  .object({
    name: z.string().refine((value) => value.trim().length > 0, 'Event name is required.'),
    description: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    preferredCurrency: z.string().min(1, 'Choose a currency.'),
    memberIds: z.array(z.string()).min(1, 'An event needs at least one participant.'),
  })
  .superRefine((values, ctx) => {
    const message = validateEventDates(values.startDate, values.endDate);
    if (!message) return;
    // The start date is checked first, so a start problem is never reported on the end field.
    const startInvalid = validateEventDates(values.startDate, '') !== null;
    ctx.addIssue({ code: 'custom', path: [startInvalid ? 'startDate' : 'endDate'], message });
  });

export type EventFormValues = z.infer<typeof EventFormValuesSchema>;
