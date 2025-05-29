'use client';

import React from 'react';
import { useLanguage } from '@justsplit/ui-components';
import styles from './page.module.css';

export default function RoadmapPage() {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>{t('roadmapPage.title')}</h1>
          <p className={styles.subtitle}>{t('roadmapPage.subtitle')}</p>
        </div>
      </section>

      {/* Roadmap Phases */}
      <section className={styles.roadmapSection}>
        <div className={styles.sectionContent}>
          <div className={styles.phasesContainer}>
            <div className={`${styles.phaseCard} ${styles.currentPhase}`}>
              <div className={styles.phaseHeader}>
                <div className={styles.phaseNumber}>1</div>
                <div className={styles.phaseStatus}>Current</div>
              </div>
              <h3 className={styles.phaseTitle}>{t('roadmapPage.phase1Title')}</h3>
              <p className={styles.phaseText}>{t('roadmapPage.phase1Text')}</p>
              <div className={styles.phaseApps}>
                <div className={styles.appTag}>Hub</div>
                <div className={styles.appTag}>JustSplit</div>
                <div className={styles.appTag}>Website</div>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{width: '75%'}}></div>
              </div>
              <span className={styles.progressText}>{t('roadmapPage.progressComplete')}</span>
            </div>

            <div className={styles.phaseCard}>
              <div className={styles.phaseHeader}>
                <div className={styles.phaseNumber}>2</div>
                <div className={styles.phaseStatus}>Next</div>
              </div>
              <h3 className={styles.phaseTitle}>{t('roadmapPage.phase2Title')}</h3>
              <p className={styles.phaseText}>{t('roadmapPage.phase2Text')}</p>
              <div className={styles.phaseApps}>
                <div className={styles.appTag}>Somos</div>
                <div className={styles.appTag}>Demos</div>
                <div className={styles.appTag}>Plantopia</div>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{width: '10%'}}></div>
              </div>
              <span className={styles.progressText}>{t('roadmapPage.planningPhase')}</span>
            </div>

            <div className={styles.phaseCard}>
              <div className={styles.phaseHeader}>
                <div className={styles.phaseNumber}>3</div>
                <div className={styles.phaseStatus}>Future</div>
              </div>
              <h3 className={styles.phaseTitle}>{t('roadmapPage.phase3Title')}</h3>
              <p className={styles.phaseText}>{t('roadmapPage.phase3Text')}</p>
              <div className={styles.phaseApps}>
                <div className={styles.appTag}>30+ Apps</div>
                <div className={styles.appTag}>Integration</div>
                <div className={styles.appTag}>Ecosystem</div>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{width: '0%'}}></div>
              </div>
              <span className={styles.progressText}>{t('roadmapPage.planned')}</span>
            </div>

            <div className={styles.phaseCard}>
              <div className={styles.phaseHeader}>
                <div className={styles.phaseNumber}>4</div>
                <div className={styles.phaseStatus}>Vision</div>
              </div>
              <h3 className={styles.phaseTitle}>{t('roadmapPage.phase4Title')}</h3>
              <p className={styles.phaseText}>{t('roadmapPage.phase4Text')}</p>
              <div className={styles.phaseApps}>
                <div className={styles.appTag}>P2P Networks</div>
                <div className={styles.appTag}>Blockchain</div>
                <div className={styles.appTag}>Decentralized</div>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{width: '0%'}}></div>
              </div>
              <span className={styles.progressText}>{t('roadmapPage.longTermVision')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className={styles.milestonesSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>{t('roadmapPage.milestonesTitle')}</h2>
          <div className={styles.milestonesGrid}>
            <div className={styles.milestoneCard}>
              <div className={styles.milestoneIcon}>🎯</div>
              <h3 className={styles.milestoneTitle}>{t('roadmapPage.currentFocusTitle')}</h3>
              <p className={styles.milestoneText}>{t('roadmapPage.currentMilestone')}</p>
              <div className={styles.milestoneStatus}>{t('roadmapPage.inProgressStatus')}</div>
            </div>
            <div className={styles.milestoneCard}>
              <div className={styles.milestoneIcon}>🚀</div>
              <h3 className={styles.milestoneTitle}>{t('roadmapPage.nextQuarterTitle')}</h3>
              <p className={styles.milestoneText}>{t('roadmapPage.nextMilestone')}</p>
              <div className={styles.milestoneStatus}>{t('roadmapPage.q2Status')}</div>
            </div>
            <div className={styles.milestoneCard}>
              <div className={styles.milestoneIcon}>🌟</div>
              <h3 className={styles.milestoneTitle}>{t('roadmapPage.longTermTitle')}</h3>
              <p className={styles.milestoneText}>{t('roadmapPage.futureMilestone')}</p>
              <div className={styles.milestoneStatus}>{t('roadmapPage.timeframeStatus')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Visualization */}
      <section className={styles.timelineSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>{t('roadmapPage.timelineTitle')}</h2>
          <div className={styles.timelineVisualization}>
            <div className={styles.timelineLine}></div>
            <div className={styles.timelinePoint} data-year="2024">
              <div className={styles.timelineMarker}></div>
              <div className={styles.timelineLabel}>
                <strong>2024</strong>
                <span>{t('roadmapPage.timeline2024')}</span>
              </div>
            </div>
            <div className={styles.timelinePoint} data-year="2025">
              <div className={styles.timelineMarker}></div>
              <div className={styles.timelineLabel}>
                <strong>2025</strong>
                <span>{t('roadmapPage.timeline2025')}</span>
              </div>
            </div>
            <div className={styles.timelinePoint} data-year="2027">
              <div className={styles.timelineMarker}></div>
              <div className={styles.timelineLabel}>
                <strong>2027</strong>
                <span>{t('roadmapPage.timeline2027')}</span>
              </div>
            </div>
            <div className={styles.timelinePoint} data-year="2030">
              <div className={styles.timelineMarker}></div>
              <div className={styles.timelineLabel}>
                <strong>2030+</strong>
                <span>{t('roadmapPage.timeline2030')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>{t('roadmapPage.ctaTitle')}</h2>
          <p className={styles.ctaText}>
            {t('roadmapPage.ctaText')}
          </p>
          <div className={styles.ctaButtons}>
            <a href="/applications" className={styles.ctaButton}>
              {t('roadmapPage.ctaButton')}
            </a>
            <a href="/vision" className={styles.ctaButtonSecondary}>
              {t('roadmapPage.ctaButtonSecondary')}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}