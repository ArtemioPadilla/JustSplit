import * as React from 'react';

import { Combobox, type ComboboxItem } from '@/components/ui/combobox';
import { SUPPORTED_CURRENCIES } from '@/domain/currency';
import { cn } from '@/lib/utils';

/**
 * CurrencySelector (plan B16, spec D4: replaces the legacy `<select>`-based
 * CurrencySelector with the extended Base UI `Combobox`). Reused everywhere
 * a currency needs picking: dashboard header, expenses list/detail, events
 * list/detail, settlements, group detail, profile — every caller owns its
 * own `value`/`onChange` (no implicit context read, unlike the legacy
 * component's `AppContext` fallback).
 */
export interface CurrencySelectorProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  id?: string;
  className?: string;
}

function renderCurrencyItem(item: ComboboxItem): React.ReactNode {
  if (typeof item === 'string') return item;
  return (
    <span className="flex w-full items-center justify-between gap-3">
      <span className="font-medium">{item.code}</span>{' '}
      <span className="text-muted-foreground">
        {item.symbol} · {item.name}
      </span>
    </span>
  );
}

export function CurrencySelector({
  value,
  onChange,
  label = 'Currency',
  id = 'currency-selector',
  className,
}: CurrencySelectorProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Combobox
        id={id}
        items={SUPPORTED_CURRENCIES}
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next);
        }}
        renderItem={renderCurrencyItem}
        emptyMessage="No matching currency."
      />
    </div>
  );
}
