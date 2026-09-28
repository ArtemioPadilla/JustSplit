import * as React from 'react';
import { UploadCloudIcon, FileIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * FileUpload — dropzone + file input + token list (Cloudscape gap roadmap
 * Epic E). The one input gap real forms hit. Controlled: the parent owns the
 * `files` array; this renders the drop target, the hidden input, and the
 * removable token group.
 */
export interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  /** Max size per file in bytes; oversized files are rejected with onError. */
  maxSize?: number;
  onError?: (message: string) => void;
  className?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileUpload({
  files,
  onChange,
  accept,
  multiple = false,
  maxSize,
  onError,
  className,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function accept_(incoming: FileList | null) {
    if (!incoming) return;
    const next: File[] = [];
    for (const f of Array.from(incoming)) {
      if (maxSize && f.size > maxSize) {
        onError?.(`"${f.name}" exceeds the ${formatSize(maxSize)} limit.`);
        continue;
      }
      next.push(f);
    }
    if (next.length === 0) return;
    onChange(multiple ? [...files, ...next] : next.slice(0, 1));
  }

  function remove(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Add files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept_(e.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dragging ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50',
        )}
      >
        <UploadCloudIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Drag {multiple ? 'files' : 'a file'} here or{' '}
          <span className="font-medium text-primary">browse</span>
        </p>
        {maxSize && <p className="text-xs text-muted-foreground">Max {formatSize(maxSize)} per file</p>}
      </div>
      {/* The native input lives OUTSIDE the role="button" dropzone — nesting an
          interactive <input> inside an interactive role trips axe's
          nested-interactive rule. The dropzone triggers it via the ref. */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          accept_(e.target.files);
          e.target.value = ''; // allow re-selecting the same file
        }}
      />
      {files.length > 0 && (
        <ul className="space-y-1.5" aria-label="Selected files">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm"
            >
              <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatSize(f.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => remove(i)}
                className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
