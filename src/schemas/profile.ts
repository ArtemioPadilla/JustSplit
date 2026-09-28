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

/**
 * The view of `JustSplitProfile` that flows through `@cyber-eco/auth`'s
 * `createAuthContext<T>()` (plan B4, `src/lib/auth-context.ts`): `T` must
 * extend `BaseUserConstraint` (`name: string`, and `email`/`avatarUrl`/
 * `createdAt`/`updatedAt` all `string | undefined` — no `null`). The stored
 * row allows `null` on all of those (nullable DB columns, partial upserts),
 * which is wider than anything the auth context ever produces or consumes:
 * `createJustSplitProfile` always stamps a `name`, and Supabase never writes
 * an explicit `null` over one. `AuthProfile` narrows just those fields via
 * intersection (not `Omit`: the schema's `.loose()` index signature makes
 * `Omit`/`Pick` collapse to the index signature itself, dropping every named
 * property — a known TS quirk); it is structurally still a `JustSplitProfile`
 * (assignable to it), just never `null` on these five fields.
 *
 * Lives here, not in `auth-context.ts`: `src/lib/data/adapter.ts` needs it to
 * type `profileStore` for `AuthConfig`, and `adapter.ts` must not depend on
 * `auth-context.ts` (data layer vs. auth-context layering).
 */
export type AuthProfile = JustSplitProfile & {
  name: string;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};
