/**
 * Sentry skeleton — opt-in, lazy-loaded, no bundled dependency by default.
 *
 * This module is deliberately a *skeleton*. The real @sentry/browser SDK is
 * not in package.json yet — adding it costs ~25 KB gzipped to every page.
 * Instead, the skeleton:
 *
 *   1. No-ops unless `PUBLIC_FLAG_SENTRY=true` AND `PUBLIC_SENTRY_DSN` is set
 *   2. Dynamically imports @sentry/browser at runtime when both are present
 *   3. Falls back to console.error if the import fails (offline, blocked, etc.)
 *
 * To wire it up for real:
 *
 *   npm install @sentry/browser
 *   Set PUBLIC_FLAG_SENTRY=true and PUBLIC_SENTRY_DSN=https://...
 *
 * Anything calling `captureError` already works in both modes.
 */
import { flags } from './flags';

const SENTRY_DSN = (import.meta.env.PUBLIC_SENTRY_DSN as string | undefined) ?? '';
// Use flags.sentry (asBool) so '1'/'on'/'yes' also enable Sentry,
// consistent with every other flag in this codebase.
const SENTRY_ENABLED = flags.sentry;

let initialized = false;
let sentryModule: unknown = null;

/**
 * Initialize Sentry if the flag + DSN are present. Safe to call multiple
 * times — only the first call does work.
 */
export async function initSentry(): Promise<void> {
  if (initialized || !SENTRY_ENABLED || !SENTRY_DSN) return;
  initialized = true;
  try {
    // Vite needs the dynamic import to be opaque so it doesn't try to
    // resolve @sentry/browser at build time when the package is absent.
    // Using `new Function` keeps Vite's static analyzer out of it.
    const importer = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>;
    const mod = (await importer('@sentry/browser')) as {
      init: (opts: Record<string, unknown>) => void;
    };
    sentryModule = mod;
    mod.init({
      dsn: SENTRY_DSN,
      environment: flags.channel,
      tracesSampleRate: flags.channel === 'production' ? 0.1 : 1.0,
    });
  } catch (err) {
    console.warn('[sentry] init failed — falling back to console.error', err);
    initialized = false;
  }
}

/**
 * Capture an error. Works in both real-Sentry and skeleton modes.
 */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (sentryModule && typeof (sentryModule as { captureException?: unknown }).captureException === 'function') {
    (sentryModule as { captureException: (e: unknown, c?: unknown) => void }).captureException(
      err,
      context ? { extra: context } : undefined,
    );
    return;
  }
  console.error('[error]', err, context ?? '');
}

/**
 * Capture a non-error event (useful for tracking unusual UI states).
 */
export function captureMessage(message: string, context?: Record<string, unknown>): void {
  if (sentryModule && typeof (sentryModule as { captureMessage?: unknown }).captureMessage === 'function') {
    (sentryModule as { captureMessage: (m: string, c?: unknown) => void }).captureMessage(
      message,
      context ? { extra: context } : undefined,
    );
    return;
  }
  console.info('[event]', message, context ?? '');
}
