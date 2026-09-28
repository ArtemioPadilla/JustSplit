import { z } from 'zod';
import type { Settlement as UniversalSettlement } from '@cyber-eco/types';

/**
 * `settlements` (plan B3, spec D10). Wraps the universal `Settlement`
 * (`@cyber-eco/types`) as the JustSplit row type: `groupId` is nullable (a
 * settlement can be scoped to a group, an event, or neither — a plain
 * friend-to-friend settle-up) and `memberIds` is required (D10: the RLS
 * membership mirror reads it on every row), the opposite of the universal
 * type's optionality for both fields. `expenseIds` / `eventId` are JustSplit-only
 * top-level fields with no mapped column (overflow keys); both are written
 * at create time by the settle-up flow (plan B14), so — unlike `expense.ts`'s
 * `conceptId`/`settledAt` — neither is a spec-D9 forward-compatible field and
 * neither is omitted from the write-input schema.
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
  method: z.string().optional(),
  notes: z.string().optional(),
  transactionId: z.string().optional(),
  memberIds: z.array(z.string()).min(1),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  // JustSplit-only top-level fields (overflow keys, no mapped column).
  expenseIds: z.array(z.string()).optional(),
  eventId: z.string().optional(),
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
