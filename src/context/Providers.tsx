'use client';

import React from 'react';
import { AppProvider } from './AppContext';
import { AuthProvider } from './AuthContext';
import { NotificationProvider } from './NotificationContext'; // assuming this is how it's imported

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default Providers;
// No changes needed here, just ensure AppProvider always receives a valid initial state.
