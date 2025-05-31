import { 
  initializeFirebase, 
  getHubApp, 
  getAppApp,
  getHubAuth,
  getAppFirestore,
  getAppStorage
} from './multi-project-config';
import { 
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { 
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { clearCachesAndReload } from '../utils/indexedDBReset';

// Check if we're in a test environment
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

// Initialize Firebase with hub and app configurations
const firebaseEnv = {
  hubConfig: {
    apiKey: process.env.NEXT_PUBLIC_HUB_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_HUB_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_HUB_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_HUB_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_HUB_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_HUB_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  },
  appConfig: process.env.NEXT_PUBLIC_JUSTSPLIT_PROJECT_ID ? {
    apiKey: process.env.NEXT_PUBLIC_JUSTSPLIT_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_JUSTSPLIT_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_JUSTSPLIT_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_JUSTSPLIT_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_JUSTSPLIT_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_JUSTSPLIT_APP_ID || '',
  } : undefined,
  useEmulators: process.env.NODE_ENV === 'development' && !isTestEnv,
  emulatorPorts: {
    auth: 9099,
    firestore: 8080,
  },
};

// For debugging - shows if env vars are loaded (only in non-test environments)
if (!isTestEnv) {
  console.log("Firebase Config:", {
    hubApiKey: firebaseEnv.hubConfig.apiKey ? "PRESENT" : "MISSING",
    hubProjectId: firebaseEnv.hubConfig.projectId ? "PRESENT" : "MISSING",
    appProjectId: firebaseEnv.appConfig?.projectId ? "PRESENT" : "MISSING (will use hub)",
    useEmulators: firebaseEnv.useEmulators
  });
}

// Initialize Firebase
initializeFirebase(firebaseEnv);

// Get Firebase instances
const hubApp = getHubApp();
const appApp = getAppApp();
const app = appApp || hubApp; // Use app-specific instance if available, otherwise hub

// Export auth from hub (shared authentication)
export const auth = getHubAuth();

// Export Firestore from app project if available, otherwise use hub
export const db = getAppFirestore();

// Export storage from app project if available, otherwise use hub  
export const storage = getAppStorage();

// Set persistence to LOCAL for auth
if (typeof window !== 'undefined' && !isTestEnv) {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Failed to set auth persistence:", error);
  });
}

// Set up offline persistence for Firestore with advanced error handling
if (typeof window !== 'undefined' && !isTestEnv) {
  // Check for existing IndexedDB issues
  const hasExistingIssue = (() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('firebase_db_error') !== null;
    } catch {
      return false;
    }
  })();
  
  // If no known issues, try to enable persistence
  if (!hasExistingIssue) {
    enableIndexedDbPersistence(db).catch((err: any) => {
      const errCode = err.code;
      const errMessage = err.message ?? '';
      
      // Handle different error scenarios
      if (errCode === 'failed-precondition') {
        console.warn('Firebase persistence failed: Multiple tabs open. Persistence will only work in one tab at a time.');
      } else if (errCode === 'unimplemented') {
        console.warn('Firebase persistence not supported in this browser. Falling back to memory-only mode.');
      } else if (errMessage.includes('IndexedDB database') || errMessage.includes('corruption')) {
        console.error('IndexedDB corruption detected. Attempting recovery...');
        clearCachesAndReload();
      } else {
        console.error('Unexpected Firebase persistence error:', errCode, err);
      }
    });
  } else {
    console.warn('Skipping enableIndexedDbPersistence due to existing IndexedDB issues');
  }
}

export { app };