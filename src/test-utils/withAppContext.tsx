import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';

// Default test data that can be used across tests
export const defaultTestData = {
  users: [
    { id: 'user1', name: 'Test User', email: 'test@example.com', balance: 0, preferredCurrency: 'USD' }
  ],
  expenses: [],
  events: [],
  settlements: []
};

// Mock auth values
const mockAuthValues = {
  user: { uid: 'user1' }, // Provide a valid user ID that can be used in Firebase queries
  isLoading: false,
  error: null,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  signInWithProvider: jest.fn(),
  updateProfile: jest.fn(),
  userProfile: null,
  isAuthenticated: false,
  currentUser: null,
  hasDatabaseCorruption: false,
  handleDatabaseRecovery: jest.fn()
};

// Custom render that includes the AppProvider and AuthProvider
export function renderWithAppContext(
  ui: React.ReactElement,
  { 
    initialState = defaultTestData,
    preferredCurrency = 'USD',
    isConvertingCurrencies = false,
    authValues = mockAuthValues,
    ...renderOptions 
  }: RenderOptions & { 
    initialState?: any,
    preferredCurrency?: string,
    isConvertingCurrencies?: boolean,
    authValues?: any
  } = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthProvider value={authValues}>
        <AppProvider 
          initialState={initialState}
          preferredCurrency={preferredCurrency}
          isConvertingCurrencies={isConvertingCurrencies}
        >
          {children}
        </AppProvider>
      </AuthProvider>
    );
  }
  
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
