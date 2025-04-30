import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { AppProvider } from './context/AppContext';

// Create sample test data for use in tests
export const createTestData = () => {
  return {
    users: [
      { id: 'user1', name: 'Alice', balance: 0, preferredCurrency: 'USD' },
      { id: 'user2', name: 'Bob', balance: 0 },
      { id: 'user3', name: 'Charlie', balance: 0 }
    ],
    expenses: [
      {
        id: 'exp1',
        description: 'Dinner',
        amount: 100,
        currency: 'USD',
        date: '2023-01-01',
        paidBy: 'user1',
        participants: ['user1', 'user2'],
        settled: false
      },
      {
        id: 'exp2',
        description: 'Movie',
        amount: 50,
        currency: 'EUR',
        date: '2023-01-02',
        paidBy: 'user2',
        participants: ['user1', 'user2', 'user3'],
        settled: true,
        eventId: 'event1'
      }
    ],
    events: [
      {
        id: 'event1',
        name: 'Trip to Paris',
        startDate: '2023-01-01',
        endDate: '2023-01-05',
        participants: ['user1', 'user2', 'user3'],
        expenses: ['exp2']
      }
    ],
    settlements: [
      {
        id: 'settlement1',
        fromUser: 'user2',
        toUser: 'user1',
        amount: 25,
        date: '2023-01-03',
        expenseIds: ['exp1']
      }
    ]
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

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override render method
export { render };
