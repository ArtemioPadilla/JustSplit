// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider, 
  FacebookAuthProvider,
  TwitterAuthProvider, 
  signInWithPopup,
  linkWithPopup,
  AuthProvider,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { hasIndexedDBCorruption, recoverFromCorruption } from '../utils/indexedDBReset';


export interface User {
  id: string;
  name: string;
  email?: string;
  balance: number;
  avatarUrl?: string;
  preferredCurrency: string;
  // Add the new optional fields
  phoneNumber?: string; 
  friends?: string[]; 
  friendRequestsSent?: string[]; 
  friendRequestsReceived?: string[];
}

export interface AuthContextType { // Add export here
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithProvider: (providerName: 'google' | 'facebook' | 'twitter') => Promise<void>;
  linkAccount: (providerName: 'google' | 'facebook' | 'twitter') => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  handleDatabaseRecovery: () => Promise<void>;
  hasDatabaseCorruption: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Use useState with a function to avoid running hasIndexedDBCorruption during SSR
  const [hasDatabaseCorruption, setHasDatabaseCorruption] = useState<boolean>(() => {
    // Safe check for browser environment
    if (typeof window === 'undefined') {
      return false;
    }
    return hasIndexedDBCorruption();
  });

  // Function to manually handle database corruption recovery
  const handleDatabaseRecovery = async () => {
    setIsLoading(true);
    await recoverFromCorruption();
    setHasDatabaseCorruption(false);
    // Page will be reloaded by the recoverFromCorruption function
  };

  // Apply Auth persistence settings to workaround IndexedDB issues
  useEffect(() => {
    const setupAuthPersistence = async () => {
      try {
        // Use in-memory persistence if IndexedDB issues detected
        if (hasDatabaseCorruption) {
          console.log('Using session persistence due to IndexedDB issues');
          await setPersistence(auth, browserSessionPersistence);
        } else {
          // Otherwise use local persistence (default)
          await setPersistence(auth, browserLocalPersistence);
        }
      } catch (error) {
        console.error('Failed to set auth persistence:', error);
        // Fall back to safer option
        setHasDatabaseCorruption(true);
      }
    };

    setupAuthPersistence();
  }, [hasDatabaseCorruption]);

  useEffect(() => {
    // Check for IndexedDB corruption periodically
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      setHasDatabaseCorruption(hasIndexedDBCorruption());
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch or create the user profile
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as User);
        } else {
          // Create a new user profile
          const newUser: User = {
            id: user.uid,
            name: user.displayName || 'User',
            email: user.email || undefined,
            balance: 0,
            avatarUrl: user.photoURL || undefined,
            preferredCurrency: 'USD'
          };
          
          await setDoc(userDocRef, newUser);
          setUserProfile(newUser);
        }
      } else {
        setUserProfile(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getProvider = (providerName: string): AuthProvider => {
    switch (providerName) {
      case 'google': return new GoogleAuthProvider();
      case 'facebook': return new FacebookAuthProvider();
      case 'twitter': return new TwitterAuthProvider();
      default: throw new Error(`Unsupported provider: ${providerName}`);
    }
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await firebaseUpdateProfile(result.user, { displayName });
    
    // Create user profile
    const newUser: User = {
      id: result.user.uid,
      name: displayName,
      email: email,
      balance: 0,
      preferredCurrency: 'USD'
    };
    
    await setDoc(doc(db, 'users', result.user.uid), newUser);
  };

  const signInWithProvider = async (providerName: 'google' | 'facebook' | 'twitter') => {
    const provider = getProvider(providerName);
    await signInWithPopup(auth, provider);
  };

  const linkAccount = async (providerName: 'google' | 'facebook' | 'twitter') => {
    if (!currentUser) throw new Error("No user is signed in");
    
    const provider = getProvider(providerName);
    await linkWithPopup(currentUser, provider);
  };

  const signOut = () => firebaseSignOut(auth);

  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

  const updateProfile = async (data: Partial<User>) => {
    if (!currentUser || !userProfile) throw new Error("No user is signed in");
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    
    // Update Firestore
    await setDoc(userDocRef, { ...userProfile, ...data }, { merge: true });
    
    // Update display name in Firebase Auth if needed
    if (data.name && data.name !== currentUser.displayName) {
      await firebaseUpdateProfile(currentUser, { displayName: data.name });
    }
    
    // Update photo URL in Firebase Auth if needed
    if (data.avatarUrl && data.avatarUrl !== currentUser.photoURL) {
      await firebaseUpdateProfile(currentUser, { photoURL: data.avatarUrl });
    }
    
    // Update local state
    setUserProfile({ ...userProfile, ...data });
  };

  const value = {
    currentUser,
    userProfile,
    isLoading,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    linkAccount,
    resetPassword,
    updateProfile,
    handleDatabaseRecovery,
    hasDatabaseCorruption
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}