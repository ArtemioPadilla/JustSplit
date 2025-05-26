import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface FirebaseEnvironment {
  hubConfig: FirebaseConfig;
  appConfig?: FirebaseConfig;
  useEmulators: boolean;
  emulatorPorts: {
    auth: number;
    firestore: number;
  };
}

const emulatorPorts = {
  auth: 9099,
  firestore: 8080,
};

let hubApp: FirebaseApp | undefined;
let appApp: FirebaseApp | undefined;

export function initializeFirebase(env: FirebaseEnvironment) {
  // Initialize hub app if not already initialized
  if (!getApps().find(app => app.name === 'hub')) {
    hubApp = initializeApp(env.hubConfig, 'hub');
    
    if (env.useEmulators) {
      const auth = getAuth(hubApp);
      const db = getFirestore(hubApp);
      
      connectAuthEmulator(auth, `http://localhost:${env.emulatorPorts.auth}`);
      connectFirestoreEmulator(db, 'localhost', env.emulatorPorts.firestore);
    }
  }
  
  // Initialize app-specific Firebase if config provided
  if (env.appConfig && !getApps().find(app => app.name === 'app')) {
    appApp = initializeApp(env.appConfig, 'app');
    
    if (env.useEmulators) {
      const db = getFirestore(appApp);
      connectFirestoreEmulator(db, 'localhost', env.emulatorPorts.firestore);
    }
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