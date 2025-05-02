import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';

// Default test data that can be used across tests
export const defaultTestData = {
  users: [
    { id: 'user1', name: 'Test User', email: 'test@example.com', balance: 0, preferredCurrency: 'USD' }
  ],
  expenses: [],
  events: [],
  settlements: []
};

// Custom render that includes the AppProvider
export function renderWithAppContext(
  ui: React.ReactElement,
  { 
    initialState = defaultTestData,
    ...renderOptions 
  }: RenderOptions & { 
    initialState?: any 
  } = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <AppProvider initialState={initialState}>{children}</AppProvider>;
  }
  
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
