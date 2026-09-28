import { describe, expect, it } from 'vitest';
import source from './tabs.tsx?raw';

describe('tabs', () => {
  it('exports Tabs', () => {
    expect(source).toMatch(/export\s+\{[^}]*\bTabs\b/);
  });
  it('exports TabsList', () => {
    expect(source).toMatch(/export\s+\{[^}]*\bTabsList\b/);
  });
  it('exports TabsTrigger', () => {
    expect(source).toMatch(/export\s+\{[^}]*\bTabsTrigger\b/);
  });
  it('exports TabsContent', () => {
    expect(source).toMatch(/export\s+\{[^}]*\bTabsContent\b/);
  });
  it('imports from @base-ui-components/react/tabs', () => {
    expect(source).toMatch(/from ['"]@base-ui-components\/react\/tabs['"]/);
  });
  it('does not import from radix-ui', () => {
    expect(source).not.toMatch(/from .{1,2}@radix/);
  });
});
