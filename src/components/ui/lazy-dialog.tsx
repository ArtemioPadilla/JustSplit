import * as React from 'react';

/**
 * Load-on-first-use for a dialog (plan B19b), the same stand-in pattern B19 used
 * for the date picker. A dialog is a Base UI dialog plus its popup stack
 * (floating-ui, focus manager, backdrop): ~25 kB gz that a page carries even when
 * nobody opens it. So the page renders a plain `<button>` that reads and looks like
 * the real trigger (same accessible name, same classes, `aria-haspopup="dialog"`,
 * `aria-expanded="false"`) and loads the real component on demand:
 *
 *  - hover, focus and touch WARM the chunk (`load()`), so it is usually there
 *    before the click lands;
 *  - the click asks for the real component, which mounts already open
 *    (`defaultOpen`), so the click is not lost; while it loads the same button
 *    stays, `aria-busy`;
 *  - the real component owns its own trigger from then on, so focus goes back to a
 *    real trigger when the dialog closes.
 *
 * The shell file passes its own `React.lazy` component and loader; it must never
 * import the dialog stack statically (`src/tests/lazy-boundaries.test.ts`).
 */
export type LazyDialogImpl<P extends object> = React.LazyExoticComponent<React.ComponentType<P & { defaultOpen?: boolean }>>;

export interface LazyDialogProps<P extends object> {
  /** `React.lazy` of the real, self-contained dialog (trigger + content). */
  impl: LazyDialogImpl<P>;
  /** The loader behind `impl`; hover/focus/touch call it to warm the chunk. Import is cached, so repeats are free. */
  load: () => Promise<unknown>;
  /** Props for the real component; it also receives `defaultOpen`. */
  implProps: P;
  /** Name, look and state of the stand-in: `className`, `aria-label`, `disabled`, `id`, ... */
  triggerProps?: Omit<React.ComponentPropsWithoutRef<'button'>, 'type' | 'children'>;
  /** The trigger's visible label. */
  children: React.ReactNode;
}

export function LazyDialog<P extends object>({ impl: Impl, load, implProps, triggerProps, children }: LazyDialogProps<P>) {
  // Set by the first click: from then on the real dialog mounts already open.
  const [requested, setRequested] = React.useState(false);
  // A blocked stand-in (`aria-disabled`, e.g. a write while offline, plan B19c) stays focusable so its
  // reason can be read, but never asks for the dialog and never warms it: a chunk fetch that fails
  // offline could otherwise be remembered as failed for the rest of the page's life.
  const blocked = triggerProps?.['aria-disabled'] === true || triggerProps?.['aria-disabled'] === 'true';
  // Warming is best effort: a failed load surfaces through the real mount, not from a hover.
  const warm = () => {
    if (!blocked) void load().catch(() => {});
  };

  const standIn = (busy: boolean) => (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded="false"
      {...triggerProps}
      aria-busy={busy || undefined}
      onClick={(event) => {
        if (blocked) {
          event.preventDefault();
          return;
        }
        triggerProps?.onClick?.(event);
        setRequested(true);
      }}
      onPointerEnter={(event) => {
        warm();
        triggerProps?.onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        warm();
        triggerProps?.onFocus?.(event);
      }}
      onTouchStart={(event) => {
        warm();
        triggerProps?.onTouchStart?.(event);
      }}
    >
      {children}
    </button>
  );

  if (!requested) return standIn(false);
  return (
    <React.Suspense fallback={standIn(true)}>
      <Impl {...implProps} defaultOpen />
    </React.Suspense>
  );
}
