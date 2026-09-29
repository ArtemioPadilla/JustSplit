import { describe, expect, it } from 'vitest';
import shell from './date-picker.tsx?raw';
import source from './date-picker-impl.tsx?raw';

describe('date-picker', () => {
  // Plan B19: date-picker.tsx is the light shell (a plain trigger button); the Popover,
  // the Calendar and react-day-picker live in date-picker-impl.tsx, loaded on first use.
  it('exports DatePicker and DateRangePicker from the light shell, which loads the impl on demand', () => {
    expect(shell).toMatch(/export\s+\{[^}]*\bDatePicker\b/);
    expect(shell).toMatch(/export\s+\{[^}]*\bDateRangePicker\b/);
    expect(shell).toMatch(/import\(\s*['"]@\/components\/ui\/date-picker-impl['"]\s*\)/);
  });

  it('the impl exports the real DatePicker and DateRangePicker', () => {
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
