'use client';

import React from 'react';
import { AppProvider } from './AppContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
