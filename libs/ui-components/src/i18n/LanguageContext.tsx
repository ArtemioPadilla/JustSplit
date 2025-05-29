'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Available languages
export type LanguageType = 'en' | 'es';

// Structure for translated strings
export interface Translations {
  [key: string]: string;
}

// Type for all available translations
export interface TranslationsMap {
  [language: string]: Translations;
}

// Language context structure
interface LanguageContextType {
  language: LanguageType;
  setLanguage: (language: LanguageType) => void;
  t: (key: string) => string;
}

// Default English translations (minimal set)
const defaultTranslations: TranslationsMap = {
  en: {
    welcome: 'Welcome',
    home: 'Home',
    about: 'About',
    features: 'Features',
    contact: 'Contact',
    login: 'Login',
    signup: 'Sign Up',
    language: 'Language',
    theme: 'Theme'
  },
  es: {
    welcome: 'Bienvenido',
    home: 'Inicio',
    about: 'Acerca de',
    features: 'Características',
    contact: 'Contacto',
    login: 'Iniciar sesión',
    signup: 'Registrarse',
    language: 'Idioma',
    theme: 'Tema'
  }
};

// Create the context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key
});

// Local storage key for language
const LANGUAGE_STORAGE_KEY = 'cybereco-language';

interface LanguageProviderProps {
  children: React.ReactNode;
  initialTranslations?: TranslationsMap;
}

// Function to detect language based on user location
const detectLanguageFromLocation = async (): Promise<LanguageType> => {
  try {
    // Try to get user's timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Spanish-speaking countries/regions based on timezone
    const spanishTimezones = [
      'America/Mexico_City', 'America/Cancun', 'America/Merida', 'America/Monterrey',
      'America/Mazatlan', 'America/Chihuahua', 'America/Hermosillo', 'America/Tijuana',
      'America/Argentina/Buenos_Aires', 'America/Argentina/Catamarca', 'America/Argentina/Cordoba',
      'America/Argentina/Jujuy', 'America/Argentina/La_Rioja', 'America/Argentina/Mendoza',
      'America/Argentina/Rio_Gallegos', 'America/Argentina/Salta', 'America/Argentina/San_Juan',
      'America/Argentina/San_Luis', 'America/Argentina/Tucuman', 'America/Argentina/Ushuaia',
      'America/La_Paz', 'America/Santiago', 'America/Bogota', 'America/Costa_Rica',
      'America/Havana', 'America/Santo_Domingo', 'America/Guayaquil', 'America/El_Salvador',
      'America/Guatemala', 'America/Tegucigalpa', 'America/Managua', 'America/Panama',
      'America/Asuncion', 'America/Lima', 'America/Montevideo', 'America/Caracas',
      'Europe/Madrid', 'Africa/Ceuta', 'Atlantic/Canary'
    ];
    
    if (spanishTimezones.includes(timezone)) {
      return 'es';
    }
    
    // Try to use geolocation API as fallback
    if ('geolocation' in navigator) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              // Use a public API to get country from coordinates
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
              );
              const data = await response.json();
              
              // Spanish-speaking countries
              const spanishCountries = [
                'ES', 'MX', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU',
                'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ'
              ];
              
              if (spanishCountries.includes(data.countryCode)) {
                resolve('es');
              } else {
                resolve('en');
              }
            } catch {
              resolve('en');
            }
          },
          () => resolve('en'), // Fallback to English on geolocation error
          { timeout: 5000 }
        );
      });
    }
  } catch {
    // Fallback to browser language
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'es' ? 'es' : 'en';
  }
  
  return 'en';
};

// Function to get initial language synchronously - matches themeScript.ts logic
const getInitialLanguage = (): LanguageType => {
  if (typeof window === 'undefined') {
    return 'en'; // SSR default
  }
  
  try {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage === 'en' || savedLanguage === 'es') {
      return savedLanguage;
    }
    
    // Check browser language (matches script logic)
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'es') {
      return 'es';
    }
  } catch (error) {
    console.warn('Failed to read language from localStorage:', error);
  }
  
  return 'en';
};

// Use regular function declaration for better Next.js compatibility
export function LanguageProvider({ 
  children, 
  initialTranslations = defaultTranslations 
}: LanguageProviderProps) {
  // Merge provided translations with default ones
  const mergedTranslations = {
    en: { ...defaultTranslations.en, ...(initialTranslations?.en || {}) },
    es: { ...defaultTranslations.es, ...(initialTranslations?.es || {}) },
  };
  
  // Initialize state from local storage immediately
  const [language, setLanguageState] = useState<LanguageType>(() => getInitialLanguage());
  const [translations] = useState<TranslationsMap>(mergedTranslations);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Handle hydration and async language detection
  useEffect(() => {
    setIsHydrated(true);
    
    const initializeLanguage = async () => {
      if (typeof window !== 'undefined') {
        const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'es')) {
          // Language already set correctly from getInitialLanguage
          return;
        } else {
          // Only detect language automatically for new users (no saved preference)
          // Use a timeout to ensure this happens after hydration
          setTimeout(async () => {
            const detectedLanguage = await detectLanguageFromLocation();
            if (detectedLanguage !== language) {
              setLanguageState(detectedLanguage);
            }
          }, 100);
        }
      }
    };
    
    initializeLanguage();
  }, []);
  
  // Update localStorage and document attributes when language changes
  useEffect(() => {
    if (typeof window !== 'undefined' && isHydrated) {
      // Save to localStorage
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch (error) {
        console.warn('Failed to save language to localStorage:', error);
      }
      
      // Only update document attributes after hydration to prevent mismatch
      document.documentElement.setAttribute('lang', language);
      document.documentElement.setAttribute('dir', 'ltr');
    }
  }, [language, isHydrated]);
  
  // Set language helper
  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
  };
  
  // Translation helper function with hydration-safe fallback
  const t = (key: string): string => {
    // During SSR or before hydration, always return English to prevent hydration mismatch
    if (typeof window === 'undefined' || !isHydrated) {
      const englishTranslations = translations['en'];
      return englishTranslations?.[key] || key;
    }
    
    const currentTranslations = translations[language];
    return currentTranslations?.[key] || key;
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook for using the language context
export const useLanguage = () => useContext(LanguageContext);