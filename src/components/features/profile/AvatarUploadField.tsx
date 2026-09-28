import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { UserAvatar } from '@/components/features/profile/UserAvatar';
import { removeAvatar, uploadAvatar } from '@/lib/data/storage';
import { notifyError, notifyInfo, notifySuccess } from '@/stores/notifications';
import { updateProfile } from '@/stores/auth';

/** Mirrors the `receipts` bucket's own hard limit (avatars share it, ADR 0005/D10). */
export const AVATAR_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface AvatarUploadFieldProps {
  /** The signed-in user's own id — `uploadAvatar`/the object path are scoped to it. */
  uid: string;
  /** Used for the fallback initials and the image's accessible name. */
  name: string;
  /**
   * The CURRENT `profiles.avatarUrl` — an `avatars/{uid}/…` storage path
   * once the user has uploaded a custom photo, or still an `https:` URL
   * (Google OAuth's `photoURL`, `createJustSplitProfile`'s default) if they
   * never have. Rendered through `UserAvatar` (plan B15 follow-up), which
   * resolves either shape safely — never through `ReceiptImage` directly,
   * which only knows how to resolve a receipts-bucket object path.
   */
  avatarPath: string | null | undefined;
}

/** Object-URL preview for the pending pick, revoked on change/unmount. */
function usePreviewUrl(file: File | null): string | null {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

/**
 * The profile island's avatar picker (plan B15, risk:high). `FileUpload` is
 * always handed an empty `files` list (same reason as `ReceiptUploader`,
 * B10: this component owns its own preview instead of `FileUpload`'s token
 * list). Files are NOT uploaded on pick — "Save photo" runs the ordering
 * contract below.
 *
 * **Replace ordering** (plan B15 decision 4): `uploadAvatar` -> `updateProfile
 * ({ avatarUrl: newPath })` -> ONLY THEN `removeAvatar(oldPath)`. A failed
 * `updateProfile` removes the NEW object instead (never orphaned) and
 * reports the failure; a failed removal of the OLD object is a non-blocking
 * `notifyInfo` (the update already succeeded — the user's photo did
 * change), never `notifyError`.
 *
 * **Defensive path check**: `oldPath` comes from the user-writable
 * `profiles` row. RLS already denies removing anything outside
 * `avatars/{uid}/` (`db/migrations/20260928000007_receipts_storage.sql`),
 * but this never even tries for a path that couldn't be this user's own
 * avatar object (an external URL, or another user's path) — no point
 * generating a removal error for something that was never going to work.
 */
export function AvatarUploadField({ uid, name, avatarPath }: AvatarUploadFieldProps) {
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const previewUrl = usePreviewUrl(pendingFile);

  function handleChange(files: File[]) {
    const file = files[files.length - 1];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notifyError('Only image files can be used as a profile photo.');
      return;
    }
    setPendingFile(file);
  }

  function clearSelection() {
    setPendingFile(null);
  }

  async function handleSave() {
    if (!pendingFile) return;
    setBusy(true);
    const oldPath = avatarPath;

    let newPath: string;
    try {
      newPath = await uploadAvatar(uid, pendingFile);
    } catch {
      notifyError('Could not upload your photo. Please try again.');
      setBusy(false);
      return;
    }

    try {
      await updateProfile({ avatarUrl: newPath });
    } catch {
      // The row was never updated to point at newPath — remove it instead
      // of leaving an orphaned object nothing will ever reference.
      try {
        await removeAvatar(newPath);
      } catch {
        // Best-effort cleanup; the failure below is reported either way.
      }
      notifyError('Could not update your profile photo. Please try again.');
      setBusy(false);
      return;
    }

    setPendingFile(null);

    if (oldPath && oldPath.startsWith(`avatars/${uid}/`)) {
      try {
        await removeAvatar(oldPath);
      } catch {
        notifyInfo("Photo updated, but the old one couldn't be removed.");
        setBusy(false);
        return;
      }
    }

    notifySuccess('Profile photo updated');
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4" aria-busy={busy}>
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserAvatar
            src={avatarPath}
            name={name}
            alt={`${name}'s profile photo`}
            className="h-16 w-16"
            fallbackClassName="text-lg"
          />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <FileUpload
          files={[]}
          onChange={handleChange}
          accept="image/*"
          maxSize={AVATAR_MAX_UPLOAD_BYTES}
          onError={notifyError}
          className="w-64"
        />
        {pendingFile && (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={() => void handleSave()} disabled={busy} aria-busy={busy}>
              {busy ? 'Uploading…' : 'Save photo'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={clearSelection} disabled={busy}>
              Remove selection
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
