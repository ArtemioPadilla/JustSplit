'use client';

import React from 'react';
import Image from 'next/image';
import { useLanguage } from '@cybereco/ui-components';
import styles from './Hero.module.css';

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section className={styles.hero}>
      <Image
        src="/images/hero-background.jpg"
        alt="Hero background"
        fill
        className={styles.heroBackgroundImage}
        priority
      />
      <div className={styles.heroOverlay} />
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>{t('hero.title')}</h1>
        <p className={styles.heroSubtitle}>{t('hero.subtitle')}</p>
        <a href="#features" className={styles.heroButton}>
          {t('hero.cta')}
        </a>
      </div>
    </section>
  );
}