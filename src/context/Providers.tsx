'use client';

import React from 'react';
import { AppProvider } from './AppContext';
import NotificationModule from './NotificationContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <NotificationModule.Provider>
        {children}
      </NotificationModule.Provider>
    </AppProvider>
  );
}
