import * as React from 'react';
import { ChevronsUpDownIcon } from 'lucide-react';

import { comboboxIconClass, comboboxInputClass } from '@/components/ui/combobox-styles';
import { cn } from '@/lib/utils';

// The Base UI combobox and its popup stack (floating-ui, tabbable, list
// navigation, backdrop) are ~45 kB gz, and nearly every app page has a currency
// selector. Loaded on demand (plan B19) so none of it is in a page's statically
// loaded JS; the stand-in below shows meanwhile. Not `@/components/ui/combobox`
// directly: `src/tests/lazy-boundaries.test.ts` pins that.
const CurrencyCombobox = React.lazy(() => import('@/components/features/currency/CurrencyCombobox'));

/**
 * CurrencySelector (plan B16, spec D4: replaces the legacy `<select>`-based
 * CurrencySelector with the extended Base UI `Combobox`). Reused everywhere
 * a currency needs picking: dashboard header, expenses list/detail, events
 * list/detail, settlements, group detail, profile — every caller owns its
 * own `value`/`onChange` (no implicit context read, unlike the legacy
 * component's `AppContext` fallback).
 *
 * While the combobox chunk loads, a read-only input with the same id, look and
 * value stands in for it (so the label, the layout and the current currency are
 * there at once and nothing shifts). If the user focused it in the meantime, the
 * real combobox takes that focus when it arrives.
 */
export interface CurrencySelectorProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  id?: string;
  className?: string;
}

function CurrencyStandIn({ id, value, onFocus, onBlur }: { id: string; value: string; onFocus: () => void; onBlur: () => void }) {
  return (
    <div className="relative">
      <input id={id} readOnly value={value} aria-busy="true" onFocus={onFocus} onBlur={onBlur} className={comboboxInputClass} />
      <span className={comboboxIconClass}>
        <ChevronsUpDownIcon aria-hidden="true" className="h-4 w-4 opacity-70" />
      </span>
    </div>
  );
}

export function CurrencySelector({
  value,
  onChange,
  label = 'Currency',
  id = 'currency-selector',
  className,
}: CurrencySelectorProps) {
  const [standInFocused, setStandInFocused] = React.useState(false);
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <React.Suspense
        fallback={<CurrencyStandIn id={id} value={value} onFocus={() => setStandInFocused(true)} onBlur={() => setStandInFocused(false)} />}
      >
        <CurrencyCombobox id={id} value={value} onChange={onChange} focusOnMount={standInFocused} />
      </React.Suspense>
    </div>
  );
}
