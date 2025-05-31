import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  Firestore,
  DocumentReference,
  CollectionReference,
  enableIndexedDbPersistence,
  clearIndexedDbPersistence,
  QueryConstraint
} from 'firebase/firestore';
import { getHubApp, getAppApp } from './config';

export function getHubFirestore(): Firestore {
  return getFirestore(getHubApp());
}

export function getAppFirestore(): Firestore {
  const app = getAppApp();
  if (!app) {
    throw new Error('App Firebase instance not initialized');
  }
  return getFirestore(app);
}

export async function enablePersistence(db: Firestore) {
  try {
    await enableIndexedDbPersistence(db);
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistence not available in this browser');
    }
  }
}

export async function clearPersistence(db: Firestore) {
  try {
    await clearIndexedDbPersistence(db);
  } catch (err) {
    console.error('Failed to clear persistence:', err);
  }
}

// Helper functions for common operations
export function getCollection<T>(db: Firestore, path: string): CollectionReference<T> {
  return collection(db, path) as CollectionReference<T>;
}

export function getDocument<T>(db: Firestore, path: string, id: string): DocumentReference<T> {
  return doc(db, path, id) as DocumentReference<T>;
}

export async function getDocumentData<T>(db: Firestore, path: string, id: string): Promise<T | null> {
  const docRef = doc(db, path, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() as T : null;
}

export async function setDocumentData<T extends Record<string, any>>(
  db: Firestore, 
  path: string, 
  id: string, 
  data: T
): Promise<void> {
  const docRef = doc(db, path, id);
  await setDoc(docRef, data);
}

export async function updateDocumentData(
  db: Firestore, 
  path: string, 
  id: string, 
  data: Record<string, any>
): Promise<void> {
  const docRef = doc(db, path, id);
  await updateDoc(docRef, data);
}

export async function queryDocuments<T>(
  db: Firestore,
  path: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const q = query(collection(db, path), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

export function subscribeToDocument<T>(
  db: Firestore,
  path: string,
  id: string,
  callback: (data: T | null) => void
) {
  const docRef = doc(db, path, id);
  return onSnapshot(docRef, (doc) => {
    callback(doc.exists() ? doc.data() as T : null);
  });
}

export function subscribeToCollection<T>(
  db: Firestore,
  path: string,
  callback: (data: T[]) => void,
  ...constraints: QueryConstraint[]
) {
  const q = query(collection(db, path), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    callback(data);
  });
}