import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

import { cn } from '@/lib/utils';

// The "Columns" toggle is a Base UI dropdown menu; its popup stack (menu,
// floating-ui, list navigation, safe polygon) was ~50 kB gz of /expenses/list's
// static JS for a control most visits never touch. So the button is plain here and
// the menu loads on first use (plan B19); `src/tests/lazy-boundaries.test.ts` pins
// that this file never imports it statically. Hover, focus and touch warm the chunk,
// so by the time a click lands it is usually there.
const loadMenu = () => import('@/components/ui/data-table-columns-menu-impl');
// `React.lazy` erases the component's generic parameter (`Table<unknown>` is not
// assignable from `Table<TData>`), so give the lazy component back its real signature.
const ColumnsMenuImpl = React.lazy(loadMenu) as unknown as <TData>(props: { table: Table<TData>; defaultOpen?: boolean }) => React.ReactNode;

/** Shared with the real trigger in `data-table-columns-menu-impl.tsx` so the swap does not change a pixel. */
export const columnsTriggerClass = cn(
  'ml-auto inline-flex items-center gap-1.5 rounded-md border border-input bg-background',
  'px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

export interface ColumnsMenuProps<TData> {
  table: Table<TData>;
}

export function ColumnsMenu<TData>({ table }: ColumnsMenuProps<TData>) {
  // Set by the first click: from then on the real menu mounts already open.
  const [requested, setRequested] = React.useState(false);

  const standIn = (busy: boolean) => (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded="false"
      aria-busy={busy || undefined}
      className={columnsTriggerClass}
      onClick={() => setRequested(true)}
      onPointerEnter={() => void loadMenu()}
      onFocus={() => void loadMenu()}
      onTouchStart={() => void loadMenu()}
    >
      Columns
      <ChevronDown aria-hidden="true" className="h-4 w-4 opacity-60" />
    </button>
  );

  if (!requested) return standIn(false);
  return (
    <React.Suspense fallback={standIn(true)}>
      <ColumnsMenuImpl table={table} defaultOpen />
    </React.Suspense>
  );
}
