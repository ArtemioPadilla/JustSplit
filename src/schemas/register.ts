/**
 * Register schema (plan B4) — mirrors `docs/recipes/auth-supabase.md` §4's
 * `RegisterSchema`, with `displayName` instead of `name` to match
 * `signUp(email, password, displayName)` (`src/stores/auth.ts`).
 */
import { z } from 'zod';

export const RegisterSchema = z.object({
  displayName: z.string().trim().min(1, 'Please enter your name.').max(80),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

/** Derived type. Never authored alongside the schema. */
export type RegisterValues = z.infer<typeof RegisterSchema>;
