import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export async function verifyFirebaseAuth() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  console.log('Current Firebase Auth User:', currentUser);
  
  if (currentUser) {
    // Try to fetch user document from Firestore
    try {
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      console.log('User document exists:', userDoc.exists());
      console.log('User data:', userDoc.data());
    } catch (error) {
      console.error('Error fetching user document:', error);
    }
  }
  
  return currentUser;
}
