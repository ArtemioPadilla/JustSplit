'use client';

import React, { useState } from 'react';
import { useLanguage } from '@justsplit/ui-components';
import styles from './page.module.css';

export default function ApplicationsPage() {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('current');

  const categories = [
    { id: 'current', name: t('applicationsPage.currentAppsTitle'), icon: '🏃' },
    { id: 'priority', name: t('applicationsPage.priorityAppsTitle'), icon: '⭐' },
    { id: 'future', name: t('applicationsPage.futureAppsTitle'), icon: '🚀' },
  ];

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>{t('applicationsPage.title')}</h1>
          <p className={styles.subtitle}>{t('applicationsPage.subtitle')}</p>
        </div>
      </section>

      {/* Category Tabs */}
      <section className={styles.categorySection}>
        <div className={styles.sectionContent}>
          <div className={styles.categoryTabs}>
            {categories.map(category => (
              <button
                key={category.id}
                className={`${styles.categoryTab} ${selectedCategory === category.id ? styles.active : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <span className={styles.categoryIcon}>{category.icon}</span>
                <span className={styles.categoryName}>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Current Applications */}
      {selectedCategory === 'current' && (
        <section className={styles.appsSection}>
          <div className={styles.sectionContent}>
            <div className={styles.appsGrid}>
              <div className={styles.appCard}>
                <div className={styles.appIcon}>🏢</div>
                <h3 className={styles.appTitle}>{t('applicationsPage.hubTitle')}</h3>
                <p className={styles.appDescription}>{t('applicationsPage.hubDescription')}</p>
                <div className={styles.appStatus}>
                  <span className={styles.statusBadge}>Live</span>
                </div>
                <a href="https://hub.cybere.co" className={styles.appLink} target="_blank" rel="noopener noreferrer">
                  Visit Application →
                </a>
              </div>

              <div className={styles.appCard}>
                <div className={styles.appIcon}>💰</div>
                <h3 className={styles.appTitle}>{t('applicationsPage.justSplitTitle')}</h3>
                <p className={styles.appDescription}>{t('applicationsPage.justSplitDescription')}</p>
                <div className={styles.appStatus}>
                  <span className={styles.statusBadge}>Live</span>
                </div>
                <a href="https://justsplit.cybere.co" className={styles.appLink} target="_blank" rel="noopener noreferrer">
                  Visit Application →
                </a>
              </div>

              <div className={styles.appCard}>
                <div className={styles.appIcon}>🌐</div>
                <h3 className={styles.appTitle}>CyberEco Website</h3>
                <p className={styles.appDescription}>Central marketing and information hub for the entire CyberEco ecosystem.</p>
                <div className={styles.appStatus}>
                  <span className={styles.statusBadge}>Live</span>
                </div>
                <a href="/" className={styles.appLink}>
                  You're Here →
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Priority Applications */}
      {selectedCategory === 'priority' && (
        <section className={styles.appsSection}>
          <div className={styles.sectionContent}>
            <div className={styles.appsGrid}>
              <div className={styles.appCard}>
                <div className={styles.appIcon}>👨‍👩‍👧‍👦</div>
                <h3 className={styles.appTitle}>{t('applicationsPage.somosTitle')}</h3>
                <p className={styles.appDescription}>{t('applicationsPage.somosDescription')}</p>
                <div className={styles.appStatus}>
                  <span className={styles.statusBadge} data-status="development">In Development</span>
                </div>
                <div className={styles.appFeatures}>
                  <span className={styles.featureTag}>Family Trees</span>
                  <span className={styles.featureTag}>Cultural Heritage</span>
                  <span className={styles.featureTag}>Community Building</span>
                </div>
              </div>

              <div className={styles.appCard}>
                <div className={styles.appIcon}>🏛️</div>
                <h3 className={styles.appTitle}>{t('applicationsPage.demosTitle')}</h3>
                <p className={styles.appDescription}>{t('applicationsPage.demosDescription')}</p>
                <div className={styles.appStatus}>
                  <span className={styles.statusBadge} data-status="planning">Planning</span>
                </div>
                <div className={styles.appFeatures}>
                  <span className={styles.featureTag}>Secure Voting</span>
                  <span className={styles.featureTag}>Proposals</span>
                  <span className={styles.featureTag}>Governance</span>
                </div>
              </div>

              <div className={styles.appCard}>
                <div className={styles.appIcon}>🌱</div>
                <h3 className={styles.appTitle}>{t('applicationsPage.plantopiaTitle')}</h3>
                <p className={styles.appDescription}>{t('applicationsPage.plantopiaDescription')}</p>
                <div className={styles.appStatus}>
                  <span className={styles.statusBadge} data-status="planning">Planning</span>
                </div>
                <div className={styles.appFeatures}>
                  <span className={styles.featureTag}>Smart Sensors</span>
                  <span className={styles.featureTag}>Plant Care</span>
                  <span className={styles.featureTag}>Sustainability</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Future Ecosystem */}
      {selectedCategory === 'future' && (
        <section className={styles.appsSection}>
          <div className={styles.sectionContent}>
            <div className={styles.ecosystemOverview}>
              <h2 className={styles.ecosystemTitle}>{t('applicationsPage.ecosystemVisionTitle')}</h2>
              <p className={styles.ecosystemText}>{t('applicationsPage.ecosystemVisionText')}</p>
            </div>

            <div className={styles.categoriesGrid}>
              <div className={styles.categoryCard}>
                <div className={styles.categoryIcon}>💰</div>
                <h3 className={styles.categoryTitle}>Finance & Economy</h3>
                <div className={styles.categoryApps}>
                  <span>MyWealth</span>
                  <span>MyBusiness</span>
                  <span>CrowdFund</span>
                  <span>OfferMe</span>
                </div>
              </div>

              <div className={styles.categoryCard}>
                <div className={styles.categoryIcon}>🌱</div>
                <h3 className={styles.categoryTitle}>Sustainability & Home</h3>
                <div className={styles.categoryApps}>
                  <span>EcoTul</span>
                  <span>MyHome</span>
                  <span>GreenLiving</span>
                </div>
              </div>

              <div className={styles.categoryCard}>
                <div className={styles.categoryIcon}>📚</div>
                <h3 className={styles.categoryTitle}>Education & Growth</h3>
                <div className={styles.categoryApps}>
                  <span>Education Hub</span>
                  <span>Skill Share</span>
                  <span>Habits</span>
                  <span>One Step</span>
                </div>
              </div>

              <div className={styles.categoryCard}>
                <div className={styles.categoryIcon}>❤️</div>
                <h3 className={styles.categoryTitle}>Health & Wellness</h3>
                <div className={styles.categoryApps}>
                  <span>Healthy</span>
                  <span>PetPal</span>
                  <span>Mindful</span>
                </div>
              </div>

              <div className={styles.categoryCard}>
                <div className={styles.categoryIcon}>🔐</div>
                <h3 className={styles.categoryTitle}>Identity & Legal</h3>
                <div className={styles.categoryApps}>
                  <span>LawPal</span>
                  <span>MyData</span>
                  <span>DigitalMe</span>
                  <span>MyDocs</span>
                </div>
              </div>

              <div className={styles.categoryCard}>
                <div className={styles.categoryIcon}>✈️</div>
                <h3 className={styles.categoryTitle}>Travel & Discovery</h3>
                <div className={styles.categoryApps}>
                  <span>TravelMate</span>
                  <span>EventConnect</span>
                  <span>LocalWonders</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to Explore?</h2>
          <p className={styles.ctaText}>
            Start with our current applications and be part of building the future ecosystem.
          </p>
          <div className={styles.ctaButtons}>
            <a href="/portfolio" className={styles.ctaButton}>
              View All Solutions
            </a>
            <a href="/roadmap" className={styles.ctaButtonSecondary}>
              Development Roadmap
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}