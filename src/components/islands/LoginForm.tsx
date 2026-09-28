/**
 * LoginForm — email/password + Google sign-in (plan B4).
 *
 * Ported from Inceptor's `src/components/islands/LoginForm.tsx` block:
 * `handleLogin` now calls `signIn()` from `src/stores/auth.ts` instead of the
 * demo stub, and a Google button calls `signInWithGoogle()`. Mounted
 * `client:only="react"` on `src/pages/auth/signin.astro`.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { LoginSchema, type LoginValues } from '@/schemas/login';
import { safeNext, withBase } from '@/lib/href';
import { signIn, signInWithGoogle } from '@/stores/auth';
import ErrorBoundary from './ErrorBoundary';

type Status = 'idle' | 'submitting' | 'success' | 'error';
type GoogleStatus = 'idle' | 'redirecting' | 'error';

export interface LoginFormProps {
  /** Heading rendered above the fields. */
  heading?: string;
  /** href for "Forgot password?". Defaults to '#'. */
  forgotPasswordHref?: string;
  /** When provided, renders a "Sign up" link pointing at this href. */
  signUpHref?: string;
}

/** The validated `?next=` redirect target for this page load. */
function currentNext(): string {
  if (typeof location === 'undefined') return '/';
  return safeNext(new URLSearchParams(location.search).get('next'));
}

export default function LoginForm(props: LoginFormProps) {
  return (
    <ErrorBoundary name="LoginForm">
      <LoginFormInner {...props} />
    </ErrorBoundary>
  );
}

function LoginFormInner({
  heading = 'Welcome back',
  forgotPasswordHref = '#',
  signUpHref,
}: LoginFormProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>('idle');

  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function handleLogin(values: LoginValues) {
    setErrorMsg(null);
    setStatus('submitting');
    try {
      await signIn(values.email, values.password);
      setStatus('success');
      // Never enumerate WHICH credential was wrong; also never redirect to an
      // unvalidated target — currentNext() already ran it through safeNext().
      // location.assign() (a method call), not `location.href = …` (a direct
      // property mutation the react-hooks/immutability rule flags).
      location.assign(withBase(currentNext()));
    } catch {
      setStatus('error');
      setErrorMsg('Incorrect email or password.');
    }
  }

  async function handleGoogle() {
    setGoogleStatus('redirecting');
    try {
      await signInWithGoogle(currentNext());
      // On a real redirect the page unloads before this resolves; reaching
      // here without an error means the SDK call itself failed silently.
    } catch {
      setGoogleStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300"
      >
        Signed in — redirecting…
      </div>
    );
  }

  return (
    <Form {...form}>
      {/* noValidate: cede all validation to zod/react-hook-form. */}
      <form onSubmit={form.handleSubmit(handleLogin)} noValidate className="space-y-4">
        <h1 className="text-lg font-semibold text-foreground">{heading}</h1>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="login-email">Email</FormLabel>
              <FormControl>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel htmlFor="login-password">Password</FormLabel>
                <a
                  href={forgotPasswordHref}
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Forgot password?
                </a>
              </div>
              <FormControl>
                <PasswordInput id="login-password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {status === 'error' && errorMsg && (
          <p role="alert" className="text-sm text-destructive">
            {errorMsg}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Signing in…' : 'Sign in'}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
          disabled={googleStatus === 'redirecting'}
        >
          {googleStatus === 'redirecting' ? 'Redirecting…' : 'Continue with Google'}
        </Button>

        {googleStatus === 'error' && (
          <p role="alert" className="text-sm text-destructive">
            Google sign-in failed. Please try again.
          </p>
        )}

        {signUpHref && (
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <a
              href={signUpHref}
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              Sign up
            </a>
          </p>
        )}
      </form>
    </Form>
  );
}
