'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBars, FaTimes } from 'react-icons/fa';
import { Logo, ThemeToggle, LanguageSelector, useLanguage } from '@justsplit/ui-components';
import styles from './Header.module.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navLinks = [
    { href: '/', label: t('navigation.home') || 'Home' },
    { href: '/portfolio', label: t('navigation.portfolio') || 'Solutions' },
    { href: '/about', label: t('navigation.about') || 'About Us' },
    { href: '/help', label: t('navigation.help') || 'Help' },
  ];

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
              className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.toggleContainer}>
          <ThemeToggle />
          <LanguageSelector />
          <button className={styles.menuToggle} onClick={toggleMenu}>
            {isMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>
    </header>
  );
}