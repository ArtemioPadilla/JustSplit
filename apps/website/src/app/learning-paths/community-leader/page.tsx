'use client';

import { useLanguage } from '@cybereco/ui-components';
import styles from './page.module.css';

export default function CommunityLeaderLearningPathPage() {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <a href="/documentation" className={styles.breadcrumbLink}>
            {t('communityLeaderPath.documentation') || 'Documentation'}
          </a>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>
            {t('communityLeaderPath.title') || 'Community Leader Learning Path'}
          </span>
        </div>
        <h1 className={styles.title}>
          🏛️ {t('communityLeaderPath.title') || 'Community Leader Learning Path'}
        </h1>
        <div className={styles.pathMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>⏱️ {t('communityLeaderPath.duration') || 'Duration'}:</span>
            <span className={styles.metaValue}>30 {t('communityLeaderPath.minutes') || 'minutes'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📚 {t('communityLeaderPath.topics') || 'Topics'}:</span>
            <span className={styles.metaValue}>8 {t('communityLeaderPath.modules') || 'modules'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📈 {t('communityLeaderPath.level') || 'Level'}:</span>
            <span className={styles.metaValue}>{t('communityLeaderPath.advanced') || 'Advanced'}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.introSection}>
          <h2 className={styles.sectionTitle}>
            {t('communityLeaderPath.introTitle') || 'Digital Sovereignty & Community Governance'}
          </h2>
          <p className={styles.introText}>
            {t('communityLeaderPath.introText') || 'This learning path explores the philosophical foundations of CyberEco, digital sovereignty principles, and community governance structures. Designed for community leaders, organizers, and those interested in participatory digital democracy and sustainable technology platforms.'}
          </p>
          
          <div className={styles.philosophyHighlight}>
            <div className={styles.philosophyIcon}>🌱</div>
            <div className={styles.philosophyContent}>
              <h3>{t('communityLeaderPath.corePhilosophy') || 'Core Philosophy'}</h3>
              <p>{t('communityLeaderPath.philosophyText') || 'Technology should serve human flourishing and community well-being, not extract value from it.'}</p>
            </div>
          </div>
          
          <div className={styles.progressIndicator}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{width: '0%'}}></div>
            </div>
            <span className={styles.progressText}>0% {t('communityLeaderPath.complete') || 'Complete'}</span>
          </div>
        </div>

        <div className={styles.modulesSection}>
          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>1</div>
              <div className={styles.moduleInfo}>
                <h3>{t('communityLeaderPath.module1Title') || 'Digital Sovereignty Fundamentals'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 5 min</span>
                  <span>🎯 Foundation</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('communityLeaderPath.module1Desc') || 'Understand the principles of digital sovereignty, data ownership, and why centralized platforms extract value from communities.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('communityLeaderPath.keyPrinciples') || 'Key Principles'}:</h4>
              <ul>
                <li>{t('communityLeaderPath.module1Principle1') || 'Community ownership of digital infrastructure'}</li>
                <li>{t('communityLeaderPath.module1Principle2') || 'Data sovereignty and user control'}</li>
                <li>{t('communityLeaderPath.module1Principle3') || 'Transparent governance and decision-making'}</li>
                <li>{t('communityLeaderPath.module1Principle4') || 'Sustainable technology ecosystems'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <a href="/philosophy" className={styles.startButton}>
                {t('communityLeaderPath.explorePhilosophy') || 'Explore Philosophy'} →
              </a>
            </div>
          </div>

          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>2</div>
              <div className={styles.moduleInfo}>
                <h3>{t('communityLeaderPath.module2Title') || 'Community Governance Structure'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 4 min</span>
                  <span>🎯 Governance</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('communityLeaderPath.module2Desc') || 'Learn about CyberEco\'s community council, working groups, and participatory decision-making processes.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('communityLeaderPath.governanceElements') || 'Governance Elements'}:</h4>
              <ul>
                <li>{t('communityLeaderPath.module2Element1') || 'Community Council structure and elections'}</li>
                <li>{t('communityLeaderPath.module2Element2') || 'Working Groups and specialized teams'}</li>
                <li>{t('communityLeaderPath.module2Element3') || 'Proposal and voting mechanisms'}</li>
                <li>{t('communityLeaderPath.module2Element4') || 'Conflict resolution and consensus building'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <a href="/documentation#community" className={styles.startButton}>
                {t('communityLeaderPath.learnGovernance') || 'Learn Governance'} →
              </a>
            </div>
          </div>

          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>3</div>
              <div className={styles.moduleInfo}>
                <h3>{t('communityLeaderPath.module3Title') || 'Participatory Digital Democracy'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 6 min</span>
                  <span>🎯 Democracy</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('communityLeaderPath.module3Desc') || 'Explore how digital tools can enhance democratic participation, from local neighborhood decisions to platform governance.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('communityLeaderPath.democraticTools') || 'Democratic Tools'}:</h4>
              <ul>
                <li>{t('communityLeaderPath.module3Tool1') || 'Digital voting and consensus mechanisms'}</li>
                <li>{t('communityLeaderPath.module3Tool2') || 'Community forums and discussion platforms'}</li>
                <li>{t('communityLeaderPath.module3Tool3') || 'Transparent budget and resource allocation'}</li>
                <li>{t('communityLeaderPath.module3Tool4') || 'Citizen participation and engagement tools'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <span className={styles.comingSoonButton}>
                {t('communityLeaderPath.comingSoon') || 'Coming with Demos App'} 🚧
              </span>
            </div>
          </div>

          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>4</div>
              <div className={styles.moduleInfo}>
                <h3>{t('communityLeaderPath.module4Title') || 'Sustainable Technology Principles'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 3 min</span>
                  <span>🎯 Sustainability</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('communityLeaderPath.module4Desc') || 'Understand how technology platforms can be designed for long-term sustainability, community benefit, and environmental responsibility.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('communityLeaderPath.sustainabilityPrinciples') || 'Sustainability Principles'}:</h4>
              <ul>
                <li>{t('communityLeaderPath.module4Principle1') || 'Energy-efficient architecture and green hosting'}</li>
                <li>{t('communityLeaderPath.module4Principle2') || 'Community-funded development model'}</li>
                <li>{t('communityLeaderPath.module4Principle3') || 'Open-source and transparent development'}</li>
                <li>{t('communityLeaderPath.module4Principle4') || 'Local-first and distributed infrastructure'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <a href="/roadmap" className={styles.startButton}>
                {t('communityLeaderPath.viewRoadmap') || 'View Roadmap'} →
              </a>
            </div>
          </div>

          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>5</div>
              <div className={styles.moduleInfo}>
                <h3>{t('communityLeaderPath.module5Title') || 'Community Building & Engagement'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 4 min</span>
                  <span>🎯 Community</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('communityLeaderPath.module5Desc') || 'Learn effective strategies for building inclusive communities, fostering engagement, and maintaining healthy digital spaces.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('communityLeaderPath.engagementStrategies') || 'Engagement Strategies'}:</h4>
              <ul>
                <li>{t('communityLeaderPath.module5Strategy1') || 'Inclusive onboarding and welcome processes'}</li>
                <li>{t('communityLeaderPath.module5Strategy2') || 'Regular community events and learning sessions'}</li>
                <li>{t('communityLeaderPath.module5Strategy3') || 'Mentorship and leadership development'}</li>
                <li>{t('communityLeaderPath.module5Strategy4') || 'Recognition and community celebration'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <a href="/documentation#community" className={styles.startButton}>
                {t('communityLeaderPath.joinCommunity') || 'Join Community'} →
              </a>
            </div>
          </div>

          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>6</div>
              <div className={styles.moduleInfo}>
                <h3>{t('communityLeaderPath.module6Title') || 'Local Group Organization'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 3 min</span>
                  <span>🎯 Local</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('communityLeaderPath.module6Desc') || 'Organize and lead local CyberEco groups for in-person education, support, and community building activities.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('communityLeaderPath.organizationSteps') || 'Organization Steps'}:</h4>
              <ul>
                <li>{t('communityLeaderPath.module6Step1') || 'Identifying local community needs and interests'}</li>
                <li>{t('communityLeaderPath.module6Step2') || 'Planning educational workshops and events'}</li>
                <li>{t('communityLeaderPath.module6Step3') || 'Building partnerships with local organizations'}</li>
                <li>{t('communityLeaderPath.module6Step4') || 'Creating safe and inclusive meeting spaces'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <a href="/support" className={styles.startButton}>
                {t('communityLeaderPath.getSupport') || 'Get Support'} →
              </a>
            </div>
          </div>

          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>7</div>
              <div className={styles.moduleInfo}>
                <h3>{t('communityLeaderPath.module7Title') || 'Educational Content Development'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 3 min</span>
                  <span>🎯 Education</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('communityLeaderPath.module7Desc') || 'Create and share educational content about digital sovereignty, privacy, and community technology for broader public understanding.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('communityLeaderPath.contentTypes') || 'Content Types'}:</h4>
              <ul>
                <li>{t('communityLeaderPath.module7Type1') || 'Digital literacy and privacy workshops'}</li>
                <li>{t('communityLeaderPath.module7Type2') || 'Community technology case studies'}</li>
                <li>{t('communityLeaderPath.module7Type3') || 'Platform comparison and evaluation guides'}</li>
                <li>{t('communityLeaderPath.module7Type4') || 'Digital sovereignty advocacy materials'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <span className={styles.comingSoonButton}>
                {t('communityLeaderPath.comingSoon') || 'Coming with Education Hub'} 🚧
              </span>
            </div>
          </div>

          <div className={styles.moduleCard}>
            <div className={styles.moduleHeader}>
              <div className={styles.moduleNumber}>8</div>
              <div className={styles.moduleInfo}>
                <h3>{t('communityLeaderPath.module8Title') || 'Platform Evolution & Vision'}</h3>
                <div className={styles.moduleStats}>
                  <span>⏱️ 2 min</span>
                  <span>🎯 Vision</span>
                </div>
              </div>
            </div>
            <p className={styles.moduleDescription}>
              {t('communityLeaderPath.module8Desc') || 'Understand the long-term vision for CyberEco, upcoming applications, and how communities can shape platform development.'}
            </p>
            <div className={styles.moduleContent}>
              <h4>{t('communityLeaderPath.futureVision') || 'Future Vision'}:</h4>
              <ul>
                <li>{t('communityLeaderPath.module8Vision1') || 'Decentralized and federated platform architecture'}</li>
                <li>{t('communityLeaderPath.module8Vision2') || 'Community-owned and operated infrastructure'}</li>
                <li>{t('communityLeaderPath.module8Vision3') || 'Integration with cooperative economy models'}</li>
                <li>{t('communityLeaderPath.module8Vision4') || 'Global network of sovereign digital communities'}</li>
              </ul>
            </div>
            <div className={styles.moduleActions}>
              <a href="/vision" className={styles.startButton}>
                {t('communityLeaderPath.exploreVision') || 'Explore Vision'} →
              </a>
            </div>
          </div>
        </div>

        <div className={styles.completionSection}>
          <h2 className={styles.sectionTitle}>
            {t('communityLeaderPath.nextStepsTitle') || 'Take Action'}
          </h2>
          <div className={styles.nextStepsGrid}>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🗳️</div>
              <h3>{t('communityLeaderPath.joinCouncil') || 'Community Council'}</h3>
              <p>{t('communityLeaderPath.joinCouncilDesc') || 'Run for Community Council or participate in working groups to shape platform development.'}</p>
              <a href="/documentation#community" className={styles.nextStepLink}>
                {t('communityLeaderPath.participate') || 'Participate'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>🌍</div>
              <h3>{t('communityLeaderPath.startLocalGroup') || 'Start Local Group'}</h3>
              <p>{t('communityLeaderPath.startLocalGroupDesc') || 'Organize a local CyberEco group in your city or region for education and community building.'}</p>
              <a href="/support" className={styles.nextStepLink}>
                {t('communityLeaderPath.getStarted') || 'Get Started'} →
              </a>
            </div>
            <div className={styles.nextStepCard}>
              <div className={styles.nextStepIcon}>👥</div>
              <h3>{t('communityLeaderPath.buildMovement') || 'Build the Movement'}</h3>
              <p>{t('communityLeaderPath.buildMovementDesc') || 'Advocate for digital sovereignty and help others understand community-owned technology.'}</p>
              <a href="/philosophy" className={styles.nextStepLink}>
                {t('communityLeaderPath.shareIdeas') || 'Share Ideas'} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}