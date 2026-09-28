import * as React from 'react';
import { DownloadIcon } from 'lucide-react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/**
 * DownloadTrigger — icon/label button with a loading state while an async
 * export function runs, then triggers a browser file download from the
 * resolved Blob (ROADMAP Epic 23). A standalone primitive, not DataTable-
 * specific — <DataTable>'s `onExport` prop renders one in its toolbar, but
 * it composes into any export/download flow.
 */
export interface DownloadTriggerProps
  extends Omit<ButtonProps, 'onClick' | 'children' | 'onError'> {
  /** Runs on click; must resolve with the file content as a Blob. */
  onExport: () => Promise<Blob>;
  /** Filename for the downloaded file. Defaults to 'export'. */
  filename?: string;
  /** Button label (and default aria-label). Defaults to 'Export'. */
  label?: string;
  /** Called when `onExport` rejects. The loading state always resets regardless. */
  onError?: (error: Error) => void;
}

const DownloadTrigger = React.forwardRef<HTMLButtonElement, DownloadTriggerProps>(
  (
    { onExport, filename = 'export', label = 'Export', onError, className, variant = 'outline', ...props },
    ref,
  ) => {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleClick = React.useCallback(async () => {
      setIsLoading(true);
      try {
        const blob = await onExport();
        // Standard anchor-download trick — works for any Blob/MIME type,
        // no extra dependency. The URL is revoked immediately after the
        // synchronous click dispatch triggers the browser's save prompt.
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        onError?.(normalized);
      } finally {
        setIsLoading(false);
      }
    }, [onExport, filename, onError]);

    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        aria-busy={isLoading}
        aria-label={label}
        onClick={handleClick}
        className={cn(className)}
        {...props}
        // Applied after {...props} so isLoading always wins — a caller's
        // disabled={false} must never re-enable a button mid-export, or a
        // double-click can fire a second concurrent onExport() call.
        disabled={isLoading || props.disabled}
      >
        {isLoading ? <Spinner label="Exporting" /> : <DownloadIcon className="size-4" />}
        {label}
      </Button>
    );
  },
);
DownloadTrigger.displayName = 'DownloadTrigger';

export { DownloadTrigger };
