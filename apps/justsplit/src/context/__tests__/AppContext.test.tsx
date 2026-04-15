import React from 'react';
import { render, act } from '@testing-library/react';
import { AppProvider, useAppContext, AppState } from '../AppContext';
import { AuthContext, AuthContextType } from '../AuthContext';
import { User, Expense, Event, Settlement } from '../../types';

// Mock Firebase to prevent any Firebase operations during tests
jest.mock('../../firebase/config', () => ({
  db: {}, // Mock Firestore db
}));

// Mock Firebase functions to prevent any operations
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  writeBatch: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: jest.fn(),
}));

// Mock Firebase to prevent any Firebase operations during tests
jest.mock('../../firebase/config', () => ({
  db: {}, // Mock Firestore db
}));

// Mock Firebase functions to prevent any operations
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  writeBatch: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: jest.fn(),
}));

// Default mock auth value - ensure all properties of AuthContextType are covered
const mockAuthContextValue: AuthContextType = {
  currentUser: { uid: 'test-user' } as any, // Mock FirebaseUser as needed for tests
  userProfile: { id: 'test-user', name: 'Test User', email: 'test@example.com', balance: 0 } as User,
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
  // Removed login/logout as they are not in AuthContextType
};

// Wrapper for tests that need both Auth and App contexts
const AllProvidersWrapper: React.FC<{ children: React.ReactNode, initialAppState?: Partial<AppState> }> = ({ children, initialAppState }) => {
  return (
    <AuthContext.Provider value={mockAuthContextValue}>
      <AppProvider initialState={initialAppState}>
        {children}
      </AppProvider>
    </AuthContext.Provider>
  );
};

describe('AppContext', () => {
  // Helper to get context value reliably
  const getContextValue = (initialAppState?: Partial<AppState>) => {
    let contextValue: ReturnType<typeof useAppContext> | undefined;
    const TestComponent = () => {
      contextValue = useAppContext();
      return null;
    };
    render(<TestComponent />, { wrapper: ({ children }) => <AllProvidersWrapper initialAppState={initialAppState}>{children}</AllProvidersWrapper> });
    if (!contextValue) throw new Error('useAppContext did not provide a value');
    return contextValue;
  };

  test('initializes with default state when no initialState is provided', () => {
    const context = getContextValue();
    expect(context.state.users.length).toBe(0);
    expect(context.state.expenses.length).toBe(0);
    expect(context.state.events.length).toBe(0);
    expect(context.state.settlements.length).toBe(0);
  });

  test('initializes with provided initialState', () => {
    const initialAppState: Partial<AppState> = {
      users: [{ id: 'user1', name: 'Test User', balance: 0, email: 'test@example.com' } as User],
      currentUser: { id: 'user1', name: 'Test User', balance: 0, email: 'test@example.com' } as User,
      isDataLoaded: true,
    };
    const context = getContextValue(initialAppState);
    expect(context.state.users[0]?.name).toBe('Test User');
  });

  test('adds a user correctly', () => {
    let contextValue: ReturnType<typeof useAppContext> | undefined;
    const TestComponent = () => {
      contextValue = useAppContext();
      console.log('Render - users length:', contextValue.state.users.length);
      return null;
    };
    
    const { rerender } = render(<TestComponent />, { 
      wrapper: ({ children }) => <AllProvidersWrapper>{children}</AllProvidersWrapper> 
    });
    
    if (!contextValue) throw new Error('useAppContext did not provide a value');
    
    console.log('Before dispatch - users length:', contextValue.state.users.length);
    console.log('Before dispatch - full state:', JSON.stringify(contextValue.state, null, 2));
    
    act(() => {
      console.log('Dispatching ADD_USER');
      contextValue!.dispatch({
        type: 'ADD_USER',
        payload: { name: 'New User', email: 'new@example.com' }
      });
    });
    
    // Force a re-render to get the updated state
    rerender(<TestComponent />);
    
    console.log('After dispatch - users length:', contextValue.state.users.length);
    console.log('After dispatch - full state:', JSON.stringify(contextValue.state, null, 2));
    
    expect(contextValue.state.users.length).toBe(1);
    expect(contextValue.state.users[0].name).toBe('New User');
  });

  test('adds an expense correctly', () => {
    const initialAppState: Partial<AppState> = {
      users: [{ id: 'user1', name: 'Test User', balance: 0, email: 'test@example.com' } as User],
      currentUser: { id: 'user1', name: 'Test User', balance: 0, email: 'test@example.com' } as User,
    };
    
    let contextValue: ReturnType<typeof useAppContext> | undefined;
    const TestComponent = () => {
      contextValue = useAppContext();
      return null;
    };
    
    const { rerender } = render(<TestComponent />, { 
      wrapper: ({ children }) => <AllProvidersWrapper initialAppState={initialAppState}>{children}</AllProvidersWrapper> 
    });
    
    if (!contextValue) throw new Error('useAppContext did not provide a value');
    
    const expensePayload: Omit<Expense, 'id'> = {
      description: 'Test Expense',
      amount: 50,
      currency: 'USD',
      date: '2023-05-15T00:00:00.000Z',
      paidBy: 'user1',
      participants: ['user1'],
      settled: false,
      createdAt: '2023-05-15T00:00:00.000Z',
    };
    
    act(() => {
      contextValue!.dispatch({ type: 'ADD_EXPENSE', payload: expensePayload });
    });
    
    // Force a re-render to get the updated state
    rerender(<TestComponent />);
    
    expect(contextValue.state.expenses.length).toBe(1);
    expect(contextValue.state.expenses[0].description).toBe('Test Expense');
  });

  test('adds an event correctly', () => {
    const initialAppState: Partial<AppState> = {
      users: [{ id: 'user1', name: 'Test User', balance: 0, email: 'test@example.com' } as User],
      currentUser: { id: 'user1', name: 'Test User', balance: 0, email: 'test@example.com' } as User,
    };
    
    let contextValue: ReturnType<typeof useAppContext> | undefined;
    const TestComponent = () => {
      contextValue = useAppContext();
      return null;
    };
    
    const { rerender } = render(<TestComponent />, { 
      wrapper: ({ children }) => <AllProvidersWrapper initialAppState={initialAppState}>{children}</AllProvidersWrapper> 
    });
    
    if (!contextValue) throw new Error('useAppContext did not provide a value');
    
    const eventPayload: Omit<Event, 'id' | 'expenses'> = {
      name: 'Test Event',
      description: 'Event description',
      date: '2023-05-15T00:00:00.000Z',
      startDate: '2023-05-15T00:00:00.000Z',
      createdBy: 'user1', 
      members: ['user1'], 
      createdAt: new Date().toISOString(),
      expenseIds: [],
    };

    act(() => {
      contextValue!.dispatch({ type: 'ADD_EVENT', payload: eventPayload });
    });
    
    // Force a re-render to get the updated state
    rerender(<TestComponent />);
    
    expect(contextValue.state.events.length).toBe(1);
    expect(contextValue.state.events[0].name).toBe('Test Event');
    expect(contextValue.state.events[0].expenseIds).toEqual([]);
  });

  test('adds a settlement correctly', () => {
    const initialAppState: Partial<AppState> = {
      users: [
        { id: 'user1', name: 'User One', balance: 50, email: 'one@example.com' } as User,
        { id: 'user2', name: 'User Two', balance: -50, email: 'two@example.com' } as User
      ],
      currentUser: { id: 'user1', name: 'User One', balance: 50, email: 'one@example.com' } as User,
    };
    
    let contextValue: ReturnType<typeof useAppContext> | undefined;
    const TestComponent = () => {
      contextValue = useAppContext();
      return null;
    };
    
    const { rerender } = render(<TestComponent />, { 
      wrapper: ({ children }) => <AllProvidersWrapper initialAppState={initialAppState}>{children}</AllProvidersWrapper> 
    });
    
    if (!contextValue) throw new Error('useAppContext did not provide a value');
    
    const settlementPayload: Omit<Settlement, 'id' | 'date'> = {
      fromUser: 'user2',
      toUser: 'user1',
      amount: 50,
      currency: 'USD',
      expenseIds: [],
    };
    
    act(() => {
      contextValue!.dispatch({ type: 'ADD_SETTLEMENT', payload: settlementPayload });
    });
    
    // Force a re-render to get the updated state
    rerender(<TestComponent />);
    
    expect(contextValue.state.settlements.length).toBe(1);
    expect(contextValue.state.settlements[0].amount).toBe(50);
  });

  test('updates a user correctly', () => {
    const initialAppState: Partial<AppState> = {
      users: [{ id: 'user1', name: 'Original Name', email: 'original@example.com', balance: 0 } as User],
      currentUser: { id: 'user1', name: 'Original Name', email: 'original@example.com', balance: 0 } as User,
    };
    
    let contextValue: ReturnType<typeof useAppContext> | undefined;
    const TestComponent = () => {
      contextValue = useAppContext();
      return null;
    };
    
    const { rerender } = render(<TestComponent />, { 
      wrapper: ({ children }) => <AllProvidersWrapper initialAppState={initialAppState}>{children}</AllProvidersWrapper> 
    });
    
    if (!contextValue) throw new Error('useAppContext did not provide a value');
    
    act(() => {
      contextValue!.dispatch({
        type: 'UPDATE_USER',
        payload: { id: 'user1', name: 'Updated Name', email: 'updated@example.com' }
      });
    });
    
    // Force a re-render to get the updated state
    rerender(<TestComponent />);
    
    expect(contextValue.state.users[0].name).toBe('Updated Name');
    expect(contextValue.state.users[0].email).toBe('updated@example.com');
  });

  test('throws error when context is used outside of provider', () => {
    const originalError = console.error;
    console.error = jest.fn();
    function renderHookOutsideProvider(callback: () => any) { 
        const result: { current: any } = { current: null };
        function TestComponent() {
            result.current = callback();
            return null;
        }
        render(<TestComponent />); // No wrapper provided, so no context
        return { result };
    }
    expect(() => {
      renderHookOutsideProvider(() => useAppContext());
    }).toThrow('useAppContext must be used within an AppProvider');
    console.error = originalError;
  });
});
