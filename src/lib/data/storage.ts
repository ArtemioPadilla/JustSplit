import { assertOnline } from '@/lib/offline-write';
import { requireSupabase } from './client';

/**
 * Supabase Storage helpers (plan B5b, spec D10 "Images", ADR 0005). Besides
 * `client.ts` and `relational-adapter.ts`, this is the only module that
 * touches `@supabase/supabase-js` — it gets the client through
 * `requireSupabase()`, never a raw import (CLAUDE.md rule 7,
 * `src/tests/data-boundary.test.ts`).
 *
 * Bucket `receipts` (private, 5 MiB, `image/*`;
 * `db/migrations/20260928000007_receipts_storage.sql`). Two path shapes,
 * both required by the `storage.objects` policies — `storage.foldername(name)`
 * needs a SECOND folder segment, so a flat `avatars/{uid}.jpg` is always
 * denied:
 *   - `expenses/{expenseId}/{uuid}.jpg` — every member of that expense may
 *     read/write; the expense row must exist BEFORE the first upload (the
 *     insert policy looks it up by id in `public.expenses`).
 *   - `avatars/{uid}/{uuid}.jpg` — any signed-in user may read; only the
 *     owner (`(storage.foldername(name))[2] = auth.uid()`) may write.
 */
export const RECEIPTS_BUCKET = 'receipts';

/** Storage list() page size (its default cap). */
const LIST_PAGE_SIZE = 100;
/** Upper bound on list/remove rounds in removeReceipts (100 × 100 objects). */
const MAX_REMOVE_ROUNDS = 100;

// ── id generation ────────────────────────────────────────────────────────
// Mirrors `relational-adapter.ts`'s `randomUUID`: no static `node:crypto`
// import, since this module ships to the browser.
function randomUUID(): string {
  const webcrypto = globalThis.crypto;
  if (typeof webcrypto?.randomUUID === 'function') return webcrypto.randomUUID();
  if (typeof webcrypto?.getRandomValues === 'function') {
    const bytes = webcrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error('storage.ts needs globalThis.crypto (Node 20+, a browser, or Cloudflare workerd).');
}

export function receiptPath(expenseId: string, id: string = randomUUID()): string {
  return `expenses/${expenseId}/${id}.jpg`;
}

export function avatarPath(uid: string, id: string = randomUUID()): string {
  return `avatars/${uid}/${id}.jpg`;
}

// ── client-side resize (plan B5b: <= 1600px longest side, <= 1 MiB, JPEG) ──

export const MAX_DIMENSION_PX = 1600;
export const MAX_BYTES = 1024 * 1024; // 1 MiB
export const JPEG_MIME_TYPE = 'image/jpeg';

/** Pure: the largest side scaled down to fit `maxDimension`, aspect ratio preserved. Already-small images pass through unchanged. */
export function computeResizeDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_DIMENSION_PX,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** The minimal surface `resizeImage` needs from a decoded image — real `ImageBitmap`s satisfy this. */
interface DecodedImage {
  width: number;
  height: number;
  close?: () => void;
}

/** The minimal surface `resizeImage` needs from a canvas — real `<canvas>`/`OffscreenCanvas` elements satisfy this. */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(id: '2d'): { drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void } | null;
  convertToBlob?(opts: { type: string; quality: number }): Promise<Blob>;
  toBlob?(callback: (blob: Blob | null) => void, type: string, quality: number): void;
}

export interface ResizeImageDeps {
  /** Defaults to `globalThis.createImageBitmap`. Injected so this is unit-testable in jsdom/node, which implement neither. */
  createImageBitmap?: (blob: Blob) => Promise<DecodedImage>;
  /** Defaults to a real `<canvas>`/`OffscreenCanvas`. Injected for the same reason. */
  createCanvas?: (width: number, height: number) => CanvasLike;
}

function defaultCreateCanvas(width: number, height: number): CanvasLike {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height) as unknown as CanvasLike;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas as unknown as CanvasLike;
}

function canvasToBlob(canvas: CanvasLike, type: string, quality: number): Promise<Blob> {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve, reject) => {
    if (!canvas.toBlob) {
      reject(new Error('resizeImage: canvas supports neither convertToBlob nor toBlob'));
      return;
    }
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('resizeImage: toBlob produced no blob'))), type, quality);
  });
}

const MIN_JPEG_QUALITY = 0.4;
const QUALITY_STEP = 0.1;

/**
 * Client-side resize to <= 1600px longest side, re-encoded as JPEG with the
 * quality stepped down until the blob is <= 1 MiB (or the quality floor is
 * hit, in which case the smallest blob produced is returned rather than
 * looping forever). Pure orchestration over injected
 * `createImageBitmap`/`createCanvas` (plan B5b) — jsdom/node implement
 * neither natively.
 */
export async function resizeImage(file: Blob, deps: ResizeImageDeps = {}): Promise<Blob> {
  const createBitmap = deps.createImageBitmap ?? globalThis.createImageBitmap?.bind(globalThis);
  if (!createBitmap) throw new Error('resizeImage needs createImageBitmap (inject it outside a browser)');
  const createCanvas = deps.createCanvas ?? defaultCreateCanvas;

  const image = await createBitmap(file);
  const { width, height } = computeResizeDimensions(image.width, image.height);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('resizeImage: 2D canvas context unavailable');
  ctx.drawImage(image, 0, 0, width, height);
  image.close?.();

  let quality = 0.92;
  let blob = await canvasToBlob(canvas, JPEG_MIME_TYPE, quality);
  while (blob.size > MAX_BYTES && quality > MIN_JPEG_QUALITY) {
    quality = Math.max(MIN_JPEG_QUALITY, quality - QUALITY_STEP);
    const next = await canvasToBlob(canvas, JPEG_MIME_TYPE, quality);
    if (next.size >= blob.size) break; // no further gain — stop instead of looping at the floor
    blob = next;
    if (quality <= MIN_JPEG_QUALITY) break;
  }
  return blob;
}

// ── uploads ──────────────────────────────────────────────────────────────

export interface UploadDeps {
  resize?: (file: Blob, deps?: ResizeImageDeps) => Promise<Blob>;
}

/**
 * Uploads a receipt photo under `expenses/{expenseId}/{uuid}.jpg`. The
 * expense row must already exist (callers, plan B10, insert it first — the
 * insert policy on `storage.objects` looks it up by id). Resizes
 * client-side first.
 */
export async function uploadReceipt(expenseId: string, file: Blob, deps: UploadDeps = {}): Promise<string> {
  assertOnline(); // plan B19c: refuse before any storage call (ADR 0015)
  const resize = deps.resize ?? resizeImage;
  const resized = await resize(file);
  const path = receiptPath(expenseId);
  const { error } = await requireSupabase().storage.from(RECEIPTS_BUCKET).upload(path, resized, {
    contentType: JPEG_MIME_TYPE,
  });
  if (error) throw error;
  return path;
}

/**
 * Uploads an avatar under `avatars/{uid}/{uuid}.jpg`.
 *
 * `uid` MUST be the caller's own id. The RLS insert policy already enforces
 * `(storage.foldername(name))[2] = (select auth.uid())::text` server-side,
 * but this function refuses a mismatch client-side too — before the file is
 * even resized — instead of trusting a `uid` argument the UI could spoof
 * (e.g. a stale prop, a query param): it re-derives the true uid from the
 * live session (`auth.getUser()`) and compares.
 */
export async function uploadAvatar(uid: string, file: Blob, deps: UploadDeps = {}): Promise<string> {
  assertOnline(); // plan B19c: refuse before any storage call (ADR 0015)
  const client = requireSupabase();
  const { data, error: sessionError } = await client.auth.getUser();
  if (sessionError) throw sessionError;
  const sessionUid = data.user?.id;
  if (!sessionUid) throw new Error('uploadAvatar: no signed-in session');
  if (sessionUid !== uid) {
    throw new Error(
      `uploadAvatar: uid "${uid}" does not match the signed-in session ("${sessionUid}"); the RLS policy would deny this ` +
        'upload anyway ((storage.foldername(name))[2] = auth.uid()).',
    );
  }

  const resize = deps.resize ?? resizeImage;
  const resized = await resize(file);
  const path = avatarPath(uid);
  const { error } = await client.storage.from(RECEIPTS_BUCKET).upload(path, resized, { contentType: JPEG_MIME_TYPE });
  if (error) throw error;
  return path;
}

// ── removal ──────────────────────────────────────────────────────────────

/**
 * Deletes every object under `expenses/{expenseId}/`. `repos.expenses.remove`
 * calls this BEFORE deleting the row (spec D10): once the row is gone, no
 * policy can reach the objects, and they would be orphaned unreachable
 * forever. A listing or removal failure throws, which is what stops
 * `repos.expenses.remove` from deleting the row in that case.
 */
export async function removeReceipts(expenseId: string): Promise<void> {
  assertOnline(); // plan B19c: refuse before any storage call (ADR 0015)
  const client = requireSupabase();
  const bucket = client.storage.from(RECEIPTS_BUCKET);
  const prefix = `expenses/${expenseId}`;
  // list() returns at most `limit` objects, so re-list until the folder is
  // empty. Each round must remove everything it listed: Storage reports a
  // path it was not allowed to delete by leaving it out of `data`, not as an
  // error, and a folder that never empties would otherwise loop forever.
  for (let round = 0; round < MAX_REMOVE_ROUNDS; round++) {
    const { data, error } = await bucket.list(prefix, { limit: LIST_PAGE_SIZE });
    if (error) throw error;
    if (!data || data.length === 0) return;
    const paths = data.map((object) => `${prefix}/${object.name}`);
    const { data: removed, error: removeError } = await bucket.remove(paths);
    if (removeError) throw removeError;
    const removedCount = removed?.length ?? 0;
    if (removedCount < paths.length) {
      throw new Error(`removeReceipts(${expenseId}): removed ${removedCount} of ${paths.length} objects; refusing to continue`);
    }
  }
  throw new Error(`removeReceipts(${expenseId}): folder not empty after ${MAX_REMOVE_ROUNDS} rounds`);
}

/** Shared single-path removal — `removeAvatar`/`removeReceiptObject` differ only in name/doc, not behavior. */
async function removeObject(path: string): Promise<void> {
  assertOnline(); // plan B19c: covers removeAvatar and removeReceiptObject
  const { error } = await requireSupabase().storage.from(RECEIPTS_BUCKET).remove([path]);
  if (error) throw error;
}

/**
 * Deletes a single avatar object. The caller (a future avatar-upload
 * feature, plan B10+) is responsible for calling this only AFTER the
 * `profiles.avatarUrl` update that points away from it has succeeded —
 * removing it first, then failing the profile update, would leave a user's
 * `avatarUrl` pointing at a deleted object.
 */
export async function removeAvatar(path: string): Promise<void> {
  await removeObject(path);
}

/**
 * Deletes a single receipt object (plan B10's edit-flow "remove this
 * receipt" action) — never the whole `expenses/{id}/` folder, which is
 * `removeReceipts` (used only by the whole-expense delete path,
 * `repos.expenses.remove`). `repos.expenses.removeReceipt` calls this AFTER
 * patching `images` to drop the path (ADR 0005 amendment, plan B10): if the
 * patch succeeds but this delete fails, only an unreferenced object
 * remains — never a dangling reference in `images`.
 */
export async function removeReceiptObject(path: string): Promise<void> {
  await removeObject(path);
}

// ── signed URLs ──────────────────────────────────────────────────────────

export const SIGNED_URL_TTL_SECONDS_DEFAULT = 3600;

interface SignedUrlCacheEntry {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

/**
 * How much earlier than the URL's real expiry the CACHE ENTRY itself
 * expires: 10% of the TTL, capped at 60s. A caller within that margin gets
 * a fresh URL instead of one the storage server is about to reject.
 */
function cacheMarginMs(expiresInSeconds: number): number {
  return Math.min(60_000, Math.floor(expiresInSeconds * 1000 * 0.1));
}

/**
 * A signed URL for `path` in the `receipts` bucket, cached in memory until
 * shortly before the URL itself expires (`cacheMarginMs`).
 */
export async function signedUrl(path: string, expiresInSeconds: number = SIGNED_URL_TTL_SECONDS_DEFAULT): Promise<string> {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await requireSupabase().storage.from(RECEIPTS_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw error ?? new Error(`signedUrl: no URL returned for "${path}"`);

  signedUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + expiresInSeconds * 1000 - cacheMarginMs(expiresInSeconds),
  });
  return data.signedUrl;
}
