// Temporary multi-project configuration until @justsplit/firebase-config is ready
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator,
  browserLocalPersistence,
  setPersistence,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  Firestore
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface FirebaseEnvironment {
  hubConfig: FirebaseConfig;
  appConfig?: FirebaseConfig;
  useEmulators: boolean;
  emulatorPorts: {
    auth: number;
    firestore: number;
    storage?: number;
  };
}

let hubApp: FirebaseApp | undefined;
let appApp: FirebaseApp | undefined;

export function initializeFirebase(env: FirebaseEnvironment) {
  // Initialize hub app if not already initialized
  if (!getApps().find(app => app.name === 'hub')) {
    hubApp = initializeApp(env.hubConfig, 'hub');
    
    if (env.useEmulators) {
      const auth = getAuth(hubApp);
      const db = getFirestore(hubApp);
      
      try {
        connectAuthEmulator(auth, `http://localhost:${env.emulatorPorts.auth}`);
        connectFirestoreEmulator(db, 'localhost', env.emulatorPorts.firestore);
      } catch (error) {
        console.log('Emulators might already be connected:', error);
      }
    }
  } else {
    hubApp = getApps().find(app => app.name === 'hub');
  }
  
  // Initialize app-specific Firebase if config provided
  if (env.appConfig && !getApps().find(app => app.name === 'app')) {
    appApp = initializeApp(env.appConfig, 'app');
    
    if (env.useEmulators) {
      const db = getFirestore(appApp);
      const storage = getStorage(appApp);
      
      try {
        connectFirestoreEmulator(db, 'localhost', env.emulatorPorts.firestore);
        if (env.emulatorPorts.storage) {
          connectStorageEmulator(storage, 'localhost', env.emulatorPorts.storage);
        }
      } catch (error) {
        console.log('Emulators might already be connected:', error);
      }
    }
  } else if (env.appConfig) {
    appApp = getApps().find(app => app.name === 'app');
  }
  
  return {
    hubApp: hubApp!,
    appApp,
  };
}

export function getHubApp(): FirebaseApp {
  if (!hubApp) {
    throw new Error('Hub Firebase app not initialized');
  }
  return hubApp;
}

export function getAppApp(): FirebaseApp | undefined {
  return appApp;
}

export function getHubAuth(): Auth {
  return getAuth(getHubApp());
}

export function getHubFirestore(): Firestore {
  return getFirestore(getHubApp());
}

export function getAppFirestore(): Firestore {
  const app = getAppApp();
  if (!app) {
    // Fall back to hub firestore if no app-specific project
    return getHubFirestore();
  }
  return getFirestore(app);
}

export function getAppStorage(): FirebaseStorage {
  const app = getAppApp();
  if (!app) {
    // Fall back to hub storage if no app-specific project
    return getStorage(getHubApp());
  }
  return getStorage(app);
}