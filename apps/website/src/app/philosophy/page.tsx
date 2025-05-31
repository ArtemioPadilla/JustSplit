'use client';

import React from 'react';
import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function PhilosophyPage() {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>{t('philosophyPage.title')}</h1>
          <p className={styles.subtitle}>🌟 {t('philosophyPage.subtitle')}</p>
        </div>
      </section>

      {/* Manifesto Section */}
      <section className={styles.manifestoSection}>
        <div className={styles.manifestoCard}>
          <h2 className={styles.manifestoTitle}>🎯 {t('philosophyPage.manifestoTitle')}</h2>
          <blockquote className={styles.manifestoQuote}>
            "{t('philosophyPage.manifestoQuote')}"
          </blockquote>
          <div className={styles.manifestoBeliefs}>
            <h3>{t('philosophyPage.manifestoBeliefTitle')}</h3>
            <ul>
              <li><strong>{t('philosophyPage.manifestoBelief1')}</strong></li>
              <li><strong>{t('philosophyPage.manifestoBelief2')}</strong></li>
              <li><strong>{t('philosophyPage.manifestoBelief3')}</strong></li>
              <li><strong>{t('philosophyPage.manifestoBelief4')}</strong></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className={styles.principlesSection}>
        <h2 className={styles.sectionTitle}>🌱 {t('philosophyPage.principlesSectionTitle')}</h2>
        <div className={styles.principlesGrid}>
          <div className={styles.principleCard}>
            <div className={styles.principleIcon}>🔐</div>
            <h3 className={styles.principleTitle}>{t('philosophyPage.digitalSovereigntyTitle')}</h3>
            <p className={styles.principleQuote}>"{t('philosophyPage.digitalSovereigntyQuote')}"</p>
            <div className={styles.principleDetails}>
              <h4>{t('philosophyPage.digitalSovereigntyMeansTitle')}</h4>
              <ul>
                <li>{t('philosophyPage.digitalSovereigntyMeans1')}</li>
                <li>{t('philosophyPage.digitalSovereigntyMeans2')}</li>
                <li>{t('philosophyPage.digitalSovereigntyMeans3')}</li>
                <li>{t('philosophyPage.digitalSovereigntyMeans4')}</li>
              </ul>
              <h4>{t('philosophyPage.digitalSovereigntyImplTitle')}</h4>
              <ul>
                <li>{t('philosophyPage.digitalSovereigntyImpl1')}</li>
                <li>{t('philosophyPage.digitalSovereigntyImpl2')}</li>
                <li>{t('philosophyPage.digitalSovereigntyImpl3')}</li>
                <li>{t('philosophyPage.digitalSovereigntyImpl4')}</li>
              </ul>
            </div>
          </div>

          <div className={styles.principleCard}>
            <div className={styles.principleIcon}>🌱</div>
            <h3 className={styles.principleTitle}>{t('philosophyPage.wellbeingTitle')}</h3>
            <p className={styles.principleQuote}>"{t('philosophyPage.wellbeingQuote')}"</p>
            <div className={styles.principleDetails}>
              <h4>{t('philosophyPage.wellbeingMeansTitle')}</h4>
              <ul>
                <li>{t('philosophyPage.wellbeingMeans1')}</li>
                <li>{t('philosophyPage.wellbeingMeans2')}</li>
                <li>{t('philosophyPage.wellbeingMeans3')}</li>
                <li>{t('philosophyPage.wellbeingMeans4')}</li>
              </ul>
              <h4>{t('philosophyPage.wellbeingImplTitle')}</h4>
              <ul>
                <li>{t('philosophyPage.wellbeingImpl1')}</li>
                <li>{t('philosophyPage.wellbeingImpl2')}</li>
                <li>{t('philosophyPage.wellbeingImpl3')}</li>
                <li>{t('philosophyPage.wellbeingImpl4')}</li>
              </ul>
            </div>
          </div>

          <div className={styles.principleCard}>
            <div className={styles.principleIcon}>🔗</div>
            <h3 className={styles.principleTitle}>{t('philosophyPage.interconnectionTitle')}</h3>
            <p className={styles.principleQuote}>"{t('philosophyPage.interconnectionQuote')}"</p>
            <div className={styles.principleDetails}>
              <h4>{t('philosophyPage.interconnectionMeansTitle')}</h4>
              <ul>
                <li>{t('philosophyPage.interconnectionMeans1')}</li>
                <li>{t('philosophyPage.interconnectionMeans2')}</li>
                <li>{t('philosophyPage.interconnectionMeans3')}</li>
                <li>{t('philosophyPage.interconnectionMeans4')}</li>
              </ul>
              <h4>{t('philosophyPage.interconnectionImplTitle')}</h4>
              <ul>
                <li>{t('philosophyPage.interconnectionImpl1')}</li>
                <li>{t('philosophyPage.interconnectionImpl2')}</li>
                <li>{t('philosophyPage.interconnectionImpl3')}</li>
                <li>{t('philosophyPage.interconnectionImpl4')}</li>
              </ul>
            </div>
          </div>

          <div className={styles.principleCard}>
            <div className={styles.principleIcon}>🤝</div>
            <h3 className={styles.principleTitle}>{t('philosophyPage.communityTitle')}</h3>
            <p className={styles.principleQuote}>"{t('philosophyPage.communityQuote')}"</p>
            <div className={styles.principleDetails}>
              <h4>{t('philosophyPage.communityMeansTitle')}</h4>
              <ul>
                <li>{t('philosophyPage.communityMeans1')}</li>
                <li>{t('philosophyPage.communityMeans2')}</li>
                <li>{t('philosophyPage.communityMeans3')}</li>
                <li>{t('philosophyPage.communityMeans4')}</li>
              </ul>
              <h4>{t('philosophyPage.communityImplTitle')}</h4>
              <ul>
                <li>{t('philosophyPage.communityImpl1')}</li>
                <li>{t('philosophyPage.communityImpl2')}</li>
                <li>{t('philosophyPage.communityImpl3')}</li>
                <li>{t('philosophyPage.communityImpl4')}</li>
              </ul>
            </div>
          </div>

          <div className={styles.principleCard}>
            <div className={styles.principleIcon}>📖</div>
            <h3 className={styles.principleTitle}>{t('philosophyPage.opennessTitle')}</h3>
            <p className={styles.principleQuote}>"{t('philosophyPage.opennessQuote')}"</p>
            <div className={styles.principleDetails}>
              <h4>{t('philosophyPage.opennessMeansTitle')}</h4>
              <ul>
                <li>{t('philosophyPage.opennessMeans1')}</li>
                <li>{t('philosophyPage.opennessMeans2')}</li>
                <li>{t('philosophyPage.opennessMeans3')}</li>
                <li>{t('philosophyPage.opennessMeans4')}</li>
              </ul>
              <h4>{t('philosophyPage.opennessImplTitle')}</h4>
              <ul>
                <li>{t('philosophyPage.opennessImpl1')}</li>
                <li>{t('philosophyPage.opennessImpl2')}</li>
                <li>{t('philosophyPage.opennessImpl3')}</li>
                <li>{t('philosophyPage.opennessImpl4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>{t('philosophyPage.ctaTitle')}</h2>
          <p className={styles.ctaText}>
            {t('philosophyPage.ctaText')}
          </p>
          <div className={styles.ctaButtons}>
            <a href="/portfolio" className={styles.ctaButton}>
              {t('philosophyPage.ctaButton')}
            </a>
            <a href="/vision" className={styles.ctaButtonSecondary}>
              {t('philosophyPage.ctaButtonSecondary')}
            </a>
          </div>
        </div>
      </section>

      {/* Implementation Section */}
      <section className={styles.implementationSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>🚀 {t('philosophyPage.implementationTitle')}</h2>
          <p className={styles.sectionDescription}>
            {t('philosophyPage.implementationText')}
          </p>
          <div className={styles.actionGrid}>
            <div className={styles.actionCard}>
              <h4>🔒 {t('philosophyPage.privacyTitle')}</h4>
              <p>{t('philosophyPage.privacyText')}</p>
            </div>
            <div className={styles.actionCard}>
              <h4>🌐 {t('philosophyPage.decentralizedTitle')}</h4>
              <p>{t('philosophyPage.decentralizedText')}</p>
            </div>
            <div className={styles.actionCard}>
              <h4>💡 {t('philosophyPage.innovationTitle')}</h4>
              <p>{t('philosophyPage.innovationText')}</p>
            </div>
            <div className={styles.actionCard}>
              <h4>🎯 {t('philosophyPage.humanCenteredTitle')}</h4>
              <p>{t('philosophyPage.humanCenteredText')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}