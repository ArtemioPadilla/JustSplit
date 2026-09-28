# 0007 — open.er-api.com as the exchange-rate provider

## Status

`Accepted`

Date: 2026-09-28 (plan B16; spec §6 "Currency")

## Context

JustSplit needs live currency-exchange rates for two widgets: the
`CurrencyExchangeTicker` (shown on `/`) and every display-currency
conversion pass across expenses/events/settlements/group detail
(`domain/currency.ts#getExchangeRate`, plan B3). The app is a static site
with no server component (ADR 0011) — any provider call happens directly
from the visitor's browser, which is why this issue is tagged `risk:high`
("non-same-origin fetch to the exchange-rate API").

`domain/currency.ts` already existed before this issue (plan B3) and had
already chosen `https://open.er-api.com/v6/latest/{base}` (ported unchanged
from the legacy Next tree's `utils/currencyExchange.ts`). This ADR records
*why* that provider, and the honesty/privacy rules this issue (B16) added
around it — it was never written down as a decision before.

Alternatives considered:

1. **A paid provider with an API key** (e.g. exchangerate-api.com's paid
   tier, Fixer, Open Exchange Rates). Rejected: an API key shipped in a
   static site's client bundle is public — anyone can read it out of the
   built JS and use it against the project's quota/billing. A paid tier
   would need a server-side proxy to hide the key, which contradicts "no
   server component" (ADR 0011) and is out of scope for a fair-splitting
   tool with no revenue.
2. **A different free, keyless tier** (e.g. frankfurter.app, which also
   needs no attribution). Rejected for this issue: `domain/currency.ts`
   (plan B3) already shipped against open.er-api.com's response shape
   (`{ result: 'success', rates: {...} }`) with tests against that exact
   contract; switching providers now would be a B3 change, not a B16 one,
   for no functional gain — open.er-api.com's free tier already meets every
   requirement below.
3. **No live rates, `FALLBACK_RATES` only.** Rejected: a fixed table frozen
   at commit time drifts from reality within days for volatile pairs (e.g.
   `KRW`, `RUB`) and would silently mislead every user relying on a
   converted amount for an actual payment decision — worse than the
   `isFallback` honesty markers this issue adds, which at least disclose
   when the number shown IS the frozen table.

**Chosen: open.er-api.com** (the free tier of
[exchangerate-api.com](https://www.exchangerate-api.com)) — no API key, no
signup, response format already integrated, and its only requirement is a
visible attribution link on any page that displays its data.

## Decision

- **Provider**: `GET https://open.er-api.com/v6/latest/{baseCurrencyCode}`
  (`domain/currency.ts#getExchangeRate`, unchanged from plan B3). Free,
  keyless, no signup — nothing to leak from a static-site client bundle.
- **What leaves the browser**: only the 3-letter base currency code, as a
  URL path segment (e.g. `.../latest/USD`). No request body, no auth
  header, no user identifier, no cookie. The response is the provider's
  full rates table for that base, cached client-side (below) — no
  per-conversion request for every displayed pair.
- **Caching / availability handling**: `$rateCache` (plan B5b,
  `src/stores/preferences.ts`), a `persistentAtom` Map keyed by base
  currency, TTL 6 hours (`domain/currency.ts#CACHE_TTL_MS`). A cache hit
  never calls the network at all. This issue (B16) adds the single call
  site every widget uses to read/write it honestly:
  `src/lib/currency/rates.ts#fetchExchangeRate` hands `getExchangeRate` a
  COPY of the cache (mutating the atom's own Map in place would neither
  notify subscribers nor persist) and persists a freshly-fetched entry
  through `setRateCacheEntry`.
- **Fallback**: on any fetch failure (network down, rate-limited, malformed
  response), `getExchangeRate` falls back to the hand-maintained
  `FALLBACK_RATES` table (direct pair, then the inverse, `domain/
  currency.ts`) and marks the result `isFallback: true`. `CurrencyExchangeTicker`
  and every conversion display visibly AND textually mark a fallback rate
  as approximate (never presented as live data) — the sr-only text
  alternative, not just the "*" glyph, so a screen-reader user gets the
  same disclosure a sighted user sees.
- **The rate-1 omission rule**: when a pair has NEITHER a live rate NOR a
  `FALLBACK_RATES` entry, `getExchangeRate`'s only remaining return is the
  literal `{ rate: 1, isFallback: true }` — a placeholder, not a real 1:1
  parity claim. `CurrencyExchangeTicker` omits that pair entirely rather
  than display it: showing "1.0000*" would read as "these currencies are
  worth the same," which is false for every pair in `SUPPORTED_CURRENCIES`
  lacking a fallback entry. Omission is the honest choice; a fabricated
  number is not.
- **Attribution**: the "Rates By Exchange Rate API" link
  (`https://www.exchangerate-api.com`, `target="_blank" rel="noopener
  noreferrer"`) stays on `CurrencyExchangeTicker` — the free tier's terms
  require it on any page displaying the data.
- **Privacy**: the provider sees the visitor's IP address and the
  requested base currency (ordinary HTTP request metadata) — nothing
  JustSplit-specific (no user id, email, or session token). No cookie is
  set by this call. This is disclosed here and in this ADR's Stakeholder
  Analysis below, not in a user-facing privacy notice (the same standard
  ADR 0005 applied to Supabase Storage signed URLs: infrastructure-level
  necessary data flow, not a tracking mechanism).

## Consequences

**Positive** — no API key to leak or rotate; the 6-hour cache means most
page loads make zero requests to the provider; the fallback table plus
honesty markers mean a provider outage degrades to "approximate rates,
clearly labeled" rather than a broken widget or (worse) a silently wrong
number.

**Negative** — open.er-api.com's free tier has no published uptime SLA;
an extended outage past the 6-hour cache window means every currency
without a `FALLBACK_RATES` entry silently disappears from the ticker
(the rate-1 omission rule) rather than showing stale-but-labeled data —
accepted as strictly better than showing a fabricated rate.

**Neutral** — switching providers later only touches
`domain/currency.ts#getExchangeRate`'s fetch URL/response parsing; the
cache, fallback table, and honesty rules in this ADR are provider-agnostic
and would not need to change.

## Stakeholder Analysis

| Stakeholder | Impact | Mitigation |
|---|---|---|
| End users (privacy) | Every distinct base currency the user's session requests reveals their IP to a third party (open.er-api.com) — a visitor's approximate location, correlated with their currency choice. | Only the currency CODE leaves the browser, never a user id, session token, or the amounts being converted. The 6-hour cache means this happens at most once per base currency per 6 hours per browser, not per page view. |
| End users (trust in the numbers shown) | A user deciding how much to actually pay someone could be misled by a stale, wrong, or fabricated exchange rate presented as current. | `isFallback` is disclosed everywhere a rate is shown (visible marker + sr-only text, never silent); the rate-1 placeholder for a fallback-less pair is omitted rather than shown as false 1:1 parity — the two honesty rules this ADR records. |
| End users (screen readers / assistive tech) | A "some rates are approximate" note or a bare "*" glyph that isn't in the accessible name is invisible to a screen-reader user, who would then trust an approximate rate as exact. | `CurrencyExchangeTicker` pairs every fallback glyph with `sr-only` text ("(approximate)") and keeps the standing "* Some rates are approximate" paragraph as real (non-`aria-hidden`) text. |
| End users (assistive tech, refresh cadence) | A ticker that re-announces its full rate list every 30-minute refresh would be disruptive noise for a screen-reader user who has it open in a background tab. | The rate list is plain static content, never wrapped in `aria-live` — a refresh updates the DOM silently; nothing is re-announced. |
| Maintainer / on-call | A provider rate-limit or outage could make every page load slow (waiting on a hung fetch) or spam the console with errors. | `getExchangeRate`'s try/catch always resolves (never rejects) within the fetch's own timeout behavior; `CurrencyExchangeTicker` additionally wraps each pair's `fetchExchangeRate` call so one failing pair never blanks the rest. |
| The provider (open.er-api.com) | A free, unauthenticated tier is vulnerable to abusive request volume from any one integrator, degrading service for everyone using it. | The 6-hour client-side cache caps JustSplit's own request volume per visitor to a handful of calls a day regardless of how many pages they view; the attribution link is kept exactly as the free tier's terms require. |

## Supersedes

None.

## References

- Spec §6 "Currency": `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan B3 (`domain/currency.ts`), B5b (`$rateCache`), B16 (this issue):
  `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- ADR 0005 (Supabase Storage — same "what leaves the client, what's
  disclosed" analysis pattern for a third-party data flow), ADR 0011
  (Supabase via the CyberEco data layer — the "no server component"
  constraint this ADR inherits)
- `src/domain/currency.ts`, `src/lib/currency/rates.ts`,
  `src/components/islands/CurrencyExchangeTicker.tsx`
- <https://www.exchangerate-api.com> (attribution target, free-tier terms)
