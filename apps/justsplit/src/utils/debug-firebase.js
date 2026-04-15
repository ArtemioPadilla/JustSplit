import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

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
      
      // Also check collections the user has access to
      await checkUserCollections(currentUser.uid);
    } catch (error) {
      console.error('Error fetching user document:', error);
    }
  }
  
  return currentUser;
}

async function checkUserCollections(userId) {
  const db = getFirestore();
  
  // Check user's expenses
  try {
    const expensesQuery = await getDocs(collection(db, 'expenses'));
    const userExpenses = expensesQuery.docs.filter(doc => 
      doc.data().participants?.includes(userId) || doc.data().paidBy === userId
    );
    console.log('User expenses count:', userExpenses.length);
  } catch (error) {
    console.error('Error checking expenses:', error);
  }
  
  // Check user's groups
  try {
    const groupsQuery = await getDocs(collection(db, 'groups'));
    const userGroups = groupsQuery.docs.filter(doc => 
      doc.data().members?.includes(userId)
    );
    console.log('User groups count:', userGroups.length);
  } catch (error) {
    console.error('Error checking groups:', error);
  }
}

export async function debugFirebaseConnection() {
  console.log('=== Firebase Debug Information ===');
  
  const auth = getAuth();
  console.log('Auth instance:', auth);
  console.log('Current user:', auth.currentUser);
  
  const db = getFirestore();
  console.log('Firestore instance:', db);
  
  return {
    auth: !!auth,
    user: !!auth.currentUser,
    firestore: !!db
  };
}
