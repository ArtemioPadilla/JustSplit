import * as React from 'react';
import { NumberField as BaseNumberField } from '@base-ui-components/react/number-field';
import { MinusIcon, PlusIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// Number field built on Base UI's NumberField primitive (NOT Radix). Stepper
// input with increment/decrement + scrub support.
//
// `id` is passed to `Root` ONLY, never re-passed to `Input` — Root already
// forwards it to the real `<input>` correctly on its own, via its internal
// `NumberFieldRootContext` (the same `id` value `Decrement`/`Increment` read
// for their `aria-controls`, per `node_modules/@base-ui-components/react/
// number-field/{root,input}/*.js`). Explicitly re-setting `id` on `Input`
// was tried first and made things worse: `Input`'s own resolved `id` (used
// for `aria-controls`, computed inside Root's `useLabelableId` /
// `useLabelableContext` machinery) can genuinely diverge from a plain
// `id ?? React.useId()` value computed independently in THIS wrapper — the
// two are not guaranteed to agree, and overriding only `Input`'s attribute
// (not the buttons' `aria-controls`, which is Base UI's own internal
// resolution) produced a real, adversarially-verified axe-core
// "aria-valid-attr-value" critical failure on /gallery/'s `ShowcaseFieldType`
// demo (a money-typed field going through `FormControl`'s cloneElement,
// field-type/form-item.tsx). Leaving `id` alone on `Input` and letting Base
// UI's own context propagation handle it end-to-end is what actually keeps
// `Root`, `Input`, and the buttons' `aria-controls` consistent.
//
// `aria-describedby`/`aria-invalid`/`aria-label`/`aria-labelledby` are a
// different story — `Root` does NOT forward any of these to `Input` (only
// `id`), so they're pulled out and applied explicitly to `Input` here. A
// caller naming a standalone NumberField directly (no surrounding
// `<FormLabel>` — the documented pattern, see ShowcaseAdvanced.tsx /
// gallery-recipes.ts) via `aria-label` needs it to land on the real input,
// or the input has no accessible name at all (the other axe-core failure
// this file's history includes: "aria-input-field-name", critical).
// `aria-invalid` is computed purely from what's passed in — this standalone
// usage sits outside Base UI's own `<Field.Root>`, so Base UI's internal
// Field-validity state is never wired up and would always read `undefined`
// on its own.
const NumberField = React.forwardRef<
  React.ComponentRef<typeof BaseNumberField.Root>,
  React.ComponentPropsWithoutRef<typeof BaseNumberField.Root>
>(
  (
    {
      className,
      id,
      'aria-describedby': ariaDescribedby,
      'aria-invalid': ariaInvalid,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      ...props
    },
    ref,
  ) => (
    <BaseNumberField.Root ref={ref} id={id} className={cn('inline-flex', className)} {...props}>
      <BaseNumberField.Group className="inline-flex h-10 items-center rounded-md border border-input bg-background">
        <BaseNumberField.Decrement className="grid h-full w-9 place-items-center rounded-l-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50">
          <MinusIcon className="h-4 w-4" />
        </BaseNumberField.Decrement>
        <BaseNumberField.Input
          aria-describedby={ariaDescribedby}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          className="h-full w-16 border-x border-input bg-transparent text-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <BaseNumberField.Increment className="grid h-full w-9 place-items-center rounded-r-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50">
          <PlusIcon className="h-4 w-4" />
        </BaseNumberField.Increment>
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  ),
);
NumberField.displayName = 'NumberField';

export { NumberField };
