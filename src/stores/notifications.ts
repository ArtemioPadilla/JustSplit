import { toast } from '@/components/ui/toast';

/**
 * Thin wrapper over Inceptor's imperative `toast()` (`src/components/ui/toast.tsx`,
 * built on Base UI's Toast — plan B5b). Feature islands (B8-B16) fire
 * toasts through this module ONLY, never `toast()` directly, so the
 * topology decision in B17b (ADR 0008: toast topology and cache reset) can
 * change the underlying mechanism without touching every island.
 */

export interface NotifyOptions {
  description?: string;
}

/** Success — e.g. "Expense saved." */
export function notifySuccess(title: string, options: NotifyOptions = {}): string {
  return toast({ title, description: options.description, type: 'success' });
}

/**
 * Error — destructive-variant toast, e.g. a failed save or network error.
 *
 * `priority: 'high'` asks Base UI's Toast to announce it assertively
 * (WCAG's expectation for an error, vs the default polite announcement
 * every other toast gets); `timeout: 0` disables the default 5s auto-
 * dismiss so an error persists until the user closes it — WCAG 2.2.1
 * (Timing Adjustable): a failure the user didn't get to read before it
 * vanished is effectively invisible.
 */
export function notifyError(title: string, options: NotifyOptions = {}): string {
  return toast({
    title,
    description: options.description,
    type: 'error',
    data: { variant: 'destructive' },
    priority: 'high',
    timeout: 0,
  });
}

/** Informational — neither success nor failure, e.g. "You're offline." */
export function notifyInfo(title: string, options: NotifyOptions = {}): string {
  return toast({ title, description: options.description, type: 'info' });
}
