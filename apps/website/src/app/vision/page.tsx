'use client';

import React from 'react';
import { useLanguage } from '@justsplit/ui-components';
import styles from './page.module.css';

export default function VisionPage() {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>{t('visionPage.title')}</h1>
          <p className={styles.subtitle}>{t('visionPage.subtitle')}</p>
        </div>
      </section>

      {/* Current State */}
      <section className={styles.currentSection}>
        <div className={styles.sectionContent}>
          <div className={styles.currentCard}>
            <h2 className={styles.sectionTitle}>{t('visionPage.currentStateTitle')}</h2>
            <p className={styles.sectionText}>{t('visionPage.currentStateText')}</p>
            <div className={styles.currentApps}>
              <div className={styles.appItem}>
                <div className={styles.appIcon}>🏢</div>
                <span>CyberEco Hub</span>
              </div>
              <div className={styles.appItem}>
                <div className={styles.appIcon}>💰</div>
                <span>JustSplit</span>
              </div>
              <div className={styles.appItem}>
                <div className={styles.appIcon}>🌐</div>
                <span>Website</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future Vision */}
      <section className={styles.futureSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>{t('visionPage.futureVisionTitle')}</h2>
          <p className={styles.sectionText}>{t('visionPage.futureVisionText')}</p>
          
          <div className={styles.visionGrid}>
            <div className={styles.visionCard}>
              <div className={styles.visionIcon}>📱</div>
              <h3 className={styles.visionTitle}>{t('visionPage.p2pNetworksTitle')}</h3>
              <p className={styles.visionText}>{t('visionPage.p2pNetworksText')}</p>
            </div>

            <div className={styles.visionCard}>
              <div className={styles.visionIcon}>🔐</div>
              <h3 className={styles.visionTitle}>{t('visionPage.dataSovereigntyTitle')}</h3>
              <p className={styles.visionText}>{t('visionPage.dataSovereigntyText')}</p>
            </div>

            <div className={styles.visionCard}>
              <div className={styles.visionIcon}>🪙</div>
              <h3 className={styles.visionTitle}>{t('visionPage.participationEconomyTitle')}</h3>
              <p className={styles.visionText}>{t('visionPage.participationEconomyText')}</p>
            </div>

            <div className={styles.visionCard}>
              <div className={styles.visionIcon}>🌍</div>
              <h3 className={styles.visionTitle}>{t('visionPage.globalAccessTitle')}</h3>
              <p className={styles.visionText}>{t('visionPage.globalAccessText')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className={styles.timelineSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>{t('visionPage.timelineTitle')}</h2>
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <div className={styles.timelineMarker}>1</div>
              <div className={styles.timelineContent}>
                <h3>{t('visionPage.phase1Title')}</h3>
                <p>{t('visionPage.phase1Text')}</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <div className={styles.timelineMarker}>2</div>
              <div className={styles.timelineContent}>
                <h3>{t('visionPage.phase2Title')}</h3>
                <p>{t('visionPage.phase2Text')}</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <div className={styles.timelineMarker}>3</div>
              <div className={styles.timelineContent}>
                <h3>{t('visionPage.phase3Title')}</h3>
                <p>{t('visionPage.phase3Text')}</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <div className={styles.timelineMarker}>4</div>
              <div className={styles.timelineContent}>
                <h3>{t('visionPage.phase4Title')}</h3>
                <p>{t('visionPage.phase4Text')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>{t('visionPage.ctaTitle')}</h2>
          <p className={styles.ctaText}>
            {t('visionPage.ctaText')}
          </p>
          <div className={styles.ctaButtons}>
            <a href="/roadmap" className={styles.ctaButton}>
              {t('visionPage.ctaButton')}
            </a>
            <a href="/philosophy" className={styles.ctaButtonSecondary}>
              {t('visionPage.ctaButtonSecondary')}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}