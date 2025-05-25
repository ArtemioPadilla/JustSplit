import React, { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AppProvider, AppState, AppContext } from './context/AppContext';
import { AuthContext, AuthContextType } from './context/AuthContext';
import { ReactElement } from 'react';
import { NotificationProvider } from './context/NotificationContext';
import { User } from './types'; // Import User type

const defaultInitialAppState: AppState = { // Ensure this conforms to AppState fully
  users: [],
  expenses: [],
  events: [],
  settlements: [],
  groups: [],
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
  authValues?: Partial<AuthContextType>; // Allow partial auth values for easier override
  debug?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { 
    initialState: optionInitialState, // Rename to avoid conflict
    authValues: optionAuthValues, // Capture provided authValues
    debug = false,
    ...renderOptions
  } = options;

  // Merge provided initial state with defaults to ensure AppState is complete
  const mergedInitialState: AppState = {
    ...defaultInitialAppState,
    ...optionInitialState,
  };
  
  // Start with default mock auth values
  let finalAuthValues: AuthContextType = { ...mockAuthValues };

  // If an initialState with currentUser is provided, 
  // make sure authValues reflects that user for consistency.
  if (mergedInitialState.currentUser) {
    const appUser = mergedInitialState.currentUser as User; // Assuming it's our User type
    finalAuthValues.currentUser = { 
        uid: appUser.id, 
        displayName: appUser.name, 
        email: appUser.email, 
        photoURL: appUser.avatarUrl 
        // Add other FirebaseUser-like properties if needed by useAuth or AppProvider
    } as any; // Cast to any for simplicity if not fully mocking FirebaseUser
    finalAuthValues.userProfile = appUser;
    finalAuthValues.isLoading = false; // Usually true if a user is present
  }

  // If specific authValues are passed in options, they take precedence
  if (optionAuthValues) {
    finalAuthValues = { ...finalAuthValues, ...optionAuthValues };
  }
  
  function CustomProviders({ children }: { children: ReactNode }) {
    if (debug) {
      console.log('Rendering with auth values:', finalAuthValues);
      if (mergedInitialState) {
        console.log('Rendering with initial AppState:', mergedInitialState);
      }
    }
    
    if (!AuthContext || !AppContext) {
      console.error('AuthContext or AppContext is undefined. Check imports.');
      throw new Error('AuthContext or AppContext is undefined in test-utils.tsx');
    }

    return (
      <AuthContext.Provider value={finalAuthValues}>
        <AppProvider initialState={mergedInitialState}>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </AppProvider>
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
    initialState: optionInitialState,
    authValues: optionAuthValues,
    ...renderOptions
  } = options;

  const mergedInitialState: AppState = {
    ...defaultInitialAppState,
    ...optionInitialState,
  };

  let finalAuthValues: AuthContextType = { ...mockAuthValues };
  if (mergedInitialState.currentUser) {
    const appUser = mergedInitialState.currentUser as User;
    finalAuthValues.currentUser = { uid: appUser.id, displayName: appUser.name, email: appUser.email, photoURL: appUser.avatarUrl } as any;
    finalAuthValues.userProfile = appUser;
    finalAuthValues.isLoading = false;
  }
  if (optionAuthValues) {
    finalAuthValues = { ...finalAuthValues, ...optionAuthValues };
  }

  if (!AuthContext || !AppContext) {
    console.error('AuthContext or AppContext is undefined in renderWithAppContext. Check imports.');
    throw new Error('AuthContext or AppContext is undefined in test-utils.tsx (renderWithAppContext)');
  }

  return render(
    <AuthContext.Provider value={finalAuthValues}>
      <AppProvider initialState={mergedInitialState}>
        {/* NotificationProvider might be needed here too if components rely on it */}
        {/* For now, keeping it as it was, but this could be a source of inconsistency */}
        {ui}
      </AppProvider>
    </AuthContext.Provider>,
    renderOptions
  );
}
