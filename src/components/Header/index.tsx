'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import styles from './styles.module.css';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const pathname = usePathname();
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when path changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
              onError={() => setImageError(true)}
              priority
            />
          )}
        </Link>
        
        <button 
          className={styles.mobileMenuButton} 
          onClick={toggleMobileMenu}
          aria-label="Toggle Menu"
        >
          <span className={styles.menuIcon}></span>
        </button>
        
        <nav className={`${styles.nav} ${isMobileMenuOpen ? styles.mobileOpen : ''}`}>
          <Link 
            href="/" 
            className={`${styles.navLink} ${pathname === '/' ? styles.active : ''}`}
          >
            Home
          </Link>
          <Link 
            href="/events" 
            className={`${styles.navLink} ${pathname?.startsWith('/events') ? styles.active : ''}`}
          >
            Events
          </Link>
          <Link 
            href="/expenses" 
            className={`${styles.navLink} ${pathname?.startsWith('/expenses') ? styles.active : ''}`}
          >
            Expenses
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
          <Link 
            href="/profile" 
            className={`${styles.navLink} ${pathname?.startsWith('/profile') ? styles.active : ''}`}
          >
            Profile
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
