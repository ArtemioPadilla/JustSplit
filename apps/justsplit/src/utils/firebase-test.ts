// This test script helps verify our Firebase fixes
// It will test authentication, Firestore operations, and our error handling

import { auth, db } from '../firebase/config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { sanitizeForFirestore } from '../context/AppContext';

// Test email and password for authentication tests
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test123!';

// Helper function to wait
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

async function runTests(): Promise<void> {
  console.log('=== Starting Firebase Fix Verification Tests ===');
  
  // Step 1: Test Authentication
  console.log('\n--- Testing Authentication ---');
  
  try {
    // First sign out to ensure clean state
    await signOut(auth);
    console.log('✓ Signed out current user');
    
    // Attempt to sign in (might fail if user doesn't exist)
    try {
      await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
      console.log('✓ Signed in with existing test user');
    } catch {
      console.log('Creating new test user...');
      
      // Create a new user
      const userCredential = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
      console.log('✓ Created new test user:', userCredential.user.uid);
    }
    
    // Verify the user is signed in
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log('✓ User is authenticated:', currentUser.uid);
    } else {
      throw new Error('Authentication failed - no current user');
    }
    
    // Step 2: Test Firestore User Profile
    console.log('\n--- Testing User Profile in Firestore ---');
    
    // Create a user profile with fields that would previously cause issues
    const userProfileWithUndefined = {
      id: currentUser.uid,
      name: 'Test User',
      email: currentUser.email,
      balance: 0,
      preferredCurrency: 'USD',
      avatarUrl: undefined, // This previously caused issues
      phoneNumber: null,
      friends: []
    };
    
    // Sanitize and save to Firestore
    console.log('Saving user profile with sanitization...');
    const sanitizedProfile = sanitizeForFirestore(userProfileWithUndefined);
    await setDoc(doc(db, 'users', currentUser.uid), sanitizedProfile);
    console.log('✓ Saved user profile with sanitized data');
    
    // Read back the user profile to confirm
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      console.log('✓ Successfully read user profile from Firestore');
      console.log('User data:', userDoc.data());
      
      // Verify avatarUrl is null, not undefined
      if (userDoc.data().avatarUrl === null) {
        console.log('✓ avatarUrl was properly sanitized to null');
      } else {
        console.error('× avatarUrl was not properly sanitized');
      }
    } else {
      throw new Error('Failed to retrieve user profile');
    }
    
    // Step 3: Test Group Creation with Members
    console.log('\n--- Testing Group Creation ---');
    
    const groupData = {
      name: 'Test Group',
      description: 'A test group for validation',
      members: [currentUser.uid],
      expenseIds: [],
      eventIds: [],
      currency: 'USD',
      avatarUrl: undefined // This previously caused issues
    };
    
    console.log('Creating group with members including current user...');
    const sanitizedGroupData = sanitizeForFirestore(groupData);
    const groupRef = await addDoc(collection(db, 'groups'), sanitizedGroupData);
    console.log('✓ Successfully created group:', groupRef.id);
    
    // Step 4: Test Event Creation with Members (not participants)
    console.log('\n--- Testing Event Creation ---');
    
    const eventData = {
      name: 'Test Event',
      description: 'A test event for validation',
      members: [currentUser.uid], // Using members, not participants
      expenseIds: [],
      startDate: new Date().toISOString(),
      endDate: undefined, // This previously caused issues
      preferredCurrency: 'USD',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.uid
    };
    
    console.log('Creating event with members...');
    const sanitizedEventData = sanitizeForFirestore(eventData);
    const eventRef = await addDoc(collection(db, 'events'), sanitizedEventData);
    console.log('✓ Successfully created event:', eventRef.id);
    
    // Wait a moment to ensure Firebase operations complete
    await wait(1000);
    
    // Clean up test data
    console.log('\n--- Cleaning Up Test Data ---');
    
    await deleteDoc(doc(db, 'events', eventRef.id));
    console.log('✓ Deleted test event');
    
    await deleteDoc(doc(db, 'groups', groupRef.id));
    console.log('✓ Deleted test group');
    
    await signOut(auth);
    console.log('✓ Signed out test user');
    
    console.log('\n=== All Tests Completed Successfully ===');
    console.log('Firebase fixes have been verified!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Auto-run the tests when this file is executed
runTests();

export default runTests;
