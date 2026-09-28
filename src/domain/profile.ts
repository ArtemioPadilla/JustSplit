import type { JustSplitProfilePreferences } from '@/schemas/profile';

/**
 * Merges a partial `preferences` patch onto the CURRENT `preferences` object
 * (plan B15, spec D10). `SupabaseProfileStore.update` (`@cyber-eco/supabase`)
 * upserts `preferences` as a whole jsonb COLUMN VALUE —
 * `{ id, ...sanitize(partial), updatedAt }` — never a jsonb merge, so handing
 * `updateProfile({ preferences: { phoneNumber } })` a bare object would
 * silently wipe `preferredCurrency` (and the reverse). Every call site that
 * writes `preferences` (the profile island's name/phone form, its currency
 * selector, `DashboardHeader`'s currency selector) MUST build the object
 * through this helper instead of an inline spread, so the merge rule lives
 * in exactly one place.
 *
 * A key patched to `undefined` is DROPPED from the result (not kept as an
 * `undefined`-valued property) — the one way to clear an optional field
 * like `phoneNumber` client-side.
 */
export function buildPreferencesPatch(
  current: Partial<JustSplitProfilePreferences> | undefined,
  patch: Partial<JustSplitProfilePreferences>,
): JustSplitProfilePreferences {
  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete merged[key];
    else merged[key] = value;
  }
  return merged as JustSplitProfilePreferences;
}
