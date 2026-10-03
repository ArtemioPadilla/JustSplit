// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readAll, speakFocused, spokenWith, trackAnnouncements } from '@/tests/screen-reader';

const { signIn, signInWithGoogle } = vi.hoisted(() => ({ signIn: vi.fn(), signInWithGoogle: vi.fn() }));
vi.mock('@/stores/auth', () => ({ signIn, signInWithGoogle }));

import LoginForm from './LoginForm';

/**
 * Plan B19d, layer 1: what a screen reader is told when the sign-in form refuses a
 * submit (`ui/form.tsx` wires label, `aria-invalid` and `aria-describedby`;
 * react-hook-form moves focus to the first invalid field).
 *
 * Behavior contracts:
 *  - a submit with invalid fields leaves focus ON the first invalid field, and that
 *    field is spoken with its name, as invalid, and with its message as the description
 *    (that is how the error reaches the person: by focus, not by a live region);
 *  - every other invalid field is invalid and described by its own message;
 *  - the validation messages are NOT also live regions (that would say each twice);
 *  - a refused sign-in is announced ONCE, as an assertive alert, and is not a double.
 */
let announcements: Awaited<ReturnType<typeof trackAnnouncements>>;

beforeEach(async () => {
  vi.clearAllMocks();
  announcements = await trackAnnouncements();
});
afterEach(() => {
  announcements.stop();
});

describe('LoginForm: a submit with invalid fields', () => {
  it('leaves focus on the first invalid field, spoken as invalid with its message', async () => {
    render(<LoginForm signUpHref="/auth/signup/" />);
    await userEvent.setup().click(screen.getByRole('button', { name: /^sign in$/i }));
    await screen.findByText(/valid email/i);

    expect(document.activeElement).toBe(screen.getByLabelText('Email'));
    const spoken = await speakFocused();
    expect(spoken).toContain('textbox');
    expect(spoken).toContain('Email');
    expect(spoken).toContain('invalid');
    expect(spoken).toContain('Please enter a valid email address.');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('marks the second invalid field invalid and describes it with its own message', async () => {
    render(<LoginForm />);
    await userEvent.setup().click(screen.getByRole('button', { name: /^sign in$/i }));
    await screen.findByText(/at least 8 characters/i);

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAccessibleDescription('Password must be at least 8 characters.');
    password.focus();
    expect(await speakFocused()).toContain('Password must be at least 8 characters.');
  });

  it('keeps the page reading in order: the message follows its field', async () => {
    render(<LoginForm />);
    await userEvent.setup().click(screen.getByRole('button', { name: /^sign in$/i }));
    await screen.findByText(/valid email/i);
    const phrases = await readAll();
    const field = phrases.findIndex((phrase) => phrase.startsWith('textbox, Email'));
    const message = phrases.indexOf('Please enter a valid email address.');
    expect(field).toBeGreaterThanOrEqual(0);
    expect(message).toBeGreaterThan(field);
  });

  it('does not announce the messages through a live region as well', async () => {
    render(<LoginForm />);
    await announcements.settled();
    await userEvent.setup().click(screen.getByRole('button', { name: /^sign in$/i }));
    await screen.findByText(/valid email/i);
    await announcements.settled();
    expect(announcements.log).toEqual([]);
  });
});

describe('LoginForm: a refused sign-in', () => {
  it('is announced once, as an assertive alert', async () => {
    signIn.mockRejectedValue(new Error('invalid_credentials'));
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'longenoughpw');
    await announcements.settled();
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    await screen.findByRole('alert');
    const log = await announcements.settled();

    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ politeness: 'assertive', text: 'Incorrect email or password.' });
    expect(announcements.problems()).toEqual([]);
    const phrases = await readAll();
    expect(phrases).toContain('alert');
    expect(spokenWith(phrases, 'Incorrect email or password.')).toBe(true);
  });
});
