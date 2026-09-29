import * as React from 'react';
import { ChevronsUpDownIcon } from 'lucide-react';

import { comboboxIconClass, comboboxInputClass } from '@/components/ui/combobox-styles';
import type { WriteState } from '@/lib/use-can-write';
import { cn } from '@/lib/utils';

// The Base UI combobox and its popup stack (floating-ui, tabbable, list
// navigation, backdrop) are ~45 kB gz, and nearly every app page has a currency
// selector. Loaded on demand (plan B19) so none of it is in a page's statically
// loaded JS; the stand-in below shows meanwhile. Not `@/components/ui/combobox`
// directly: `src/tests/lazy-boundaries.test.ts` pins that.
const loadCombobox = () => import('@/components/features/currency/CurrencyCombobox');
const CurrencyCombobox = React.lazy(loadCombobox);

// Idle warm-up (plan B19b). `React.lazy` only fetches the chunk when a selector
// first RENDERS, which on a signed-in page is after auth and the first data. The
// islands that will render one call `useWarmCurrencyCombobox()`, which fetches it
// in the browser's idle time instead. It is the same dynamic `import()` as above,
// so the page's STATIC graph is untouched (`lazy-boundaries.test.ts`,
// `check-budgets`); it only moves when the chunk is requested.
const IDLE_TIMEOUT_MS = 4000; // an idle slot that never comes (a busy page) still warms it
const FALLBACK_DELAY_MS = 1500; // Safari has no requestIdleCallback
let warmed = false;

/** Save-Data users asked not to spend bytes speculatively; the chunk still loads on first use. */
function saveDataRequested(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

/**
 * Fetches the combobox chunk when the browser is idle (`requestIdleCallback`,
 * `setTimeout` where it is missing). Best effort: a failed warm-up is ignored, the
 * real load on first render reports its own error. Returns a cancel function.
 */
export function warmCurrencyCombobox(): () => void {
  if (warmed || typeof window === 'undefined' || saveDataRequested()) return () => {};
  const run = () => {
    if (warmed) return;
    warmed = true;
    loadCombobox().catch(() => {
      warmed = false; // let a later page or selector try again
    });
  };
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback?.(handle);
  }
  const handle = window.setTimeout(run, FALLBACK_DELAY_MS);
  return () => window.clearTimeout(handle);
}

/** Warm the combobox chunk on idle for as long as the calling island is mounted. */
export function useWarmCurrencyCombobox(): void {
  React.useEffect(() => warmCurrencyCombobox(), []);
}

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
  /**
   * Set where choosing a currency WRITES something (the profile's preferred
   * currency, plan B19c, ADR 0015). While `write.canWrite` is false the selector
   * is the read-only stand-in with `aria-disabled` and the page's explanation as
   * its description; nothing opens and no combobox chunk is needed. Leave it out
   * for a display-only choice that never leaves the browser.
   */
  write?: WriteState;
}

function CurrencyStandIn({
  id,
  value,
  onFocus,
  onBlur,
  blocked,
}: {
  id: string;
  value: string;
  onFocus?: () => void;
  onBlur?: () => void;
  blocked?: WriteState['blocked'];
}) {
  return (
    <div className="relative">
      <input
        id={id}
        readOnly
        value={value}
        // Loading is only "busy" for the real stand-in; a blocked selector is not waiting for anything.
        aria-busy={blocked ? undefined : 'true'}
        onFocus={onFocus}
        onBlur={onBlur}
        className={comboboxInputClass}
        {...blocked}
      />
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
  write,
}: CurrencySelectorProps) {
  const [standInFocused, setStandInFocused] = React.useState(false);
  if (write && !write.canWrite) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <CurrencyStandIn id={id} value={value} blocked={write.blocked} />
      </div>
    );
  }
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
