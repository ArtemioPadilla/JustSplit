import { z } from 'zod';

/**
 * `events` (plan B3, spec D10) — JustSplit-local, not a universal
 * `@cyber-eco/types` collection (the hub's legacy `JustSplit.Event`
 * namespace in `packages/types/src/justsplit/types.ts` is a reference, not a
 * dependency). `kind` is a real column since plan B2 (`text not null default
 * 'event'`, values `trip` | `event`) and stays `z.string()` forever — never a
 * Zod enum (spec D9): `parseEventKind()` (Track D) falls back instead of
 * throwing, so an older deployed build never breaks on a value a newer build
 * wrote. `settings` is a JustSplit-only top-level field with no mapped
 * column (an overflow key, spec D9 — the relationship-kinds `settings.budget`
 * feature; nobody writes it before Track D).
 */
export const EventSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    date: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    location: z.string().optional(),
    groupId: z.string().nullable().optional(),
    memberIds: z.array(z.string()).min(1),
    preferredCurrency: z.string().optional(),
    // Real column since B2, `text not null default 'event'`. Never an enum.
    kind: z.string(),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    // JustSplit-only top-level field (overflow key, no mapped column, spec D9).
    settings: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

export type Event = z.infer<typeof EventSchema>;

/**
 * Write-input schema (plan B3): `.omit()`s the spec-D9 forward-compatible
 * `settings` field (see file header) until Track D issue D1 deletes the
 * omit. `kind` stays writable: plan B11b writes `kind: 'event'` (and D6
 * later `kind: 'trip'`) at create time, so it predates Track D.
 */
export const CreateEventInputSchema = EventSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  settings: true,
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
