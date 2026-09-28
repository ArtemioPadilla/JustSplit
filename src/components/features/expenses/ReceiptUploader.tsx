import * as React from 'react';
import { XIcon } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { cn } from '@/lib/utils';

/** Mirrors the `receipts` bucket's own hard limit (`db/migrations/20260928000007_receipts_storage.sql`), pre-resize. */
export const RECEIPT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const DEFAULT_MAX_IMAGES = 5;

export interface ReceiptUploaderProps {
  /** Not-yet-uploaded files, picked in this form session. */
  files: File[];
  onChange: (files: File[]) => void;
  /** Already-uploaded receipts (edit mode) counted toward `maxImages` alongside `files`. */
  existingCount?: number;
  maxImages?: number;
  onError?: (message: string) => void;
  className?: string;
}

/**
 * The expense form's receipt picker (plan B10, ported from the legacy
 * `ImageUploader` onto `ui/file-upload.tsx` over `File[]` — see this file's
 * test header for what changed and why). Files are NOT uploaded here: the
 * form uploads them at submit time, in the order `createWithReceipts`/
 * `addReceipts` fix (`repos/expenses.ts`).
 *
 * Renders an object-URL preview per file (revoked on unmount/change, plain
 * effect cleanup — no event listener/interval/observer here, so
 * `createDisposer` buys nothing) and a remove control, plus a `FileUpload`
 * dropzone that disappears once `existingCount + files.length` reaches
 * `maxImages`. Rejects a non-image file client-side even though the picker's
 * own `accept="image/*"` normally filters it out — drag-and-drop bypasses
 * `accept` entirely.
 */
export function ReceiptUploader({
  files,
  onChange,
  existingCount = 0,
  maxImages = DEFAULT_MAX_IMAGES,
  onError,
  className,
}: ReceiptUploaderProps) {
  const previews = usePreviewUrls(files);
  const atLimit = existingCount + files.length >= maxImages;

  // `FileUpload` is always given an EMPTY `files` list (below) so it never
  // renders its own "Selected files" token list — this component owns the
  // preview grid instead, and rendering both would duplicate the "Remove
  // <name>" control under the same accessible name. Passing `files={[]}`
  // also means its own `onChange` hands back just the NEWLY picked batch
  // (its `accept_()` computes `[...files, ...next]`), which this handler
  // merges onto the real `files` prop itself.
  function handleChange(next: File[]) {
    const images = next.filter((f) => f.type.startsWith('image/'));
    if (images.length < next.length) onError?.('Only image files can be attached as receipts.');
    if (images.length === 0) return;

    const allowed = Math.max(0, maxImages - existingCount - files.length);
    if (images.length > allowed) {
      onError?.(`You can attach up to ${maxImages} receipts.`);
      onChange([...files, ...images.slice(0, allowed)]);
      return;
    }
    onChange([...files, ...images]);
  }

  function remove(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {atLimit ? (
        <p className="text-sm text-muted-foreground">Maximum of {maxImages} receipts reached.</p>
      ) : (
        <FileUpload
          files={[]}
          onChange={handleChange}
          accept="image/*"
          multiple
          maxSize={RECEIPT_MAX_UPLOAD_BYTES}
          onError={onError}
        />
      )}
      {files.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Receipt previews">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="relative">
              <img
                src={previews[index]}
                alt={`Preview of ${file.name}`}
                className="h-20 w-full rounded-md border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove ${file.name}`}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-background p-0.5 text-muted-foreground shadow ring-1 ring-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Object-URL previews for `files`, revoked whenever the list changes or the component unmounts. */
function usePreviewUrls(files: File[]): string[] {
  const [urls, setUrls] = React.useState<string[]>([]);
  React.useEffect(() => {
    const next = files.map((file) => URL.createObjectURL(file));
    setUrls(next);
    return () => {
      next.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the file list identity, not individual File objects
  }, [files]);
  return urls;
}
