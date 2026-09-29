/**
 * The combobox input's classes, in a module with no Base UI import so a
 * lightweight stand-in (`CurrencySelector` while the real combobox is still
 * loading, plan B19) can look identical without pulling the combobox in.
 */
export const comboboxInputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 pr-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const comboboxIconClass = 'absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground';
