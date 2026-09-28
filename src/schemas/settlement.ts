import { z } from 'zod';
import { optionalColumn } from './nullable-column';
import type { Settlement as UniversalSettlement } from '@cyber-eco/types';

/**
 * `settlements` (plan B3, spec D10). Wraps the universal `Settlement`
 * (`@cyber-eco/types`) as the JustSplit row type: `groupId` is nullable (a
 * settlement can be scoped to a group, an event, or neither — a plain
 * friend-to-friend settle-up) and `memberIds` is required (D10: the RLS
 * membership mirror reads it on every row), the opposite of the universal
 * type's optionality for both fields. `expenseIds` is a JustSplit-only
 * top-level field with no mapped column (an overflow key) and `eventId` is
 * the `event_id` column (B2d, ADR 0013). Both stay writable on the generic
 * create-input schema, but settle-up (plan B14a, ADR 0014) writes only
 * `eventId`: a settlement is a payment on a ledger, not a receipt for a list
 * of expenses, so `expenseIds` is legacy/informational and nothing may rely on
 * it for balance maths.
 */
// No `.passthrough()` here — see `expense.ts` for why the compile-time guard
// below needs the plain (non-indexed) shape.
const SettlementShapeSchema = z.object({
  id: z.string(),
  groupId: z.string().nullable(),
  fromUserId: z.string(),
  toUserId: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.string(),
  method: optionalColumn(),
  notes: optionalColumn(),
  transactionId: optionalColumn(),
  memberIds: z.array(z.string()).min(1),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  // A real, nullable column since B2d (ADR 0013): an unlinked row reads back `null`.
  eventId: z.string().nullish(),
  // JustSplit-only top-level field (overflow key, no mapped column).
  expenseIds: z.array(z.string()).optional(),
});

export const SettlementSchema = SettlementShapeSchema.loose();

export type Settlement = z.infer<typeof SettlementSchema>;
type _SettlementShape = z.infer<typeof SettlementShapeSchema>;

/**
 * Compile-time guard, mirroring `expense.ts`: every universal `Settlement`
 * field (besides the D10 `groupId` override) must stay assignable from the
 * JustSplit row type. Not a runtime check.
 */
type _ExpectTrue<T extends true> = T;
export type _UniversalSettlementFieldsCovered = _ExpectTrue<
  Omit<UniversalSettlement, 'groupId' | 'memberIds'> extends Omit<
    _SettlementShape,
    'groupId' | 'memberIds' | 'expenseIds' | 'eventId' | 'updatedAt'
  >
    ? true
    : false
>;

/**
 * Write-input schema (plan B3): only the server-assigned `id`/`createdAt`/
 * `updatedAt` are omitted. `expenseIds`/`eventId` stay writable (see above).
 */
export const CreateSettlementInputSchema = SettlementSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateSettlementInput = z.infer<typeof CreateSettlementInputSchema>;

const isWholeCents = (amount: number): boolean => Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6;

/**
 * What a caller hands `repos.settlements.settle` (plan B14a, ADR 0014). The
 * repo fills the rest: `createdBy` from the session (never the caller),
 * `memberIds` as exactly the two parties (the RLS insert policy requires it)
 * and `groupId` as `null` (the group scope is Track D D7). `amount` is whole
 * cents — round with `round2` first — so a float never reaches a
 * `numeric(14,2)` column to be rounded silently. `eventId` is set only when the
 * scope is an event.
 */
export const SettleInputSchema = z
  .object({
    fromUserId: z.string().min(1),
    toUserId: z.string().min(1),
    amount: z
      .number()
      .positive()
      .refine(isWholeCents, { message: 'amount must be a whole number of cents' }),
    currency: z.string().regex(/^[A-Z]{3}$/, 'currency must be a three-letter uppercase code'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    eventId: z.string().min(1).optional(),
    method: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((input) => input.fromUserId !== input.toUserId, {
    message: 'a settlement needs two different people',
    path: ['toUserId'],
  });
export type SettleInput = z.infer<typeof SettleInputSchema>;
