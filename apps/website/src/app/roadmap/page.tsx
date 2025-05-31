'use client';

import React from 'react';
import { useLanguage } from '@cybereco/ui-components';
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
                <div className={styles.phaseStatus}>{t('roadmapPage.currentStatus')}</div>
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
                <div className={styles.phaseStatus}>{t('roadmapPage.nextStatus')}</div>
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
                <div className={styles.phaseStatus}>{t('roadmapPage.futureStatus')}</div>
              </div>
              <h3 className={styles.phaseTitle}>{t('roadmapPage.phase3Title')}</h3>
              <p className={styles.phaseText}>{t('roadmapPage.phase3Text')}</p>
              <div className={styles.phaseApps}>
                <div className={styles.appTag}>{t('roadmapPage.thirtyPlusApps')}</div>
                <div className={styles.appTag}>{t('roadmapPage.integration')}</div>
                <div className={styles.appTag}>{t('roadmapPage.ecosystem')}</div>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{width: '0%'}}></div>
              </div>
              <span className={styles.progressText}>{t('roadmapPage.planned')}</span>
            </div>

            <div className={styles.phaseCard}>
              <div className={styles.phaseHeader}>
                <div className={styles.phaseNumber}>4</div>
                <div className={styles.phaseStatus}>{t('roadmapPage.visionStatus')}</div>
              </div>
              <h3 className={styles.phaseTitle}>{t('roadmapPage.phase4Title')}</h3>
              <p className={styles.phaseText}>{t('roadmapPage.phase4Text')}</p>
              <div className={styles.phaseApps}>
                <div className={styles.appTag}>{t('roadmapPage.p2pNetworks')}</div>
                <div className={styles.appTag}>{t('roadmapPage.blockchain')}</div>
                <div className={styles.appTag}>{t('roadmapPage.decentralized')}</div>
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
          <h2 className={styles.sectionTitle}>🎯 {t('roadmapPage.currentFocusSectionTitle')}</h2>
          <div className={styles.focusGrid}>
            <div className={styles.focusCard}>
              <div className={styles.focusIcon}>🔧</div>
              <h3 className={styles.focusTitle}>{t('roadmapPage.criticalFixesTitle')}</h3>
              <div className={styles.focusDetails}>
                <h4>{t('roadmapPage.justSplitStabilization')}</h4>
                <ul>
                  <li>{t('roadmapPage.criticalFix1')}</li>
                  <li>{t('roadmapPage.criticalFix2')}</li>
                  <li>{t('roadmapPage.criticalFix3')}</li>
                  <li>{t('roadmapPage.criticalFix4')}</li>
                </ul>
              </div>
              <div className={styles.focusStatus}>🔄 {t('roadmapPage.inProgressStatus2')}</div>
            </div>

            <div className={styles.focusCard}>
              <div className={styles.focusIcon}>🏢</div>
              <h3 className={styles.focusTitle}>{t('roadmapPage.hubDevelopmentTitle')}</h3>
              <div className={styles.focusDetails}>
                <h4>{t('roadmapPage.coreAuthentication')}</h4>
                <ul>
                  <li>{t('roadmapPage.hubFeature1')}</li>
                  <li>{t('roadmapPage.hubFeature2')}</li>
                  <li>{t('roadmapPage.hubFeature3')}</li>
                  <li>{t('roadmapPage.hubFeature4')}</li>
                </ul>
              </div>
              <div className={styles.focusStatus}>📋 {t('roadmapPage.plannedStatus')}</div>
            </div>

            <div className={styles.focusCard}>
              <div className={styles.focusIcon}>🔗</div>
              <h3 className={styles.focusTitle}>{t('roadmapPage.integrationTitle')}</h3>
              <div className={styles.focusDetails}>
                <h4>{t('roadmapPage.crossAppFeatures')}</h4>
                <ul>
                  <li>{t('roadmapPage.integrationFeature1')}</li>
                  <li>{t('roadmapPage.integrationFeature2')}</li>
                  <li>{t('roadmapPage.integrationFeature3')}</li>
                  <li>{t('roadmapPage.integrationFeature4')}</li>
                </ul>
              </div>
              <div className={styles.focusStatus}>⏳ {t('roadmapPage.nextQuarterStatus')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Roadmap */}
      <section className={styles.technicalSection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>🛠️ {t('roadmapPage.technicalEvolutionTitle')}</h2>
          <div className={styles.evolutionTimeline}>
            <div className={styles.evolutionPhase}>
              <h3>{t('roadmapPage.techPhase1Title')}</h3>
              <p>{t('roadmapPage.techPhase1Text')}</p>
              <div className={styles.techStack}>
                <span>{t('roadmapPage.techStack1')}</span>
                <span>{t('roadmapPage.techStack2')}</span>
                <span>{t('roadmapPage.techStack3')}</span>
                <span>{t('roadmapPage.techStack4')}</span>
              </div>
            </div>
            <div className={styles.evolutionPhase}>
              <h3>{t('roadmapPage.techPhase2Title')}</h3>
              <p>{t('roadmapPage.techPhase2Text')}</p>
              <div className={styles.techStack}>
                <span>{t('roadmapPage.techStack5')}</span>
                <span>{t('roadmapPage.techStack6')}</span>
                <span>{t('roadmapPage.techStack7')}</span>
              </div>
            </div>
            <div className={styles.evolutionPhase}>
              <h3>{t('roadmapPage.techPhase3Title')}</h3>
              <p>{t('roadmapPage.techPhase3Text')}</p>
              <div className={styles.techStack}>
                <span>{t('roadmapPage.techStack8')}</span>
                <span>{t('roadmapPage.techStack9')}</span>
                <span>{t('roadmapPage.techStack10')}</span>
              </div>
            </div>
            <div className={styles.evolutionPhase}>
              <h3>{t('roadmapPage.techPhase4Title')}</h3>
              <p>{t('roadmapPage.techPhase4Text')}</p>
              <div className={styles.techStack}>
                <span>{t('roadmapPage.techStack11')}</span>
                <span>{t('roadmapPage.techStack12')}</span>
                <span>{t('roadmapPage.techStack13')}</span>
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