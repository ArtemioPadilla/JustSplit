'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initializeFirebase, onAuthChange, signIn as firebaseSignIn, signOut as firebaseSignOut } from '@cybereco/firebase-config';
import type { AuthUser } from '@cybereco/shared-types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Firebase with hub configuration
    initializeFirebase({
      hubConfig: {
        apiKey: process.env.NEXT_PUBLIC_HUB_API_KEY || '',
        authDomain: process.env.NEXT_PUBLIC_HUB_AUTH_DOMAIN || '',
        projectId: process.env.NEXT_PUBLIC_HUB_PROJECT_ID || '',
        storageBucket: process.env.NEXT_PUBLIC_HUB_STORAGE_BUCKET || '',
        messagingSenderId: process.env.NEXT_PUBLIC_HUB_MESSAGING_SENDER_ID || '',
        appId: process.env.NEXT_PUBLIC_HUB_APP_ID || '',
      },
      useEmulators: process.env.NODE_ENV === 'development',
      emulatorPorts: {
        auth: 9099,
        firestore: 8080,
      },
    });

    // Subscribe to auth changes
    const unsubscribe = onAuthChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await firebaseSignIn(email, password);
  };

  const signOut = async () => {
    await firebaseSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);