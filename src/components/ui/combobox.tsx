import * as React from 'react';
import { Combobox as BaseCombobox } from '@base-ui-components/react/combobox';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { comboboxIconClass, comboboxInputClass } from './combobox-styles';

// Combobox built on Base UI's Combobox primitive (NOT Radix). Typeahead select
// with built-in filtering. High-level API: pass `items` (string[] or
// {code,symbol,name}[], plan B16 harvest check — CurrencySelector needs the
// latter) + value.
export interface ComboboxObjectItem {
  code: string;
  symbol: string;
  name: string;
}

export type ComboboxItem = string | ComboboxObjectItem;

interface ComboboxProps {
  items: ComboboxItem[];
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  id?: string;
  /** Custom list-item markup. Defaults to the plain string / "CODE — Name (Symbol)" text. */
  renderItem?: (item: ComboboxItem) => React.ReactNode;
}

function isObjectItem(item: ComboboxItem): item is ComboboxObjectItem {
  return typeof item !== 'string';
}

/** The item's identity as a plain string — what `value`/`onValueChange` traffic in. */
function itemToCode(item: ComboboxItem): string {
  return isObjectItem(item) ? item.code : item;
}

function defaultRenderItem(item: ComboboxItem): React.ReactNode {
  return isObjectItem(item) ? `${item.code} — ${item.name} (${item.symbol})` : item;
}

function Combobox({
  items,
  value,
  onValueChange,
  placeholder = 'Search…',
  emptyMessage = 'No results.',
  className,
  id,
  renderItem,
}: ComboboxProps) {
  // The public API traffics in plain string codes (backward compatible with
  // the original string[]-only shape); Base UI's Root needs the actual
  // list item (of `Value` type) as its controlled `value`/`onValueChange`
  // payload, so resolve one to the other at the boundary.
  const selectedItem = React.useMemo<ComboboxItem | null>(() => {
    if (value == null) return null;
    return items.find((item) => itemToCode(item) === value) ?? value;
  }, [items, value]);

  return (
    <BaseCombobox.Root<ComboboxItem>
      items={items}
      value={selectedItem ?? undefined}
      itemToStringLabel={itemToCode}
      itemToStringValue={itemToCode}
      isItemEqualToValue={(a, b) => itemToCode(a) === itemToCode(b)}
      onValueChange={(v) => onValueChange?.(v == null ? null : itemToCode(v))}
    >
      <div className={cn('relative', className)}>
        <BaseCombobox.Input
          id={id}
          placeholder={placeholder}
          onKeyDown={(event) => {
            // Base UI, with its popup CLOSED, answers Escape by clearing the
            // input and selection and stopping the event — so an enclosing
            // Dialog could never be dismissed from here. Skip that handler
            // and let the key bubble; with the popup open, Base UI's own
            // handler still closes just the popup (plan A7).
            if (event.key === 'Escape' && event.currentTarget.getAttribute('aria-expanded') !== 'true') {
              event.preventBaseUIHandler();
            }
          }}
          className={comboboxInputClass}
        />
        <BaseCombobox.Icon className={comboboxIconClass}>
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
              {(item: ComboboxItem) => (
                <BaseCombobox.Item
                  key={itemToCode(item)}
                  value={item}
                  className="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                >
                  <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                    <BaseCombobox.ItemIndicator>
                      <CheckIcon className="h-4 w-4" />
                    </BaseCombobox.ItemIndicator>
                  </span>
                  {renderItem ? renderItem(item) : defaultRenderItem(item)}
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
