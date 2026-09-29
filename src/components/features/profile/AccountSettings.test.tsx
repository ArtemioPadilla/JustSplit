// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

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

  it('mounts the existing ResetLocalDataButton ("Reset local data") instead of duplicating it', () => {
    render(<AccountSettings />);
    expect(screen.getByRole('button', { name: /reset local data/i })).toBeInTheDocument();
  });
});

/**
 * Plan A7 (found by the live smoke's signed-in axe pass on /profile):
 * `heading-order`. The route island's sr-only `<h1>` is followed by the
 * "Account" card, whose title was a plain `<div>`, and then by `<h3>`
 * sections: h1 -> h3 skips a level. The card title is a level-2 heading, so
 * the sections under it are a valid h1 -> h2 -> h3.
 */
describe('AccountSettings heading structure', () => {
  it('titles the card with a level-2 heading and its sections with level 3, never skipping a level', () => {
    render(
      <>
        <h1>Your profile</h1>
        <AccountSettings />
      </>,
    );
    const headings = screen.getAllByRole('heading').map((h) => ({
      level: Number(h.getAttribute('aria-level') ?? h.tagName.slice(1)),
      name: h.textContent,
    }));
    expect(headings).toEqual([
      { level: 1, name: 'Your profile' },
      { level: 2, name: 'Account' },
      { level: 3, name: 'Change password' },
      { level: 3, name: 'Sign out' },
      { level: 3, name: 'This device' },
    ]);
  });
});

/**
 * Plan B19c (risk:high, ADR 0015): changing the password is a write. Signing out and resetting local data are not
 * data writes and stay available: leaving must never be blocked by a bad connection.
 */
describe('AccountSettings — offline (plan B19c)', () => {
  beforeEach(() => {
    signOut.mockReset();
    updatePassword.mockReset();
    notifySuccess.mockClear();
    notifyError.mockClear();
  });

  afterEach(() => {
    restoreOnLine();
  });

  it('Update password is blocked and explained, keeps the typed passwords, and works again on reconnect', async () => {
    updatePassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AccountSettings />);
    await user.type(screen.getByLabelText(/^new password$/i), 'brandnewpw1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'brandnewpw1');

    setOnLine(false);
    const update = screen.getByRole('button', { name: /update password/i });
    expectBlocked(update);
    expect(visibleNotices()).toHaveLength(1);
    expect(visibleNotices()[0]).toHaveTextContent(OFFLINE_SENTENCE);
    await user.click(update);
    await user.type(screen.getByLabelText(/confirm new password/i), '{Enter}');
    expect(updatePassword).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^new password$/i)).toHaveValue('brandnewpw1');

    setOnLine(true);
    expectWritable(update);
    expect(visibleNotices()).toHaveLength(0);
    await user.click(update);
    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('brandnewpw1'));
  });

  it('a connection that drops mid-update shows the plain failure, never success', async () => {
    updatePassword.mockImplementation(async () => {
      setOnLine(false);
      throw new TypeError('Failed to fetch');
    });
    const user = userEvent.setup();
    render(<AccountSettings />);
    await user.type(screen.getByLabelText(/^new password$/i), 'brandnewpw1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'brandnewpw1');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not update your password. Please try again.'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('the store refusing an offline write reads as the shared sentence', async () => {
    updatePassword.mockRejectedValue(new OfflineWriteError());
    const user = userEvent.setup();
    render(<AccountSettings />);
    await user.type(screen.getByLabelText(/^new password$/i), 'brandnewpw1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'brandnewpw1');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(OFFLINE_SENTENCE));
  });

  it('sign out and reset local data are not writes: they stay enabled offline', () => {
    render(<AccountSettings />);
    setOnLine(false);
    expectNotBlocked(screen.getByRole('button', { name: /sign out everywhere/i }));
    expectNotBlocked(screen.getByRole('button', { name: /reset local data/i }));
  });
});

function expectNotBlocked(control: HTMLElement) {
  expect(control).not.toHaveAttribute('aria-disabled');
  expect(control).not.toBeDisabled();
}
