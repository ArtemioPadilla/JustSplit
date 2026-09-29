import * as React from 'react';

import { Combobox, type ComboboxItem } from '@/components/ui/combobox';
import { SUPPORTED_CURRENCIES } from '@/domain/currency';

export interface CurrencyComboboxProps {
  value: string;
  onChange: (code: string) => void;
  id: string;
  /** The user had focused the stand-in while this chunk loaded: keep their focus. */
  focusOnMount?: boolean;
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

/**
 * The real, interactive half of `CurrencySelector`: the Base UI combobox over
 * `SUPPORTED_CURRENCIES`. Its own module so `CurrencySelector` can load it on
 * demand (plan B19): the combobox and its popup stack are ~45 kB gz.
 */
export default function CurrencyCombobox({ value, onChange, id, focusOnMount = false }: CurrencyComboboxProps) {
  // The stand-in this replaces had the same id; hand its keyboard focus over
  // (the swap unmounts the element that held it).
  // Read once: a later prop change must never move focus.
  const [shouldFocus] = React.useState(focusOnMount);
  React.useEffect(() => {
    if (shouldFocus) document.getElementById(id)?.focus();
  }, [shouldFocus, id]);

  return (
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
  );
}
