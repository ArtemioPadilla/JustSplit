// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

/**
 * `AvatarUploadField` (plan B15, risk:high — avatar replace ordering).
 * Covers the ordering decision: `uploadAvatar` -> `updateProfile({
 * avatarUrl })` -> ONLY THEN `removeAvatar(oldPath)`. A failed
 * `updateProfile` removes the NEW object instead (never orphaned); a failed
 * `removeAvatar(oldPath)` is a non-blocking info toast, not an error (the
 * profile update already succeeded). The defensive path check refuses to
 * call `removeAvatar` for anything that isn't under `avatars/{uid}/` —
 * RLS would deny it anyway, but this never even tries.
 */
const { uploadAvatar, removeAvatar, signedUrl } = vi.hoisted(() => ({
  uploadAvatar: vi.fn(),
  removeAvatar: vi.fn(),
  signedUrl: vi.fn().mockResolvedValue('https://signed.example/avatar.jpg'),
}));
vi.mock('@/lib/data/storage', () => ({ uploadAvatar, removeAvatar, signedUrl }));

const { updateProfile } = vi.hoisted(() => ({ updateProfile: vi.fn() }));
vi.mock('@/stores/auth', () => ({ updateProfile }));

const { notifySuccess, notifyError, notifyInfo } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  notifyInfo: vi.fn(),
}));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError, notifyInfo }));

const { AvatarUploadField } = await import('./AvatarUploadField');

function selectFile(name = 'photo.jpg', type = 'image/jpeg') {
  const file = new File(['x'], name, { type });
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });
  return file;
}

describe('AvatarUploadField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('success: uploads, updates the profile, then removes the OLD object in that order', async () => {
    uploadAvatar.mockResolvedValue('avatars/u1/new-uuid.jpg');
    updateProfile.mockResolvedValue(undefined);
    removeAvatar.mockResolvedValue(undefined);

    render(<AvatarUploadField uid="u1" name="Ana" avatarPath="avatars/u1/old-uuid.jpg" />);
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: /save photo/i }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());

    expect(uploadAvatar).toHaveBeenCalledWith('u1', expect.any(File));
    expect(updateProfile).toHaveBeenCalledWith({ avatarUrl: 'avatars/u1/new-uuid.jpg' });
    expect(removeAvatar).toHaveBeenCalledWith('avatars/u1/old-uuid.jpg');
    expect(notifyError).not.toHaveBeenCalled();

    // Ordering: removeAvatar must be called strictly after updateProfile.
    const updateOrder = updateProfile.mock.invocationCallOrder[0]!;
    const removeOrder = removeAvatar.mock.invocationCallOrder[0]!;
    expect(removeOrder).toBeGreaterThan(updateOrder);
  });

  it('failed profile update: removes the NEW object instead, never the old one', async () => {
    uploadAvatar.mockResolvedValue('avatars/u1/new-uuid.jpg');
    updateProfile.mockRejectedValue(new Error('network error'));
    removeAvatar.mockResolvedValue(undefined);

    render(<AvatarUploadField uid="u1" name="Ana" avatarPath="avatars/u1/old-uuid.jpg" />);
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: /save photo/i }));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());

    expect(removeAvatar).toHaveBeenCalledTimes(1);
    expect(removeAvatar).toHaveBeenCalledWith('avatars/u1/new-uuid.jpg');
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('failed removal of the old object: reports a non-blocking info toast, not an error, since the update already succeeded', async () => {
    uploadAvatar.mockResolvedValue('avatars/u1/new-uuid.jpg');
    updateProfile.mockResolvedValue(undefined);
    removeAvatar.mockRejectedValue(new Error('storage error'));

    render(<AvatarUploadField uid="u1" name="Ana" avatarPath="avatars/u1/old-uuid.jpg" />);
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: /save photo/i }));

    await waitFor(() => expect(notifyInfo).toHaveBeenCalled());

    expect(notifyInfo).toHaveBeenCalledWith(expect.stringMatching(/couldn.?t be removed/i));
    expect(notifyError).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it.each([
    ['an external URL', 'https://example.com/somewhere/old.jpg'],
    ["another user's path", 'avatars/someone-else/old-uuid.jpg'],
  ])('defensive path check: never calls removeAvatar for %s', async (_label, oldPath) => {
    uploadAvatar.mockResolvedValue('avatars/u1/new-uuid.jpg');
    updateProfile.mockResolvedValue(undefined);

    render(<AvatarUploadField uid="u1" name="Ana" avatarPath={oldPath} />);
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: /save photo/i }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
    expect(removeAvatar).not.toHaveBeenCalled();
  });

  it('rejects a non-image file client-side without calling uploadAvatar', async () => {
    render(<AvatarUploadField uid="u1" name="Ana" avatarPath={null} />);
    selectFile('notes.pdf', 'application/pdf');

    expect(screen.queryByRole('button', { name: /save photo/i })).not.toBeInTheDocument();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('shows the current avatar through the shared UserAvatar resolver, including an https: URL (e.g. Google OAuth photoURL) that is not a storage path', async () => {
    // Base UI's Avatar.Image only mounts an <img> once a hidden probe Image
    // fires onload (see UserAvatar.test.tsx's own doc comment) — stub it so
    // the https: passthrough case actually renders in jsdom.
    class ImmediateLoadImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin: string | null = null;
      referrerPolicy = '';
      private _src = '';
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', ImmediateLoadImage);

    render(<AvatarUploadField uid="u1" name="Ana" avatarPath="https://lh3.googleusercontent.com/a/photo.jpg" />);

    const img = await screen.findByRole('img', { name: "Ana's profile photo" });
    expect(img).toHaveAttribute('src', 'https://lh3.googleusercontent.com/a/photo.jpg');
    // Never treated as a receipts-bucket object path — signedUrl is never called for it.
    expect(signedUrl).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('a "Remove selection" control clears the pending pick without uploading', () => {
    render(<AvatarUploadField uid="u1" name="Ana" avatarPath={null} />);
    selectFile();
    expect(screen.getByRole('button', { name: /save photo/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove selection/i }));

    expect(screen.queryByRole('button', { name: /save photo/i })).not.toBeInTheDocument();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });
});

/**
 * Plan A7 (found by the live smoke on /profile at 375px): the dropzone had a
 * fixed `w-64` (256px) next to the 64px avatar, so the row was 336px wide
 * inside a ~293px card and the page scrolled sideways by 2px. jsdom has no
 * layout, so this pins the classes that make the row able to shrink: the
 * dropzone is `w-full` with a `max-w-64` cap, and the column that holds it
 * may shrink below its content (`min-w-0`); the live smoke measures the
 * real overflow.
 */
describe('AvatarUploadField layout (375px)', () => {
  it('lets the dropzone shrink instead of forcing a fixed 256px width', () => {
    render(<AvatarUploadField uid="u1" name="Ana" avatarPath={null} />);
    const dropzone = screen.getByRole('button', { name: /add files/i });
    const upload = dropzone.parentElement as HTMLElement;
    expect(upload.className).not.toMatch(/(^|\s)w-64(\s|$)/);
    expect(upload.className).toMatch(/(^|\s)w-full(\s|$)/);
    expect(upload.className).toMatch(/(^|\s)max-w-64(\s|$)/);
    expect((upload.parentElement as HTMLElement).className).toMatch(/(^|\s)min-w-0(\s|$)/);
  });
});

/** Plan B19c (risk:high, ADR 0015): a photo is upload -> profile update -> old-object removal; never start it offline. */
describe('AvatarUploadField — offline (plan B19c)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    restoreOnLine();
    vi.unstubAllGlobals();
  });

  it('Save photo is blocked and explained, keeps the chosen file, and works again on reconnect', async () => {
    uploadAvatar.mockResolvedValue('avatars/u1/new-uuid.jpg');
    updateProfile.mockResolvedValue(undefined);
    removeAvatar.mockResolvedValue(undefined);
    render(<AvatarUploadField uid="u1" name="Ana" avatarPath="avatars/u1/old-uuid.jpg" />);
    selectFile();

    setOnLine(false);
    const save = screen.getByRole('button', { name: /save photo/i });
    expectBlocked(save);
    expect(visibleNotices()).toHaveLength(1);
    expect(visibleNotices()[0]).toHaveTextContent(OFFLINE_SENTENCE);
    fireEvent.click(save);
    expect(uploadAvatar).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /remove selection/i })).toBeInTheDocument();

    setOnLine(true);
    expectWritable(save);
    expect(visibleNotices()).toHaveLength(0);
    fireEvent.click(save);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
    expect(uploadAvatar).toHaveBeenCalledTimes(1);
  });

  it('a page that owns the state shows no second sentence of its own', () => {
    const write = { canWrite: false, noticeId: 'page-notice', blocked: { 'aria-disabled': true as const, 'aria-describedby': 'page-notice' } };
    render(
      <>
        <p id="page-notice">{OFFLINE_SENTENCE}</p>
        <AvatarUploadField uid="u1" name="Ana" avatarPath={null} write={write} />
      </>,
    );
    selectFile();
    expect(visibleNotices()).toHaveLength(0);
    expect(screen.getByRole('button', { name: /save photo/i })).toHaveAccessibleDescription(OFFLINE_SENTENCE);
  });

  it('a connection that drops after the upload takes the failure path: the plain message, never success', async () => {
    uploadAvatar.mockResolvedValue('avatars/u1/new-uuid.jpg');
    updateProfile.mockImplementation(async () => {
      setOnLine(false);
      throw new TypeError('Failed to fetch');
    });
    removeAvatar.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<AvatarUploadField uid="u1" name="Ana" avatarPath="avatars/u1/old-uuid.jpg" />);
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: /save photo/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not update your profile photo. Please try again.'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('the data layer refusing an offline write reads as the shared sentence', async () => {
    uploadAvatar.mockRejectedValue(new OfflineWriteError());
    render(<AvatarUploadField uid="u1" name="Ana" avatarPath={null} />);
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: /save photo/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(OFFLINE_SENTENCE));
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
