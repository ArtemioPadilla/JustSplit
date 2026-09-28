import { describe, expect, it, vi } from 'vitest';

/**
 * Plan B5b: `notifications.ts` is a thin wrapper over Inceptor's `toast()`
 * (`src/components/ui/toast.tsx`) — feature code (B8-B16) fires toasts
 * through this module only, so the topology decided in B17b (ADR 0008) can
 * change without touching every island.
 */
const { toast } = vi.hoisted(() => ({ toast: vi.fn().mockReturnValue('toast-id') }));
vi.mock('@/components/ui/toast', () => ({ toast }));

const { notifyError, notifyInfo, notifySuccess } = await import('./notifications');

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
});

describe('notifyInfo', () => {
  it('fires an "info"-typed, default-variant toast', () => {
    notifyInfo('FYI');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'FYI', type: 'info' }));
  });
});
