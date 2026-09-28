import { z } from 'zod';

/**
 * `profiles` (plan B3, spec D10) — **not** a `SchemaMap` collection: its
 * columns are quoted camelCase `text` written flat by `SupabaseProfileStore`
 * (`db/migrations/20260928000002_profiles.sql`), it has no `extra` column,
 * and own-row RLS is never widened. `preferences` holds `preferredCurrency`
 * (source of truth for `$preferredCurrency`, plan B5b) and `phoneNumber` —
 * the hub's `profiles` table has no `phoneNumber` column, so the phone
 * number lives inside the `preferences` jsonb instead of top-level.
 */
export const JustSplitProfilePreferencesSchema = z
  .object({
    preferredCurrency: z.string(),
    phoneNumber: z.string().optional(),
  })
  .loose();
export type JustSplitProfilePreferences = z.infer<typeof JustSplitProfilePreferencesSchema>;

export const JustSplitProfileSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    apps: z.array(z.string()),
    permissions: z.array(z.unknown()),
    preferences: JustSplitProfilePreferencesSchema,
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    lastLoginAt: z.string().nullable().optional(),
    isAdmin: z.boolean().optional(),
  })
  .loose();

export type JustSplitProfile = z.infer<typeof JustSplitProfileSchema>;
