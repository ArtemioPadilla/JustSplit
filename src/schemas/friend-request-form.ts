import { z } from 'zod';

/**
 * The `/friends` add-by-email form's own react-hook-form + zod schema (plan
 * B13). `email` normalizes (trim, then lowercase) BEFORE the format check —
 * the normalized value is what `AddFriendForm` compares against the
 * caller's own email for the self-request refusal, and what
 * `find_profile_by_email` ultimately compares case-insensitively too
 * (`lower(u.email) = lower(p_email)`), so the two never disagree over
 * whitespace or casing.
 */
export const AddFriendFormValuesSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Email is required.').email('Enter a valid email address.'),
});

export type AddFriendFormValues = z.infer<typeof AddFriendFormValuesSchema>;
