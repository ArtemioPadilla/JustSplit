import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { clearCachesAndReload } from '../utils/indexedDBReset';

// For debugging - shows if env vars are loaded
console.log("Firebase Config:", {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "PRESENT" : "MISSING",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "PRESENT" : "MISSING",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "PRESENT" : "MISSING",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "PRESENT" : "MISSING",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "PRESENT" : "MISSING",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "PRESENT" : "MISSING",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ? "PRESENT" : "MISSING"
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators BEFORE any other Firestore operations
if (process.env.NODE_ENV === 'development') {
  console.log("Connecting to Firebase EMULATORS");
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, 'localhost', 8080); // FIXED: Note format is 'localhost' (string) and 8080 (number)
    console.log("Successfully connected to emulators");
  } catch (error) {
    console.error("Error connecting to emulators:", error);
  }
}

// Set up offline persistence AFTER emulator connection
// with advanced error handling and recovery
if (typeof window !== 'undefined') {
  // Check for existing IndexedDB issues - safely with try/catch for SSR
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
      } else if (errMessage.includes('IndexedDB database')) {
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

export { app, auth, db };