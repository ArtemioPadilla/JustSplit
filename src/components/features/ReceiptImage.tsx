import * as React from 'react';
import { useSignedUrl } from '@/lib/data/hooks/useSignedUrl';
import { cn } from '@/lib/utils';

/**
 * `<ReceiptImage path alt />` (plan B5b, spec D10 "Images"): resolves the
 * object PATH stored on the row (`Expense.images[]`, `profiles.avatarUrl`)
 * to a signed URL and renders it. Not shown in `/showcase`: it needs a real
 * Supabase Storage object and an authenticated, member session to render
 * anything meaningful — there is no backend-free way to demo it.
 *
 * The resolution state machine itself lives in `useSignedUrl`
 * (`src/lib/data/hooks/useSignedUrl.ts`, factored out in plan B15's
 * `UserAvatar` follow-up) — this component is now just that hook plus the
 * loading/error UI below.
 */
export interface ReceiptImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  /** The object path stored on the row, e.g. `expenses/{id}/{uuid}.jpg`. */
  path: string;
  /** Required — the receipt's accessible description (never decorative). */
  alt: string;
  /** Forwarded to `signedUrl`'s `expiresInSeconds` (default 3600, `signedUrl`'s own default). */
  expiresInSeconds?: number;
}

export function ReceiptImage({ path, alt, expiresInSeconds, className, ...imgProps }: ReceiptImageProps) {
  const state = useSignedUrl(path, expiresInSeconds);

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div
        role="status"
        aria-label={alt}
        className={cn('animate-pulse rounded-md bg-muted', className)}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          'flex items-center justify-center rounded-md bg-muted text-center text-xs text-muted-foreground',
          className,
        )}
      >
        Image unavailable
      </div>
    );
  }

  return <img src={state.url} alt={alt} className={className} {...imgProps} />;
}
