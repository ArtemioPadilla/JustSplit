// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

const { resetPassword, updatePassword, onPasswordRecovery, recoveryCallbacks } = vi.hoisted(() => {
  const callbacks: Array<() => void> = [];
  return {
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    recoveryCallbacks: callbacks,
    onPasswordRecovery: vi.fn((cb: () => void) => {
      callbacks.push(cb);
      return () => {};
    }),
  };
});
vi.mock('@/stores/auth', () => ({ resetPassword, updatePassword }));
vi.mock('@/lib/data/client', () => ({ onPasswordRecovery }));

import ResetPasswordIsland from './ResetPasswordIsland';

describe('ResetPasswordIsland — request mode (default)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recoveryCallbacks.length = 0;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: vi.fn() },
    });
  });

  it('submits an email and shows a "check your email" confirmation', async () => {
    resetPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ResetPasswordIsland />);

    await user.type(screen.getByLabelText(/email/i), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('ana@example.com'));
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });
});

describe('ResetPasswordIsland — recovery mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recoveryCallbacks.length = 0;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: vi.fn() },
    });
  });

  it('switches to the update-password form when a PASSWORD_RECOVERY event fires', async () => {
    render(<ResetPasswordIsland />);
    expect(screen.queryByLabelText(/^new password$/i)).not.toBeInTheDocument();

    recoveryCallbacks.forEach((cb) => cb());

    expect(await screen.findByLabelText(/^new password$/i)).toBeInTheDocument();
  });

  it('submits a new password and redirects to / on success', async () => {
    updatePassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ResetPasswordIsland />);
    recoveryCallbacks.forEach((cb) => cb());

    await user.type(await screen.findByLabelText(/^new password$/i), 'brandnewpw1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('brandnewpw1'));
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('/'));
  });
});

/** Plan B19c (risk:high, ADR 0015): setting the new password is a write; see `AccountSettings.test.tsx`. */
describe('ResetPasswordIsland — offline (plan B19c)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recoveryCallbacks.length = 0;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign: vi.fn() } });
  });

  afterEach(() => {
    restoreOnLine();
  });

  it('Update password is blocked and explained, keeps the typed password, and works again on reconnect', async () => {
    updatePassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ResetPasswordIsland />);
    recoveryCallbacks.forEach((cb) => cb());
    await user.type(await screen.findByLabelText(/^new password$/i), 'brandnewpw1');

    setOnLine(false);
    const update = screen.getByRole('button', { name: /update password/i });
    expectBlocked(update);
    expect(visibleNotices()).toHaveLength(1);
    await user.click(update);
    expect(updatePassword).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^new password$/i)).toHaveValue('brandnewpw1');

    setOnLine(true);
    expectWritable(update);
    await user.click(update);
    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('brandnewpw1'));
  });

  it('the store refusing an offline write reads as the shared sentence', async () => {
    updatePassword.mockRejectedValue(new OfflineWriteError());
    const user = userEvent.setup();
    render(<ResetPasswordIsland />);
    recoveryCallbacks.forEach((cb) => cb());
    await user.type(await screen.findByLabelText(/^new password$/i), 'brandnewpw1');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(await screen.findByText(OFFLINE_SENTENCE)).toBeInTheDocument();
  });
});
