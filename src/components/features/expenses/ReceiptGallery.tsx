import * as React from 'react';
import { ReceiptImage } from '@/components/features/ReceiptImage';
import { signedUrl } from '@/lib/data/storage';
import { notifyError } from '@/stores/notifications';

export interface ReceiptGalleryProps {
  /** Object paths stored on `Expense.images[]` (B5b, e.g. `expenses/{id}/{uuid}.jpg`). */
  paths: string[];
}

/**
 * The expense detail island's receipt gallery (plan B9). Renders
 * `<ReceiptImage path>` (B5b signed URLs) for each object; clicking a
 * thumbnail resolves the SAME signed URL again (cheap — `signedUrl`'s own
 * in-memory cache, ADR 0005) and opens it in a new tab. `window.open`'s
 * third-argument string form is the programmatic equivalent of a real
 * anchor's `rel="noopener noreferrer"` — there is no anchor to attach that
 * to upfront, since the href isn't known until the signed URL resolves.
 */
export function ReceiptGallery({ paths }: ReceiptGalleryProps) {
  if (paths.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {paths.map((path, index) => (
        <ReceiptGalleryItem key={path} path={path} index={index} />
      ))}
    </div>
  );
}

function ReceiptGalleryItem({ path, index }: { path: string; index: number }) {
  const handleClick = React.useCallback(async () => {
    try {
      const url = await signedUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      notifyError('Could not open this receipt');
    }
  }, [path]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Receipt ${index + 1} — open in a new tab`}
      className="overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <ReceiptImage path={path} alt={`Receipt ${index + 1}`} className="h-32 w-full object-cover" />
    </button>
  );
}
