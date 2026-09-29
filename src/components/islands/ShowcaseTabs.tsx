import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ErrorBoundary from './ErrorBoundary';

/**
 * /showcase-only wrapper for `Tabs` (plan A7). Tabs, TabsList, TabsTrigger and
 * TabsContent share state, so the whole composition lives in this one file and
 * is hydrated as ONE island (CLAUDE.md, "the compound-component gotcha"):
 * `<ShowcaseTabs client:visible />`, never one `client:*` per part.
 *
 * It exists to make the selected state visible: Base UI 1.0.0-rc.0 marks the
 * current tab `data-active` (there is no `data-selected`), and the trigger
 * styles key off it — a raised, foreground-coloured pill against the muted
 * list — which B14 fixed after /settlements shipped with every tab looking
 * the same. Click a tab, or focus one and use the arrow keys.
 */
export default function ShowcaseTabs() {
  return (
    <ErrorBoundary name="ShowcaseTabs">
      <Tabs defaultValue="pending">
        <TabsList aria-label="Demo tabs">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="pt-3 text-sm text-foreground">
          Pending panel: the suggested payments would be listed here.
        </TabsContent>
        <TabsContent value="balances" className="pt-3 text-sm text-foreground">
          Balances panel: who owes whom, per person.
        </TabsContent>
        <TabsContent value="history" className="pt-3 text-sm text-foreground">
          History panel: every payment on the ledger, newest first.
        </TabsContent>
      </Tabs>
    </ErrorBoundary>
  );
}
