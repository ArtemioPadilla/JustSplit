import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { AppProvider } from './context/AppContext';

// Create sample test data for use in tests
export const createTestData = () => {
  return {
    users: [
      { id: 'user1', name: 'Test User', email: 'test@example.com', balance: 0, preferredCurrency: 'USD' }
    ],
    expenses: [],
    events: [],
    settlements: []
  };
};

// Create a custom render function that includes the AppProvider
function render(
  ui: React.ReactElement,
  { 
    initialState = createTestData(),
    ...renderOptions 
  }: RenderOptions & { initialState?: any } = {}
) {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <AppProvider initialState={initialState}>{children}</AppProvider>;
  };
  
  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// Custom render that includes the AppProvider
export function renderWithAppContext(
  ui: React.ReactElement,
  { 
    initialState = createTestData(),
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

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override render method
export { render };
