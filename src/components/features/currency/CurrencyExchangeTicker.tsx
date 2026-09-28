import * as React from 'react';
import { useStore } from '@nanostores/react';

import { $preferredCurrency } from '@/stores/preferences';
import { SUPPORTED_CURRENCIES } from '@/domain/currency';
import { fetchExchangeRate } from '@/lib/currency/rates';
import { createDisposer } from '@/lib/disposer';
import { cn } from '@/lib/utils';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const ATTRIBUTION_URL = 'https://www.exchangerate-api.com';

interface TickerRate {
  code: string;
  rate: number;
  isFallback: boolean;
}

/**
 * CurrencyExchangeTicker (plan B16). Ported from the legacy Next tree's
 * `src/components/CurrencyExchangeTicker/index.tsx` onto Tailwind v4 +
 * shadcn tokens, `$preferredCurrency` (B5b) as the base, and
 * `fetchExchangeRate` (this issue's shared `$rateCache` helper, B3/B5b)
 * instead of the legacy module-level `exchangeRateCache` singleton.
 *
 * Honesty rules (ethics checklist #2 "no deception"): a fallback rate is
 * always visibly AND textually marked as approximate (never presented as
 * live data), and a pair `getExchangeRate` has no fallback table entry for
 * — which surfaces as the exact `{ rate: 1, isFallback: true }` placeholder
 * — is omitted entirely rather than shown as if 1:1 parity were a real
 * exchange rate.
 */
export default function CurrencyExchangeTicker({ className }: { className?: string }) {
  const base = useStore($preferredCurrency);
  const [rates, setRates] = React.useState<TickerRate[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const d = createDisposer();

    async function load() {
      const targets = SUPPORTED_CURRENCIES.filter((c) => c.code !== base);
      const settled = await Promise.all(
        targets.map(async (c): Promise<TickerRate | null> => {
          try {
            const { rate, isFallback } = await fetchExchangeRate(base, c.code);
            return { code: c.code, rate, isFallback };
          } catch {
            // A single pair failing must not blank the whole ticker.
            return null;
          }
        }),
      );
      if (cancelled) return;
      setRates(
        settled.filter((r): r is TickerRate => {
          if (r == null) return false;
          // Never display the fallback-less 1:1 placeholder as if it were
          // a real rate — omit that pair instead (see file doc comment).
          if (r.isFallback && r.rate === 1) return false;
          return true;
        }),
      );
      setLoading(false);
    }

    load();
    d.interval(REFRESH_INTERVAL_MS, load);

    return () => {
      cancelled = true;
      d.dispose();
    };
  }, [base]);

  const hasFallback = rates.some((r) => r.isFallback);

  if (loading && rates.length === 0) {
    return (
      <div
        className={cn('rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground', className)}
        data-testid="currency-exchange-ticker"
      >
        Loading exchange rates…
      </div>
    );
  }

  return (
    <div
      className={cn('overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-md', className)}
      data-testid="currency-exchange-ticker"
    >
      <div className="flex items-center gap-2 bg-black/20 px-3 py-1 text-sm font-medium">
        <span>Exchange rates · base {base}</span>
        {hasFallback && (
          <span aria-hidden="true" className="motion-safe:animate-pulse text-amber-300">
            *
          </span>
        )}
      </div>

      {hasFallback && (
        <p className="border-y border-dashed border-white/30 bg-amber-400/20 px-3 py-1 text-center text-xs text-amber-100">
          * Some rates are approximate
        </p>
      )}

      {rates.length > 0 ? (
        <div className="ticker-viewport overflow-x-auto">
          {/* Not a live region on purpose: a 30-min refresh must not make a
              screen reader re-announce this list every time it changes
              (CLAUDE.md island-lifecycle discipline extended to a11y). The
              list is rendered exactly once — real content, never duplicated
              or hidden from assistive tech — and stays perfectly readable
              via normal tab/read navigation regardless of the CSS-only
              scroll animation applied to it (global.css `.ticker-track`,
              disabled under `prefers-reduced-motion`, at which point
              `overflow-x-auto` above keeps every pair reachable by a plain
              horizontal scroll). */}
          <ul className="ticker-track flex w-max gap-6 whitespace-nowrap px-3 py-2">
            <TickerItems base={base} rates={rates} />
          </ul>
        </div>
      ) : (
        <div className="px-3 py-2 text-center text-sm italic text-primary-foreground/70">
          Exchange rate data unavailable
        </div>
      )}

      <a
        href={ATTRIBUTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-3 pb-2 text-right text-xs text-primary-foreground/70 hover:underline"
      >
        Rates By Exchange Rate API
      </a>
    </div>
  );
}

function TickerItems({ base, rates }: { base: string; rates: TickerRate[] }) {
  return (
    <>
      {rates.map((r) => (
        <li key={r.code} className="flex items-center gap-1 font-mono text-sm">
          <span>{`${base}/${r.code}`}</span>
          <span>{r.rate.toFixed(4)}</span>
          {r.isFallback && (
            <span title="Approximate rate">
              <span aria-hidden="true">*</span>
              <span className="sr-only"> (approximate)</span>
            </span>
          )}
        </li>
      ))}
    </>
  );
}
