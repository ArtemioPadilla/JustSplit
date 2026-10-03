// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { signUp } = vi.hoisted(() => ({ signUp: vi.fn() }));
vi.mock('@/stores/auth', () => ({ signUp }));

import SignUpForm from './SignUpForm';

describe('SignUpForm — accessibility (plan B6, axe smoke)', () => {
  it('renders its heading as an h1', () => {
    render(<SignUpForm />);
    expect(screen.getByRole('heading', { level: 1, name: /create your account/i })).toBeInTheDocument();
  });
});

describe('SignUpForm — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '', search: '', assign: vi.fn() },
    });
  });

  it('shows a validation message and does not sign up when the name is empty', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'longenoughpw');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText(/enter your name/i)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe('SignUpForm — happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '', search: '', assign: vi.fn() },
    });
  });

  it('submits a valid signup, calls signUp and redirects to /', async () => {
    signUp.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/name/i), 'Ada');
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'longenoughpw');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => expect(signUp).toHaveBeenCalledWith('ada@example.com', 'longenoughpw', 'Ada'));
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('/'));
  });

  it('shows an error message when signUp rejects (e.g. duplicate email)', async () => {
    signUp.mockRejectedValue(new Error('user_already_exists'));
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/name/i), 'Ada');
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'longenoughpw');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});

describe('SignUpForm — links', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '', search: '', assign: vi.fn() },
    });
  });

  it('renders a "Sign in" link only when signInHref is provided, and no Facebook/Twitter buttons', () => {
    const { rerender } = render(<SignUpForm />);
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /facebook/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /twitter/i })).not.toBeInTheDocument();

    rerender(<SignUpForm signInHref="/auth/signin/" />);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/signin/');
  });
});

/**
 * Plan B20a: sign-up never has a Google button (the sign-in page owns the provider,
 * and it is off by default), with the flag unset or on; email sign-up is the only path.
 */
describe.each(['', 'true'])('SignUpForm — no Google control (PUBLIC_AUTH_GOOGLE=%j)', (flag) => {
  beforeEach(() => vi.stubEnv('PUBLIC_AUTH_GOOGLE', flag));
  afterEach(() => vi.unstubAllEnvs());

  it('renders no Google button, no "or" divider and no Google text', () => {
    render(<SignUpForm signInHref="/auth/signin/" />);
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^or$/i)).not.toBeInTheDocument();
  });
});
