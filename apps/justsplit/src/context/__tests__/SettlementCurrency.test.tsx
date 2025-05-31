import React from 'react';
import { render, act } from '@testing-library/react';
import { AppProvider, useAppContext, AppState } from '../AppContext';
import { AuthContext, AuthContextType } from '../AuthContext';
import { User } from '../../types';

// Custom renderHook utility
function renderHook<TResult>(
  callback: () => TResult,
  options?: { wrapper?: React.ComponentType<{children: React.ReactNode, initialAppState?: Partial<AppState>}>, initialAppState?: Partial<AppState> }
) {
  const result: { current: TResult | null } = { current: null };

  function TestComponent() {
    result.current = callback();
    return null;
  }

  if (options?.wrapper) {
    const Wrapper = options.wrapper;
    render(<Wrapper initialAppState={options.initialAppState}><TestComponent /></Wrapper>);
  } else {
    render(<TestComponent />);
  }
  
  return { result };
}

// Consistent mock auth value
const mockAuthContextValue: AuthContextType = {
  currentUser: { uid: 'test-user-settlement' } as import('firebase/auth').User,
  userProfile: { id: 'test-user-settlement', name: 'Settlement Test User', email: 'settlement@example.com', balance: 0 } as User,
  isLoading: false,
  signIn: jest.fn().mockResolvedValue(undefined),
  signUp: jest.fn().mockResolvedValue(undefined),
  signOut: jest.fn().mockResolvedValue(undefined),
  signInWithProvider: jest.fn().mockResolvedValue(undefined),
  linkAccount: jest.fn().mockResolvedValue(undefined),
  resetPassword: jest.fn().mockResolvedValue(undefined),
  updateProfile: jest.fn().mockResolvedValue(undefined),
  handleDatabaseRecovery: jest.fn().mockResolvedValue(undefined),
  hasDatabaseCorruption: false,
};

// Wrapper that provides both context providers
const AllProvidersWrapper: React.FC<{ children: React.ReactNode, initialAppState?: Partial<AppState> }> = ({ children, initialAppState }) => {
  return (
    <AuthContext.Provider value={mockAuthContextValue}>
      <AppProvider initialState={initialAppState}>
        {children}
      </AppProvider>
    </AuthContext.Provider>
  );
};

describe('Settlement Currency Functionality', () => {
  test('settlement includes currency when created', () => {
    const initialState: Partial<AppState> = {
      users: [
        { id: 'user1', name: 'Alice', balance: 0, email: 'alice@example.com' } as User,
        { id: 'user2', name: 'Bob', balance: 0, email: 'bob@example.com' } as User
      ],
      expenses: [
        {
          id: 'exp1',
          description: 'Lunch',
          amount: 100,
          currency: 'USD',
          date: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false,
          createdAt: new Date().toISOString(),
        }
      ],
      events: [],
      settlements: [],
      currentUser: { id: 'test-user-settlement', name: 'Settlement Test User', balance: 0, email: 'settlement@example.com' } as User,
    };
    
    const { result } = renderHook(() => useAppContext(), {
      wrapper: AllProvidersWrapper,
      initialAppState: initialState
    });

    if (!result.current) throw new Error('useAppContext did not provide a value in test');
    
    act(() => {
      result.current!.dispatch({
        type: 'ADD_SETTLEMENT',
        payload: {
          fromUser: 'user2',
          toUser: 'user1',
          amount: 50,
          currency: 'EUR',
          expenseIds: ['exp1']
        }
      });
    });
    
    expect(result.current!.state.settlements.length).toBe(1);
    expect(result.current!.state.settlements[0].amount).toBe(50);
    expect(result.current!.state.settlements[0].currency).toBe('EUR');
  });
  
  test('marks expenses as settled when settlement is created', () => {
    const initialState: Partial<AppState> = {
      users: [
        { id: 'user1', name: 'Alice', balance: 0, email: 'alice@example.com' } as User,
        { id: 'user2', name: 'Bob', balance: 0, email: 'bob@example.com' } as User
      ],
      expenses: [
        {
          id: 'exp1',
          description: 'Dinner',
          amount: 80,
          currency: 'USD',
          date: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false,
          createdAt: new Date().toISOString(),
        }
      ],
      events: [],
      settlements: [],
      currentUser: { id: 'test-user-settlement', name: 'Settlement Test User', balance: 0, email: 'settlement@example.com' } as User,
    };
    
    const { result } = renderHook(() => useAppContext(), { 
      wrapper: AllProvidersWrapper,
      initialAppState: initialState 
    });

    if (!result.current) throw new Error('useAppContext did not provide a value in test');

    expect(result.current!.state.expenses[0].settled).toBe(false);
    
    act(() => {
      result.current!.dispatch({
        type: 'ADD_SETTLEMENT',
        payload: {
          fromUser: 'user2',
          toUser: 'user1',
          amount: 40,
          currency: 'USD',
          expenseIds: ['exp1']
        }
      });
    });
    
    expect(result.current!.state.expenses[0].settled).toBe(true);
  });
  
  test('supports settlements in different currencies', () => {
    const initialState: Partial<AppState> = {
      users: [
        { id: 'user1', name: 'Alice', balance: 0, email: 'alice@example.com' } as User,
        { id: 'user2', name: 'Bob', balance: 0, email: 'bob@example.com' } as User
      ],
      expenses: [
        {
          id: 'exp1',
          description: 'Lunch',
          amount: 100,
          currency: 'USD',
          date: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'exp2',
          description: 'Dinner',
          amount: 80,
          currency: 'EUR',
          date: '2023-01-02',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false,
          createdAt: new Date().toISOString(),
        }
      ],
      events: [],
      settlements: [],
      currentUser: { id: 'test-user-settlement', name: 'Settlement Test User', balance: 0, email: 'settlement@example.com' } as User,
    };
    
    const { result } = renderHook(() => useAppContext(), { 
      wrapper: AllProvidersWrapper,
      initialAppState: initialState 
    });

    if (!result.current) throw new Error('useAppContext did not provide a value in test');
    
    act(() => {
      result.current!.dispatch({
        type: 'ADD_SETTLEMENT',
        payload: {
          fromUser: 'user2',
          toUser: 'user1',
          amount: 50,
          currency: 'USD',
          expenseIds: ['exp1']
        }
      });
      
      result.current!.dispatch({
        type: 'ADD_SETTLEMENT',
        payload: {
          fromUser: 'user2',
          toUser: 'user1',
          amount: 40,
          currency: 'EUR',
          expenseIds: ['exp2']
        }
      });
    });
    
    expect(result.current!.state.settlements.length).toBe(2);
    expect(result.current!.state.settlements[0].currency).toBe('USD');
    expect(result.current!.state.settlements[1].currency).toBe('EUR');
  });
});