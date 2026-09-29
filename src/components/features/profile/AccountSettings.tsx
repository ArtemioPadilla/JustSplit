import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { ResetLocalDataButton } from '@/components/features/settings/ResetLocalDataButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { Separator } from '@/components/ui/separator';
import { ChangePasswordSchema, type ChangePasswordValues } from '@/schemas/change-password';
import { withBase } from '@/lib/href';
import { signOut, updatePassword } from '@/stores/auth';
import { notifyError, notifySuccess } from '@/stores/notifications';

/**
 * `/profile`'s "Account" card (plan B15, risk:high): change password, sign
 * out everywhere, and the local-cache reset (`ResetLocalDataButton`, B17b —
 * mounted here, not duplicated).
 */
export function AccountSettings() {
  return (
    <Card>
      <CardHeader>
        {/* Level 2: the island's sr-only <h1> is right above, and the sections below are h3 (axe heading-order, plan A7). */}
        <CardTitle role="heading" aria-level={2}>Account</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ChangePasswordForm />
        <Separator />
        <SignOutSection />
        <Separator />
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">This device</h3>
          <p className="text-sm text-muted-foreground">
            Clears cached expenses, groups, and preferences this browser has stored for you, and
            signs you out of this device.
          </p>
          <ResetLocalDataButton className="self-start" />
        </div>
      </CardContent>
    </Card>
  );
}

type Status = 'idle' | 'submitting' | 'error';

function ChangePasswordForm() {
  const [status, setStatus] = React.useState<Status>('idle');
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: ChangePasswordValues) {
    setStatus('submitting');
    try {
      await updatePassword(values.newPassword);
      notifySuccess('Password updated');
      form.reset({ newPassword: '', confirmPassword: '' });
      setStatus('idle');
    } catch {
      setStatus('error');
      notifyError('Could not update your password. Please try again.');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-foreground">Change password</h3>
      {/* States what updating the password does instead of asking for the
          current one (plan B15): the session is already authenticated, and
          Supabase's auth.updateUser needs no re-proof of the old password. */}
      <p className="text-sm text-muted-foreground">
        You&apos;re already signed in, so we don&apos;t need your current password — just choose a
        new one.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="account-new-password">New password</FormLabel>
                <FormControl>
                  <PasswordInput id="account-new-password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="account-confirm-password">Confirm new password</FormLabel>
                <FormControl>
                  <PasswordInput id="account-confirm-password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={status === 'submitting'} aria-busy={status === 'submitting'} className="self-start">
            {status === 'submitting' ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Form>
    </div>
  );
}

function SignOutSection() {
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      // afterNavigation: true — the location.assign() below is a full page
      // load in this static MPA that would otherwise discard this toast
      // before it renders (plan B17b, ADR 0008).
      notifySuccess('Signed out on every device', { afterNavigation: true });
      window.location.assign(withBase('/landing'));
    } catch {
      notifyError('Could not sign out. Please try again.');
      setSigningOut(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-foreground">Sign out</h3>
      {/* The adapter's signOut() takes no scope argument and is already
          Supabase's default GLOBAL scope (every session revoked) — the copy
          names that explicitly rather than implying a single-device
          sign-out, which this app does not build (plan B15). */}
      <p className="text-sm text-muted-foreground">
        Signs you out of every device with an active session — not just this one.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        aria-busy={signingOut}
        className="self-start"
      >
        {signingOut ? 'Signing out…' : 'Sign out everywhere'}
      </Button>
    </div>
  );
}
