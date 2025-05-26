import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const DatabaseErrorRecovery: React.FC = () => {
  // Use local state to avoid hydration mismatch issues
  const [shouldShow, setShouldShow] = useState(false);
  
  // Always call the hook at the top level
  const authContext = useAuth();
  const { hasDatabaseCorruption, handleDatabaseRecovery } = authContext;
  
  // Use useEffect to set the state on the client side only
  useEffect(() => {
    setShouldShow(hasDatabaseCorruption);
  }, [hasDatabaseCorruption]);

  // Don't render anything during SSR or if no corruption detected
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-red-600 text-center mb-4">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-12 w-12 mx-auto" 
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
        </div>
        <h2 className="text-xl font-bold text-center mb-4">Database Error Detected</h2>
        <p className="mb-4">
          Your browser&apos;s local database appears to be corrupted. This can happen when you clear site data,
          use private browsing, or due to browser storage limitations.
        </p>
        <p className="mb-6">
          Click the button below to fix this issue. This will clear cached data and reload the app.
        </p>
        <div className="flex justify-center">
          <button
            onClick={handleDatabaseRecovery}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            Fix Database Issue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseErrorRecovery;
