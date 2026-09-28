import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { formatFieldValue, type FieldType, type StatusTone } from '@/lib/field-type';
import { cn } from '@/lib/utils';

// Tone -> Tailwind classes. Mirrors ShowcaseDataTable's STATUS_STYLES map
// (src/components/islands/ShowcaseDataTable.tsx) so a 'status' fieldType
// look identical to that hand-rolled example, just derived from data instead
// of a per-consumer switch statement.
const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  success: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  warning: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  danger: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  info: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  neutral: 'border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export interface FieldDisplayProps {
  fieldType: FieldType;
  value: unknown;
  className?: string;
}

/**
 * (a) Read/display renderer (ROADMAP Epic 24) — the shared surface both
 * `DataTable` cells (`meta.fieldType`, see data-table.tsx) and
 * `<DescriptionItem fieldType value />` (description-list.tsx) call into.
 * `status` fieldTypes render as a colored `<Badge>`; every other fieldType
 * renders the pure `formatFieldValue` string.
 */
export function FieldDisplay({ fieldType, value, className }: FieldDisplayProps) {
  if (fieldType.type === 'status') {
    const opt = fieldType.statuses.find((s) => s.value === String(value));
    const tone = opt?.tone ?? 'neutral';
    return (
      <Badge variant="outline" className={cn(STATUS_TONE_CLASS[tone], className)}>
        {opt?.label ?? (value == null || value === '' ? '—' : String(value))}
      </Badge>
    );
  }

  return <span className={className}>{formatFieldValue(fieldType, value)}</span>;
}
