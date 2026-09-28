import { z } from 'zod';

/**
 * The profile island's name/phone form (plan B15). `displayName` is written
 * through `updateProfile({ name })`; `phoneNumber` is stored inside
 * `preferences.phoneNumber` (`src/schemas/profile.ts` — the hub's `profiles`
 * table has no `phoneNumber` column), never as a top-level key.
 *
 * The phone regex mirrors the legacy `/app/profile/page.tsx`'s
 * `validatePhone` (`git show origin/main:src/app/profile/page.tsx`): a
 * lenient international-number pattern; an empty string is valid (the field
 * is optional).
 */
const PHONE_REGEX = /^\+?[(]?\d{1,4}[)]?[-\s.]?\d{1,4}[-\s.]?\d{1,9}$/;

export const ProfileEditSchema = z.object({
  displayName: z.string().trim().min(1, 'Please enter your name.').max(80),
  phoneNumber: z
    .string()
    .trim()
    .refine((value) => value === '' || PHONE_REGEX.test(value), 'Please enter a valid phone number.'),
});

/** Derived type. Never authored alongside the schema. */
export type ProfileEditValues = z.infer<typeof ProfileEditSchema>;
