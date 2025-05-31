import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import RecentExpenses from '../RecentExpenses';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const LinkComponent = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href} data-testid="next-link">{children}</a>;
  };
  LinkComponent.displayName = 'Link';
  return LinkComponent;
});

// Mock currency conversion functions
jest.mock('../../../utils/currencyExchange', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  convertCurrency: async (amount: number) => {
    // Make sure to return a properly convertedAmount that's different from the original
    // This ensures the component will display the converted amount
    return { convertedAmount: amount * 1.2, isFallback: false };
  },
  getCurrencySymbol: () => '$'
}));

describe('RecentExpenses', () => {
  const mockExpenses = [
    { 
      id: 'exp1', 
      description: 'Dinner', 
      amount: 50.75, 
      currency: 'USD',
      date: '2023-05-10', 
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      settled: false,
      eventId: 'event1',
      notes: 'Birthday dinner',
      createdAt: '2023-05-10T00:00:00.000Z'
    },
    { 
      id: 'exp2', 
      description: 'Groceries', 
      amount: 35.20, 
      currency: 'USD',
      date: '2023-05-08', 
      paidBy: 'user2',
      participants: ['user1', 'user2', 'user3'],
      settled: true,
      eventId: 'event2',
      notes: 'Weekly shopping',
      createdAt: '2023-05-08T00:00:00.000Z'
    }
  ];

  const mockUsers = [
    { id: 'user1', name: 'Alice', balance: 0 },
    { id: 'user2', name: 'Bob', balance: 0 },
    { id: 'user3', name: 'Charlie', balance: 0 }
  ];

  const mockEvents = [
    { 
      id: 'event1', 
      name: 'Dinner Party', 
      date: '2023-05-10',
      startDate: '2023-05-10',
      createdAt: '2023-05-10T00:00:00.000Z',
      createdBy: 'user1',
      members: ['user1', 'user2'],
      expenseIds: ['exp1']
    },
    { 
      id: 'event2', 
      name: 'Europe', 
      date: '2023-05-08',
      startDate: '2023-05-08',
      createdAt: '2023-05-08T00:00:00.000Z',
      createdBy: 'user2',
      members: ['user1', 'user2', 'user3'],
      expenseIds: ['exp2']
    }
  ];

  it('renders recent expenses correctly with data', async () => {
    // Use renderWithAppContext instead of render to provide context
    renderWithAppContext(
      <RecentExpenses />,
      {
        initialState: {
          expenses: mockExpenses,
          users: mockUsers,
          events: mockEvents,
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Recent Expenses')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Converting currencies...')).not.toBeInTheDocument();
    });
    
    // Check if descriptions are displayed
    await waitFor(() => {
      expect(screen.getByText('Dinner')).toBeInTheDocument();
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });
    
    // Check if amounts are displayed (with currency symbol)
    expect(screen.getByText('$50.75')).toBeInTheDocument();
    expect(screen.getByText('$35.20')).toBeInTheDocument();
    
    // Check for user names
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    
    // Test for status indicators
    expect(screen.getByText('Settled')).toBeInTheDocument();
    expect(screen.getByText('Unsettled')).toBeInTheDocument();
    
    // Check if "View all expenses" link is displayed
    const viewAllLink = screen.getByText('View all expenses');
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.closest('a')!).toHaveAttribute('href', '/expenses');
  });

  it('handles empty data correctly', async () => {
    renderWithAppContext(
      <RecentExpenses />,
      {
        initialState: {
          expenses: [],
          users: mockUsers,
          events: mockEvents,
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Recent Expenses')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Converting currencies...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
    
    // View all link should still be present
    expect(screen.getByText('View all expenses')).toBeInTheDocument();
  });

  it('links to individual expense details pages', async () => {
    renderWithAppContext(
      <RecentExpenses />,
      {
        initialState: {
          expenses: mockExpenses,
          users: mockUsers,
          events: mockEvents,
          settlements: []
        }
      }
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Converting currencies...')).not.toBeInTheDocument();
    });
    
    const links = screen.getAllByTestId('next-link');
    // Check if there's a link to the individual expense page
    const expenseLinks = links.filter(link => link.getAttribute('href').startsWith('/expenses/'));
    expect(expenseLinks.length).toBeGreaterThan(0);
  });

  it('renders table headers and rows correctly', async () => {
    renderWithAppContext(
      <RecentExpenses />,
      {
        initialState: {
          expenses: mockExpenses,
          users: mockUsers,
          events: mockEvents,
          settlements: []
        }
      }
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Converting currencies...')).not.toBeInTheDocument();
    });
    
    // Table headers
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Paid By')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    
    // Data rows - check for content we know exists
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows Settled and Unsettled status badges', async () => {
    renderWithAppContext(
      <RecentExpenses />,
      {
        initialState: {
          expenses: mockExpenses,
          users: mockUsers,
          events: mockEvents,
          settlements: []
        }
      }
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Converting currencies...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Settled')).toBeInTheDocument();
    expect(screen.getByText('Unsettled')).toBeInTheDocument();
  });

  it('shows converted amount if currency differs and conversion is enabled', async () => {
    console.log('Starting test: shows converted amount if currency differs and conversion is enabled');
    
    // Create a specific test expense with European currency
    const euroExpense = {
      ...mockExpenses[0],
      currency: 'EUR'
    };
    
    console.log('Test expense:', euroExpense);
    
    // Rendering component with test data
    renderWithAppContext(
      <RecentExpenses />,
      {
        initialState: {
          expenses: [euroExpense, ...mockExpenses.slice(1)],
          users: mockUsers,
          events: mockEvents,
          settlements: []
        },
        preferredCurrency: 'USD',
        isConvertingCurrencies: true
      }
    );
    
    console.log('Component rendered');
    
    // Wait for loading to complete
    await waitFor(() => {
      const loadingElement = screen.queryByText('Converting currencies...');
      console.log('Loading element present:', !!loadingElement);
      expect(loadingElement).not.toBeInTheDocument();
    });
    
    console.log('Loading complete');
    
    // Debug: log all text content in the document
    console.log('Document text content:', document.body.textContent);
    
    // Debug: Check for specific element with data-testid
    const convertedElement = screen.queryByTestId('converted-amount');
    console.log('Converted element:', convertedElement);
    
    // Wait for conversion to finish
    await waitFor(() => {
      const convertedElement = screen.queryByTestId('converted-amount');
      console.log('Converted element after wait:', convertedElement);
      expect(convertedElement).toBeInTheDocument();
    });
  });

  it('shows participant count and event name', async () => {
    renderWithAppContext(
      <RecentExpenses />,
      {
        initialState: {
          expenses: mockExpenses,
          users: mockUsers,
          events: mockEvents,
          settlements: []
        }
      }
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Converting currencies...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
    expect(screen.getByText('Dinner Party')).toBeInTheDocument();
    expect(screen.getByText('Europe')).toBeInTheDocument();
  });

  it('shows "No expenses yet" if empty', async () => {
    renderWithAppContext(
      <RecentExpenses />,
      {
        initialState: {
          expenses: [],
          users: mockUsers,
          events: mockEvents,
          settlements: []
        }
      }
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Converting currencies...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
  });
});
