import * as React from 'react';
import { Avatar as BaseAvatar } from '@base-ui-components/react/avatar';

import { cn } from '@/lib/utils';

// Avatar built on Base UI's Avatar primitive (NOT Radix).
const Avatar = React.forwardRef<
  React.ComponentRef<typeof BaseAvatar.Root>,
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Root>
>(({ className, ...props }, ref) => (
  <BaseAvatar.Root
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium',
      className,
    )}
    {...props}
  />
));
Avatar.displayName = 'Avatar';

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof BaseAvatar.Image>,
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Image>
>(({ className, ...props }, ref) => (
  <BaseAvatar.Image ref={ref} className={cn('h-full w-full object-cover', className)} {...props} />
));
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof BaseAvatar.Fallback>,
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Fallback>
>(({ className, ...props }, ref) => (
  <BaseAvatar.Fallback
    ref={ref}
    className={cn('flex h-full w-full items-center justify-center text-muted-foreground', className)}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
