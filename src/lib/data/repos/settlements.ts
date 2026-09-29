import type { QueryFilter } from '@cyber-eco/types';
import {
  CreateSettlementInputSchema,
  SettleInputSchema,
  SettlementSchema,
  type CreateSettlementInput,
  type SettleInput,
  type Settlement,
} from '@/schemas/settlement';
import { requireStorageAdapter, requireUid } from '../require-adapter';

/**
 * `settlements` repo (plan B5a). No `update` export on purpose: spec D10's
 * RLS has no update policy on `settlements` ("none (immutable; correct by
 * delete + insert)") — a settlement is corrected by deleting and re-creating
 * it, never patched.
 *
 * Plan B14a (ADR 0014): a settlement is a payment on a ledger. `settle()` is
 * the app's writer — ONE insert, never an expense write (`settledAt` is legacy
 * and read-only) — and `remove()` undoes the caller's own attestation.
 */

/**
 * Every settlement the signed-in user may see: NO filter (plan B2d, ADR 0013).
 * A settlement is visible to its two parties, to members of its group and to
 * members of its event; only RLS knows that, so a `memberIds` filter would
 * hide the group and event rows the user is allowed to see.
 */
export function visibleFilters(): QueryFilter[] {
  return [];
}

export function forGroupFilters(groupId: string): QueryFilter[] {
  return [{ field: 'groupId', operator: '==', value: groupId }];
}

export function forEventFilters(eventId: string): QueryFilter[] {
  return [{ field: 'eventId', operator: '==', value: eventId }];
}

export async function get(id: string): Promise<Settlement | null> {
  const doc = await requireStorageAdapter().getDocument('settlements', id);
  return doc ? SettlementSchema.parse(doc) : null;
}

/** Every settlement the signed-in user can see (see `visibleFilters`). */
export async function listVisible(): Promise<Settlement[]> {
  const { data } = await requireStorageAdapter().query('settlements', visibleFilters());
  return data.map((doc) => SettlementSchema.parse(doc));
}

export async function listForGroup(groupId: string): Promise<Settlement[]> {
  const { data } = await requireStorageAdapter().query('settlements', forGroupFilters(groupId));
  return data.map((doc) => SettlementSchema.parse(doc));
}

export async function listForEvent(eventId: string): Promise<Settlement[]> {
  const { data } = await requireStorageAdapter().query('settlements', forEventFilters(eventId));
  return data.map((doc) => SettlementSchema.parse(doc));
}

export async function create(input: CreateSettlementInput): Promise<Settlement> {
  const adapter = requireStorageAdapter();
  const parsed = CreateSettlementInputSchema.parse(input);
  const id = adapter.generateId('settlements');
  await adapter.setDocument('settlements', id, {
    ...parsed,
    createdAt: adapter.serverTimestamp(),
    updatedAt: adapter.serverTimestamp(),
  });
  const created = await get(id);
  if (!created) throw new Error(`repos.settlements.create: row ${id} not found after insert`);
  return created;
}

/**
 * Thrown by `settle()` when the caller is neither the payer nor the payee. A
 * client-side check that fails with a clear message before the network, never
 * authorization: `settlements_insert` requires `created_by = auth.uid()` and
 * the creator to be `from_user_id` or `to_user_id` (CLAUDE.md rule 8).
 */
export class SettlementPartyNotAllowedError extends Error {
  constructor() {
    super('repos.settlements.settle: only the payer or the payee may record a settlement');
    this.name = 'SettlementPartyNotAllowedError';
  }
}

/**
 * Records that `fromUserId` paid `toUserId` (plan B14a, ADR 0014): Zod-validates
 * the input, then ONE `setDocument` on `settlements` — no batch, no expense
 * write. Balances are derived from the ledger, so nothing else has to change.
 * The row is an attestation by its creator (ADR 0002), not a verified payment.
 *
 * `createdBy` comes from the session via `requireUid()` (same convention as
 * `repos.expenses.remove`), `memberIds` is exactly the two parties and
 * `groupId` is `null` (the group scope is Track D D7); `eventId` is written
 * only when the scope is an event. Returns the created row.
 */
export async function settle(input: SettleInput): Promise<Settlement> {
  const uid = requireUid();
  const parsed = SettleInputSchema.parse(input);
  if (uid !== parsed.fromUserId && uid !== parsed.toUserId) throw new SettlementPartyNotAllowedError();

  return create({
    groupId: null,
    fromUserId: parsed.fromUserId,
    toUserId: parsed.toUserId,
    amount: parsed.amount,
    currency: parsed.currency,
    date: parsed.date,
    memberIds: [parsed.fromUserId, parsed.toUserId],
    createdBy: uid,
    ...(parsed.eventId ? { eventId: parsed.eventId } : {}),
    ...(parsed.method ? { method: parsed.method } : {}),
    ...(parsed.notes ? { notes: parsed.notes } : {}),
  });
}

/** Thrown when `id` does not resolve to a settlement (never existed, already deleted, or RLS-hidden — never distinguished, ADR 0002). */
export class SettlementNotFoundError extends Error {
  constructor(id: string) {
    super(`repos.settlements: settlement "${id}" was not found`);
    this.name = 'SettlementNotFoundError';
  }
}

/**
 * Thrown by `remove()`'s preflight when the caller did not create the
 * settlement. Client-side safety check, never authorization:
 * `settlements_delete` is creator-only on its own (CLAUDE.md rule 8) — the
 * other party can read the row but cannot delete it (ADR 0014).
 */
export class SettlementDeleteNotAllowedError extends Error {
  constructor(id: string) {
    super(`repos.settlements.remove: only the person who recorded settlement "${id}" may delete it`);
    this.name = 'SettlementDeleteNotAllowedError';
  }
}

/**
 * Thrown when a re-read after the delete shows the settlement is still there:
 * a denied `settlements_delete` is a silent 0-row result, so "the call didn't
 * error" is never proof it is gone.
 */
export class SettlementDeleteVerificationFailedError extends Error {
  constructor(id: string) {
    super(`repos.settlements.remove: settlement "${id}" could not be deleted`);
    this.name = 'SettlementDeleteVerificationFailedError';
  }
}

/**
 * Undoes the caller's own settlement (plan B14a). Mirrors `repos.groups.remove`:
 * a fresh-read creator preflight, the delete, then a re-read that must find
 * nothing. Deleting it restores the ledger exactly — no expense was ever
 * changed by recording it.
 */
export async function remove(id: string): Promise<void> {
  const uid = requireUid();
  const settlement = await get(id);
  if (!settlement) throw new SettlementNotFoundError(id);
  if (settlement.createdBy !== uid) throw new SettlementDeleteNotAllowedError(id);

  await requireStorageAdapter().deleteDocument('settlements', id);

  const stillExists = await get(id);
  if (stillExists) throw new SettlementDeleteVerificationFailedError(id);
}
