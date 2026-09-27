import * as React from 'react';
import { Combobox as BaseCombobox } from '@base-ui-components/react/combobox';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// Combobox built on Base UI's Combobox primitive (NOT Radix). Typeahead select
// with built-in filtering. High-level API: pass `items` (string[]) + value.
interface ComboboxProps {
  items: string[];
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}

function Combobox({
  items,
  value,
  onValueChange,
  placeholder = 'Search…',
  emptyMessage = 'No results.',
  className,
}: ComboboxProps) {
  return (
    <BaseCombobox.Root
      items={items}
      value={value}
      onValueChange={(v) => onValueChange?.((v as string | null) ?? null)}
    >
      <div className={cn('relative', className)}>
        <BaseCombobox.Input
          placeholder={placeholder}
          className="h-10 w-full rounded-md border border-input bg-background px-3 pr-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <BaseCombobox.Icon className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          <ChevronsUpDownIcon className="h-4 w-4 opacity-70" />
        </BaseCombobox.Icon>
      </div>
      <BaseCombobox.Portal>
        <BaseCombobox.Positioner sideOffset={6} className="z-50">
          <BaseCombobox.Popup className="max-h-[min(var(--available-height),18rem)] w-[var(--anchor-width)] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
            <BaseCombobox.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </BaseCombobox.Empty>
            <BaseCombobox.List>
              {(item: string) => (
                <BaseCombobox.Item
                  key={item}
                  value={item}
                  className="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                >
                  <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                    <BaseCombobox.ItemIndicator>
                      <CheckIcon className="h-4 w-4" />
                    </BaseCombobox.ItemIndicator>
                  </span>
                  {item}
                </BaseCombobox.Item>
              )}
            </BaseCombobox.List>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
}

export { Combobox };
