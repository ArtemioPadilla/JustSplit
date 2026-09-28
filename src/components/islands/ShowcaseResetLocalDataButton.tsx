import { ResetLocalDataButton } from '@/components/features/settings/ResetLocalDataButton';
import ErrorBoundary from './ErrorBoundary';

/**
 * /showcase-only wrapper (plan B17b) — same shape as B17a's
 * `ShowcaseExportCsvButton`: `ResetLocalDataButton` itself is fully tested
 * (`ResetLocalDataButton.test.tsx`) and data-source-agnostic, so this file
 * is pure mount-site wiring with no logic of its own to test. Confirming
 * on /showcase actually signs the visitor out and reloads the page — real
 * behavior, not a fictional demo (there is no safe way to fake
 * `resetLocalData()` here without lying about what the button does).
 */
export default function ShowcaseResetLocalDataButton() {
  return (
    <ErrorBoundary name="ShowcaseResetLocalDataButton">
      <ResetLocalDataButton />
    </ErrorBoundary>
  );
}
