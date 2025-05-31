'use client';

import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function DeveloperLearningPathPage() {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <a href="/documentation" className={styles.breadcrumbLink}>
            {t('developerPath.documentation') || 'Documentation'}
          </a>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>
            {t('developerPath.title') || 'Developer Learning Path'}
          </span>
        </div>
        <h1 className={styles.title}>
          👩‍💻 {t('developerPath.title') || 'Developer Learning Path'}
        </h1>
        <div className={styles.pathMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>⏱️ {t('developerPath.duration') || 'Duration'}:</span>
            <span className={styles.metaValue}>45 {t('developerPath.minutes') || 'minutes'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📚 {t('developerPath.topics') || 'Topics'}:</span>
            <span className={styles.metaValue}>12 {t('developerPath.modules') || 'modules'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📈 {t('developerPath.level') || 'Level'}:</span>
            <span className={styles.metaValue}>{t('developerPath.intermediate') || 'Intermediate'}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.introSection}>
          <h2 className={styles.sectionTitle}>
            {t('developerPath.introTitle') || 'Build with CyberEco Platform'}
          </h2>
          <p className={styles.introText}>
            {t('developerPath.introText') || 'This comprehensive learning path covers everything developers need to integrate with CyberEco platforms. From API authentication to advanced integrations, you\'ll master the tools and concepts needed to build custom solutions and extend platform functionality.'}
          </p>
          
          <div className={styles.skillLevel}>
            <h3>{t('developerPath.prerequisitesTitle') || 'Prerequisites'}</h3>
            <div className={styles.prerequisites}>
              <span className={styles.prerequisite}>JavaScript/TypeScript</span>
              <span className={styles.prerequisite}>REST APIs</span>
              <span className={styles.prerequisite}>OAuth 2.0</span>
              <span className={styles.prerequisite}>JSON</span>
            </div>
          </div>
          
          <div className={styles.progressIndicator}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{width: '0%'}}></div>
            </div>
            <span className={styles.progressText}>0% {t('developerPath.complete') || 'Complete'}</span>
          </div>
        </div>

        <div className={styles.modulesSection}>
          <div className={styles.moduleCategory}>
            <h3 className={styles.categoryTitle}>🚀 {t('developerPath.gettingStarted') || 'Getting Started'}</h3>
            
            <div className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleNumber}>1</div>
                <div className={styles.moduleInfo}>
                  <h4>{t('developerPath.module1Title') || 'Platform Architecture Overview'}</h4>
                  <div className={styles.moduleStats}>
                    <span>⏱️ 5 min</span>
                    <span>🎯 Foundation</span>
                  </div>
                </div>
              </div>
              <p className={styles.moduleDescription}>
                {t('developerPath.module1Desc') || 'Understand the CyberEco ecosystem, NX monorepo structure, shared libraries, and multi-project Firebase setup.'}
              </p>
              <div className={styles.moduleTopics}>
                <span className={styles.topic}>NX Architecture</span>
                <span className={styles.topic}>Microservices</span>
                <span className={styles.topic}>Firebase Projects</span>
                <span className={styles.topic}>Shared Libraries</span>
              </div>
            </div>

            <div className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleNumber}>2</div>
                <div className={styles.moduleInfo}>
                  <h4>{t('developerPath.module2Title') || 'Development Environment Setup'}</h4>
                  <div className={styles.moduleStats}>
                    <span>⏱️ 8 min</span>
                    <span>🎯 Essential</span>
                  </div>
                </div>
              </div>
              <p className={styles.moduleDescription}>
                {t('developerPath.module2Desc') || 'Set up your local development environment with NX, Firebase emulators, and testing infrastructure.'}
              </p>
              <div className={styles.moduleTopics}>
                <span className={styles.topic}>NX CLI</span>
                <span className={styles.topic}>Firebase Emulators</span>
                <span className={styles.topic}>Testing Setup</span>
                <span className={styles.topic}>Build Tools</span>
              </div>
            </div>

            <div className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleNumber}>3</div>
                <div className={styles.moduleInfo}>
                  <h4>{t('developerPath.module3Title') || 'API Authentication & Security'}</h4>
                  <div className={styles.moduleStats}>
                    <span>⏱️ 6 min</span>
                    <span>🎯 Critical</span>
                  </div>
                </div>
              </div>
              <p className={styles.moduleDescription}>
                {t('developerPath.module3Desc') || 'Master OAuth 2.0 implementation, token management, and security best practices for API access.'}
              </p>
              <div className={styles.moduleTopics}>
                <span className={styles.topic}>OAuth 2.0</span>
                <span className={styles.topic}>JWT Tokens</span>
                <span className={styles.topic}>Rate Limiting</span>
                <span className={styles.topic}>CORS</span>
              </div>
            </div>
          </div>

          <div className={styles.moduleCategory}>
            <h3 className={styles.categoryTitle}>🔧 {t('developerPath.coreIntegration') || 'Core Integration'}</h3>
            
            <div className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleNumber}>4</div>
                <div className={styles.moduleInfo}>
                  <h4>{t('developerPath.module4Title') || 'Hub Authentication Integration'}</h4>
                  <div className={styles.moduleStats}>
                    <span>⏱️ 4 min</span>
                    <span>🎯 Core</span>
                  </div>
                </div>
              </div>
              <p className={styles.moduleDescription}>
                {t('developerPath.module4Desc') || 'Integrate with CyberEco Hub for centralized authentication and user management across applications.'}
              </p>
              <div className={styles.moduleTopics}>
                <span className={styles.topic}>SSO Integration</span>
                <span className={styles.topic}>User Profiles</span>
                <span className={styles.topic}>Permission Checking</span>
                <span className={styles.topic}>Session Management</span>
              </div>
            </div>

            <div className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleNumber}>5</div>
                <div className={styles.moduleInfo}>
                  <h4>{t('developerPath.module5Title') || 'JustSplit API Integration'}</h4>
                  <div className={styles.moduleStats}>
                    <span>⏱️ 7 min</span>
                    <span>🎯 Core</span>
                  </div>
                </div>
              </div>
              <p className={styles.moduleDescription}>
                {t('developerPath.module5Desc') || 'Work with expenses, groups, settlements, and financial data through the JustSplit REST API.'}
              </p>
              <div className={styles.moduleTopics}>
                <span className={styles.topic}>Expense Management</span>
                <span className={styles.topic}>Group Operations</span>
                <span className={styles.topic}>Settlement Tracking</span>
                <span className={styles.topic}>Data Export</span>
              </div>
            </div>

            <div className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleNumber}>6</div>
                <div className={styles.moduleInfo}>
                  <h4>{t('developerPath.module6Title') || 'Shared Components & Libraries'}</h4>
                  <div className={styles.moduleStats}>
                    <span>⏱️ 5 min</span>
                    <span>🎯 Efficiency</span>
                  </div>
                </div>
              </div>
              <p className={styles.moduleDescription}>
                {t('developerPath.module6Desc') || 'Leverage shared UI components, types, and utilities for consistent development across applications.'}
              </p>
              <div className={styles.moduleTopics}>
                <span className={styles.topic}>UI Components</span>
                <span className={styles.topic}>TypeScript Types</span>
                <span className={styles.topic}>Utility Functions</span>
                <span className={styles.topic}>Theme System</span>
              </div>
            </div>
          </div>

          <div className={styles.moduleCategory}>
            <h3 className={styles.categoryTitle}>🏗️ {t('developerPath.advancedTopics') || 'Advanced Topics'}</h3>
            
            <div className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleNumber}>7</div>
                <div className={styles.moduleInfo}>
                  <h4>{t('developerPath.module7Title') || 'Real-time Data & Webhooks'}</h4>
                  <div className={styles.moduleStats}>
                    <span>⏱️ 6 min</span>
                    <span>🎯 Advanced</span>
                  </div>
                </div>
              </div>
              <p className={styles.moduleDescription}>
                {t('developerPath.module7Desc') || 'Implement real-time data synchronization and webhook notifications for live updates.'}
              </p>
              <div className={styles.moduleTopics}>
                <span className={styles.topic}>WebSocket Connections</span>
                <span className={styles.topic}>Webhook Endpoints</span>
                <span className={styles.topic}>Event Streaming</span>
                <span className={styles.topic}>Data Synchronization</span>
              </div>
            </div>

            <div className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleNumber}>8</div>
                <div className={styles.moduleInfo}>
                  <h4>{t('developerPath.module8Title') || 'Custom Application Development'}</h4>
                  <div className={styles.moduleStats}>
                    <span>⏱️ 10 min</span>
                    <span>🎯 Advanced</span>
                  </div>
                </div>
              </div>
              <p className={styles.moduleDescription}>
                {t('developerPath.module8Desc') || 'Build custom applications using the CyberEco framework with NX generators and shared infrastructure.'}
              </p>
              <div className={styles.moduleTopics}>
                <span className={styles.topic}>NX Generators</span>
                <span className={styles.topic}>App Scaffolding</span>
                <span className={styles.topic}>Deployment Pipeline</span>
                <span className={styles.topic}>Testing Strategy</span>
              </div>
            </div>

            <div className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleNumber}>9</div>
                <div className={styles.moduleInfo}>
                  <h4>{t('developerPath.module9Title') || 'Testing & Quality Assurance'}</h4>
                  <div className={styles.moduleStats}>
                    <span>⏱️ 4 min</span>
                    <span>🎯 Essential</span>
                  </div>
                </div>
              </div>
              <p className={styles.moduleDescription}>
                {t('developerPath.module9Desc') || 'Implement comprehensive testing strategies including unit tests, integration tests, and end-to-end testing.'}
              </p>
              <div className={styles.moduleTopics}>
                <span className={styles.topic}>Jest Testing</span>
                <span className={styles.topic}>React Testing Library</span>
                <span className={styles.topic}>Firebase Emulators</span>
                <span className={styles.topic}>CI/CD Pipeline</span>
              </div>
            </div>
          </div>

          <div className={styles.moduleCategory}>
            <h3 className={styles.categoryTitle}>🚀 {t('developerPath.production') || 'Production & Deployment'}</h3>
            
            <div className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleNumber}>10</div>
                <div className={styles.moduleInfo}>
                  <h4>{t('developerPath.module10Title') || 'Performance Optimization'}</h4>
                  <div className={styles.moduleStats}>
                    <span>⏱️ 5 min</span>
                    <span>🎯 Performance</span>
                  </div>
                </div>
              </div>
              <p className={styles.moduleDescription}>
                {t('developerPath.module10Desc') || 'Optimize application performance with code splitting, caching strategies, and monitoring.'}
              </p>
              <div className={styles.moduleTopics}>
                <span className={styles.topic}>Code Splitting</span>
                <span className={styles.topic}>Bundle Analysis</span>
                <span className={styles.topic}>Caching Strategies</span>
                <span className={styles.topic}>Performance Monitoring</span>
              </div>
            </div>

            <div className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleNumber}>11</div>
                <div className={styles.moduleInfo}>
                  <h4>{t('developerPath.module11Title') || 'Security Best Practices'}</h4>
                  <div className={styles.moduleStats}>
                    <span>⏱️ 4 min</span>
                    <span>🎯 Critical</span>
                  </div>
                </div>
              </div>
              <p className={styles.moduleDescription}>
                {t('developerPath.module11Desc') || 'Implement security best practices including input validation, XSS protection, and secure data handling.'}
              </p>
              <div className={styles.moduleTopics}>
                <span className={styles.topic}>Input Validation</span>
                <span className={styles.topic}>XSS Protection</span>
                <span className={styles.topic}>CSRF Prevention</span>
                <span className={styles.topic}>Data Encryption</span>
              </div>
            </div>

            <div className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleNumber}>12</div>
                <div className={styles.moduleInfo}>
                  <h4>{t('developerPath.module12Title') || 'Deployment & Monitoring'}</h4>
                  <div className={styles.moduleStats}>
                    <span>⏱️ 6 min</span>
                    <span>🎯 Production</span>
                  </div>
                </div>
              </div>
              <p className={styles.moduleDescription}>
                {t('developerPath.module12Desc') || 'Deploy applications to Firebase hosting with monitoring, analytics, and error tracking.'}
              </p>
              <div className={styles.moduleTopics}>
                <span className={styles.topic}>Firebase Hosting</span>
                <span className={styles.topic}>Analytics Setup</span>
                <span className={styles.topic}>Error Tracking</span>
                <span className={styles.topic}>Performance Metrics</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.completionSection}>
          <h2 className={styles.sectionTitle}>
            {t('developerPath.nextStepsTitle') || 'Next Steps'}
          </h2>
          <div className={styles.nextStepsGrid}>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🤝</div>
              <h3>{t('developerPath.contribute') || 'Contribute to Platform'}</h3>
              <p>{t('developerPath.contributeDesc') || 'Join our open-source development community and contribute to platform evolution.'}</p>
              <a href="/community" className={styles.nextStepLink}>
                {t('developerPath.joinCommunity') || 'Join Community'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🏛️</div>
              <h3>{t('developerPath.communityPath') || 'Community Leader Path'}</h3>
              <p>{t('developerPath.communityPathDesc') || 'Learn about platform governance and digital sovereignty principles.'}</p>
              <a href="/learning-paths/community-leader" className={styles.nextStepLink}>
                {t('developerPath.explore') || 'Explore'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>📚</div>
              <h3>{t('developerPath.apiReference') || 'API Reference'}</h3>
              <p>{t('developerPath.apiReferenceDesc') || 'Access comprehensive API documentation and interactive playground.'}</p>
              <a href="/documentation#api-reference" className={styles.nextStepLink}>
                {t('developerPath.viewDocs') || 'View Documentation'} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}