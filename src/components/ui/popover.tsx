import * as React from 'react';
import { Popover as BasePopover } from '@base-ui-components/react/popover';

import { cn } from '@/lib/utils';

// Popover built on Base UI's Popover primitive (NOT Radix).
const Popover = BasePopover.Root;
const PopoverTrigger = BasePopover.Trigger;
const PopoverClose = BasePopover.Close;

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof BasePopover.Popup>,
  React.ComponentPropsWithoutRef<typeof BasePopover.Popup> & { sideOffset?: number; align?: 'start' | 'center' | 'end' }
>(({ className, sideOffset = 8, align = 'center', children, ...props }, ref) => (
  <BasePopover.Portal>
    <BasePopover.Positioner sideOffset={sideOffset} align={align} className="z-50">
      <BasePopover.Popup
        ref={ref}
        className={cn(
          'w-72 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none',
          'origin-[var(--transform-origin)] transition-[transform,opacity] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[starting-style]:scale-95',
          className,
        )}
        {...props}
      >
        {children}
      </BasePopover.Popup>
    </BasePopover.Positioner>
  </BasePopover.Portal>
));
PopoverContent.displayName = 'PopoverContent';

const PopoverTitle = React.forwardRef<
  React.ComponentRef<typeof BasePopover.Title>,
  React.ComponentPropsWithoutRef<typeof BasePopover.Title>
>(({ className, ...props }, ref) => (
  <BasePopover.Title ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
));
PopoverTitle.displayName = 'PopoverTitle';

const PopoverDescription = React.forwardRef<
  React.ComponentRef<typeof BasePopover.Description>,
  React.ComponentPropsWithoutRef<typeof BasePopover.Description>
>(({ className, ...props }, ref) => (
  <BasePopover.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
PopoverDescription.displayName = 'PopoverDescription';

export {
  Popover,
  PopoverTrigger,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
};
