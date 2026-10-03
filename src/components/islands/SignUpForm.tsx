/**
 * SignUpForm — email/password + display name (plan B4).
 *
 * Sibling of `LoginForm`, same pattern (Form + react-hook-form + zod).
 * No Facebook/Twitter buttons and no `linkProvider` (plan B4 explicitly
 * forbids both); Google sign-in (off by default, plan B20a) lives on the sign-in page only — Supabase's
 * `signInWithOAuth` creates the account too if it doesn't exist yet, so a
 * separate Google button here would be redundant. Mounted `client:only="react"`
 * on `src/pages/auth/signup.astro`.
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
import { RegisterSchema, type RegisterValues } from '@/schemas/register';
import { safeNext, withBase } from '@/lib/href';
import { signUp } from '@/stores/auth';
import ErrorBoundary from './ErrorBoundary';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export interface SignUpFormProps {
  /** Heading rendered above the fields. */
  heading?: string;
  /** When provided, renders a "Sign in" link pointing at this href. */
  signInHref?: string;
}

function currentNext(): string {
  if (typeof location === 'undefined') return '/';
  return safeNext(new URLSearchParams(location.search).get('next'));
}

export default function SignUpForm(props: SignUpFormProps) {
  return (
    <ErrorBoundary name="SignUpForm">
      <SignUpFormInner {...props} />
    </ErrorBoundary>
  );
}

function SignUpFormInner({ heading = 'Create your account', signInHref }: SignUpFormProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  async function handleSignUp(values: RegisterValues) {
    setErrorMsg(null);
    setStatus('submitting');
    try {
      await signUp(values.email, values.password, values.displayName);
      setStatus('success');
      // location.assign() (a method call), not `location.href = …` (a direct
      // property mutation the react-hooks/immutability rule flags).
      location.assign(withBase(currentNext()));
    } catch {
      setStatus('error');
      // Never enumerate whether the address is already registered.
      setErrorMsg('Could not create your account. The email may already be in use.');
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300"
      >
        Account created — redirecting…
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSignUp)} noValidate className="space-y-4">
        <h1 className="text-lg font-semibold text-foreground">{heading}</h1>

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="signup-name">Name</FormLabel>
              <FormControl>
                <Input id="signup-name" placeholder="Ada Lovelace" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="signup-email">Email</FormLabel>
              <FormControl>
                <Input
                  id="signup-email"
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
              <FormLabel htmlFor="signup-password">Password</FormLabel>
              <FormControl>
                <PasswordInput id="signup-password" autoComplete="new-password" {...field} />
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
          {status === 'submitting' ? 'Creating account…' : 'Sign up'}
        </Button>

        {signInHref && (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <a
              href={signInHref}
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              Sign in
            </a>
          </p>
        )}
      </form>
    </Form>
  );
}
