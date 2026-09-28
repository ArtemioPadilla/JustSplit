/**
 * Login schema (ported from Inceptor's `src/schemas/login.ts` — Spec-DD, see
 * `docs/PRINCIPLES.md` §3: "Zod as the source of truth"). Backs the
 * `LoginForm` island's react-hook-form + zod validation.
 */
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

/** Derived type. Never authored alongside the schema. */
export type LoginValues = z.infer<typeof LoginSchema>;
