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
          <h2 className={styles.sectionTitle}>🔮 Decentralized Future Vision</h2>
          <p className={styles.sectionText}>By 2030+, CyberEco will transition to a revolutionary decentralized architecture that empowers users with complete data sovereignty and privacy.</p>
          
          <div className={styles.visionGrid}>
            <div className={styles.visionCard}>
              <div className={styles.visionIcon}>📱</div>
              <h3 className={styles.visionTitle}>Mobile P2P Network</h3>
              <p className={styles.visionText}>Transform smartphones into distributed computing nodes, creating a resilient mesh network powered by community participation.</p>
              <div className={styles.visionDetails}>
                <ul>
                  <li>User devices as network infrastructure</li>
                  <li>Mesh networking for resilient connectivity</li>
                  <li>Edge computing for local data processing</li>
                  <li>Community-driven network maintenance</li>
                </ul>
              </div>
            </div>

            <div className={styles.visionCard}>
              <div className={styles.visionIcon}>🔐</div>
              <h3 className={styles.visionTitle}>Complete Data Sovereignty</h3>
              <p className={styles.visionText}>Users maintain full control over their data through cryptographic guarantees and self-sovereign identity systems.</p>
              <div className={styles.visionDetails}>
                <ul>
                  <li>Zero-knowledge proofs for privacy</li>
                  <li>Client-side encryption by default</li>
                  <li>Self-sovereign digital identity</li>
                  <li>Selective data sharing controls</li>
                </ul>
              </div>
            </div>

            <div className={styles.visionCard}>
              <div className={styles.visionIcon}>🪙</div>
              <h3 className={styles.visionTitle}>Token Economics (CYE)</h3>
              <p className={styles.visionText}>Participate in network value creation through token rewards for contributing resources and maintaining network health.</p>
              <div className={styles.visionDetails}>
                <ul>
                  <li>Earn tokens by running network nodes</li>
                  <li>Governance rights through token holding</li>
                  <li>Pay for premium privacy features</li>
                  <li>Community-driven development funding</li>
                </ul>
              </div>
            </div>

            <div className={styles.visionCard}>
              <div className={styles.visionIcon}>🌍</div>
              <h3 className={styles.visionTitle}>Global Accessibility</h3>
              <p className={styles.visionText}>Censorship-resistant platform accessible worldwide without geographic restrictions or corporate gatekeepers.</p>
              <div className={styles.visionDetails}>
                <ul>
                  <li>No geographic restrictions</li>
                  <li>Censorship-resistant architecture</li>
                  <li>Works in low-connectivity areas</li>
                  <li>Community-owned infrastructure</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Architecture */}
      <section className={styles.architectureSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>🏗️ Decentralized Architecture</h2>
          <div className={styles.architectureDiagram}>
            <div className={styles.architectureLayer}>
              <h3>Layer 3: Application Layer</h3>
              <p>Privacy-preserving personal data and application state</p>
              <div className={styles.layerComponents}>
                <span>Personal Data Vaults</span>
                <span>Zero-Knowledge Computations</span>
                <span>Selective Disclosure</span>
              </div>
            </div>
            <div className={styles.architectureLayer}>
              <h3>Layer 2: Protocol Layer</h3>
              <p>Application interactions and cross-app data sharing</p>
              <div className={styles.layerComponents}>
                <span>Smart Contracts</span>
                <span>Cross-App APIs</span>
                <span>Data Synchronization</span>
              </div>
            </div>
            <div className={styles.architectureLayer}>
              <h3>Layer 1: Network Layer</h3>
              <p>Network governance, consensus, and tokenomics</p>
              <div className={styles.layerComponents}>
                <span>Consensus Mechanism</span>
                <span>Token Economics</span>
                <span>Network Governance</span>
              </div>
            </div>
            <div className={styles.architectureLayer}>
              <h3>Device Layer: Mobile Nodes</h3>
              <p>User smartphones as distributed computing infrastructure</p>
              <div className={styles.layerComponents}>
                <span>P2P Networking</span>
                <span>Local Storage</span>
                <span>Edge Computing</span>
              </div>
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