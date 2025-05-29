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

      {/* Current Focus Section */}
      <section className={styles.currentFocusSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>🎯 Current Development Focus</h2>
          <div className={styles.focusGrid}>
            <div className={styles.focusCard}>
              <div className={styles.focusIcon}>🔧</div>
              <h3 className={styles.focusTitle}>Critical Fixes</h3>
              <div className={styles.focusDetails}>
                <h4>JustSplit Stabilization:</h4>
                <ul>
                  <li>Fix component prop type errors</li>
                  <li>Implement proper data flow patterns</li>
                  <li>Add comprehensive error boundaries</li>
                  <li>Resolve TypeScript compilation issues</li>
                </ul>
              </div>
              <div className={styles.focusStatus}>🔄 In Progress</div>
            </div>

            <div className={styles.focusCard}>
              <div className={styles.focusIcon}>🏢</div>
              <h3 className={styles.focusTitle}>Hub Development</h3>
              <div className={styles.focusDetails}>
                <h4>Core Authentication:</h4>
                <ul>
                  <li>User registration and login forms</li>
                  <li>Password reset functionality</li>
                  <li>Application launcher dashboard</li>
                  <li>Cross-app session management</li>
                </ul>
              </div>
              <div className={styles.focusStatus}>📋 Planned</div>
            </div>

            <div className={styles.focusCard}>
              <div className={styles.focusIcon}>🔗</div>
              <h3 className={styles.focusTitle}>Integration</h3>
              <div className={styles.focusDetails}>
                <h4>Cross-App Features:</h4>
                <ul>
                  <li>JWT token-based authentication</li>
                  <li>User profile synchronization</li>
                  <li>Unified navigation experience</li>
                  <li>Shared component libraries</li>
                </ul>
              </div>
              <div className={styles.focusStatus}>⏳ Next Quarter</div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Roadmap */}
      <section className={styles.technicalSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>🛠️ Technical Evolution</h2>
          <div className={styles.evolutionTimeline}>
            <div className={styles.evolutionPhase}>
              <h3>Phase 1: Centralized Foundation (2025-2026)</h3>
              <p>Build robust applications on traditional infrastructure</p>
              <div className={styles.techStack}>
                <span>Firebase</span>
                <span>Next.js</span>
                <span>TypeScript</span>
                <span>NX Monorepo</span>
              </div>
            </div>
            <div className={styles.evolutionPhase}>
              <h3>Phase 2: Privacy Enhancement (2026-2028)</h3>
              <p>Implement advanced privacy features and user control</p>
              <div className={styles.techStack}>
                <span>Client-side Encryption</span>
                <span>Local-first Data</span>
                <span>Zero-trust Architecture</span>
              </div>
            </div>
            <div className={styles.evolutionPhase}>
              <h3>Phase 3: Hybrid Systems (2028-2030)</h3>
              <p>Bridge centralized and decentralized architectures</p>
              <div className={styles.techStack}>
                <span>P2P Protocols</span>
                <span>Blockchain Integration</span>
                <span>Mobile Node Networks</span>
              </div>
            </div>
            <div className={styles.evolutionPhase}>
              <h3>Phase 4: Full Decentralization (2030+)</h3>
              <p>Complete transition to user-sovereign architecture</p>
              <div className={styles.techStack}>
                <span>Self-Sovereign Identity</span>
                <span>Zero-Knowledge Proofs</span>
                <span>Token Economics</span>
              </div>
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
            <a href="/portfolio" className={styles.ctaButton}>
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