/**
 * Browser-side helpers of the live smoke (`scripts/live-smoke.mjs`, plan A7):
 * console capture, external-request isolation, settling, axe and the 375px
 * overflow check.
 */
import AxeBuilder from '@axe-core/playwright';
import { classifyConsoleEntry } from './console-policy.mjs';

// Every currency the ticker asks for (SUPPORTED_CURRENCIES): a partial answer
// would put the app in its "approximate rates" fallback, which is a state of
// its own (audited separately by live-smoke.mjs), not the default one.
export const RATES = {
  USD: 1, MXN: 17, EUR: 0.9, GBP: 0.8, JPY: 150, CAD: 1.35, AUD: 1.5, CHF: 0.88,
  CNY: 7.2, INR: 83, BRL: 5, RUB: 90, KRW: 1350, SGD: 1.35, NZD: 1.6,
};

/**
 * Deterministic stand-in for the one third-party API the app calls
 * (`domain/currency.ts` -> open.er-api.com): CI never depends on it being up
 * or on today's rates, and every other non-local request is aborted, so an
 * unexpected network dependency shows up as a console error instead of
 * passing silently. Fonts are NOT stubbed: BaseLayout's Google Fonts request
 * is the one known, allowlisted noise (console-policy.mjs).
 */
export async function isolateExternalRequests(context) {
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.fallback();
    if (url.hostname === 'open.er-api.com') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ result: 'success', rates: RATES }) });
    }
    // Fonts go to the real network (or fail on the sandbox's TLS, which the policy allows).
    if (/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return route.fallback();
    return route.abort();
  });
}

/**
 * Feeds every console message and uncaught error of every page in `context`
 * through the console policy. `sink(kind, message, where)` receives the
 * failures only.
 */
export function watchConsole(context, label, sink) {
  const attach = (page) => {
    page.on('console', (message) => {
      const found = classifyConsoleEntry({
        type: message.type(),
        text: message.text(),
        resourceUrl: message.location().url,
        pageUrl: page.url(),
      });
      if (found) sink(found.kind, found.message, `${label} ${page.url()}`);
    });
    page.on('pageerror', (error) => {
      const found = classifyConsoleEntry({ type: 'pageerror', text: String(error.message ?? error), pageUrl: page.url() });
      if (found) sink(found.kind, found.message, `${label} ${page.url()}`);
    });
  };
  context.on('page', attach);
}

/** Network quiet, hydrated, and no skeleton (`aria-busy="true"`) left on the page. */
export async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
}

/** Waits until the page's visible text matches `pattern` (a RegExp). */
export function waitForText(page, pattern, timeout) {
  return page.waitForFunction(
    ({ source, flags }) => new RegExp(source, flags).test(document.body.innerText),
    { source: pattern.source, flags: pattern.flags },
    { timeout },
  );
}

export async function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

/** axe-core over the whole page; returns human-readable violation lines. */
export async function axeViolations(page, { transition = false } = {}) {
  // Dialog and toast fade-ins: axe would read mid-transition colours.
  if (transition) await page.waitForTimeout(400);
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.map(
    (v) => `[${v.impact ?? 'unknown'}] ${v.id} — ${v.help} (${v.nodes.length} node(s): ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')})`,
  );
}

/** A page wider than the viewport scrolls sideways. Returns a message, or null. */
export async function overflowOf(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  return scrollWidth > clientWidth ? `overflows horizontally (${scrollWidth}px > ${clientWidth}px)` : null;
}
