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
  // Base UI 1.0.0-rc.0 marks the selected tab `data-active` (there is no `data-selected`), so a
  // `data-[selected]:` variant never matched and the current tab looked like every other (found on /settlements, B14b).
  it('styles the selected tab through the attribute Base UI actually sets (data-active)', () => {
    expect(source).toMatch(/data-\[active\]:bg-background/);
    expect(source).toMatch(/data-\[active\]:text-foreground/);
    expect(source).not.toMatch(/data-\[selected\]/);
    expect(source).not.toMatch(/not-data-\[selected\]/);
  });
});
