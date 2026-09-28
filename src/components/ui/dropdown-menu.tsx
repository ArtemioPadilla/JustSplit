import * as React from 'react';
import { Menu } from '@base-ui-components/react/menu';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// Dropdown menu built on Base UI's Menu primitive instead of the Radix UI dropdown-menu package.
// Exposes a shadcn-compatible API.

// Direct Base UI re-exports — no .displayName assignments.
// Base UI types don't carry that property (TS2339); DevTools already shows the component name.
const DropdownMenu = Menu.Root;

const DropdownMenuTrigger = Menu.Trigger;

const DropdownMenuGroup = Menu.Group;

const DropdownMenuPortal = Menu.Portal;

const DropdownMenuSub = Menu.SubmenuRoot;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ComponentRef<typeof Menu.SubmenuTrigger>,
  React.ComponentPropsWithoutRef<typeof Menu.SubmenuTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <Menu.SubmenuTrigger
    ref={ref}
    className={cn(
      'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
      'focus:bg-accent data-[open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      inset && 'pl-8',
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRightIcon className="ml-auto" />
  </Menu.SubmenuTrigger>
));
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

const DropdownMenuSubContent = React.forwardRef<
  React.ComponentRef<typeof Menu.Popup>,
  React.ComponentPropsWithoutRef<typeof Menu.Popup> & {
    positionerProps?: React.ComponentPropsWithoutRef<typeof Menu.Positioner>;
  }
>(({ className, positionerProps, ...props }, ref) => (
  <Menu.Portal>
    <Menu.Positioner side="right" align="start" {...positionerProps}>
      <Menu.Popup
        ref={ref}
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
          'data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity',
          className,
        )}
        {...props}
      />
    </Menu.Positioner>
  </Menu.Portal>
));
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

// DropdownMenuContent wraps the positioner + popup for the top-level menu.
// `align` and `side` are forwarded to Menu.Positioner so callers can control
// placement (e.g. data-table's column-visibility dropdown uses align="end").
type DropdownMenuContentProps = React.ComponentPropsWithoutRef<typeof Menu.Popup> & {
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left' | 'inline-end' | 'inline-start';
};

const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof Menu.Popup>,
  DropdownMenuContentProps
>(({ className, sideOffset = 4, align, side, ...props }, ref) => (
  <Menu.Portal>
    <Menu.Positioner sideOffset={sideOffset} align={align} side={side}>
      <Menu.Popup
        ref={ref}
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
          'data-[ending-style]:opacity-0 data-[ending-style]:scale-95',
          'data-[starting-style]:opacity-0 data-[starting-style]:scale-95',
          'transition-[opacity,transform]',
          className,
        )}
        {...props}
      />
    </Menu.Positioner>
  </Menu.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof Menu.Item>,
  React.ComponentPropsWithoutRef<typeof Menu.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <Menu.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
      'transition-colors focus:bg-accent focus:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof Menu.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof Menu.CheckboxItem>
>(({ className, children, ...props }, ref) => (
  <Menu.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
      'transition-colors focus:bg-accent focus:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Menu.CheckboxItemIndicator>
        <CheckIcon className="h-4 w-4" />
      </Menu.CheckboxItemIndicator>
    </span>
    {children}
  </Menu.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

const DropdownMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof Menu.RadioItem>,
  React.ComponentPropsWithoutRef<typeof Menu.RadioItem>
>(({ className, children, ...props }, ref) => (
  <Menu.RadioItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
      'transition-colors focus:bg-accent focus:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Menu.RadioItemIndicator>
        <CircleIcon className="h-2 w-2 fill-current" />
      </Menu.RadioItemIndicator>
    </span>
    {children}
  </Menu.RadioItem>
));
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-sm font-semibold',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

const DropdownMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof Menu.Separator>,
  React.ComponentPropsWithoutRef<typeof Menu.Separator>
>(({ className, ...props }, ref) => (
  <Menu.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

const DropdownMenuRadioGroup = Menu.RadioGroup;

function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  );
}
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
