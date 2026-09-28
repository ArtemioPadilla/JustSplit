import * as React from 'react';
import { signedUrl } from '@/lib/data/storage';

/**
 * The Storage-object-path -> signed-URL resolution state (plan B5b/B15).
 * Extracted out of `ReceiptImage.tsx` (its original home) so `UserAvatar`
 * (plan B15 follow-up) uses the SAME mechanism instead of a second copy of
 * this loading/ready/error state machine.
 */
export type SignedUrlState = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; url: string } | { status: 'error' };

/**
 * Resolves `path` (an object path in the `receipts` bucket, e.g.
 * `expenses/{id}/{uuid}.jpg` or `avatars/{uid}/{uuid}.jpg`) to a signed URL
 * via `src/lib/data/storage.ts#signedUrl`. `path === null` means "nothing to
 * resolve" (e.g. `UserAvatar` when `src` isn't a storage path at all) and
 * never calls `signedUrl` — the state stays `idle`.
 */
export function useSignedUrl(path: string | null, expiresInSeconds?: number): SignedUrlState {
  const [state, setState] = React.useState<SignedUrlState>(path ? { status: 'loading' } : { status: 'idle' });

  React.useEffect(() => {
    if (!path) {
      setState({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    signedUrl(path, expiresInSeconds)
      .then((url) => {
        if (!cancelled) setState({ status: 'ready', url });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [path, expiresInSeconds]);

  return state;
}
