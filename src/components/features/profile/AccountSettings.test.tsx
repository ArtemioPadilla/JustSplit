// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * `AccountSettings` (plan B15, risk:high): change password (`updatePassword`,
 * no "current password" field — the session is already authenticated),
 * "Sign out everywhere" (`signOut()`, Supabase's default GLOBAL scope, then
 * `withBase('/landing')` with the toast handoff since this is a full-page
 * navigation, ADR 0008), and the already-built/tested `ResetLocalDataButton`
 * mounted (never duplicated).
 */
const { signOut, updatePassword } = vi.hoisted(() => ({ signOut: vi.fn(), updatePassword: vi.fn() }));
vi.mock('@/stores/auth', () => ({ signOut, updatePassword }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

const { AccountSettings } = await import('./AccountSettings');

function stubLocationAssign() {
  const real = window.location;
  const assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...real, assign } });
  return {
    assign,
    restore: () => Object.defineProperty(window, 'location', { configurable: true, value: real }),
  };
}

describe('AccountSettings', () => {
  let location: ReturnType<typeof stubLocationAssign>;

  beforeEach(() => {
    signOut.mockReset();
    updatePassword.mockReset();
    notifySuccess.mockClear();
    notifyError.mockClear();
    location = stubLocationAssign();
  });

  afterEach(() => {
    location.restore();
  });

  it('updates the password on a valid, matching pair and never asks for the current password', async () => {
    updatePassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AccountSettings />);

    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/^new password$/i), 'brandnewpw1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'brandnewpw1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('brandnewpw1'));
    expect(notifySuccess).toHaveBeenCalled();
  });

  it('rejects a mismatched confirmation without calling updatePassword', async () => {
    const user = userEvent.setup();
    render(<AccountSettings />);

    await user.type(screen.getByLabelText(/^new password$/i), 'brandnewpw1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'somethingelse1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than 8 characters', async () => {
    const user = userEvent.setup();
    render(<AccountSettings />);

    await user.type(screen.getByLabelText(/^new password$/i), 'short1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'short1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('reports a failed password update without crashing', async () => {
    updatePassword.mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();
    render(<AccountSettings />);

    await user.type(screen.getByLabelText(/^new password$/i), 'brandnewpw1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'brandnewpw1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('"Sign out everywhere" signs out and navigates to /landing with an afterNavigation toast', async () => {
    signOut.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AccountSettings />);

    await user.click(screen.getByRole('button', { name: /sign out everywhere/i }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(notifySuccess).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ afterNavigation: true }));
    expect(location.assign).toHaveBeenCalledWith('/landing');
  });

  it('reports a failed sign-out without navigating', async () => {
    signOut.mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();
    render(<AccountSettings />);

    await user.click(screen.getByRole('button', { name: /sign out everywhere/i }));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(location.assign).not.toHaveBeenCalled();
  });

  it('mounts the existing ResetLocalDataButton ("Restablecer datos locales") instead of duplicating it', () => {
    render(<AccountSettings />);
    expect(screen.getByRole('button', { name: /restablecer datos locales/i })).toBeInTheDocument();
  });
});
