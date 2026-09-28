import * as React from 'react';
import { Editable } from '@/components/ui/editable';
import ErrorBoundary from './ErrorBoundary';

/**
 * /showcase-only wrapper: demonstrates a controlled `Editable` (the shared
 * inline-rename widget, plan B16 — replaces the legacy `EditableText` in
 * expense/event/group detail) with the current committed value shown below
 * it, so Enter/Escape/blur/empty-rejection are all observable without
 * opening devtools.
 */
export default function ShowcaseEditable() {
  return (
    <ErrorBoundary name="ShowcaseEditable">
      <ShowcaseEditableInner />
    </ErrorBoundary>
  );
}

function ShowcaseEditableInner() {
  const [value, setValue] = React.useState('Weekend trip to Tulum');

  return (
    <div className="flex flex-col gap-2">
      <Editable defaultValue={value} onValueCommit={setValue} />
      <p className="text-xs text-muted-foreground">
        Committed value: <span className="font-mono">{value}</span>
      </p>
    </div>
  );
}
