'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import styles from './styles.module.css';
import { useAppContext } from '../../context/AppContext';
import IconButton from '../../components/ui/IconButton';

// Custom hook for media queries
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Mock implementation for testing environments
    if (typeof window.matchMedia !== 'function') {
      // Default to desktop view in test environment
      return;
    }

    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => {
      setMatches(media.matches);
    };
    
    // Add event listener
    media.addEventListener("change", listener);
    
    // Clean up
    return () => {
      media.removeEventListener("change", listener);
    };
  }, [matches, query]);

  return matches;
};

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const pathname = usePathname();
  const { state } = useAppContext();
  const currentUser = state?.currentUser; // Get the current logged-in user instead of first user in array
  
  // Check if we're on mobile
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when path changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logoContainer}>
          {/* Display text logo if image fails to load */}
          {imageError ? (
            <div className={styles.logoText}>JustSplit</div>
          ) : (
            <Image 
              src="/images/justsplit-logo.png" 
              alt="JustSplit Logo" 
              width={150}
              height={40}
              className={styles.logo}
              onError={handleImageError}
              priority
            />
          )}
        </Link>
        
        {/* Only render the button on mobile */}
        {isMobile && (
          <IconButton 
            onClick={toggleMobileMenu}
            variant={isMobileMenuOpen ? 'close' : 'sandwich'}
            ariaLabel={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            className={styles.mobileMenuButton}
          />
        )}
        
        <nav className={`${styles.nav} ${isMobileMenuOpen ? styles.mobileOpen : ''}`}>
          {/* Home link for all users */}
          <Link 
            href={currentUser ? '/' : '/landing'}
            className={`${styles.navLink} ${pathname === '/' || pathname === '/landing' ? styles.active : ''}`}
          >
            Home
          </Link>
          
          {/* App-specific links only for logged-in users */}
          {currentUser && (
            <>
              <Link 
                href="/expenses" 
                className={`${styles.navLink} ${pathname?.startsWith('/expenses') ? styles.active : ''}`}
              >
                Expenses
              </Link>
              <Link 
                href="/events" 
                className={`${styles.navLink} ${pathname?.startsWith('/events') ? styles.active : ''}`}
              >
                Events
              </Link>
              <Link 
                href="/groups" 
                className={`${styles.navLink} ${pathname?.startsWith('/groups') ? styles.active : ''}`}
              >
                Groups
              </Link>
              <Link 
                href="/friends" 
                className={`${styles.navLink} ${pathname?.startsWith('/friends') ? styles.active : ''}`}
              >
                Friends
              </Link>
              <Link 
                href="/settlements" 
                className={`${styles.navLink} ${pathname?.startsWith('/settlements') ? styles.active : ''}`}
              >
                Settlements
              </Link>
            </>
          )}
          
          {/* Public pages accessible to all users */}
          <Link 
            href="/about" 
            className={`${styles.navLink} ${pathname?.startsWith('/about') ? styles.active : ''}`}
          >
            About
          </Link>
          <Link 
            href="/help" 
            className={`${styles.navLink} ${pathname?.startsWith('/help') ? styles.active : ''}`}
          >
            Help
          </Link>
          
          {/* Authentication links or user profile */}
          {currentUser ? (
            <Link 
              href="/profile" 
              className={`${styles.userProfile} ${pathname?.startsWith('/profile') ? styles.active : ''}`}
              data-testid="user-profile"
            >
              <span className={styles.userProfileIcon}>👤</span>
              {currentUser.name}
            </Link>
          ) : (
            <>
              <Link 
                href="/auth/signin"
                className={`${styles.navLink} ${pathname?.startsWith('/auth/signin') ? styles.active : ''}`}
              >
                Log In
              </Link>
              <Link
                href="/auth/signup"
                className={`${styles.navLink} ${styles.signupBtn} ${pathname?.startsWith('/auth/signup') ? styles.active : ''}`}
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
