import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
  Auth
} from 'firebase/auth';
import { getHubApp } from './config';
import type { AuthUser } from '@cybereco/shared-types';

export function getHubAuth(): Auth {
  return getAuth(getHubApp());
}

export function getCurrentUser(): User | null {
  const auth = getHubAuth();
  return auth.currentUser;
}

export async function signIn(email: string, password: string) {
  const auth = getHubAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string, displayName?: string) {
  const auth = getHubAuth();
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  
  return userCredential;
}

export async function signOut() {
  const auth = getHubAuth();
  return firebaseSignOut(auth);
}

export async function resetPassword(email: string) {
  const auth = getHubAuth();
  return sendPasswordResetEmail(auth, email);
}

export function onAuthChange(callback: (user: AuthUser | null) => void) {
  const auth = getHubAuth();
  
  return onAuthStateChanged(auth, (firebaseUser: User | null) => {
    if (firebaseUser) {
      const authUser: AuthUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
      };
      callback(authUser);
    } else {
      callback(null);
    }
  });
}

export async function verifyToken(token: string, appProjectId?: string): Promise<AuthUser | null> {
  // In production, this would verify the token with Firebase Admin SDK
  // For now, we'll use the client-side auth state
  const auth = getHubAuth();
  const user = auth.currentUser;
  
  if (user) {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    };
  }
  
  return null;
}