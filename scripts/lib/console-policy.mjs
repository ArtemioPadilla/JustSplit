/**
 * What the live smoke (`scripts/live-smoke.mjs`, plan A7) treats as a defect
 * in the browser console. Everything is a failure by default: any
 * `console.error`, any `pageerror` (uncaught exception) and any React
 * hydration mismatch, on whichever channel React chooses to report it.
 *
 * The allowlist is deliberately tiny, and each entry binds a message to the
 * resource that produces it, so the same text from another resource (a
 * Supabase call, a missing asset) still fails. Do not add an entry to make a
 * run green: fix the defect, or raise it as an open question.
 */

export const CONSOLE_ALLOWLIST = [
  {
    id: 'google-fonts-tls',
    reason: 'The dev sandbox intercepts TLS, so BaseLayout’s Google Fonts stylesheet and font files fail certificate checks.',
    text: /^Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID$/,
    resource: (url) => /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url ?? ''),
  },
  {
    id: 'shell-404-status',
    reason: 'The 404 app shell (AppRouterIsland) is served with a real 404 status for /expenses/<id> etc., like GitHub Pages.',
    text: /^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/,
    // Only the page document itself: a missing asset or API call is a defect.
    resource: (url, pageUrl) => Boolean(url) && url === pageUrl,
  },
];

const HYDRATION =
  /hydrat|Minified React error #(418|419|421|422|423|425)\b|Text content did not match|didn['’]t match the client/i;

/**
 * @param {{ type: string, text: string, resourceUrl?: string, pageUrl?: string }} entry
 *   `type` is Playwright's console message type, or `'pageerror'`.
 * @returns {{ kind: 'hydration' | 'pageerror' | 'console-error', message: string } | null}
 *   null when the entry is fine.
 */
export function classifyConsoleEntry({ type, text, resourceUrl, pageUrl }) {
  if (HYDRATION.test(text)) return { kind: 'hydration', message: text };
  if (type === 'pageerror') return { kind: 'pageerror', message: text };
  if (type !== 'error') return null;
  const allowed = CONSOLE_ALLOWLIST.some((entry) => entry.text.test(text) && entry.resource(resourceUrl, pageUrl));
  return allowed ? null : { kind: 'console-error', message: text };
}
