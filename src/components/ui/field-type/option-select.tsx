import * as React from 'react';

export interface OptionSelectItem {
  value: string;
  label: string;
}

export interface OptionSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  items: OptionSelectItem[];
  /** Rendered as the first, empty-value `<option>`. Omit to skip it entirely. */
  placeholder?: string;
  /**
   * form-item.tsx's placeholder option is `disabled` (react-hook-form's
   * Controller value must resolve to a real option, so the empty option only
   * exists to render *something* before the user picks); filter-control.tsx's
   * is a selectable option that clears the filter value entirely. Defaults
   * to selectable (`false`) — the filter-context convention is more common
   * across the 5 call sites (3 of 5).
   */
  placeholderDisabled?: boolean;
}

/**
 * Shared `<select>` + `<option>` rendering for fieldType-driven select-like
 * widgets — `select`/`status`/`boolean` in filter-control.tsx
 * (`FieldFilterControl`) and `select`/`status` in form-item.tsx
 * (`FieldEditControl`) were 5 near-identical copies differing only in the
 * option source (`fieldType.options` / `fieldType.statuses` / a synthesized
 * true/false pair) and whether the placeholder option is selectable. Every
 * other `<select>` prop — `onChange`, `onBlur`, `onKeyDown`, `name`, `value`,
 * `disabled`, the a11y id/aria-* trio, `className` — is owned by the call
 * site and passed straight through via the rest of `selectProps`, so the
 * filter variant's `onKeyDown` and the form variant's `onBlur`/`name` stay
 * exactly as wired before this extraction (a refactor, not a behavior
 * change — see the 5 call sites' own regression tests).
 */
export function OptionSelect({
  items,
  placeholder,
  placeholderDisabled = false,
  ...selectProps
}: OptionSelectProps) {
  return (
    <select {...selectProps}>
      {placeholder !== undefined && (
        <option value="" disabled={placeholderDisabled}>
          {placeholder}
        </option>
      )}
      {items.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
