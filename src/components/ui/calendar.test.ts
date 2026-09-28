import { describe, expect, it } from 'vitest';
import source from './calendar.tsx?raw';

describe('calendar', () => {
  it('exports Calendar', () => {
    expect(source).toMatch(/export\s+\{[^}]*\bCalendar\b/);
  });

  it('uses cn from @/lib/utils', () => {
    expect(source).toMatch(/from ['"]@\/lib\/utils['"]/);
  });

  it('is built on react-day-picker', () => {
    expect(source).toMatch(/from ['"]react-day-picker['"]/);
  });

  it('does not import the default react-day-picker stylesheet (styled via classNames instead)', () => {
    expect(source).not.toMatch(/^\s*import\s+['"]react-day-picker\/(dist\/)?style\.css['"]/m);
  });

  it('does not import from @radix-ui', () => {
    expect(source).not.toMatch(/from .{1,2}@radix/);
  });

  it('maps classNames to Inceptor semantic tokens, not literal palette classes', () => {
    expect(source).toMatch(/bg-primary/);
    expect(source).toMatch(/text-primary-foreground/);
  });
});
