import type { QueryFilter } from '@cyber-eco/types';
import { CreateExpenseInputSchema, ExpenseSchema, type CreateExpenseInput, type Expense } from '@/schemas/expense';
import { requireStorageAdapter, requireUid } from '../require-adapter';
import { removeReceipts, removeReceiptObject, uploadReceipt } from '../storage';

/**
 * `expenses` repo (plan B5a). See `groups.ts` for the shared conventions
 * (literal collection names, StorageAdapter-only, Zod-validated).
 */

/**
 * Every expense the signed-in user may see: NO filter. Since B2d (ADR 0013)
 * an expense is visible to whoever is in its `memberIds` OR is a member of its
 * group OR of its event, and only RLS knows that — a client-side
 * `memberIds array-contains uid` filter would hide the group and event rows the
 * user is allowed to see. (Superseded ADR 0002's canonical `memberIds` query
 * for this collection; groups, events and friendships keep theirs.)
 */
export function visibleFilters(): QueryFilter[] {
  return [];
}

/** A group's expenses (`group_id = id`, real column). */
export function forGroupFilters(groupId: string): QueryFilter[] {
  return [{ field: 'groupId', operator: '==', value: groupId }];
}

/** An event's expenses (`eventId` is the `event_id` column since B2d, ADR 0013). */
export function forEventFilters(eventId: string): QueryFilter[] {
  return [{ field: 'eventId', operator: '==', value: eventId }];
}

export async function get(id: string): Promise<Expense | null> {
  const doc = await requireStorageAdapter().getDocument('expenses', id);
  return doc ? ExpenseSchema.parse(doc) : null;
}

/** Every expense the signed-in user can see (see `visibleFilters`). */
export async function listVisible(): Promise<Expense[]> {
  const { data } = await requireStorageAdapter().query('expenses', visibleFilters());
  return data.map((doc) => ExpenseSchema.parse(doc));
}

export async function listForGroup(groupId: string): Promise<Expense[]> {
  const { data } = await requireStorageAdapter().query('expenses', forGroupFilters(groupId));
  return data.map((doc) => ExpenseSchema.parse(doc));
}

export async function listForEvent(eventId: string): Promise<Expense[]> {
  const { data } = await requireStorageAdapter().query('expenses', forEventFilters(eventId));
  return data.map((doc) => ExpenseSchema.parse(doc));
}

/**
 * A fresh expense id, generated once per form session and reused across a
 * retry (plan B10) — `createWithReceipts` writes to this id with `setDocument`
 * (an upsert), so resubmitting after a partial failure never creates a
 * duplicate row.
 */
export function generateId(): string {
  return requireStorageAdapter().generateId('expenses');
}

/**
 * Writers always set `memberIds` (group context -> the group's memberIds;
 * otherwise the split participants union payer, every one an accepted
 * friend or a co-member — the RLS membership mirror rejects anything else)
 * and `createdBy = uid` (plan B5a). Callers (B10) are responsible for that
 * invariant; this repo validates shape, not membership.
 */
export async function create(input: CreateExpenseInput): Promise<Expense> {
  const adapter = requireStorageAdapter();
  const parsed = CreateExpenseInputSchema.parse(input);
  const id = adapter.generateId('expenses');
  await adapter.setDocument('expenses', id, {
    ...parsed,
    createdAt: adapter.serverTimestamp(),
    updatedAt: adapter.serverTimestamp(),
  });
  const created = await get(id);
  if (!created) throw new Error(`repos.expenses.create: row ${id} not found after insert`);
  return created;
}

/**
 * A partial patch. D9 invariant, contract-tested in
 * `storage-adapter-contract.shared.ts`: a patch with an overflow key (e.g.
 * `settledAt`) merges into `extra` without erasing another overflow key
 * already on the row (e.g. `eventId`) — never a full-row replace.
 */
export async function update(id: string, patch: Partial<Expense>): Promise<Expense | null> {
  await requireStorageAdapter().updateDocument('expenses', id, patch);
  return get(id);
}

/**
 * Thrown by `remove()`/`addReceipts()`/`removeReceipt()` when `id` does not
 * resolve to a row (already deleted, never existed, or RLS-hidden — this
 * repo never distinguishes those, same leaked-id reasoning as ADR 0002).
 */
export class ExpenseNotFoundError extends Error {
  constructor(id: string) {
    super(`repos.expenses: expense "${id}" was not found`);
    this.name = 'ExpenseNotFoundError';
  }
}

/**
 * Thrown by `remove()`'s preflight (plan B9, ADR 0005 amendment "delete
 * ordering preflight") when the caller is neither the row's creator nor its
 * payer. This is a client-side safety check against a destructive PARTIAL
 * operation — see `remove()`'s own doc comment — never authorization: the
 * `expenses_delete` RLS policy denies the row delete on its own regardless
 * of whether this check exists (CLAUDE.md rule 8).
 */
export class ExpenseDeleteNotAllowedError extends Error {
  constructor(id: string) {
    super(`repos.expenses.remove: only the creator or payer may delete expense "${id}"`);
    this.name = 'ExpenseDeleteNotAllowedError';
  }
}

export interface ReceiptWriteResult {
  expense: Expense;
  /** How many of the given files failed to upload — 0 means every one succeeded. */
  failedUploadCount: number;
}

/** Uploads `files` under `expenseId`, appending each successful path onto `existingImages`; a failed upload is skipped, not thrown. */
async function uploadAll(expenseId: string, existingImages: string[], files: Blob[]): Promise<{ images: string[]; failedUploadCount: number }> {
  const images = [...existingImages];
  let failedUploadCount = 0;
  for (const file of files) {
    try {
      images.push(await uploadReceipt(expenseId, file));
    } catch {
      failedUploadCount += 1;
    }
  }
  return { images, failedUploadCount };
}

/**
 * Create ordering (plan B10, risk:high, spec D10 "Images"): **insert the row
 * (the given `id`, `images: []`) -> upload each file -> `updateDocument(id,
 * { images })`** — a partial patch, never rewritten alongside other fields.
 * The `receipts_expenses_insert` storage policy looks the expense up by id
 * in `public.expenses`, so an upload attempted before the row exists is
 * denied; this function's whole reason to exist is fixing that order in ONE
 * place instead of leaving callers to get it right themselves.
 *
 * `id` is caller-generated (`generateId()`) and MUST be reused across a
 * retry: `setDocument` on an existing id is an upsert, so calling this again
 * with the same `id` never creates a second row. If the row from a previous
 * attempt already exists, the insert step is skipped entirely (its `images`
 * are the new upload's starting point, never reset back to `[]`) — the
 * concurrent/double-submit case resolves the same way, since both callers
 * upsert the identical row.
 *
 * **Partial failure is reported, never hidden**: a file that fails to
 * upload is skipped (not thrown), and `failedUploadCount` tells the caller
 * how many were dropped so it can toast an honest "saved, but N receipts
 * couldn't be uploaded" message — `images` only ever contains paths that
 * really uploaded. Only the INSERT step can reject this promise; once the
 * row exists, this call always resolves.
 */
export async function createWithReceipts(id: string, input: CreateExpenseInput, files: Blob[]): Promise<ReceiptWriteResult> {
  let expense = await get(id);
  if (!expense) {
    const adapter = requireStorageAdapter();
    const parsed = CreateExpenseInputSchema.parse({ ...input, images: [] });
    await adapter.setDocument('expenses', id, {
      ...parsed,
      createdAt: adapter.serverTimestamp(),
      updatedAt: adapter.serverTimestamp(),
    });
    expense = await get(id);
    if (!expense) throw new Error(`repos.expenses.createWithReceipts: row ${id} not found after insert`);
  }

  const { images, failedUploadCount } = await uploadAll(id, expense.images ?? [], files);
  const changed = images.length !== (expense.images?.length ?? 0);
  const withReceipts = changed ? ((await update(id, { images })) ?? expense) : { ...expense, images };
  return { expense: withReceipts, failedUploadCount };
}

/**
 * Edit-flow upload (plan B10): the row already exists, so this uploads
 * directly and appends to whatever `images` already has — no insert step.
 * Same partial-failure contract as `createWithReceipts`.
 */
export async function addReceipts(id: string, files: Blob[]): Promise<ReceiptWriteResult> {
  const expense = await get(id);
  if (!expense) throw new ExpenseNotFoundError(id);

  const { images, failedUploadCount } = await uploadAll(id, expense.images ?? [], files);
  const changed = images.length !== (expense.images?.length ?? 0);
  const updated = changed ? ((await update(id, { images })) ?? expense) : { ...expense, images };
  return { expense: updated, failedUploadCount };
}

/**
 * Removes one receipt (plan B10, ADR 0005 amendment): **patches `images` to
 * drop `path` BEFORE deleting the storage object**, the opposite order from
 * `remove()`'s whole-expense delete. Reasoning is the mirror image of that
 * one: `receipts_expenses_delete` is member-wide, so the object delete
 * itself can't fail on authorization the way the ROW delete can — the risk
 * here is a network/storage failure mid-operation, and patching first means
 * a failure after the patch leaves only an UNREFERENCED object in storage
 * (a retryable cleanup, and this issue's own amendment records it as an
 * accepted cost), never a dangling reference in `images` pointing at
 * something that's already gone.
 */
export async function removeReceipt(id: string, path: string): Promise<Expense | null> {
  const expense = await get(id);
  if (!expense) throw new ExpenseNotFoundError(id);

  const images = (expense.images ?? []).filter((p) => p !== path);
  const updated = await update(id, { images });
  await removeReceiptObject(path);
  return updated;
}

/**
 * Deletes every receipt object under `expenses/{id}/` BEFORE the row (spec
 * D10, plan B5b): once the row is gone, no `storage.objects` policy can
 * reach them, so a storage failure here must stop the row delete rather
 * than orphan the objects unreachable.
 *
 * Preflight (plan B9, risk:high, ADR 0005 amendment): the storage
 * `receipts_expenses_delete` policy is member-wide by design (B10 relies on
 * it so any member can edit/replace receipt images) — deliberately WIDER
 * than the row's own `expenses_delete` policy, which allows only the
 * creator or payer. Without this check, a member who is neither could call
 * `removeReceipts(id)` successfully (member-wide), then have the row
 * delete silently denied by RLS (0 rows affected) — every receipt gone,
 * the row still there, unrecoverable. Fetching the fresh row and refusing
 * BEFORE touching storage closes that window client-side; it changes
 * nothing about what RLS itself allows or denies.
 */
export async function remove(id: string): Promise<void> {
  const uid = requireUid();
  const expense = await get(id);
  if (!expense) throw new ExpenseNotFoundError(id);
  if ((expense.createdBy ?? '') !== uid && expense.paidBy !== uid) {
    throw new ExpenseDeleteNotAllowedError(id);
  }
  await removeReceipts(id);
  await requireStorageAdapter().deleteDocument('expenses', id);
}
