import * as React from 'react';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ActionBar — contextual bulk-action toolbar (ROADMAP Epic 22), the
 * "N items selected" pattern from enterprise-console tables. Deliberately
 * data-source agnostic: it takes a plain `selectedCount` + `onClearSelection`
 * pair instead of a TanStack-Table row-selection object, so it plugs into
 * `DataTable` (or any other list/table's selection state) without DataTable
 * depending on it — see `docs/COMPONENTS.md` §8 for DataTable's own state
 * shape. Base UI has no dedicated primitive for this; it's plain composition
 * over the existing `Button`.
 */
export interface ActionBarProps {
  /** Number of currently selected items. The bar renders only when > 0. */
  selectedCount: number;
  /** Called when the user dismisses the bar (clears the selection). */
  onClearSelection: () => void;
  /** Customize the announced/displayed label. Defaults to "N item(s) selected". */
  label?: (count: number) => string;
  /** Bulk-action buttons, e.g. `<Button variant="destructive">Delete</Button>`. */
  children?: React.ReactNode;
  className?: string;
}

function defaultLabel(count: number): string {
  return `${count} item${count === 1 ? '' : 's'} selected`;
}

export function ActionBar({
  selectedCount,
  onClearSelection,
  label = defaultLabel,
  children,
  className,
}: ActionBarProps) {
  // Unmounted (not just visually hidden) when nothing is selected — matches
  // the Flashbar/Toast convention of returning null on the empty case.
  if (selectedCount <= 0) return null;

  return (
    <div
      role="status"
      aria-label="Bulk actions"
      className={cn(
        'fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center gap-3',
        'rounded-lg border border-border bg-card px-4 py-3 text-card-foreground shadow-lg',
        className,
      )}
    >
      <span className="text-sm font-medium">{label(selectedCount)}</span>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      <button
        type="button"
        aria-label="Clear selection"
        onClick={onClearSelection}
        className="ml-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
