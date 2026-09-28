/**
 * Analytics skeleton — opt-in, no bundled dependency by default.
 *
 * Mirrors the Sentry skeleton in shape: flag-gated, dynamically imported,
 * never costs the user a byte unless they turn it on. Supports two privacy-
 * respecting providers out of the box (Plausible, Umami). Both run on a
 * script tag; the helpers here exist so you can fire `track(...)` events
 * from islands without coupling to a specific provider.
 *
 * Wiring:
 *   PUBLIC_FLAG_ANALYTICS=true
 *   PUBLIC_ANALYTICS_PROVIDER=plausible | umami
 *   PUBLIC_ANALYTICS_DOMAIN=<your domain, e.g. site.example.com>
 *   PUBLIC_ANALYTICS_SCRIPT_URL=<override only if self-hosting>
 *
 * Why not Google Analytics: requires a cookie banner under GDPR/CCPA, and
 * the scaffold ships analytics-free precisely to avoid that drag. Plausible
 * and Umami don't set cookies and don't need consent banners in the EU.
 */
import { flags } from './flags';

type Provider = 'plausible' | 'umami';

const PROVIDER = ((import.meta.env.PUBLIC_ANALYTICS_PROVIDER as string | undefined) ??
  'plausible') as Provider;
const DOMAIN = (import.meta.env.PUBLIC_ANALYTICS_DOMAIN as string | undefined) ?? '';
const SCRIPT_OVERRIDE =
  (import.meta.env.PUBLIC_ANALYTICS_SCRIPT_URL as string | undefined) ?? '';
// Use flags.analytics (asBool) so '1'/'on'/'yes' also enable analytics,
// consistent with every other flag in this codebase.
const ENABLED = flags.analytics;

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;
    umami?: { track: (event: string, data?: Record<string, unknown>) => void };
  }
}

let initialized = false;

function defaultScriptUrl(): string {
  if (PROVIDER === 'plausible') return 'https://plausible.io/js/script.js';
  return 'https://cloud.umami.is/script.js';
}

/**
 * Initialize analytics by injecting the provider's script tag once.
 * Safe to call multiple times — only the first call does work.
 *
 * Returns true if the script was injected; false if it was skipped
 * (flag off, missing domain, already injected).
 */
export function initAnalytics(): boolean {
  if (initialized || !ENABLED) return false;
  if (typeof document === 'undefined') return false;
  if (!DOMAIN) {
    console.warn('[analytics] PUBLIC_ANALYTICS_DOMAIN not set; skipping init.');
    return false;
  }
  initialized = true;

  const script = document.createElement('script');
  script.defer = true;
  script.src = SCRIPT_OVERRIDE || defaultScriptUrl();
  if (PROVIDER === 'plausible') {
    script.setAttribute('data-domain', DOMAIN);
  } else {
    script.setAttribute('data-website-id', DOMAIN);
  }
  document.head.appendChild(script);
  return true;
}

/**
 * Fire a custom event. No-op when disabled or before the provider script
 * has loaded — the helpers gracefully degrade rather than throw.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!ENABLED) return;
  if (typeof window === 'undefined') return;
  if (PROVIDER === 'plausible' && typeof window.plausible === 'function') {
    window.plausible(event, props ? { props } : undefined);
    return;
  }
  if (PROVIDER === 'umami' && window.umami) {
    window.umami.track(event, props);
    return;
  }
  // Provider script not yet loaded — drop the event silently in production,
  // log in development so it's visible.
  if (flags.channel !== 'production') {
    console.info('[analytics:noop]', event, props ?? '');
  }
}
