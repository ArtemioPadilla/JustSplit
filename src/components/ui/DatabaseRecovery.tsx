// src/components/ui/DatabaseRecovery.tsx
import React, { useEffect, useState } from 'react';
import { hasIndexedDBCorruption, recoverFromCorruption } from '../../utils/indexedDBReset';

/**
 * A component that displays a recovery option when IndexedDB corruption is detected
 */
export const DatabaseRecovery: React.FC = () => {
  const [showRecovery, setShowRecovery] = useState(false);

  // Check for IndexedDB corruption on mount
  useEffect(() => {
    const checkForCorruption = () => {
      const hasCorruption = hasIndexedDBCorruption();
      setShowRecovery(hasCorruption);
    };

    // Check immediately
    checkForCorruption();

    // Also check when the window gets focus, in case the error occurred while the app was in the background
    const handleFocus = () => {
      checkForCorruption();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Don't render anything if no corruption detected
  if (!showRecovery) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 p-4 bg-red-100 border-t border-red-400 z-50">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-2 md:mb-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-red-600 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-red-800">
            Database issue detected. This may affect your experience.
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={() => recoverFromCorruption()}
          >
            Fix Database Issue
          </button>
          <button
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            onClick={() => setShowRecovery(false)}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseRecovery;
