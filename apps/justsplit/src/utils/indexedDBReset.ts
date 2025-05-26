/**
 * Utility functions to deal with IndexedDB database corruptions
 * and help users recover from common issues
 */

/**
 * Function to clear caches and offer to reload
 * This is called directly from firebase config when corruption is detected
 */
export const clearCachesAndReload = async (): Promise<void> => {
  // Skip if not in browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Use optional chaining for cache operations
    const cachesKeys = await window.caches?.keys();
    if (cachesKeys) {
      await Promise.all(
        cachesKeys.map(cacheKey => window.caches.delete(cacheKey))
      );
      console.log('Cache storage cleared');
    }
    
    // Store the error information for later recovery
    try {
      localStorage.setItem('firebase_db_error', JSON.stringify({
        timestamp: Date.now(),
        message: 'IndexedDB database corruption detected'
      }));
    } catch (storageError) {
      console.error('Failed to store error data in localStorage:', storageError);
    }
    
    // Prompt user to reload
    if (confirm(
      'We detected a database issue that might affect your experience. ' +
      'Would you like to reload the app to fix this problem?'
    )) {
      window.location.reload();
    }
  } catch (cacheError) {
    console.error('Failed to clear cache during recovery:', cacheError);
  }
};

/**
 * Attempts to delete the specified Firebase IndexedDB database to recover from corruption
 * 
 * @param {string} dbName The name of the database to delete (usually firestore name or firebaseLocalStorageDb)
 * @returns {Promise<boolean>} True if successfully deleted, false otherwise
 */
export const deleteFirebaseDatabase = async (dbName: string): Promise<boolean> => {
  // Check for browser environment
  if (typeof window === 'undefined' || !window.indexedDB) {
    console.error('IndexedDB is not available in this environment');
    return false;
  }
  
  return new Promise((resolve) => {
    try {
      // Request to delete the database
      const request = window.indexedDB.deleteDatabase(dbName);

      // Handle success
      request.onsuccess = () => {
        console.log(`Successfully deleted database: ${dbName}`);
        resolve(true);
      };

      // Handle error
      request.onerror = (event) => {
        console.error(`Failed to delete database: ${dbName}`, event);
        resolve(false);
      };
    } catch (error) {
      console.error(`Error attempting to delete database ${dbName}:`, error);
      resolve(false);
    }
  });
};

/**
 * Helper function to clear browser caches
 */
const clearBrowserCaches = async (): Promise<void> => {
  if (typeof window === 'undefined' || !window.caches) {
    return;
  }
  
  try {
    const cachesKeys = await window.caches.keys();
    await Promise.all(
      cachesKeys.map(cacheKey => window.caches.delete(cacheKey))
    );
    console.log('Cache storage cleared');
  } catch (cacheError) {
    console.warn('Failed to clear some caches:', cacheError);
  }
};

/**
 * Helper function to clear local and session storage
 */
const clearStorageData = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem('firebase:previous_websocket_failure');
    localStorage.removeItem('firebase:authUser');
    sessionStorage.removeItem('firebase:authUser');
    localStorage.removeItem('firebase_db_error');
  } catch (storageError) {
    console.warn('Error clearing storage during recovery:', storageError);
  }
};

/**
 * Helper function to unregister service workers
 */
const unregisterServiceWorkers = async (): Promise<void> => {
  if (typeof window === 'undefined' || !navigator.serviceWorker) {
    return;
  }
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('Service workers unregistered');
  } catch (swError) {
    console.warn('Error unregistering service workers:', swError);
  }
};

/**
 * Attempts to recover from Firebase IndexedDB corruption by:
 * 1. Deleting the Firebase IndexedDB databases
 * 2. Clearing browser caches
 * 3. Reloading the page
 */
export const recoverFromCorruption = async (): Promise<void> => {
  // Skip if not in browser environment
  if (typeof window === 'undefined') {
    console.warn('Recovery attempted in non-browser environment');
    return;
  }
  
  try {
    // Clear web storage first
    clearStorageData();
    
    // Common Firebase IndexedDB database names
    const dbNames = [
      'firebaseLocalStorageDb',
      'firestore',
      'firebase-installations-database',
      'firebase-messaging-database',
      'firebase-auth-db',
      'IndexedDB',
      'firebase-heartbeat-database'
    ];
    
    // Add project-specific database names
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId) {
      dbNames.push(`firestore/${projectId}/default`);
      dbNames.push(`firestore/${projectId}`);
      dbNames.push(`${projectId}:default`);
    }
    
    // Delete each database
    const deletePromises = dbNames.map(deleteFirebaseDatabase);
    await Promise.allSettled(deletePromises);
    
    // Clear caches and service workers
    await clearBrowserCaches();
    await unregisterServiceWorkers();
    
    // Notify user and reload
    alert('Database has been reset to fix corruption issues. The page will now reload.');
    
    // Reload with cache bypass
    const separator = window.location.href.includes('?') ? '&' : '?';
    window.location.href = window.location.href + separator + 'cache_bust=' + Date.now();
  } catch (error) {
    console.error('Error during database recovery:', error);
    alert('Failed to recover from database corruption. Please try clearing your browser data manually and reload the page.');
    
    // Attempt a normal reload as last resort
    try {
      window.location.reload();
    } catch (reloadError) {
      console.error('Failed to reload page:', reloadError);
    }
  }
};

/**
 * Check if the user is experiencing an IndexedDB corruption error
 * This can be used in the UI to show a recovery button
 */
export const hasIndexedDBCorruption = (): boolean => {
  // First check if we're in a browser environment
  if (typeof window === 'undefined') {
    return false; // Not in browser, can't have corruption
  }
  
  // Check for stored error in localStorage
  try {
    const lastErrorStr = localStorage.getItem('firebase_db_error');
    if (lastErrorStr) {
      try {
        const lastError = JSON.parse(lastErrorStr);
        if (lastError.message?.includes('IndexedDB database')) {
          return true;
        }
      } catch {
        // Ignore parsing errors
      }
    }
    
    // Also check if IndexedDB is actually accessible
    // This handles cases where the browser blocks IndexedDB
    if (window.indexedDB) {
      // Try to open a test database to verify IndexedDB is working
      const testRequest = window.indexedDB.open('test_idb_access');
      
      testRequest.onerror = () => {
        // If there's an error, store it and return true
        localStorage.setItem('firebase_db_error', JSON.stringify({
          timestamp: Date.now(),
          message: 'IndexedDB database access error'
        }));
        return true;
      };
    }
  } catch (e) {
    console.error('Error checking IndexedDB availability:', e);
    // Only return true for specific errors, not for all exceptions
    // This prevents false positives in SSR
    if (e instanceof DOMException || 
        (e instanceof Error && e.message.includes('localStorage'))) {
      return true;
    }
  }
  
  return false;
};
