import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { admin, cast, expenseRow, seed, type Actor } from './rls/fixtures';

/**
 * Plan B5b acceptance: "an upload against `supabase start` lands under
 * `receipts/expenses/…` and renders through a signed URL." Runs ONLY
 * against `supabase start` (`npm run test:contract:live`; CI job "RLS &
 * contract (supabase start)") — excluded from `npm run test`/`npm run check`
 * (`vitest.config.ts`), the same way `storage-adapter-contract.live.test.ts`
 * is.
 *
 * `src/lib/data/storage.ts` gets its client from `requireSupabase()`
 * (`client.ts`'s app-wide singleton, built from `PUBLIC_SUPABASE_*` env
 * vars) — this test mocks that ONE function to return the RLS fixtures'
 * already-authenticated actor client instead, so the real `uploadReceipt`/
 * `removeReceipts`/`signedUrl` implementations run against a real session,
 * without needing `PUBLIC_SUPABASE_*` configured for the test process.
 * `src/tests/rls/storage.test.ts` (`npm run test:rls`) is what proves the
 * `storage.objects` POLICIES; this file proves `storage.ts`'s own functions
 * end-to-end against them.
 */
const { requireSupabase } = vi.hoisted(() => ({ requireSupabase: vi.fn() }));
vi.mock('@/lib/data/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/data/client')>()),
  requireSupabase,
}));

const { removeReceipts, signedUrl, uploadAvatar, uploadReceipt } = await import('@/lib/data/storage');

let actor: Actor;
let cleanupCast: () => Promise<void>;
const uploadedPaths: string[] = [];

// Skips the real client-side resize (jsdom/node have no createImageBitmap) —
// resize itself is unit-tested against injected fakes in storage.test.ts.
const passthroughResize = { resize: async (file: Blob) => file };

beforeAll(async () => {
  const c = await cast();
  actor = c.A;
  cleanupCast = c.cleanup;
  requireSupabase.mockImplementation(() => actor.db);
});

afterAll(async () => {
  if (uploadedPaths.length) await admin.storage.from('receipts').remove(uploadedPaths);
  await cleanupCast();
});

const jpegBytes = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], { type: 'image/jpeg' });

describe('storage.ts against a real Supabase Storage stack', () => {
  it('uploadReceipt lands under receipts/expenses/{id}/…, and signedUrl resolves it to the uploaded bytes', async () => {
    const expense = await seed('expenses', expenseRow(actor, []));

    const path = await uploadReceipt(expense.id as string, jpegBytes(), passthroughResize);
    uploadedPaths.push(path);
    expect(path).toMatch(new RegExp(`^expenses/${expense.id}/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}\\.jpg$`));

    const url = await signedUrl(path, 60);
    expect(url).toMatch(/^https?:\/\//);

    const response = await fetch(url);
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toMatch(/image\/jpeg/);

    await removeReceipts(expense.id as string);
    const afterRemoval = await admin.storage.from('receipts').list(`expenses/${expense.id}`);
    expect(afterRemoval.data).toEqual([]);
    uploadedPaths.length = 0; // already cleaned up
  });

  it('uploadAvatar lands under receipts/avatars/{uid}/…', async () => {
    const path = await uploadAvatar(actor.id, jpegBytes(), passthroughResize);
    uploadedPaths.push(path);
    expect(path).toMatch(new RegExp(`^avatars/${actor.id}/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}\\.jpg$`));

    const url = await signedUrl(path, 60);
    const response = await fetch(url);
    expect(response.ok).toBe(true);
  });
});
