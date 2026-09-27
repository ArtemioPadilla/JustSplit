import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui-components/react/dialog';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Sheet — a side-anchored dialog (drawer) built on Base UI's Dialog primitive.
// Useful for mobile navigation and side panels.
const Sheet = BaseDialog.Root;
const SheetTrigger = BaseDialog.Trigger;
const SheetClose = BaseDialog.Close;

const sheetVariants = cva(
  'fixed z-50 flex flex-col gap-4 bg-background p-6 shadow-lg transition-[transform,opacity]',
  {
    variants: {
      side: {
        right:
          'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full',
        left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full',
        top: 'inset-x-0 top-0 border-b data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full',
        bottom:
          'inset-x-0 bottom-0 border-t data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full',
      },
    },
    defaultVariants: { side: 'right' },
  },
);

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof BaseDialog.Popup>,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Popup> & VariantProps<typeof sheetVariants>
>(({ className, side = 'right', children, ...props }, ref) => (
  <BaseDialog.Portal>
    <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/80 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
    <BaseDialog.Popup ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
      {children}
    </BaseDialog.Popup>
  </BaseDialog.Portal>
));
SheetContent.displayName = 'SheetContent';

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof BaseDialog.Title>,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Title>
>(({ className, ...props }, ref) => (
  <BaseDialog.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
));
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof BaseDialog.Description>,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Description>
>(({ className, ...props }, ref) => (
  <BaseDialog.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
