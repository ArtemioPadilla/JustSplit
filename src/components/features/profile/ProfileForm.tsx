import * as React from 'react';
import { useStore } from '@nanostores/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { CurrencySelector } from '@/components/features/currency/CurrencySelector';
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { buildPreferencesPatch } from '@/domain/profile';
import { refuseIfOffline, writeErrorMessage } from '@/lib/offline-write';
import { useCanWrite } from '@/lib/use-can-write';
import { ProfileEditSchema, type ProfileEditValues } from '@/schemas/profile-edit';
import { $preferredCurrency } from '@/stores/preferences';
import { $profile, $user, updateProfile } from '@/stores/auth';
import { notifyError, notifySuccess } from '@/stores/notifications';
import { AvatarUploadField } from './AvatarUploadField';

/**
 * `/profile`'s "Your profile" card (plan B15, risk:high): avatar, display
 * name + phone number, preferred currency. Rendered inside `AuthGate`, so
 * `$user` is always set by the time this mounts — `$profile` can still be
 * `null` for one tick while `AuthBridge` mirrors the bootstrap, hence the
 * skeleton branch below.
 *
 * Both writes to `preferences` (phone, currency) go through
 * `buildPreferencesPatch` (plan B15's preferences-merge bug guard):
 * `SupabaseProfileStore.update` upserts `preferences` as a whole jsonb
 * column, so a bare `{ phoneNumber }` or `{ preferredCurrency }` write would
 * silently wipe the other one.
 */
export function ProfileForm() {
  const user = useStore($user);
  const profile = useStore($profile);
  const preferredCurrency = useStore($preferredCurrency);
  const uid = user?.uid ?? '';
  // Plan B19c (ADR 0015): the card owns ONE connection state and shows ONE sentence for Save, the
  // preferred currency and the photo; with no connection all three are blocked and nothing typed is lost.
  const write = useCanWrite();

  const [savingDetails, setSavingDetails] = React.useState(false);
  const [savingCurrency, setSavingCurrency] = React.useState(false);

  const form = useForm<ProfileEditValues>({
    resolver: zodResolver(ProfileEditSchema),
    defaultValues: { displayName: '', phoneNumber: '' },
  });

  // Resets once per profile IDENTITY, not on every $profile update — a
  // currency-only save also refreshes $profile, and re-resetting on that
  // would clobber whatever the user is mid-typing in the name/phone fields.
  React.useEffect(() => {
    if (!profile) return;
    form.reset({ displayName: profile.name ?? '', phoneNumber: profile.preferences?.phoneNumber ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [profile?.id]);

  async function onSubmit(values: ProfileEditValues) {
    setSavingDetails(true);
    try {
      await updateProfile({
        name: values.displayName,
        preferences: buildPreferencesPatch(profile?.preferences, {
          phoneNumber: values.phoneNumber || undefined,
        }),
      });
      notifySuccess('Profile updated');
    } catch (error) {
      notifyError(writeErrorMessage(error, 'Could not update your profile. Please try again.'));
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleCurrencyChange(code: string) {
    if (refuseIfOffline()) return;
    setSavingCurrency(true);
    try {
      await updateProfile({
        preferences: buildPreferencesPatch(profile?.preferences, { preferredCurrency: code }),
      });
    } catch (error) {
      notifyError(writeErrorMessage(error, 'Could not update your preferred currency'));
    } finally {
      setSavingCurrency(false);
    }
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        {/* Level 2: the island's sr-only <h1> is right above, and the sections below are h3 (axe heading-order, plan A7). */}
        <CardTitle role="heading" aria-level={2}>Your profile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <OfflineWriteNotice write={write} />

        <AvatarUploadField uid={uid} name={profile.name ?? 'Account'} avatarPath={profile.avatarUrl} write={write} />

        <Form {...form}>
          <form
            onSubmit={(event) => {
              if (refuseIfOffline(event)) return;
              return form.handleSubmit(onSubmit)(event);
            }}
            noValidate
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="profile-display-name">Name</FormLabel>
                  <FormControl>
                    <Input id="profile-display-name" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="profile-phone-number">Phone number</FormLabel>
                  <FormControl>
                    <Input id="profile-phone-number" type="tel" autoComplete="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={savingDetails} aria-busy={savingDetails} className="self-start" {...write.blocked}>
              {savingDetails ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </Form>

        <div aria-busy={savingCurrency}>
          <CurrencySelector
            id="profile-currency-selector"
            value={preferredCurrency}
            onChange={handleCurrencyChange}
            label="Preferred currency"
            write={write}
          />
        </div>
      </CardContent>
    </Card>
  );
}
