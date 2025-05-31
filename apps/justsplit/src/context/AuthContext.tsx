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
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import type { AuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { hasIndexedDBCorruption, recoverFromCorruption } from '../utils/indexedDBReset';
import { sanitizeForFirestore } from './AppContext';
import { User } from '../types';


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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.uid);
      setCurrentUser(user);
      
      if (user) {
        // Fetch or create the user profile
        const userDocRef = doc(db, 'users', user.uid);
        
        try {
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const rawUserData = userDoc.data();
            console.log('Raw user profile loaded:', rawUserData);
            
            // Sanitize the loaded data to remove any undefined values
            const sanitizedUserData = sanitizeForFirestore(rawUserData as Record<string, unknown>) as User;
            console.log('Sanitized user profile loaded:', sanitizedUserData);
            setUserProfile(sanitizedUserData);
          } else {
            // Create a new user profile - build object with only defined values
            const newUserData: User = {
              id: user.uid,
              name: user.displayName || 'User',
              balance: 0,
              preferredCurrency: 'USD',
              friends: [],
              friendRequestsSent: [],
              friendRequestsReceived: []
            };
            
            // Only add optional fields if they have actual values
            if (user.email) {
              newUserData.email = user.email;
            }
            if (user.photoURL) {
              newUserData.avatarUrl = user.photoURL;
            }
            
            console.log('Creating new user profile with data:', newUserData);
            
            await setDoc(userDocRef, newUserData);
            console.log('Created new user profile in Firestore:', user.uid);
            setUserProfile(newUserData);
          }
        } catch (error) {
          console.error('Error handling user profile:', error);
          setUserProfile(null);
        }
      } else {
        console.log('User signed out');
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
    
    // Create user profile with explicitly defined fields to avoid undefined values
    const newUser: Record<string, any> = {
      id: result.user.uid,
      name: displayName,
      email: email,
      balance: 0,
      preferredCurrency: 'USD',
      // Initialize arrays for friends-related fields
      friends: [],
      friendRequestsSent: [],
      friendRequestsReceived: []
    };
    
    // Use the data object directly with no undefined values
    await setDoc(doc(db, 'users', result.user.uid), newUser);
    console.log('Created new user profile in Firestore from signup', result.user.uid);
  };

  const signInWithProvider = async (providerName: 'google' | 'facebook' | 'twitter') => {
    const provider = getProvider(providerName);
    const result = await signInWithPopup(auth, provider);
    
    // Check if this is a new user and create a profile in Firestore
    if (result.user) {
      // Check if user already exists in Firestore
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create a new user profile with safe defaults - build object with only defined values
        const newUserData: Partial<User> = {
          id: result.user.uid,
          name: result.user.displayName || 'User',
          balance: 0,
          preferredCurrency: 'USD',
          friends: [],
          friendRequestsSent: [],
          friendRequestsReceived: []
        };
        
        // Only add optional fields if they have actual values
        if (result.user.email) {
          newUserData.email = result.user.email;
        }
        if (result.user.photoURL) {
          newUserData.avatarUrl = result.user.photoURL;
        }
        
        // Use the sanitizeForFirestore helper to clean the data before storing
        await setDoc(userDocRef, {...newUserData});
        console.log('Created new user profile in Firestore for provider login', result.user.uid);
      }
    }
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
    
    // Create a clean object with only defined values for Firestore
    const cleanData: Record<string, any> = {};
    Object.entries(data).forEach(([key, value]) => {
      // Only include non-undefined values
      // Use explicit null for fields that should be cleared
      if (value !== undefined) {
        cleanData[key] = value;
      }
    });
    
    console.log('Profile update clean data:', cleanData);
    
    // Update Firestore - use merge to only update the specified fields
    await setDoc(userDocRef, cleanData, { merge: true });
    console.log('Updated user profile in Firestore', currentUser.uid);
    
    // Update display name in Firebase Auth if needed
    if (data.name && data.name !== currentUser.displayName) {
      await firebaseUpdateProfile(currentUser, { displayName: data.name });
    }
    
    // Update photo URL in Firebase Auth if needed - only if avatarUrl is defined and not null
    if (data.avatarUrl !== undefined && data.avatarUrl !== currentUser.photoURL) {
      await firebaseUpdateProfile(currentUser, { photoURL: data.avatarUrl });
    }
    
    // Update local state with the merged profile
    const updatedUserData = { ...userProfile, ...cleanData } as User;
    setUserProfile(updatedUserData);
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