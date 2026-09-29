// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import { $profile, $user } from '@/stores/session';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

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
  AvatarUploadField: (props: { uid: string; name: string; avatarPath: string | null | undefined; write?: { canWrite: boolean } }) => (
    <div
      data-testid="avatar-upload-field"
      data-uid={props.uid}
      data-avatar-path={props.avatarPath ?? ''}
      data-can-write={String(props.write?.canWrite)}
    >
      {props.name}
    </div>
  ),
}));

vi.mock('@/components/features/currency/CurrencySelector', () => ({
  CurrencySelector: (props: {
    value: string;
    onChange: (code: string) => void;
    label?: string;
    id?: string;
    write?: { blocked?: Record<string, unknown> };
  }) => (
    <div>
      <label htmlFor={props.id}>{props.label}</label>
      <select id={props.id} value={props.value} onChange={(e) => props.onChange(e.target.value)} {...props.write?.blocked}>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
      </select>
    </div>
  ),
}));

const { updateProfile } = vi.hoisted(() => ({ updateProfile: vi.fn() }));
vi.mock('@/stores/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/auth')>();
  return { ...actual, updateProfile };
});

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

  // Plan A7 (live smoke, axe heading-order): the route island's sr-only <h1> is followed directly by this card, so its
  // title is the level-2 heading — a plain <div> title left h1 -> h3 gaps further down the page.
  it('titles the card with a level-2 heading', () => {
    $profile.set(baseProfile());
    render(<ProfileForm />);
    expect(screen.getByRole('heading', { level: 2, name: 'Your profile' })).toBeInTheDocument();
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

/** Plan B19c (risk:high, ADR 0015): the card shares ONE connection state and shows ONE sentence for Save, the currency and the photo. */
describe('ProfileForm — offline (plan B19c)', () => {
  beforeEach(() => {
    updateProfile.mockClear();
    updateProfile.mockResolvedValue(undefined);
    notifySuccess.mockClear();
    notifyError.mockClear();
    $user.set(USER);
    $preferredCurrency.set('USD');
  });

  afterEach(() => {
    restoreOnLine();
    $profile.set(null);
  });

  it('Save changes and the currency are blocked and explained once, keep what was typed, and work again on reconnect', async () => {
    $profile.set(baseProfile());
    const user = userEvent.setup();
    render(<ProfileForm />);
    const name = screen.getByLabelText(/^name$/i);
    await user.clear(name);
    await user.type(name, 'Ana María');

    setOnLine(false);
    const save = screen.getByRole('button', { name: /save changes/i });
    const currency = screen.getByLabelText(/preferred currency/i);
    expectBlocked(save);
    expectBlocked(currency);
    expect(visibleNotices()).toHaveLength(1);
    expect(visibleNotices()[0]).toHaveTextContent(OFFLINE_SENTENCE);
    expect(screen.getByTestId('avatar-upload-field')).toHaveAttribute('data-can-write', 'false');

    await user.click(save);
    await user.type(name, '{Enter}');
    await user.selectOptions(currency, 'EUR');
    expect(updateProfile).not.toHaveBeenCalled();
    expect(name).toHaveValue('Ana María');

    setOnLine(true);
    expectWritable(save);
    expectWritable(currency);
    expect(visibleNotices()).toHaveLength(0);
    expect(screen.getByTestId('avatar-upload-field')).toHaveAttribute('data-can-write', 'true');
    await user.click(save);
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(updateProfile.mock.calls[0]![0]).toMatchObject({ name: 'Ana María' });
  });

  it('a connection that drops mid-save shows the plain failure, never success', async () => {
    $profile.set(baseProfile());
    updateProfile.mockImplementation(async () => {
      setOnLine(false);
      throw new TypeError('Failed to fetch');
    });
    const user = userEvent.setup();
    render(<ProfileForm />);
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not update your profile. Please try again.'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('the store refusing an offline write reads as the shared sentence, for the details and for the currency', async () => {
    $profile.set(baseProfile());
    updateProfile.mockRejectedValue(new OfflineWriteError());
    const user = userEvent.setup();
    render(<ProfileForm />);
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(OFFLINE_SENTENCE));
    notifyError.mockClear();
    await user.selectOptions(screen.getByLabelText(/preferred currency/i), 'EUR');
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(OFFLINE_SENTENCE));
  });
});
