import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AppProvider, useAppContext } from '../AppContext';

// Custom renderHook utility to replace @testing-library/react-hooks
function renderHook(callback, { wrapper: Wrapper } = {}) {
  const result = { current: null };
  
  function TestComponent() {
    result.current = callback();
    return null;
  }
  
  render(
    Wrapper ? <Wrapper><TestComponent /></Wrapper> : <TestComponent />
  );
  
  return { result };
}

describe('AppContext', () => {
  test('initializes with default state when no initialState is provided', () => {
    const TestComponent = () => {
      const { state } = useAppContext();
      return (
        <div>
          <span data-testid="user-count">{state.users.length}</span>
          <span data-testid="expense-count">{state.expenses.length}</span>
          <span data-testid="event-count">{state.events.length}</span>
          <span data-testid="settlement-count">{state.settlements.length}</span>
        </div>
      );
    };

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('user-count').textContent).toBe('0');
    expect(screen.getByTestId('expense-count').textContent).toBe('0');
    expect(screen.getByTestId('event-count').textContent).toBe('0');
    expect(screen.getByTestId('settlement-count').textContent).toBe('0');
  });

  test('initializes with provided initialState', () => {
    const initialState = {
      users: [{ id: 'user1', name: 'Test User', balance: 0 }],
      expenses: [],
      events: [],
      settlements: []
    };

    const TestComponent = () => {
      const { state } = useAppContext();
      return (
        <div>
          <span data-testid="user-name">{state.users[0]?.name}</span>
        </div>
      );
    };

    render(
      <AppProvider initialState={initialState}>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('user-name').textContent).toBe('Test User');
  });

  test('adds a user correctly', () => {
    const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;
    
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    act(() => {
      result.current.dispatch({
        type: 'ADD_USER',
        payload: { name: 'New User', email: 'new@example.com' }
      });
    });
    
    expect(result.current.state.users.length).toBe(1);
    expect(result.current.state.users[0].name).toBe('New User');
  });

  test('adds an expense correctly', () => {
    const initialState = {
      users: [{ id: 'user1', name: 'Test User', balance: 0 }],
      expenses: [],
      events: [],
      settlements: []
    };
    
    const wrapper = ({ children }) => (
      <AppProvider initialState={initialState}>{children}</AppProvider>
    );
    
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    act(() => {
      result.current.dispatch({
        type: 'ADD_EXPENSE',
        payload: {
          description: 'Test Expense',
          amount: 50,
          currency: 'USD',
          date: '2023-05-15',
          paidBy: 'user1',
          participants: ['user1'],
          settled: false
        }
      });
    });
    
    expect(result.current.state.expenses.length).toBe(1);
    expect(result.current.state.expenses[0].description).toBe('Test Expense');
    expect(result.current.state.expenses[0].amount).toBe(50);
  });

  test('adds an event correctly', () => {
    const initialState = {
      users: [{ id: 'user1', name: 'Test User', balance: 0 }],
      expenses: [],
      events: [],
      settlements: []
    };
    
    const wrapper = ({ children }) => (
      <AppProvider initialState={initialState}>{children}</AppProvider>
    );
    
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    act(() => {
      result.current.dispatch({
        type: 'ADD_EVENT',
        payload: {
          name: 'Test Event',
          description: 'Event description',
          startDate: '2023-05-15',
          endDate: '2023-05-16',
          participants: ['user1']
        }
      });
    });
    
    expect(result.current.state.events.length).toBe(1);
    expect(result.current.state.events[0].name).toBe('Test Event');
    expect(result.current.state.events[0].participants).toContain('user1');
  });

  test('adds a settlement correctly', () => {
    const initialState = {
      users: [
        { id: 'user1', name: 'User One', balance: 50 },
        { id: 'user2', name: 'User Two', balance: -50 }
      ],
      expenses: [],
      events: [],
      settlements: []
    };
    
    const wrapper = ({ children }) => (
      <AppProvider initialState={initialState}>{children}</AppProvider>
    );
    
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    act(() => {
      result.current.dispatch({
        type: 'ADD_SETTLEMENT',
        payload: {
          fromUser: 'user2',
          toUser: 'user1',
          amount: 50,
          date: '2023-05-15',
          expenseIds: []
        }
      });
    });
    
    expect(result.current.state.settlements.length).toBe(1);
    expect(result.current.state.settlements[0].amount).toBe(50);
    expect(result.current.state.settlements[0].fromUser).toBe('user2');
  });

  test('updates a user correctly', () => {
    const initialState = {
      users: [{ id: 'user1', name: 'Original Name', email: 'original@example.com', balance: 0 }],
      expenses: [],
      events: [],
      settlements: []
    };
    
    const wrapper = ({ children }) => (
      <AppProvider initialState={initialState}>{children}</AppProvider>
    );
    
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    act(() => {
      result.current.dispatch({
        type: 'UPDATE_USER',
        payload: {
          id: 'user1',
          name: 'Updated Name',
          email: 'updated@example.com'
        }
      });
    });
    
    expect(result.current.state.users[0].name).toBe('Updated Name');
    expect(result.current.state.users[0].email).toBe('updated@example.com');
    expect(result.current.state.users[0].balance).toBe(0); // Unchanged field
  });

  test('throws error when context is used outside of provider', () => {
    // Console error is expected, so we temporarily silence it
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      const { result } = renderHook(() => useAppContext());
      // Just accessing the result should throw
      console.log(result.current);
    }).toThrow('useAppContext must be used within an AppProvider');
    
    // Restore console.error
    console.error = originalError;
  });
});
