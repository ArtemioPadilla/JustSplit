'use client';

import React from 'react';
import { AppProvider } from './AppContext';
import { AuthProvider } from './AuthContext';
import { NotificationProvider } from './NotificationContext'; // assuming this is how it's imported

export function Providers({ children }) {
  return (
    <AuthProvider>
      <AppProvider
        preferredCurrency="USD"
        isConvertingCurrencies={false}
        // Only provide initialState if your AppProvider actually needs it at initialization
        // initialState is likely fetched from Firebase after authentication
      >
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default Providers;
// No changes needed here, just ensure AppProvider always receives a valid initial state.
