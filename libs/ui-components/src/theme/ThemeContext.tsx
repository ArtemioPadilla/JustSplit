'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Define available themes
export type ThemeType = 'light' | 'dark';

// Theme context structure
interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
}

// Create the context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

// Local storage key for theme
const THEME_STORAGE_KEY = 'cybereco-theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Function to get initial theme synchronously - matches themeScript.ts logic
const getInitialTheme = (): ThemeType => {
  if (typeof window === 'undefined') {
    return 'light'; // SSR default
  }
  
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    
    // Check system preference (matches script logic)
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
  }
  
  return 'light';
};

// Regular function declaration for better Next.js compatibility
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize with 'light' for SSR, then sync with actual value after hydration
  const [theme, setTheme] = useState<ThemeType>('light');
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Handle hydration on the client side
  useEffect(() => {
    setIsHydrated(true);
    
    // Sync with the actual theme after hydration
    const actualTheme = getInitialTheme();
    setTheme(actualTheme);
  }, []);
  
  // Update document attributes and local storage when theme changes
  useEffect(() => {
    if (typeof window !== 'undefined' && isHydrated) {
      // Only apply theme after hydration to prevent hydration mismatch
      document.documentElement.setAttribute('data-theme', theme);
      
      // Save to localStorage
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error);
      }
    }
  }, [theme, isHydrated]);
  
  // Toggle between light and dark theme
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook for using the theme context
export const useTheme = () => useContext(ThemeContext);