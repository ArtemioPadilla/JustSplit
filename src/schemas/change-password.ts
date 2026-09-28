import { z } from 'zod';
import { RegisterSchema } from './register';

/**
 * The profile island's "Account" change-password form (plan B15). The
 * strength rule is REUSED from `RegisterSchema.shape.password` (the sign-up
 * form's own rule, `src/schemas/register.ts`) rather than duplicated, plus a
 * `confirmPassword` field the sign-up form has no need for. No "current
 * password" field: `updatePassword` (`src/stores/auth.ts` →
 * `SupabaseAuthAdapter.updatePassword`) updates the password for the
 * already-authenticated session — Supabase's `auth.updateUser` needs no
 * re-proof of the old one.
 */
export const ChangePasswordSchema = z
  .object({
    newPassword: RegisterSchema.shape.password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

/** Derived type. Never authored alongside the schema. */
export type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>;
