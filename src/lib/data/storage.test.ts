import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Plan B5b, spec D10 "Images". `requireSupabase` is mocked the same way
 * `client.test.ts` fakes the SDK — this file never touches a real Supabase
 * project; the live upload/signed-URL path is proven by
 * `src/tests/storage.live.test.ts` (`npm run test:contract:live`) and the
 * `storage.objects` policies by `src/tests/rls/storage.test.ts`
 * (`npm run test:rls`).
 */
const { requireSupabase } = vi.hoisted(() => ({ requireSupabase: vi.fn() }));
vi.mock('./client', () => ({ requireSupabase }));

const {
  RECEIPTS_BUCKET,
  avatarPath,
  computeResizeDimensions,
  receiptPath,
  removeAvatar,
  removeReceipts,
  resizeImage,
  signedUrl,
  uploadAvatar,
  uploadReceipt,
} = await import('./storage');

interface FakeStorageOverrides {
  upload?: ReturnType<typeof vi.fn>;
  list?: ReturnType<typeof vi.fn>;
  remove?: ReturnType<typeof vi.fn>;
  createSignedUrl?: ReturnType<typeof vi.fn>;
  getUser?: ReturnType<typeof vi.fn>;
}

function fakeStorageClient(overrides: FakeStorageOverrides = {}) {
  const upload = overrides.upload ?? vi.fn().mockResolvedValue({ data: { path: 'x' }, error: null });
  const list = overrides.list ?? vi.fn().mockResolvedValue({ data: [], error: null });
  const remove = overrides.remove ?? vi.fn().mockResolvedValue({ data: [], error: null });
  const createSignedUrl =
    overrides.createSignedUrl ?? vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example/x' }, error: null });
  const getUser = overrides.getUser ?? vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  const from = vi.fn(() => ({ upload, list, remove, createSignedUrl }));
  const client = { storage: { from }, auth: { getUser } } as unknown as SupabaseClient;
  return { client, upload, list, remove, createSignedUrl, getUser, from };
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe('object path layout (spec D10: storage.foldername(name) needs a SECOND segment)', () => {
  it('receiptPath is expenses/{expenseId}/{uuid}.jpg', () => {
    expect(receiptPath('exp-1')).toMatch(new RegExp(`^expenses/exp-1/${UUID_RE.source}\\.jpg$`, 'i'));
  });

  it('avatarPath is avatars/{uid}/{uuid}.jpg — never a flat avatars/{uid}.jpg, which the RLS policy denies', () => {
    expect(avatarPath('user-1')).toMatch(new RegExp(`^avatars/user-1/${UUID_RE.source}\\.jpg$`, 'i'));
  });
});

describe('computeResizeDimensions (pure)', () => {
  it('leaves an image already within 1600px untouched', () => {
    expect(computeResizeDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('scales the longest side down to 1600px, preserving aspect ratio', () => {
    expect(computeResizeDimensions(3200, 1600)).toEqual({ width: 1600, height: 800 });
    expect(computeResizeDimensions(1600, 3200)).toEqual({ width: 800, height: 1600 });
  });

  it('a square image scales both sides equally', () => {
    expect(computeResizeDimensions(2000, 2000)).toEqual({ width: 1600, height: 1600 });
  });
});

describe('resizeImage (injectable canvas/createImageBitmap, plan B5b)', () => {
  function fakeCanvas(blobSizes: number[]) {
    let call = 0;
    const drawImage = vi.fn();
    const convertToBlob = vi.fn(async (opts: { type: string }) => {
      const size = blobSizes[Math.min(call, blobSizes.length - 1)]!;
      call += 1;
      return new Blob([new Uint8Array(size)], { type: opts.type });
    });
    return { canvas: { width: 0, height: 0, getContext: () => ({ drawImage }), convertToBlob }, drawImage, convertToBlob };
  }

  it('scales the bitmap through computeResizeDimensions before drawing, and re-encodes as JPEG', async () => {
    const { canvas, drawImage } = fakeCanvas([500]);
    const createCanvas = vi.fn(() => canvas);
    const createImageBitmap = vi.fn().mockResolvedValue({ width: 3200, height: 1600, close: vi.fn() });

    const blob = await resizeImage(new Blob(['orig']), { createImageBitmap, createCanvas });

    expect(createCanvas).toHaveBeenCalledWith(1600, 800);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 800);
    expect(blob.type).toBe('image/jpeg');
  });

  it('steps the JPEG quality down until the blob is <= 1 MiB', async () => {
    const oneMiB = 1024 * 1024;
    const { canvas, convertToBlob } = fakeCanvas([oneMiB + 5000, oneMiB + 2000, oneMiB - 10]);
    const createCanvas = vi.fn(() => canvas);
    const createImageBitmap = vi.fn().mockResolvedValue({ width: 800, height: 600 });

    const blob = await resizeImage(new Blob(['orig']), { createImageBitmap, createCanvas });

    expect(blob.size).toBeLessThanOrEqual(oneMiB);
    expect(convertToBlob).toHaveBeenCalledTimes(3);
  });

  it('gives up stepping quality down below a floor, returning the smallest blob it produced', async () => {
    const oneMiB = 1024 * 1024;
    const { canvas, convertToBlob } = fakeCanvas([oneMiB * 2]);
    const createCanvas = vi.fn(() => canvas);
    const createImageBitmap = vi.fn().mockResolvedValue({ width: 800, height: 600 });

    const blob = await resizeImage(new Blob(['orig']), { createImageBitmap, createCanvas });

    expect(blob.size).toBe(oneMiB * 2);
    expect(convertToBlob.mock.calls.length).toBeGreaterThan(1);
  });
});

describe('uploadReceipt', () => {
  it('resizes, then uploads under expenses/{expenseId}/{uuid}.jpg', async () => {
    const { client, upload, from } = fakeStorageClient();
    requireSupabase.mockReturnValue(client);
    const resized = new Blob(['resized'], { type: 'image/jpeg' });
    const resize = vi.fn().mockResolvedValue(resized);

    const path = await uploadReceipt('exp-1', new Blob(['orig']), { resize });

    expect(resize).toHaveBeenCalledWith(expect.any(Blob));
    expect(from).toHaveBeenCalledWith(RECEIPTS_BUCKET);
    expect(path).toMatch(new RegExp(`^expenses/exp-1/${UUID_RE.source}\\.jpg$`, 'i'));
    expect(upload).toHaveBeenCalledWith(path, resized, expect.objectContaining({ contentType: 'image/jpeg' }));
  });

  it('throws (and never returns a path) when the storage API rejects the upload', async () => {
    const { client } = fakeStorageClient({ upload: vi.fn().mockResolvedValue({ data: null, error: new Error('denied') }) });
    requireSupabase.mockReturnValue(client);

    await expect(
      uploadReceipt('exp-1', new Blob(['orig']), { resize: vi.fn().mockResolvedValue(new Blob()) }),
    ).rejects.toThrow('denied');
  });
});

describe('uploadAvatar (uid MUST come from the session, never a spoofable argument alone)', () => {
  it('uploads under avatars/{uid}/{uuid}.jpg when uid matches the signed-in session', async () => {
    const { client, upload } = fakeStorageClient({
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    });
    requireSupabase.mockReturnValue(client);

    const path = await uploadAvatar('user-1', new Blob(['orig']), { resize: vi.fn().mockResolvedValue(new Blob()) });

    expect(path).toMatch(new RegExp(`^avatars/user-1/${UUID_RE.source}\\.jpg$`, 'i'));
    expect(upload).toHaveBeenCalled();
  });

  it('refuses a uid that does not match the signed-in session, before reading or uploading the file', async () => {
    const { client, upload } = fakeStorageClient({
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    });
    requireSupabase.mockReturnValue(client);
    const resize = vi.fn();

    await expect(uploadAvatar('someone-elses-uid', new Blob(['orig']), { resize })).rejects.toThrow(
      /does not match the signed-in session/,
    );
    expect(resize).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuses when there is no signed-in session at all', async () => {
    const { client } = fakeStorageClient({ getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) });
    requireSupabase.mockReturnValue(client);

    await expect(uploadAvatar('user-1', new Blob(['orig']))).rejects.toThrow(/no signed-in session/);
  });
});

describe('removeReceipts (spec D10: repos.expenses.remove calls this BEFORE the row delete)', () => {
  const objects = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ name: `r${from + i}.jpg` }));
  /** remove() that reports every requested path as deleted, like Storage does on success. */
  const removeAll = () =>
    vi.fn(async (paths: string[]) => ({ data: paths.map((name) => ({ name })), error: null }));

  it('lists then removes every object under expenses/{expenseId}/, then confirms the folder is empty', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ name: 'a.jpg' }, { name: 'b.jpg' }], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    const { client, remove } = fakeStorageClient({ list, remove: removeAll() });
    requireSupabase.mockReturnValue(client);

    await removeReceipts('exp-1');

    expect(list).toHaveBeenCalledWith('expenses/exp-1', expect.objectContaining({ limit: 100 }));
    expect(remove).toHaveBeenCalledWith(['expenses/exp-1/a.jpg', 'expenses/exp-1/b.jpg']);
  });

  it('pages past the 100-object listing limit so no receipt is left behind', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({ data: objects(100), error: null })
      .mockResolvedValueOnce({ data: objects(30, 100), error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    const { client, remove } = fakeStorageClient({ list, remove: removeAll() });
    requireSupabase.mockReturnValue(client);

    await removeReceipts('exp-big');

    const removed = remove.mock.calls.flatMap(([paths]) => paths as string[]);
    expect(removed).toHaveLength(130);
    expect(new Set(removed).size).toBe(130);
  });

  it('throws when Storage silently removes fewer objects than requested (a denied delete)', async () => {
    const list = vi.fn().mockResolvedValue({ data: [{ name: 'a.jpg' }, { name: 'b.jpg' }], error: null });
    const remove = vi.fn().mockResolvedValue({ data: [{ name: 'expenses/exp-1/a.jpg' }], error: null });
    const { client } = fakeStorageClient({ list, remove });
    requireSupabase.mockReturnValue(client);

    await expect(removeReceipts('exp-1')).rejects.toThrow(/removed 1 of 2/);
  });

  it('is a no-op when the expense has no receipts (never calls remove([]))', async () => {
    const { client, remove } = fakeStorageClient({ list: vi.fn().mockResolvedValue({ data: [], error: null }) });
    requireSupabase.mockReturnValue(client);

    await removeReceipts('exp-empty');

    expect(remove).not.toHaveBeenCalled();
  });

  it('propagates a listing failure instead of silently proceeding', async () => {
    const { client } = fakeStorageClient({
      list: vi.fn().mockResolvedValue({ data: null, error: new Error('bucket unreachable') }),
    });
    requireSupabase.mockReturnValue(client);

    await expect(removeReceipts('exp-1')).rejects.toThrow('bucket unreachable');
  });

  it('propagates a remove failure', async () => {
    const { client } = fakeStorageClient({
      list: vi.fn().mockResolvedValue({ data: [{ name: 'a.jpg' }], error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: new Error('remove failed') }),
    });
    requireSupabase.mockReturnValue(client);

    await expect(removeReceipts('exp-1')).rejects.toThrow('remove failed');
  });
});

describe('removeAvatar', () => {
  it('removes exactly the given path', async () => {
    const { client, remove } = fakeStorageClient();
    requireSupabase.mockReturnValue(client);

    await removeAvatar('avatars/user-1/old.jpg');

    expect(remove).toHaveBeenCalledWith(['avatars/user-1/old.jpg']);
  });
});

describe('signedUrl (small in-memory cache that expires BEFORE the URL itself does)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('caches a signed URL and skips a second round trip within the TTL', async () => {
    const { client, createSignedUrl } = fakeStorageClient();
    requireSupabase.mockReturnValue(client);

    const first = await signedUrl('expenses/exp-1/cache-a.jpg', 3600);
    const second = await signedUrl('expenses/exp-1/cache-a.jpg', 3600);

    expect(first).toBe(second);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('expires the cache entry before the URL itself does, and re-fetches', async () => {
    const { client, createSignedUrl } = fakeStorageClient();
    requireSupabase.mockReturnValue(client);

    await signedUrl('expenses/exp-1/cache-b.jpg', 3600);
    // 3600s TTL, margin capped at 60s -> the cache entry itself dies at 3540s,
    // 60s before the real URL would (the whole point: never hand out a URL
    // that's about to be rejected by the storage server).
    vi.advanceTimersByTime(3541_000);
    await signedUrl('expenses/exp-1/cache-b.jpg', 3600);

    expect(createSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('does not yet re-fetch just before the cache margin elapses', async () => {
    const { client, createSignedUrl } = fakeStorageClient();
    requireSupabase.mockReturnValue(client);

    await signedUrl('expenses/exp-1/cache-c.jpg', 3600);
    vi.advanceTimersByTime(3539_000);
    await signedUrl('expenses/exp-1/cache-c.jpg', 3600);

    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });
});
