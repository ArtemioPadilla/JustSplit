import * as React from 'react';
import { useStore } from '@nanostores/react';
import { Pause, Play } from 'lucide-react';

import { $preferredCurrency } from '@/stores/preferences';
import { SUPPORTED_CURRENCIES } from '@/domain/currency';
import { fetchExchangeRate } from '@/lib/currency/rates';
import { createDisposer } from '@/lib/disposer';
import { cn } from '@/lib/utils';
import ErrorBoundary from './ErrorBoundary';

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
export default function CurrencyExchangeTicker(props: { className?: string }) {
  return (
    <ErrorBoundary name="CurrencyExchangeTicker">
      <CurrencyExchangeTickerInner {...props} />
    </ErrorBoundary>
  );
}

function CurrencyExchangeTickerInner({ className }: { className?: string }) {
  const base = useStore($preferredCurrency);
  const [rates, setRates] = React.useState<TickerRate[]>([]);
  const [loading, setLoading] = React.useState(true);
  // WCAG 2.2.2 (Pause, Stop, Hide): the CSS-only auto-scroll (global.css
  // .ticker-track) previously only paused on :hover/:focus-within with
  // nothing inside the list focusable — a keyboard or touch user could
  // never pause it. This toggle is the explicit, always-reachable control;
  // `data-paused` on the track is what the CSS keys `animation-play-state:
  // paused` off (see global.css).
  const [paused, setPaused] = React.useState(false);

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
        {rates.length > 0 && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            // Hidden under prefers-reduced-motion: the animation is already
            // off there (global.css), so a pause toggle for it would be a
            // no-op control — nothing is lost, since overflow-x-auto already
            // keeps the list reachable by a plain scroll either way.
            className="ticker-pause-toggle ml-auto flex size-6 shrink-0 items-center justify-center rounded hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {paused ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}
            <span className="sr-only">Pause exchange-rate scrolling</span>
          </button>
        )}
      </div>

      {hasFallback && (
        <p className="border-y border-dashed border-primary-foreground/40 bg-black/20 px-3 py-1 text-center text-xs text-primary-foreground">
          * Some rates are approximate
        </p>
      )}

      {rates.length > 0 ? (
        // Documented exception (eslint-plugin-jsx-a11y's own rule docs,
        // "Case: Shouldn't I add a tabindex..."): a scrollable container
        // needs tabIndex={0} so keyboard users can actually scroll it
        // (axe's scrollable-region-focusable rule; WCAG 2.1.1). This is a
        // real, necessary content region, not a non-interactive `<article>`
        // or `<li>` the rule is meant to guard against.
        <div
          className="ticker-viewport overflow-x-auto"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          aria-label={`Exchange rates versus ${base}, scrollable`}
        >
          {/* Not a live region on purpose: a 30-min refresh must not make a
              screen reader re-announce this list every time it changes
              (CLAUDE.md island-lifecycle discipline extended to a11y). The
              list is rendered exactly once — real content, never duplicated
              or hidden from assistive tech — and stays perfectly readable
              via normal tab/read navigation regardless of the CSS-only
              scroll animation applied to it (global.css `.ticker-track`,
              disabled under `prefers-reduced-motion`, at which point
              `overflow-x-auto` above keeps every pair reachable by a plain
              horizontal scroll). `tabIndex={0}` + `aria-label` make this
              viewport itself keyboard-focusable (axe
              scrollable-region-focusable) and its `:focus-within` is what
              global.css also uses to pause the animation for a keyboard
              user, alongside the explicit toggle button above and plain
              `:hover`. */}
          <ul
            className="ticker-track flex w-max gap-6 whitespace-nowrap px-3 py-2"
            data-paused={paused ? 'true' : undefined}
          >
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
