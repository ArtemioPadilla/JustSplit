import * as React from 'react';
import { CurrencySelector } from '@/components/features/currency/CurrencySelector';
import ErrorBoundary from './ErrorBoundary';

/**
 * /showcase-only wrapper: CurrencySelector's `value`/`onChange` are fully
 * controlled by the caller (plan B16 — no implicit context/store read), so
 * something needs to hold the state for the demo. A single hydration
 * boundary, same pattern as UserAccountMenu's Suspense fallback — nothing
 * here is a multi-island compound composition.
 */
export default function ShowcaseCurrencySelector() {
  return (
    <ErrorBoundary name="ShowcaseCurrencySelector">
      <ShowcaseCurrencySelectorInner />
    </ErrorBoundary>
  );
}

function ShowcaseCurrencySelectorInner() {
  const [value, setValue] = React.useState('USD');

  return (
    <div className="flex flex-col gap-2">
      <CurrencySelector value={value} onChange={setValue} id="showcase-currency-selector" />
      <p className="text-xs text-muted-foreground">
        Selected: <span className="font-mono">{value}</span>
      </p>
    </div>
  );
}
