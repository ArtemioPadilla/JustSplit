// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';

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

  it('a "Remove selection" control clears the pending pick without uploading', () => {
    render(<AvatarUploadField uid="u1" name="Ana" avatarPath={null} />);
    selectFile();
    expect(screen.getByRole('button', { name: /save photo/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove selection/i }));

    expect(screen.queryByRole('button', { name: /save photo/i })).not.toBeInTheDocument();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });
});
