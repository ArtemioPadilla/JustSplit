// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * `UserAccountMenu` (plan B15 follow-up): its avatar must render through
 * the shared `UserAvatar` resolver, never a raw `AvatarImage` fed
 * `profiles.avatarUrl` directly — that value is sometimes a private
 * `avatars/{uid}/…` storage path since B15's avatar upload, not a fetchable
 * URL.
 */
const { UserAvatar } = vi.hoisted(() => ({
  UserAvatar: vi.fn((props: { src: string | null | undefined; name: string }) => (
    <div data-testid="user-avatar" data-src={props.src ?? ''} data-name={props.name} />
  )),
}));
vi.mock('@/components/features/profile/UserAvatar', () => ({ UserAvatar }));

const { default: UserAccountMenu } = await import('./UserAccountMenu');

describe('UserAccountMenu', () => {
  it('renders its avatar through the shared UserAvatar resolver', () => {
    render(<UserAccountMenu name="Ana" avatarUrl="avatars/u1/a.jpg" />);
    const avatar = screen.getByTestId('user-avatar');
    expect(avatar).toHaveAttribute('data-src', 'avatars/u1/a.jpg');
    expect(avatar).toHaveAttribute('data-name', 'Ana');
  });
});
