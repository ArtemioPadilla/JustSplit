// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Plan B5b: `notifications.ts` is a thin wrapper over Inceptor's `toast()`
 * (`src/components/ui/toast.tsx`) — feature code (B8-B16) fires toasts
 * through this module only, so the topology decided in B17b (ADR 0008) can
 * change without touching every island.
 */
const { toast } = vi.hoisted(() => ({ toast: vi.fn().mockReturnValue('toast-id') }));
vi.mock('@/components/ui/toast', () => ({ toast }));

const { notifyError, notifyInfo, notifySuccess, drainPendingToasts } = await import('./notifications');

const PENDING_TOASTS_KEY = 'justsplit:pending-toasts';

beforeEach(() => {
  sessionStorage.clear();
  toast.mockClear();
});

describe('notifySuccess', () => {
  it('fires a "success"-typed toast with the message as the title', () => {
    notifySuccess('Saved');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Saved', type: 'success' }));
  });

  it('accepts an optional description', () => {
    notifySuccess('Saved', { description: 'Your changes were saved.' });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Your changes were saved.' }));
  });

  it('returns the toast id, so a caller can close/update it later', () => {
    expect(notifySuccess('Saved')).toBe('toast-id');
  });
});

describe('notifyError', () => {
  it('fires an "error"-typed, destructive-variant toast', () => {
    notifyError('Something broke');
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Something broke', type: 'error', data: { variant: 'destructive' } }),
    );
  });

  it('is announced assertively (Base UI high priority) and persists until dismissed, not auto-timed out (WCAG 2.2.1, plan B17b)', () => {
    notifyError('Something broke');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ priority: 'high', timeout: 0 }));
  });
});

describe('notifyInfo', () => {
  it('fires an "info"-typed, default-variant toast', () => {
    notifyInfo('FYI');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'FYI', type: 'info' }));
  });
});

/**
 * Plan B17b amendment (cross-navigation toasts, ADR 0008): this is a static
 * MPA (spec D2) — every "notify, then `location.assign`/`reload()`" call
 * site is a full page load that discards a toast fired synchronously right
 * before it. `{ afterNavigation: true }` queues the toast in
 * `sessionStorage` instead of firing it, so it survives the navigation;
 * `drainPendingToasts()` (called once by `ToasterIsland` on mount) fires
 * each queued entry through the SAME `notify*` path used for an immediate
 * toast, so error assertiveness/persistence rules still apply.
 */
describe('afterNavigation: writing to the queue', () => {
  it('does not fire toast() immediately when afterNavigation is set', () => {
    notifySuccess('Group created', { afterNavigation: true });
    expect(toast).not.toHaveBeenCalled();
  });

  it('writes a validated entry to sessionStorage', () => {
    notifySuccess('Group created', { afterNavigation: true });
    const raw = sessionStorage.getItem(PENDING_TOASTS_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual([{ kind: 'success', title: 'Group created' }]);
  });

  it('includes the description when given', () => {
    notifyError('Could not delete this group', { afterNavigation: true, description: 'Try again.' });
    const raw = JSON.parse(sessionStorage.getItem(PENDING_TOASTS_KEY)!);
    expect(raw).toEqual([{ kind: 'error', title: 'Could not delete this group', description: 'Try again.' }]);
  });

  it('appends to an existing queue rather than overwriting it', () => {
    notifySuccess('First', { afterNavigation: true });
    notifyError('Second', { afterNavigation: true });
    const raw = JSON.parse(sessionStorage.getItem(PENDING_TOASTS_KEY)!);
    expect(raw.map((e: { title: string }) => e.title)).toEqual(['First', 'Second']);
  });

  it('is bounded — the 6th queued entry drops the oldest', () => {
    for (let i = 1; i <= 6; i += 1) notifySuccess(`Toast ${i}`, { afterNavigation: true });
    const raw = JSON.parse(sessionStorage.getItem(PENDING_TOASTS_KEY)!);
    expect(raw).toHaveLength(5);
    expect(raw.map((e: { title: string }) => e.title)).toEqual(['Toast 2', 'Toast 3', 'Toast 4', 'Toast 5', 'Toast 6']);
  });

  it('falls back to firing immediately when sessionStorage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded');
    });
    try {
      notifySuccess('Saved', { afterNavigation: true });
    } finally {
      spy.mockRestore();
    }
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Saved', type: 'success' }));
  });
});

describe('drainPendingToasts', () => {
  it('fires each queued toast through the normal notify path, in order, and clears the queue', () => {
    notifySuccess('First', { afterNavigation: true });
    notifyError('Second', { afterNavigation: true });
    toast.mockClear();

    drainPendingToasts();

    expect(toast).toHaveBeenNthCalledWith(1, expect.objectContaining({ title: 'First', type: 'success' }));
    expect(toast).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: 'Second', type: 'error', priority: 'high', timeout: 0 }),
    );
    expect(sessionStorage.getItem(PENDING_TOASTS_KEY)).toBeNull();
  });

  it('is a no-op when the queue is empty', () => {
    drainPendingToasts();
    expect(toast).not.toHaveBeenCalled();
  });

  it('does not fire twice — a second call after a drain finds nothing left to fire', () => {
    notifySuccess('Once', { afterNavigation: true });
    drainPendingToasts();
    toast.mockClear();

    drainPendingToasts();

    expect(toast).not.toHaveBeenCalled();
  });

  it('ignores malformed JSON in storage — drops it without throwing', () => {
    sessionStorage.setItem(PENDING_TOASTS_KEY, 'not json{{{');

    expect(() => drainPendingToasts()).not.toThrow();
    expect(toast).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(PENDING_TOASTS_KEY)).toBeNull();
  });

  it('ignores a validly-parsed but schema-invalid payload — drops it without throwing', () => {
    sessionStorage.setItem(PENDING_TOASTS_KEY, JSON.stringify([{ kind: 'bogus', title: 'nope' }]));

    expect(() => drainPendingToasts()).not.toThrow();
    expect(toast).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  sessionStorage.clear();
});
