import * as React from 'react';
import { CheckIcon, PencilIcon, XIcon } from 'lucide-react';
import * as editable from '@zag-js/editable';
import { normalizeProps, useMachine } from '@zag-js/react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Editable — inline click-to-edit text (ROADMAP Epic 21). Base UI ships no
// editable primitive, so per ADR 0009 this depends directly on the
// `@zag-js/editable` state machine (not the full `@ark-ui/react` wrapper),
// wrapped in the same shadcn-style pattern as every other src/components/ui
// file. The machine already owns focus/blur/Enter/Escape handling per the
// WAI-ARIA editable pattern, so this wrapper is pure styling + prop mapping.
export interface EditableProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onValueCommit?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** @default 'click' — clicking the preview text (or the edit button) enters edit mode. */
  activationMode?: 'focus' | 'dblclick' | 'click' | 'none';
}

function Editable({
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  placeholder = 'Click to edit…',
  disabled,
  className,
  activationMode = 'click',
}: EditableProps) {
  const id = React.useId();
  const service = useMachine(editable.machine, {
    id,
    value,
    defaultValue,
    disabled,
    placeholder,
    activationMode,
    onValueChange: (details) => onValueChange?.(details.value),
    onValueCommit: (details) => onValueCommit?.(details.value),
  });
  const api = editable.connect(service, normalizeProps);

  return (
    <div {...api.getRootProps()} className={cn('inline-flex items-center gap-1', className)}>
      <div {...api.getAreaProps()} className="relative inline-flex">
        <input
          {...api.getInputProps()}
          className={cn(
            'h-8 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
        />
        <span
          {...api.getPreviewProps()}
          className={cn(
            'inline-flex h-8 items-center rounded-md px-2 py-1 text-sm text-foreground',
            !api.empty && 'hover:bg-accent',
            api.empty && 'text-muted-foreground',
            activationMode !== 'none' && 'cursor-text',
          )}
        >
          {api.valueText}
        </span>
      </div>
      <div {...api.getControlProps()} className="flex items-center gap-0.5">
        {!api.editing ? (
          <Button
            {...api.getEditTriggerProps()}
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Edit"
          >
            <PencilIcon className="size-3.5" />
          </Button>
        ) : (
          <>
            <Button
              {...api.getSubmitTriggerProps()}
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Save"
            >
              <CheckIcon className="size-3.5" />
            </Button>
            <Button
              {...api.getCancelTriggerProps()}
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Cancel"
            >
              <XIcon className="size-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
Editable.displayName = 'Editable';

export { Editable };
