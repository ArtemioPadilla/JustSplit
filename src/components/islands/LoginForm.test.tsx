// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { signIn, signInWithGoogle } = vi.hoisted(() => ({
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
}));
vi.mock('@/stores/auth', () => ({ signIn, signInWithGoogle }));

import LoginForm from './LoginForm';

describe('LoginForm — accessibility (plan B6, axe smoke)', () => {
  it('renders its heading as an h1 (axe page-has-heading-one on /auth/signin/)', () => {
    render(<LoginForm />);
    expect(screen.getByRole('heading', { level: 1, name: /welcome back/i })).toBeInTheDocument();
  });
});

describe('LoginForm — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '', search: '', assign: vi.fn(), replace: vi.fn() },
    });
  });

  it('shows a validation message and does not sign in when the email is malformed', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/^password$/i), 'longenoughpw');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe('LoginForm — happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '', search: '', assign: vi.fn(), replace: vi.fn() },
    });
  });

  it('submits valid credentials, calls signIn and redirects to /', async () => {
    signIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'longenoughpw');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('ada@example.com', 'longenoughpw'));
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('/'));
  });

  it('shows an error message and does not redirect when signIn rejects', async () => {
    signIn.mockRejectedValue(new Error('invalid_credentials'));
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'longenoughpw');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i);
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});

/**
 * Plan B20a: Google sign-in is behind the build-time flag PUBLIC_AUTH_GOOGLE and
 * off by default. Off: no button, no "or" divider, nothing hinting at a disabled
 * provider, and no empty gap between the submit button and the sign-up link.
 */
describe('LoginForm — Google sign-in off (the default, plan B20a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PUBLIC_AUTH_GOOGLE', '');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('renders no Google button, no divider and no Google text', () => {
    render(<LoginForm signUpHref="/auth/signup/" />);
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^or$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('keeps email/password sign-in fully working', async () => {
    signIn.mockResolvedValue(undefined);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '', search: '', assign: vi.fn(), replace: vi.fn() },
    });
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'ana@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'longenoughpw');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('ana@example.com', 'longenoughpw'));
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });

  it('leaves the submit button directly followed by the sign-up link (no empty wrapper)', () => {
    const { container } = render(<LoginForm signUpHref="/auth/signup/" />);
    const submit = screen.getByRole('button', { name: /^sign in$/i });
    const next = submit.nextElementSibling;
    expect(next?.tagName).toBe('P');
    expect(next).toHaveTextContent(/don't have an account/i);
    expect(container.querySelectorAll('form > *:empty')).toHaveLength(0);
  });
});

describe('LoginForm — Google (flag on)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PUBLIC_AUTH_GOOGLE', 'true');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '', search: '', assign: vi.fn(), replace: vi.fn() },
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it('calls signInWithGoogle when the Google button is clicked', async () => {
    signInWithGoogle.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /continue with google/i }));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled());
  });

  it('shows an error if signInWithGoogle rejects before the redirect', async () => {
    signInWithGoogle.mockRejectedValue(new Error('oauth down'));
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(await screen.findByText(/google sign-in failed/i)).toBeInTheDocument();
  });
});

describe('LoginForm — links', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '', search: '', assign: vi.fn(), replace: vi.fn() },
    });
  });

  it('renders a "Forgot password?" link', () => {
    render(<LoginForm />);
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('renders a "Sign up" link only when signUpHref is provided', () => {
    const { rerender } = render(<LoginForm />);
    expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument();

    rerender(<LoginForm signUpHref="/auth/signup/" />);
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/auth/signup/');
  });
});
