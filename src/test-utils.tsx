import React, { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AppProvider, AppState, AppContext, User } from './context/AppContext'; // Import AppContext and User for AppState
import { AuthProvider, AuthContext, User as AuthUser, AuthContextType } from './context/AuthContext';
import { ReactElement } from 'react';
import { NotificationProvider } from './context/NotificationContext';

const defaultInitialAppState: AppState = { // Ensure this conforms to AppState fully
  users: [],
  expenses: [],
  events: [],
  settlements: [],
  isDataLoaded: false,
  currentUser: null,
};

// Mock auth values - ensure it conforms to AuthContextType
const mockAuthValues: AuthContextType = {
  currentUser: null,
  userProfile: null,
  isLoading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  signInWithProvider: jest.fn(),
  linkAccount: jest.fn(),
  resetPassword: jest.fn(),
  updateProfile: jest.fn(),
  handleDatabaseRecovery: jest.fn(),
  hasDatabaseCorruption: false,
};

// Define a type for the options to renderWithProviders
interface CustomRenderOptions extends RenderOptions {
  initialState?: Partial<AppState>; // Allow partial for overriding defaults
  preferredCurrency?: string;
  isConvertingCurrencies?: boolean;
  authValues?: AuthContextType;
  debug?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { 
    initialState: optionInitialState, // Rename to avoid conflict
    authValues = mockAuthValues,
    debug = false,
    ...renderOptions
  } = options;

  // Merge provided initial state with defaults to ensure AppState is complete
  const mergedInitialState: AppState = {
    ...defaultInitialAppState,
    ...optionInitialState,
  };
  
  function CustomProviders({ children }: { children: ReactNode }) {
    if (debug) {
      console.log('Rendering with auth values:', authValues);
      if (mergedInitialState) {
        console.log('Rendering with initial AppState:', mergedInitialState);
      }
    }
    
    if (!AuthContext || !AppContext) {
      console.error('AuthContext or AppContext is undefined. Check imports.');
      throw new Error('AuthContext or AppContext is undefined in test-utils.tsx');
    }

    return (
      <AuthContext.Provider value={authValues}>
        <AppContext.Provider value={{
          state: mergedInitialState, // Use the fully formed state
          dispatch: jest.fn(),
          preferredCurrency: 'USD',
          isConvertingCurrencies: false,
          setIsConvertingCurrencies: jest.fn(),
          setPreferredCurrency: jest.fn(),
          addUser: jest.fn(),
          updateUser: jest.fn(),
          addExpense: jest.fn(),
          updateExpense: jest.fn(),
          deleteExpense: jest.fn(),
          addEvent: jest.fn(),
          updateEvent: jest.fn(),
          deleteEvent: jest.fn(),
          addSettlement: jest.fn(),
        }}> 
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </AppContext.Provider>
      </AuthContext.Provider>
    );
  }

  return render(ui, { wrapper: CustomProviders, ...renderOptions });
}

export function renderWithAppContext(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { 
    initialState: optionInitialState, // Rename to avoid conflict
    authValues = mockAuthValues,
    preferredCurrency = 'USD',
    isConvertingCurrencies = false,
    ...renderOptions
  } = options;

  const mergedInitialState: AppState = {
    ...defaultInitialAppState,
    ...optionInitialState,
  };

  if (!AuthContext || !AppContext) {
    console.error('AuthContext or AppContext is undefined in renderWithAppContext. Check imports.');
    throw new Error('AuthContext or AppContext is undefined in test-utils.tsx (renderWithAppContext)');
  }

  return render(
    <AuthContext.Provider value={authValues}>
      <AppContext.Provider value={{
        state: mergedInitialState, // Use the fully formed state
        dispatch: jest.fn(),
        preferredCurrency: preferredCurrency,
        isConvertingCurrencies: isConvertingCurrencies,
        setIsConvertingCurrencies: jest.fn(),
        setPreferredCurrency: jest.fn(),
        addUser: jest.fn(),
        updateUser: jest.fn(),
        addExpense: jest.fn(),
        updateExpense: jest.fn(),
        deleteExpense: jest.fn(),
        addEvent: jest.fn(),
        updateEvent: jest.fn(),
        deleteEvent: jest.fn(),
        addSettlement: jest.fn(),
      }}>
        {ui}
      </AppContext.Provider>
    </AuthContext.Provider>,
    renderOptions
  );
}
