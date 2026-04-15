'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBars, FaTimes, FaRocket, FaExternalLinkAlt } from 'react-icons/fa';
import { Logo, useLanguage } from '@cybereco/ui-components';
import ConfigDropdown from './ConfigDropdown';
import styles from './Header.module.css';

// Local storage key for header state
const HEADER_STATE_KEY = 'cybereco-header-state';

interface HeaderState {
  lastMenuState: boolean;
  configDropdownOpen: boolean;
  userPreferences: {
    rememberMenuState: boolean;
  };
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [headerState, setHeaderState] = useState<HeaderState>({
    lastMenuState: false,
    configDropdownOpen: false,
    userPreferences: {
      rememberMenuState: true
    }
  });
  const pathname = usePathname();
  const { t } = useLanguage();

  // Load header state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(HEADER_STATE_KEY);
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          setHeaderState(prev => ({
            ...prev,
            ...parsedState,
            // Merge user preferences to ensure all keys exist
            userPreferences: {
              ...prev.userPreferences,
              ...parsedState.userPreferences
            }
          }));
          
          // Restore menu state if preference is enabled
          if (parsedState.userPreferences?.rememberMenuState && parsedState.lastMenuState) {
            setIsMenuOpen(true);
          }
        } catch (error) {
          console.warn('Failed to parse header state:', error);
        }
      }
    }
  }, []);

  // Debounced save to localStorage to prevent excessive writes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(HEADER_STATE_KEY, JSON.stringify(headerState));
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [headerState]);

  const toggleMenu = () => {
    const newMenuState = !isMenuOpen;
    setIsMenuOpen(newMenuState);
    
    // Update header state with last menu state
    setHeaderState(prev => ({
      ...prev,
      lastMenuState: newMenuState
    }));
  };

  // Function to update config dropdown state
  const setConfigDropdownOpen = (isOpen: boolean) => {
    setHeaderState(prev => ({
      ...prev,
      configDropdownOpen: isOpen
    }));
  };


  const navLinks = [
    { href: '/', label: t('navigation.home') || 'Home' },
    { href: '/portfolio', label: t('navigation.portfolio') || 'Solutions' },
    { href: '/documentation', label: t('navigation.documentation') || 'Documentation' },
    { href: '/about', label: t('navigation.about') || 'About Us' },
    { href: '/help', label: t('navigation.help') || 'Help' },
  ];

  // Helper function to check if a link is active
  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logoContainer}>
          <Link href="/">
            <Logo height={40} />
          </Link>
        </div>

        <nav className={`${styles.navLinks} ${isMenuOpen ? styles.navOpen : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${isActiveLink(link.href) ? styles.active : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.toggleContainer}>
          <a 
            href="https://hub.cybere.co" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.hubButton}
            title={t('navigation.hub') || 'Go to CyberEco Hub'}
          >
            <div className={styles.hubButtonContent}>
              <FaRocket className={styles.hubButtonIcon} />
              <span className={styles.hubButtonText}>
                {t('navigation.hub') || 'Hub'}
              </span>
              <FaExternalLinkAlt className={styles.hubButtonExternal} />
            </div>
            <div className={styles.hubButtonGlow}></div>
          </a>
          <ConfigDropdown 
            isOpen={headerState.configDropdownOpen}
            onToggle={setConfigDropdownOpen}
          />
          <button className={styles.menuToggle} onClick={toggleMenu}>
            {isMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>
    </header>
  );
}