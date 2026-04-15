'use client';

import React from 'react';
import { AppProvider } from './AppContext';
import { AuthProvider } from './AuthContext';
import { NotificationProvider } from './NotificationContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider initialState={{}}>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default Providers;
