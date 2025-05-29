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
  
  // Initialize state from local storage if available
  const [language, setLanguageState] = useState<LanguageType>('en');
  const [translations, setTranslations] = useState<TranslationsMap>(mergedTranslations);
  
  // Check localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'es')) {
        setLanguageState(savedLanguage);
      } else {
        // Use browser language if available
        const browserLang = navigator.language.split('-')[0];
        if (browserLang === 'es') {
          setLanguageState('es');
        }
      }
    }
  }, []);
  
  // Update localStorage when language changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      // Document lang attribute for accessibility
      document.documentElement.setAttribute('lang', language);
    }
  }, [language]);
  
  // Set language helper
  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
  };
  
  // Translation helper function
  const t = (key: string): string => {
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