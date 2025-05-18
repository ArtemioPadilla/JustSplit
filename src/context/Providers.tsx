'use client';

import React from 'react';
import { AppProvider } from './AppContext';
import { AuthProvider } from './AuthContext';
import NotificationModule from './NotificationContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>
        <NotificationModule.Provider>
          {children}
        </NotificationModule.Provider>
      </AppProvider>
    </AuthProvider>
  );
}
