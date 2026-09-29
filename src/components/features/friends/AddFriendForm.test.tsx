// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

/**
 * Plan B13, ADR 0006. Behavior contracts:
 *  - self-email is refused locally, with NO call to the mutation at all
 *    (spec: "no RPC call" for that case);
 *  - a registered email calls the mutation and shows a success toast;
 *  - an unregistered email shows the invite panel (mailto + copy-link),
 *    never an avatar/name preview;
 *  - a duplicate pair (`FriendshipAlreadyExistsError`) shows the specific
 *    generic-but-informative message, not the catch-all one.
 */
const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

class FriendshipAlreadyExistsError extends Error {}
vi.mock('@/lib/data/repos/friendships', () => ({ FriendshipAlreadyExistsError }));

class LookupRateLimitedError extends Error {}
vi.mock('@/lib/data/repos/profiles', () => ({ LookupRateLimitedError }));

const { useSendFriendRequest } = vi.hoisted(() => ({ useSendFriendRequest: vi.fn() }));
vi.mock('@/lib/data/hooks/useSendFriendRequest', () => ({ useSendFriendRequest }));

const { default: AddFriendForm } = await import('./AddFriendForm').then((m) => ({ default: m.AddFriendForm }));

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mutateAsync = vi.fn();
  useSendFriendRequest.mockReturnValue({ mutateAsync, isPending: false });
  vi.clearAllMocks();
  useSendFriendRequest.mockReturnValue({ mutateAsync, isPending: false });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderForm(props: Partial<React.ComponentProps<typeof AddFriendForm>> = {}) {
  return render(<AddFriendForm uid="u1" selfEmail="me@example.com" inviterName="Ana" {...props} />);
}

describe('AddFriendForm', () => {
  it('refuses a self-email locally, without calling the mutation', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/email/i), 'ME@Example.com');
    await user.click(screen.getByRole('button', { name: /send request/i }));
    expect(await screen.findByText(/can't send a friend request to your own email/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('a registered email sends the request and shows a success toast', async () => {
    mutateAsync.mockResolvedValue({ kind: 'sent', friendship: { id: 'f1' }, name: 'Beto' });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/email/i), 'beto@example.com');
    await user.click(screen.getByRole('button', { name: /send request/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ uid: 'u1', email: 'beto@example.com' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Friend request sent'));
  });

  it('an unregistered email shows the invite panel with a mailto link and a copy-link button, never a name/avatar preview', async () => {
    mutateAsync.mockResolvedValue({ kind: 'unregistered' });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/email/i), 'stranger@example.com');
    await user.click(screen.getByRole('button', { name: /send request/i }));
    expect(await screen.findByText(/no justsplit account uses that email/i)).toBeInTheDocument();
    const mailLink = screen.getByRole('link', { name: /email an invite/i });
    expect(mailLink.getAttribute('href')).toMatch(/^mailto:stranger%40example\.com\?/);
    expect(screen.getByRole('button', { name: /copy invite link/i })).toBeInTheDocument();
    // No preview of the target's own data (there is none to preview — the
    // lookup result is deliberately never surfaced beyond registered/not).
    expect(screen.queryByText(/beto/i)).not.toBeInTheDocument();
  });

  it('copy invite link copies the absolute signup URL and toasts success', async () => {
    mutateAsync.mockResolvedValue({ kind: 'unregistered' });
    // `userEvent.setup()` installs its OWN getter-only `navigator.clipboard`
    // stub (`attachClipboardStubToView`) — this override must come AFTER
    // `setup()`, or `setup()` clobbers it right back.
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    renderForm();
    await user.type(screen.getByLabelText(/email/i), 'stranger@example.com');
    await user.click(screen.getByRole('button', { name: /send request/i }));
    await user.click(await screen.findByRole('button', { name: /copy invite link/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/signup\/?$/)));
    expect(writeText.mock.calls[0]![0]).toMatch(/^https?:\/\//);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Invite link copied'));
  });

  it('maps a duplicate-pair error to its own specific message', async () => {
    mutateAsync.mockRejectedValue(new FriendshipAlreadyExistsError('dup'));
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/email/i), 'beto@example.com');
    await user.click(screen.getByRole('button', { name: /send request/i }));
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith('You already have a request or friendship with this person'),
    );
  });

  it('a rate-limited lookup (ADR 0013) shows the fixed sentence inline, with no toast and no raw text, and clears on the next try', async () => {
    mutateAsync.mockRejectedValueOnce(Object.assign(new LookupRateLimitedError('rate_limited'), { code: 'P0429' }));
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/email/i), 'beto@example.com');
    await user.click(screen.getByRole('button', { name: /send request/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("You've looked up a lot of emails recently. Please try again in a while.");
    expect(document.body.textContent).not.toMatch(/rate_limited|P0429/);
    expect(notifyError).not.toHaveBeenCalled();

    mutateAsync.mockResolvedValueOnce({ kind: 'unregistered' });
    await user.click(screen.getByRole('button', { name: /send request/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('a generic failure shows a generic message', async () => {
    mutateAsync.mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/email/i), 'beto@example.com');
    await user.click(screen.getByRole('button', { name: /send request/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not send this friend request. Please try again.'));
  });
});

/** Plan B19c (risk:high, ADR 0015): see `ExpenseForm.test.tsx` for the contract. */
describe('AddFriendForm — offline (plan B19c)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  it('Send request is blocked and explained, keeps the typed email, and works again on reconnect', async () => {
    mutateAsync.mockResolvedValue({ kind: 'sent', friendship: { id: 'f1' }, name: 'Beto' });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/email/i), 'beto@example.com');

    setOnLine(false);
    const send = screen.getByRole('button', { name: /send request/i });
    expectBlocked(send);
    expect(visibleNotices()).toHaveLength(1);
    expect(visibleNotices()[0]).toHaveTextContent(OFFLINE_SENTENCE);

    await user.click(send);
    await user.type(screen.getByLabelText(/email/i), '{Enter}');
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/email/i)).toHaveValue('beto@example.com');

    setOnLine(true);
    expectWritable(send);
    expect(visibleNotices()).toHaveLength(0);
    await user.click(send);
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ uid: 'u1', email: 'beto@example.com' }));
  });

  it('a page that owns the state shows no second sentence of its own', () => {
    const write = { canWrite: false, noticeId: 'page-notice', blocked: { 'aria-disabled': true as const, 'aria-describedby': 'page-notice' } };
    render(
      <>
        <p id="page-notice">{OFFLINE_SENTENCE}</p>
        <AddFriendForm uid="u1" selfEmail={null} inviterName={null} write={write} />
      </>,
    );
    expect(visibleNotices()).toHaveLength(0);
    expect(screen.getByRole('button', { name: /send request/i })).toHaveAccessibleDescription(OFFLINE_SENTENCE);
  });

  it('a connection that drops mid-submit shows the plain failure, never success', async () => {
    mutateAsync.mockImplementation(async () => {
      setOnLine(false);
      throw new TypeError('Failed to fetch');
    });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/email/i), 'beto@example.com');
    await user.click(screen.getByRole('button', { name: /send request/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not send this friend request. Please try again.'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('the repo refusing an offline write reads as the shared sentence', async () => {
    mutateAsync.mockRejectedValue(new OfflineWriteError());
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/email/i), 'beto@example.com');
    await user.click(screen.getByRole('button', { name: /send request/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(OFFLINE_SENTENCE));
  });
});
