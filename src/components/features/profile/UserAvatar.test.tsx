// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * `UserAvatar` (plan B15 follow-up — a regression B15 itself introduced):
 * `profiles.avatarUrl` (and the mirrored auth `photoURL`) is USER-WRITABLE.
 * Before this issue's avatar upload feature, `avatarUrl` only ever held a
 * real `https:` URL (Google OAuth); B15 made it sometimes hold a private
 * `avatars/{uid}/…` storage PATH instead, which is not a fetchable URL on
 * its own — every avatar render site needs the same safe resolution:
 *   - `avatars/…` -> a short-lived signed URL (`useSignedUrl`, the SAME
 *     mechanism `ReceiptImage` uses).
 *   - `https:` -> passed through unchanged (Google's `photoURL`).
 *   - anything else (`http:`, `javascript:`, `data:`, another shape, empty)
 *     -> initials fallback, NEVER placed in an `<img src>`.
 *   - a failing signed-URL resolution -> initials fallback too.
 */
const { signedUrl } = vi.hoisted(() => ({ signedUrl: vi.fn() }));
vi.mock('@/lib/data/storage', () => ({ signedUrl }));

const { UserAvatar } = await import('./UserAvatar');

/**
 * Base UI's `Avatar.Image` only renders an `<img>` once a hidden probe
 * `new window.Image()` fires `onload` (`useImageLoadingStatus.js`) — jsdom
 * never loads real image bytes, so without this stub NO `<img>` a real
 * browser would show ever appears in these tests, success cases included.
 * This stub always succeeds; it is not what drives this suite's "falls
 * back to initials" cases (those never even mount `<AvatarImage>` in the
 * first place — `resolvedUrl` stays `null`).
 */
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

describe('UserAvatar', () => {
  beforeEach(() => {
    signedUrl.mockReset();
    vi.stubGlobal('Image', ImmediateLoadImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves an avatars/ storage path to a signed URL and renders it', async () => {
    signedUrl.mockResolvedValue('https://signed.example/avatars/u1/a.jpg?token=abc');
    render(<UserAvatar src="avatars/u1/a.jpg" name="Ana" />);

    const img = await screen.findByRole('img', { name: 'Ana' });
    expect(img).toHaveAttribute('src', 'https://signed.example/avatars/u1/a.jpg?token=abc');
    expect(signedUrl).toHaveBeenCalledWith('avatars/u1/a.jpg', undefined);
  });

  it('passes an https: URL through unchanged, without calling signedUrl', async () => {
    render(<UserAvatar src="https://lh3.googleusercontent.com/a/photo.jpg" name="Ana" />);

    const img = await screen.findByRole('img', { name: 'Ana' });
    expect(img).toHaveAttribute('src', 'https://lh3.googleusercontent.com/a/photo.jpg');
    expect(signedUrl).not.toHaveBeenCalled();
  });

  it.each([
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a data: URL', 'data:text/html,<script>alert(1)</script>'],
    ['a plain http: URL', 'http://example.com/a.jpg'],
    ["another user's account settings path", 'settings/u1/a.jpg'],
    ['an empty string', ''],
  ])('renders the initials fallback for %s, never in an <img src>', (_label, src) => {
    render(<UserAvatar src={src} name="Ana Beto" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('AB')).toBeInTheDocument();
    expect(signedUrl).not.toHaveBeenCalled();
  });

  it('renders the initials fallback for null/undefined src', () => {
    render(<UserAvatar src={null} name="Ana Beto" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('falls back to initials when the signed URL fails to resolve', async () => {
    signedUrl.mockRejectedValue(new Error('object not found'));
    render(<UserAvatar src="avatars/u1/missing.jpg" name="Ana Beto" />);

    await waitFor(() => expect(screen.getByText('AB')).toBeInTheDocument());
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('defaults alt to the name, but respects an explicit empty alt when the name sits next to it', async () => {
    signedUrl.mockResolvedValue('https://signed.example/a.jpg');
    const { container } = render(<UserAvatar src="avatars/u1/a.jpg" name="Ana" alt="" />);
    // alt="" maps an <img> to the "presentation" role, so it is intentionally
    // NOT queried via getByRole('img') here — a plain DOM query instead.
    const img = await waitFor(() => {
      const el = container.querySelector('img');
      if (!el) throw new Error('img not rendered yet');
      return el;
    });
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('src', 'https://signed.example/a.jpg');
  });
});
