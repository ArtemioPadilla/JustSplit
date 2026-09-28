import { z } from 'zod';
import type { Expense as UniversalExpense, ExpenseSplit as UniversalExpenseSplit, SplitType as UniversalSplitType } from '@cyber-eco/types';

/**
 * `expenses` (plan B3, spec D10).
 *
 * Wraps the universal `Expense` (`@cyber-eco/types`) as the JustSplit row
 * type: `groupId` is nullable (event and friend-to-friend expenses exist)
 * and `memberIds` is required (JustSplit always denormalises it for RLS,
 * spec D10), which is the opposite of the universal type's optionality for
 * both fields. `conceptId` / `settledAt` are JustSplit-only top-level
 * fields with no mapped column (`db/migrations/20260928000003_justsplit_tables.sql`)
 * — the SchemaMap (B5a) stores them in the `extra` overflow column and
 * rehydrates them flat; the app never spells `extra` (spec D9/D10).
 * `eventId` is the `event_id` column since B2d (ADR 0013). `category`
 * is a real column and stays a plain string, never a Zod enum (spec D9): an
 * older deployed build must never choke on a category value a newer build
 * introduced.
 */
export const SplitTypeSchema = z.enum(['equal', 'percentage', 'exact']);
export type SplitType = z.infer<typeof SplitTypeSchema>;

export const ExpenseSplitSchema = z.object({
  userId: z.string(),
  amount: z.number(),
  percentage: z.number().optional(),
});
export type ExpenseSplit = z.infer<typeof ExpenseSplitSchema>;

// No `.passthrough()` here on purpose: `.passthrough()` adds a `[k: string]:
// unknown` index signature to the inferred type, and TS's structural
// assignability check requires a *named* index signature on the source side
// too (not just structurally-compatible properties) — which would make the
// `_ExpectTrue` guard below fail even when every field genuinely matches.
// The exported, passthrough `ExpenseSchema` is derived from this shape.
const ExpenseShapeSchema = z.object({
  id: z.string(),
  // D10: nullable in JustSplit (event and friend-to-friend expenses have no group).
  groupId: z.string().nullable(),
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  paidBy: z.string(),
  splitType: SplitTypeSchema,
  splits: z.array(ExpenseSplitSchema),
  date: z.string(),
  // Real column; stays a free string forever (spec D9) — never an enum.
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  images: z.array(z.string()).optional(),
  source: z.string().optional(),
  transactionId: z.string().optional(),
  // D10: required in JustSplit (RLS membership mirror reads it on every row).
  memberIds: z.array(z.string()).min(1),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  // A real, nullable column since B2d (ADR 0013): an unlinked row reads back `null`.
  eventId: z.string().nullish(),
  // JustSplit-only top-level fields (overflow keys, no mapped column).
  conceptId: z.string().optional(),
  settledAt: z.string().nullable().optional(),
});

export const ExpenseSchema = ExpenseShapeSchema
  // Never `.strict()`: an unknown top-level key (a future Track D field, or a
  // row written by a newer build) must survive a parse on an older build.
  .loose();

export type Expense = z.infer<typeof ExpenseSchema>;
type _ExpenseShape = z.infer<typeof ExpenseShapeSchema>;

/**
 * Compile-time guard: every universal `Expense` field (besides the D10
 * `groupId`/`memberIds` overrides) must still be assignable from the
 * JustSplit row type, so a schema drift from `@cyber-eco/types` fails
 * `npm run type-check` instead of silently dropping a field. Not a runtime
 * check — `_ExpectTrue` never resolves at runtime.
 */
type _ExpectTrue<T extends true> = T;
export type _UniversalExpenseFieldsCovered = _ExpectTrue<
  Omit<UniversalExpense, 'groupId' | 'memberIds'> extends Omit<
    _ExpenseShape,
    'groupId' | 'memberIds' | 'eventId' | 'conceptId' | 'settledAt'
  >
    ? true
    : false
>;
export type _ExpenseSplitCovered = _ExpectTrue<UniversalExpenseSplit extends ExpenseSplit ? true : false>;
export type _SplitTypeCovered = _ExpectTrue<UniversalSplitType extends SplitType ? true : false>;

/**
 * Write-input schema (plan B3): `.omit()`s the spec-D9 forward-compatible
 * `conceptId` field that nobody writes before Track D, plus `settledAt`
 * (only ever written later via a partial `repos.expenses.update` patch,
 * never at create time) and the server-assigned `id`/`createdAt`/
 * `updatedAt`. `eventId` stays writable: B10 writes it from `?event=` at
 * create time, so it predates Track D and is not one of the omitted fields.
 * `category` also stays writable as of plan B10 (the create form's category
 * select writes one of the five `LEGACY_CATEGORY_KEYS`; it is a real column,
 * spec D9, so this was never an overflow-key question) — Track D issue D1
 * deletes the remaining `conceptId` omit once it gains a real write path.
 */
export const CreateExpenseInputSchema = ExpenseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  conceptId: true,
  settledAt: true,
});
export type CreateExpenseInput = z.infer<typeof CreateExpenseInputSchema>;
