import { z } from 'zod';
import { optionalColumn } from './nullable-column';
import type { AppRole, ExpenseGroup as UniversalExpenseGroup, ExpenseGroupMember as UniversalExpenseGroupMember } from '@cyber-eco/types';

/**
 * `expense_groups` (plan B3, spec D10). Wraps the universal `ExpenseGroup`
 * (`@cyber-eco/types`); `members[]` items are the universal
 * `ExpenseGroupMember` (`role: AppRole`, `joinedAt` both required — used to
 * derive `adminIds` with `hasMinimumRole`, spec D10, so they never drift).
 *
 * `kind` / `concepts` are JustSplit-only top-level fields with no mapped
 * column (overflow keys, spec D9 — the relationship-kinds feature; nobody
 * writes them before Track D). `settings` **has** a real column since plan
 * B2 (the universal `ExpenseGroupSettings`), but spec D9 extends its inner
 * shape with kind-specific defaults (`defaultShares`, `defaultCurrency`,
 * `budget`) that Track D issue D1's `src/schemas/shared.ts` will type
 * strictly; B3 keeps it an opaque `z.record` on purpose so that extension
 * needs no schema change here.
 */
export const AppRoleSchema = z.enum(['owner', 'admin', 'moderator', 'member']);

/**
 * Tolerant READ of `members[].role` (B19b). The roles live inside a jsonb
 * column, so a value outside the enum used to fail the parse of the whole
 * group and blank `GroupDetailView`. An unknown (or missing, or non-string)
 * role now reads as `'member'`: the lowest role, so it displays as a plain
 * member and grants nothing (deny by default; `computeAdminIds` and every
 * admin check stay allowlists, and RLS reads `admin_ids`, never this field).
 * Migration 016 makes the database reject such a value on write; this is the
 * safety net for rows written before it, and for a role a future build adds.
 * `AppRoleSchema` itself stays strict.
 */
const TolerantRoleSchema = AppRoleSchema.catch('member');

export const ExpenseGroupMemberSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  role: TolerantRoleSchema,
  joinedAt: z.string(),
  invitedBy: z.string().optional(),
});
export type ExpenseGroupMember = z.infer<typeof ExpenseGroupMemberSchema>;

export const ExpenseGroupSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: optionalColumn(),
    type: z.enum(['family', 'friends', 'community', 'organization', 'other']),
    currency: z.string(),
    members: z.array(ExpenseGroupMemberSchema),
    // Real column since B2; opaque for now (see file header), narrowed in D1.
    settings: z.record(z.string(), z.unknown()).optional(),
    totalExpenses: z.number(),
    memberIds: z.array(z.string()).min(1),
    adminIds: z.array(z.string()),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    // JustSplit-only top-level fields (overflow keys, no mapped column, spec D9).
    kind: z.string().optional(),
    concepts: z.array(z.unknown()).optional(),
  })
  .loose();

export type ExpenseGroup = z.infer<typeof ExpenseGroupSchema>;

/**
 * Compile-time guards, mirroring `expense.ts` (not runtime checks): every
 * universal `ExpenseGroupMember` field must stay assignable from the
 * JustSplit row type's member shape, and `AppRole` must stay in sync.
 * `UniversalExpenseGroup` itself is referenced (not structurally checked
 * beyond `id`) because `settings` is intentionally widened here — see the
 * file header — and narrowed for real in Track D issue D1.
 */
type _ExpectTrue<T extends true> = T;
export type _UniversalMemberCovered = _ExpectTrue<UniversalExpenseGroupMember extends ExpenseGroupMember ? true : false>;
export type _AppRoleCovered = _ExpectTrue<AppRole extends z.infer<typeof AppRoleSchema> ? true : false>;
export type _UniversalExpenseGroupReferenced = _ExpectTrue<UniversalExpenseGroup['id'] extends string ? true : false>;

/**
 * Write-input schema (plan B3): `.omit()`s the spec-D9 forward-compatible
 * fields (`kind`, `settings`, `concepts` — see file header) until Track D
 * issue D1 deletes the omit and replaces `settings` with the strict, D9
 * allowlisted shape from `src/schemas/shared.ts`.
 */
export const CreateExpenseGroupInputSchema = ExpenseGroupSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  kind: true,
  settings: true,
  concepts: true,
});
export type CreateExpenseGroupInput = z.infer<typeof CreateExpenseGroupInputSchema>;
