// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import { $profile, $user } from '@/stores/session';

/**
 * `ProfileForm` (plan B15, risk:high) — the profile island's name/phone/
 * currency card. `AvatarUploadField` (own ordering test suite) and
 * `CurrencySelector` (own Combobox interaction test suite) are mocked here
 * so this file stays focused on ITS OWN job: prefilling from `$profile`,
 * phone validation, and — the preferences-merge bug guard (plan B15
 * decision 2) — that saving the phone keeps `preferredCurrency` and saving
 * the currency keeps `phoneNumber`, both through `buildPreferencesPatch`.
 */
vi.mock('./AvatarUploadField', () => ({
  AvatarUploadField: (props: { uid: string; name: string; avatarPath: string | null | undefined }) => (
    <div data-testid="avatar-upload-field" data-uid={props.uid} data-avatar-path={props.avatarPath ?? ''}>
      {props.name}
    </div>
  ),
}));

vi.mock('@/components/features/currency/CurrencySelector', () => ({
  CurrencySelector: (props: { value: string; onChange: (code: string) => void; label?: string; id?: string }) => (
    <div>
      <label htmlFor={props.id}>{props.label}</label>
      <select id={props.id} value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
      </select>
    </div>
  ),
}));

const { updateProfile } = vi.hoisted(() => ({ updateProfile: vi.fn() }));
vi.mock('@/stores/auth', () => ({ updateProfile }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

const { atom } = await import('nanostores');
const $preferredCurrency = atom('USD');
vi.mock('@/stores/preferences', () => ({ $preferredCurrency }));

const { ProfileForm } = await import('./ProfileForm');

const USER: AuthUser = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };

function baseProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    name: 'Ana',
    apps: ['justsplit'],
    permissions: [],
    preferences: { preferredCurrency: 'USD', phoneNumber: '555-0100' },
    avatarUrl: 'avatars/u1/existing.jpg',
    ...overrides,
  };
}

describe('ProfileForm', () => {
  beforeEach(() => {
    updateProfile.mockClear();
    updateProfile.mockResolvedValue(undefined);
    notifySuccess.mockClear();
    notifyError.mockClear();
    $user.set(USER);
    $preferredCurrency.set('USD');
  });

  afterEach(() => {
    $profile.set(null);
  });

  it('renders a loading skeleton before the profile has loaded', () => {
    $profile.set(null);
    render(<ProfileForm />);
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
  });

  it('prefills the name and phone number from the current profile, and mounts AvatarUploadField with the right props', () => {
    $profile.set(baseProfile());
    render(<ProfileForm />);

    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Ana');
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('555-0100');
    const avatarField = screen.getByTestId('avatar-upload-field');
    expect(avatarField).toHaveAttribute('data-uid', 'u1');
    expect(avatarField).toHaveAttribute('data-avatar-path', 'avatars/u1/existing.jpg');
  });

  it('shows a validation error for an invalid phone number and does not call updateProfile', async () => {
    $profile.set(baseProfile());
    const user = userEvent.setup();
    render(<ProfileForm />);

    const phoneInput = screen.getByLabelText(/phone number/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, 'abc');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/valid phone number/i)).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('saving the phone keeps the existing preferredCurrency (preferences-merge bug guard)', async () => {
    $profile.set(baseProfile({ preferences: { preferredCurrency: 'EUR', phoneNumber: '555-0100' } }));
    const user = userEvent.setup();
    render(<ProfileForm />);

    const phoneInput = screen.getByLabelText(/phone number/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, '555-0199');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(updateProfile).toHaveBeenCalledWith({
      name: 'Ana',
      preferences: { preferredCurrency: 'EUR', phoneNumber: '555-0199' },
    });
  });

  it('saving the currency keeps the existing phone number (preferences-merge bug guard)', async () => {
    $profile.set(baseProfile({ preferences: { preferredCurrency: 'USD', phoneNumber: '555-0100' } }));
    const user = userEvent.setup();
    render(<ProfileForm />);

    await user.selectOptions(screen.getByLabelText(/preferred currency/i), 'EUR');

    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(updateProfile).toHaveBeenCalledWith({
      preferences: { preferredCurrency: 'EUR', phoneNumber: '555-0100' },
    });
  });
});
