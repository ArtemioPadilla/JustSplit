/**
 * ResetPasswordIsland (plan B4) — the signin page's "Forgot password?" link
 * pointed nowhere before this; it's live now.
 *
 * Two modes, chosen by `onPasswordRecovery` (`src/lib/data/client.ts`), not
 * by a prop: `SupabaseAuthAdapter.onAuthStateChanged` discards the Supabase
 * event type, so `$user`/`AuthBridge` cannot tell a recovery session from an
 * ordinary sign-in — this island listens for the raw `PASSWORD_RECOVERY`
 * event instead.
 *
 *   - Request (default): email -> `resetPassword(email)` -> "check your
 *     email".
 *   - Update (after following the emailed link, which lands back here with a
 *     recovery session already established by `detectSessionInUrl: true`):
 *     new password -> `updatePassword(newPassword)` -> redirect to `/`.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as React from 'react';
import { z } from 'zod';

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
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { createDisposer } from '@/lib/disposer';
import { onPasswordRecovery } from '@/lib/data/client';
import { withBase } from '@/lib/href';
import { refuseIfOffline, writeErrorMessage } from '@/lib/offline-write';
import { useCanWrite } from '@/lib/use-can-write';
import { resetPassword, updatePassword } from '@/stores/auth';
import ErrorBoundary from './ErrorBoundary';

// Page-local (not reused elsewhere): still Zod, not a bare interface, for
// the react-hook-form + zodResolver contract (CLAUDE.md rule 8).
const RequestSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});
type RequestValues = z.infer<typeof RequestSchema>;

const UpdateSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
});
type UpdateValues = z.infer<typeof UpdateSchema>;

type Mode = 'request' | 'update';
type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ResetPasswordIsland() {
  return (
    <ErrorBoundary name="ResetPasswordIsland">
      <ResetPasswordInner />
    </ErrorBoundary>
  );
}

function ResetPasswordInner() {
  const [mode, setMode] = React.useState<Mode>('request');

  React.useEffect(() => {
    const d = createDisposer();
    d.add(onPasswordRecovery(() => setMode('update')));
    return d.dispose;
  }, []);

  return mode === 'update' ? <UpdatePasswordForm /> : <RequestResetForm />;
}

function RequestResetForm() {
  const [status, setStatus] = React.useState<Status>('idle');
  const form = useForm<RequestValues>({
    resolver: zodResolver(RequestSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: RequestValues) {
    setStatus('submitting');
    try {
      await resetPassword(values.email);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300">
        Check your email for a password reset link.
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Reset your password</h2>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="reset-email">Email</FormLabel>
              <FormControl>
                <Input id="reset-email" type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {status === 'error' && (
          <p role="alert" className="text-sm text-destructive">
            Could not send the reset email. Please try again.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </Form>
  );
}

const RECOVERY_FAILED = 'Could not update your password. The recovery link may have expired.';

function UpdatePasswordForm() {
  const [status, setStatus] = React.useState<Status>('idle');
  const [failure, setFailure] = React.useState(RECOVERY_FAILED);
  // Plan B19c (ADR 0015): setting the new password is a write; with no connection it is blocked and explained.
  const write = useCanWrite();
  const form = useForm<UpdateValues>({
    resolver: zodResolver(UpdateSchema),
    defaultValues: { newPassword: '' },
  });

  async function onSubmit(values: UpdateValues) {
    setStatus('submitting');
    try {
      await updatePassword(values.newPassword);
      setStatus('success');
      location.assign(withBase('/'));
    } catch (error) {
      // Offline is not an expired link: say what it is.
      setFailure(writeErrorMessage(error, RECOVERY_FAILED));
      setStatus('error');
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          if (refuseIfOffline(event)) return;
          return form.handleSubmit(onSubmit)(event);
        }}
        noValidate
        className="space-y-4"
      >
        <h2 className="text-lg font-semibold text-foreground">Choose a new password</h2>
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="reset-new-password">New password</FormLabel>
              <FormControl>
                <PasswordInput id="reset-new-password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {status === 'error' && (
          <p role="alert" className="text-sm text-destructive">
            {failure}
          </p>
        )}
        <OfflineWriteNotice write={write} />
        <Button type="submit" className="w-full" disabled={status === 'submitting'} {...write.blocked}>
          {status === 'submitting' ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </Form>
  );
}
