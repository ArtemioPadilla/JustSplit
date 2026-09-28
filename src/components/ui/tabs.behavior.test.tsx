// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

function Fixture() {
  return (
    <Tabs defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account panel</TabsContent>
      <TabsContent value="password">Password panel</TabsContent>
    </Tabs>
  );
}

describe('Tabs (behavior)', () => {
  it('shows the default panel and not the others', () => {
    render(<Fixture />);
    expect(screen.getByText('Account panel')).toBeVisible();
    // Base UI unmounts inactive tab panels by default (no keepMounted).
    expect(screen.queryByText('Password panel')).toBeNull();
  });

  it('marks the default trigger as selected', () => {
    render(<Fixture />);
    const account = screen.getByRole('tab', { name: 'Account' });
    expect(account).toHaveAttribute('aria-selected', 'true');
  });

  it('switches the visible panel when another trigger is clicked', () => {
    render(<Fixture />);
    fireEvent.click(screen.getByRole('tab', { name: 'Password' }));
    expect(screen.getByText('Password panel')).toBeVisible();
    expect(screen.queryByText('Account panel')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Password' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
