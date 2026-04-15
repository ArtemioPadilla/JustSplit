'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaCog, FaSun, FaMoon, FaGlobe, FaCheck } from 'react-icons/fa';
import { ThemeToggle, LanguageSelector, useTheme, useLanguage } from '@cybereco/ui-components';
import styles from './ConfigDropdown.module.css';

interface ConfigDropdownProps {
  className?: string;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export default function ConfigDropdown({ 
  className,
  isOpen: controlledIsOpen,
  onToggle
}: ConfigDropdownProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onToggle || setInternalIsOpen;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, setIsOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, setIsOpen]);

  const handleThemeToggle = () => {
    toggleTheme();
    // Optional: close dropdown after action
    // setIsOpen(false);
  };

  const handleLanguageChange = (lang: 'en' | 'es') => {
    setLanguage(lang);
    // Optional: close dropdown after action
    // setIsOpen(false);
  };

  return (
    <div className={`${styles.configDropdown} ${className || ''}`} ref={dropdownRef}>
      <button
        className={`${styles.configButton} ${isOpen ? styles.active : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('navigation.settings') || 'Settings'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <FaCog className={`${styles.configIcon} ${isOpen ? styles.spinning : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu} role="menu">
          <div className={styles.dropdownHeader}>
            <h3 className={styles.dropdownTitle}>
              {t('navigation.settings') || 'Settings'}
            </h3>
          </div>

          <div className={styles.dropdownSection}>
            <div className={styles.sectionHeader}>
              <FaSun className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>
                {t('theme.title') || 'Theme'}
              </span>
            </div>
            <div className={styles.themeOptions}>
              <button
                className={`${styles.themeOption} ${theme === 'light' ? styles.selected : ''}`}
                onClick={handleThemeToggle}
                role="menuitem"
              >
                <FaSun className={styles.themeIcon} />
                <span>{t('theme.light') || 'Light'}</span>
                {theme === 'light' && <FaCheck className={styles.checkIcon} />}
              </button>
              <button
                className={`${styles.themeOption} ${theme === 'dark' ? styles.selected : ''}`}
                onClick={handleThemeToggle}
                role="menuitem"
              >
                <FaMoon className={styles.themeIcon} />
                <span>{t('theme.dark') || 'Dark'}</span>
                {theme === 'dark' && <FaCheck className={styles.checkIcon} />}
              </button>
            </div>
          </div>

          <div className={styles.dropdownSection}>
            <div className={styles.sectionHeader}>
              <FaGlobe className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>
                {t('language.title') || 'Language'}
              </span>
            </div>
            <div className={styles.languageOptions}>
              <button
                className={`${styles.languageOption} ${language === 'en' ? styles.selected : ''}`}
                onClick={() => handleLanguageChange('en')}
                role="menuitem"
              >
                <span className={styles.languageFlag}>🇺🇸</span>
                <span>English</span>
                {language === 'en' && <FaCheck className={styles.checkIcon} />}
              </button>
              <button
                className={`${styles.languageOption} ${language === 'es' ? styles.selected : ''}`}
                onClick={() => handleLanguageChange('es')}
                role="menuitem"
              >
                <span className={styles.languageFlag}>🇪🇸</span>
                <span>Español</span>
                {language === 'es' && <FaCheck className={styles.checkIcon} />}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}