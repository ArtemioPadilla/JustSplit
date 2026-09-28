import { describe, expect, it } from 'vitest';
import source from './date-picker.tsx?raw';

describe('date-picker', () => {
  it('exports DatePicker and DateRangePicker', () => {
    expect(source).toMatch(/export\s+\{[^}]*\bDatePicker\b/);
    expect(source).toMatch(/export\s+\{[^}]*\bDateRangePicker\b/);
  });

  it('composes Popover + Calendar (no new root primitive)', () => {
    expect(source).toMatch(/from ['"]@\/components\/ui\/popover['"]/);
    expect(source).toMatch(/from ['"]@\/components\/ui\/calendar['"]/);
  });

  it('DateRangePicker uses react-day-picker range mode', () => {
    expect(source).toMatch(/mode="range"/);
  });

  it('DatePicker uses single mode', () => {
    expect(source).toMatch(/mode="single"/);
  });

  it('supports controlled + uncontrolled value via onValueChange', () => {
    expect(source).toMatch(/onValueChange/);
  });

  it('does not import from @radix-ui', () => {
    expect(source).not.toMatch(/from .{1,2}@radix/);
  });
});
