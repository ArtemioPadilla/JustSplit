import { ChevronDown } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

import { columnsTriggerClass } from '@/components/ui/data-table-columns-menu';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * The real "Columns" menu (the heavy half of `ColumnsMenu`, loaded on first use,
 * plan B19). Mounted after the user's first click, so it opens itself.
 */
export default function ColumnsMenuImpl<TData>({ table, defaultOpen = false }: { table: Table<TData>; defaultOpen?: boolean }) {
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger className={columnsTriggerClass}>
        Columns
        <ChevronDown className="h-4 w-4 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((col) => col.getCanHide())
          .map((col) => (
            <DropdownMenuCheckboxItem
              key={col.id}
              checked={col.getIsVisible()}
              onCheckedChange={(value) => col.toggleVisibility(Boolean(value))}
            >
              {/* Use header string when available, fall back to column id */}
              {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
