
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Friendship } from '../types'; // Adjust the import based on your project structure

// Send friend request
export const sendFriendRequest = async (currentUserId: string, targetUserId: string) => {
  const friendshipData: Omit<Friendship, 'id'> = {
    users: [currentUserId, targetUserId],
    status: 'pending',
    requestedBy: currentUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  return await addDoc(collection(db, 'friendships'), friendshipData);
};

// Get user's friends
export const getUserFriendships = async (userId: string) => {
  const q = query(
    collection(db, 'friendships'),
    where('users', 'array-contains', userId)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Friendship[];
};

// Update friendship status
export const updateFriendshipStatus = async (friendshipId: string, status: 'accepted' | 'rejected') => {
  const friendshipRef = doc(db, 'friendships', friendshipId);
  return await updateDoc(friendshipRef, {
    status,
    updatedAt: new Date()
  });
};

// Remove friendship
export const removeFriendship = async (friendshipId: string) => {
  const friendshipRef = doc(db, 'friendships', friendshipId);
  return await deleteDoc(friendshipRef);
};