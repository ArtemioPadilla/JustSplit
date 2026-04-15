'use client';

import React from 'react';
import { useLanguage, LanguageType } from './LanguageContext';
import styles from './LanguageSelector.module.css';

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className = '' }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();
  
  const languages: { value: LanguageType; label: string; flag: string }[] = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'es', label: 'Español', flag: '🇲🇽' }
  ];
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as LanguageType;
    setLanguage(newLanguage);
  };
  
  return (
    <div className={`${styles.languageSelector} ${className}`}>
      <label htmlFor="language-selector" className={styles.label}>
        {t('language')}:
      </label>
      <select 
        id="language-selector"
        value={language}
        onChange={handleChange}
        className={styles.select}
        aria-label={t('language')}
      >
        {languages.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}