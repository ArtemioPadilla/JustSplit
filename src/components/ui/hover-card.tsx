import * as React from 'react';
import { PreviewCard as BasePreviewCard } from '@base-ui-components/react/preview-card';

import { cn } from '@/lib/utils';

// Hover card built on Base UI's PreviewCard primitive (NOT Radix). Shows rich
// content on hover/focus — link previews, user cards, etc.
const HoverCard = BasePreviewCard.Root;
const HoverCardTrigger = BasePreviewCard.Trigger;

const HoverCardContent = React.forwardRef<
  React.ComponentRef<typeof BasePreviewCard.Popup>,
  React.ComponentPropsWithoutRef<typeof BasePreviewCard.Popup> & { sideOffset?: number }
>(({ className, sideOffset = 8, children, ...props }, ref) => (
  <BasePreviewCard.Portal>
    <BasePreviewCard.Positioner sideOffset={sideOffset} className="z-50">
      <BasePreviewCard.Popup
        ref={ref}
        className={cn(
          'w-64 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none',
          'origin-[var(--transform-origin)] transition-[transform,opacity] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[starting-style]:scale-95',
          className,
        )}
        {...props}
      >
        {children}
      </BasePreviewCard.Popup>
    </BasePreviewCard.Positioner>
  </BasePreviewCard.Portal>
));
HoverCardContent.displayName = 'HoverCardContent';

export { HoverCard, HoverCardTrigger, HoverCardContent };
