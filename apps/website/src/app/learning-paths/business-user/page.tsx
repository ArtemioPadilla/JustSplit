'use client';

import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function BusinessUserLearningPathPage() {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <a href="/documentation" className={styles.breadcrumbLink}>
            {t('businessUserPath.documentation') || 'Documentation'}
          </a>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>
            {t('businessUserPath.title') || 'Business User Learning Path'}
          </span>
        </div>
        <h1 className={styles.title}>
          👨‍💼 {t('businessUserPath.title') || 'Business User Learning Path'}
        </h1>
        <div className={styles.pathMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>⏱️ {t('businessUserPath.duration') || 'Duration'}:</span>
            <span className={styles.metaValue}>15 {t('businessUserPath.minutes') || 'minutes'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📚 {t('businessUserPath.topics') || 'Topics'}:</span>
            <span className={styles.metaValue}>5 {t('businessUserPath.modules') || 'modules'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📈 {t('businessUserPath.level') || 'Level'}:</span>
            <span className={styles.metaValue}>{t('businessUserPath.beginner') || 'Beginner'}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.introSection}>
          <h2 className={styles.sectionTitle}>
            {t('businessUserPath.introTitle') || 'Business Collaboration Made Simple'}
          </h2>
          <p className={styles.introText}>
            {t('businessUserPath.introText') || 'This learning path is designed for business professionals who want to leverage CyberEco applications for team collaboration, expense management, and operational efficiency. Learn to use JustSplit for team expenses, understand governance tools, and integrate with your existing workflows.'}
          </p>
          
          <div className={styles.progressIndicator}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{width: '0%'}}></div>
            </div>
            <span className={styles.progressText}>0% {t('businessUserPath.complete') || 'Complete'}</span>
          </div>
        </div>

        <div className={styles.modulesSection}>
          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>1</div>
              <div className={styles.moduleInfo}>
                <h3>{t('businessUserPath.module1Title') || 'Account Setup for Teams'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 3 min</span>
                  <span>🎯 Essential</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('businessUserPath.module1Desc') || 'Set up your CyberEco Hub account with business-focused privacy settings and team management features.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('businessUserPath.youWillLearn') || 'You will learn'}:</h4>
              <ul>
                <li>{t('businessUserPath.module1Learn1') || 'Creating secure business accounts'}</li>
                <li>{t('businessUserPath.module1Learn2') || 'Configuring team privacy settings'}</li>
                <li>{t('businessUserPath.module1Learn3') || 'Setting up multi-factor authentication'}</li>
                <li>{t('businessUserPath.module1Learn4') || 'Understanding data ownership policies'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <a href="/guides/account-setup" className={styles.startButton}>
                {t('businessUserPath.startModule') || 'Start Module'} →
              </a>
            </div>
          </div>

          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>2</div>
              <div className={styles.moduleInfo}>
                <h3>{t('businessUserPath.module2Title') || 'Team Expense Management'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 5 min</span>
                  <span>🎯 Core</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('businessUserPath.module2Desc') || 'Master JustSplit for business use: team expenses, approval workflows, and integration with accounting systems.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('businessUserPath.youWillLearn') || 'You will learn'}:</h4>
              <ul>
                <li>{t('businessUserPath.module2Learn1') || 'Creating business expense groups'}</li>
                <li>{t('businessUserPath.module2Learn2') || 'Setting up approval workflows'}</li>
                <li>{t('businessUserPath.module2Learn3') || 'Configuring spending limits and policies'}</li>
                <li>{t('businessUserPath.module2Learn4') || 'Exporting data for accounting software'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <a href="/guides/justsplit" className={styles.startButton}>
                {t('businessUserPath.startModule') || 'Start Module'} →
              </a>
            </div>
          </div>

          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>3</div>
              <div className={styles.moduleInfo}>
                <h3>{t('businessUserPath.module3Title') || 'Advanced Group Management'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 4 min</span>
                  <span>🎯 Advanced</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('businessUserPath.module3Desc') || 'Learn complex group scenarios, roles and permissions, automation rules, and conflict resolution for business teams.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('businessUserPath.youWillLearn') || 'You will learn'}:</h4>
              <ul>
                <li>{t('businessUserPath.module3Learn1') || 'Hierarchical team structures'}</li>
                <li>{t('businessUserPath.module3Learn2') || 'Custom roles and permissions'}</li>
                <li>{t('businessUserPath.module3Learn3') || 'Automated expense rules'}</li>
                <li>{t('businessUserPath.module3Learn4') || 'Business conflict resolution'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <a href="/guides/group-management" className={styles.startButton}>
                {t('businessUserPath.startModule') || 'Start Module'} →
              </a>
            </div>
          </div>

          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>4</div>
              <div className={styles.moduleInfo}>
                <h3>{t('businessUserPath.module4Title') || 'Data Export & Analysis'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 2 min</span>
                  <span>🎯 Essential</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('businessUserPath.module4Desc') || 'Export business data for analysis, integrate with BI tools, and generate reports for stakeholders.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('businessUserPath.youWillLearn') || 'You will learn'}:</h4>
              <ul>
                <li>{t('businessUserPath.module4Learn1') || 'Business data export formats'}</li>
                <li>{t('businessUserPath.module4Learn2') || 'Integration with accounting software'}</li>
                <li>{t('businessUserPath.module4Learn3') || 'Custom reporting and analytics'}</li>
                <li>{t('businessUserPath.module4Learn4') || 'Compliance and audit trails'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <a href="/guides/data-export" className={styles.startButton}>
                {t('businessUserPath.startModule') || 'Start Module'} →
              </a>
            </div>
          </div>

          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>5</div>
              <div className={styles.moduleInfo}>
                <h3>{t('businessUserPath.module5Title') || 'Business Privacy & Security'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 1 min</span>
                  <span>🎯 Critical</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('businessUserPath.module5Desc') || 'Configure enterprise-grade privacy settings, understand compliance requirements, and protect sensitive business data.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('businessUserPath.youWillLearn') || 'You will learn'}:</h4>
              <ul>
                <li>{t('businessUserPath.module5Learn1') || 'Enterprise privacy controls'}</li>
                <li>{t('businessUserPath.module5Learn2') || 'GDPR and compliance settings'}</li>
                <li>{t('businessUserPath.module5Learn3') || 'Data retention policies'}</li>
                <li>{t('businessUserPath.module5Learn4') || 'Team security best practices'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <a href="/guides/privacy-settings" className={styles.startButton}>
                {t('businessUserPath.startModule') || 'Start Module'} →
              </a>
            </div>
          </div>
        </div>

        <div className={styles.completionSection}>
          <h2 className={styles.sectionTitle}>
            {t('businessUserPath.nextStepsTitle') || 'Next Steps'}
          </h2>
          <div className={styles.nextStepsGrid}>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>👩‍💻</div>
              <h3>{t('businessUserPath.developerPath') || 'Developer Learning Path'}</h3>
              <p>{t('businessUserPath.developerPathDesc') || 'Take your integration further with API access and custom development.'}</p>
              <a href="/learning-paths/developer" className={styles.nextStepLink}>
                {t('businessUserPath.exploreNext') || 'Explore Next'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🏛️</div>
              <h3>{t('businessUserPath.communityPath') || 'Community Leader Path'}</h3>
              <p>{t('businessUserPath.communityPathDesc') || 'Learn about governance and digital sovereignty principles.'}</p>
              <a href="/learning-paths/community-leader" className={styles.nextStepLink}>
                {t('businessUserPath.exploreNext') || 'Explore Next'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🤝</div>
              <h3>{t('businessUserPath.support') || 'Business Support'}</h3>
              <p>{t('businessUserPath.supportDesc') || 'Get specialized support for business implementations and custom needs.'}</p>
              <a href="/support" className={styles.nextStepLink}>
                {t('businessUserPath.contactSupport') || 'Contact Support'} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}