'use client';

import { useState } from 'react';
import { useLanguage } from '@justsplit/ui-components';
import styles from './page.module.css';

interface Solution {
  id: string;
  title: string;
  description: string;
  color: string;
  image?: string;
  url?: string;
  category: string;
  phase: string;
}

const getSolutions = (t: (key: string) => string): Solution[] => [
  // Community & Governance
  { id: 'demos', title: t('portfolioPage.demosTitle'), description: t('portfolioPage.demosDesc'), color: '#006241', category: 'community', phase: 'phase1' },
  { id: 'community-manager', title: t('portfolioPage.communityManagerTitle'), description: t('portfolioPage.communityManagerDesc'), color: '#8E24AA', category: 'community', phase: 'phase3' },
  { id: 'mycommunity', title: t('portfolioPage.myCommunityTitle'), description: t('portfolioPage.myCommunityDesc'), color: '#757575', category: 'community', phase: 'phase4' },
  { id: 'conciliation', title: t('portfolioPage.conciliationTitle'), description: t('portfolioPage.conciliationDesc'), color: '#388E3C', category: 'community', phase: 'phase4' },
  { id: 'crowdpool', title: t('portfolioPage.crowdPoolTitle'), description: t('portfolioPage.crowdPoolDesc'), color: '#0288D1', category: 'community', phase: 'phase3' },
  
  // Finance & Economy
  { id: 'justsplit', title: t('portfolioPage.justSplitTitle'), description: t('portfolioPage.justSplitDesc'), color: '#006241', image: '/portfolio/justsplit.png', url: 'https://justsplit.cybere.co', category: 'finance', phase: 'phase1' },
  { id: 'mywealth', title: t('portfolioPage.myWealthTitle'), description: t('portfolioPage.myWealthDesc'), color: '#F57C00', category: 'finance', phase: 'phase2' },
  { id: 'mybusiness', title: t('portfolioPage.myBusinessTitle'), description: t('portfolioPage.myBusinessDesc'), color: '#303F9F', category: 'finance', phase: 'phase3' },
  { id: 'crowdfund', title: t('portfolioPage.crowdFundTitle'), description: t('portfolioPage.crowdFundDesc'), color: '#00796B', category: 'finance', phase: 'phase3' },
  { id: 'offerme', title: t('portfolioPage.offerMeTitle'), description: t('portfolioPage.offerMeDesc'), color: '#C2185B', category: 'finance', phase: 'phase4' },
  
  // Sustainability & Home
  { id: 'plantopia', title: t('portfolioPage.plantopiaTitle'), description: t('portfolioPage.plantopiaDesc'), color: '#006241', category: 'sustainability', phase: 'phase1' },
  { id: 'ecotul', title: t('portfolioPage.ecoTulTitle'), description: t('portfolioPage.ecoTulDesc'), color: '#689F38', category: 'sustainability', phase: 'phase2' },
  { id: 'myhome', title: t('portfolioPage.myHomeTitle'), description: t('portfolioPage.myHomeDesc'), color: '#795548', category: 'sustainability', phase: 'phase3' },
  
  // Education & Growth
  { id: 'education-hub', title: t('portfolioPage.educationHubTitle'), description: t('portfolioPage.educationHubDesc'), color: '#FFA000', category: 'education', phase: 'phase2' },
  { id: 'skill-share', title: t('portfolioPage.skillShareTitle'), description: t('portfolioPage.skillShareDesc'), color: '#5E35B1', category: 'education', phase: 'phase3' },
  { id: 'habits', title: t('portfolioPage.habitsTitle'), description: t('portfolioPage.habitsDesc'), color: '#43A047', category: 'education', phase: 'phase2' },
  { id: 'one-step', title: t('portfolioPage.oneStepTitle'), description: t('portfolioPage.oneStepDesc'), color: '#00ACC1', category: 'education', phase: 'phase4' },
  
  // Health & Wellness
  { id: 'healthy', title: t('portfolioPage.healthyTitle'), description: t('portfolioPage.healthyDesc'), color: '#D32F2F', category: 'health', phase: 'phase2' },
  { id: 'petpal', title: t('portfolioPage.petPalTitle'), description: t('portfolioPage.petPalDesc'), color: '#F4511E', category: 'health', phase: 'phase3' },
  
  // Identity, Data & Legal
  { id: 'lawpal', title: t('portfolioPage.lawPalTitle'), description: t('portfolioPage.lawPalDesc'), color: '#616161', category: 'identity', phase: 'phase2' },
  { id: 'mydata', title: t('portfolioPage.myDataTitle'), description: t('portfolioPage.myDataDesc'), color: '#455A64', category: 'identity', phase: 'phase3' },
  { id: 'digitalme', title: t('portfolioPage.digitalMeTitle'), description: t('portfolioPage.digitalMeDesc'), color: '#0097A7', category: 'identity', phase: 'phase3' },
  { id: 'mydocs', title: t('portfolioPage.myDocsTitle'), description: t('portfolioPage.myDocsDesc'), color: '#7B1FA2', category: 'identity', phase: 'phase3' },
  { id: 'govaccess', title: t('portfolioPage.govAccessTitle'), description: t('portfolioPage.govAccessDesc'), color: '#1976D2', category: 'identity', phase: 'phase4' },
  
  // Family & Memory
  { id: 'somos', title: t('portfolioPage.somosTitle'), description: t('portfolioPage.somosDesc'), color: '#006241', category: 'family', phase: 'phase1' },
  { id: 'remember-me', title: t('portfolioPage.rememberMeTitle'), description: t('portfolioPage.rememberMeDesc'), color: '#6A1B9A', category: 'family', phase: 'phase3' },
  
  // Travel & Local Discovery
  { id: 'travelmate', title: t('portfolioPage.travelMateTitle'), description: t('portfolioPage.travelMateDesc'), color: '#039BE5', category: 'travel', phase: 'phase3' },
  { id: 'eventconnect', title: t('portfolioPage.eventConnectTitle'), description: t('portfolioPage.eventConnectDesc'), color: '#FB8C00', category: 'travel', phase: 'phase4' },
  
  // Tech & Productivity
  { id: 'tradepilot', title: t('portfolioPage.tradePilotTitle'), description: t('portfolioPage.tradePilotDesc'), color: '#37474F', category: 'tech', phase: 'phase3' },
  { id: 'nexus', title: t('portfolioPage.nexusTitle'), description: t('portfolioPage.nexusDesc'), color: '#E91E63', category: 'tech', phase: 'phase4' },
];

const getCategories = (t: (key: string) => string) => [
  { id: 'all', name: t('portfolioPage.filterAll'), icon: '🎯' },
  { id: 'community', name: t('portfolioPage.communityGovernanceTitle'), icon: '🏛️' },
  { id: 'finance', name: t('portfolioPage.financeEconomyTitle'), icon: '💰' },
  { id: 'sustainability', name: t('portfolioPage.sustainabilityHomeTitle'), icon: '🌱' },
  { id: 'education', name: t('portfolioPage.educationTitle'), icon: '📚' },
  { id: 'health', name: t('portfolioPage.healthWellnessTitle'), icon: '❤️' },
  { id: 'identity', name: t('portfolioPage.identityDataLegalTitle'), icon: '🔐' },
  { id: 'family', name: t('portfolioPage.familyMemoryTitle'), icon: '👨‍👩‍👧‍👦' },
  { id: 'travel', name: t('portfolioPage.travelLocalDiscoveryTitle'), icon: '✈️' },
  { id: 'tech', name: t('portfolioPage.techProductivityTitle'), icon: '💻' },
];

const getPhaseInfo = (t: (key: string) => string) => ({
  phase1: { label: t('portfolioPage.phaseMvp'), color: '#006241' },
  phase2: { label: t('portfolioPage.phaseGreen'), color: '#388E3C' },
  phase3: { label: t('portfolioPage.phasePersonal'), color: '#1976D2' },
  phase4: { label: t('portfolioPage.phaseExpansion'), color: '#7B1FA2' },
});

export default function PortfolioPage() {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const solutions = getSolutions(t);
  const categories = getCategories(t);

  const filteredSolutions = selectedCategory === 'all' 
    ? solutions 
    : solutions.filter(solution => solution.category === selectedCategory);

  const groupedSolutions = selectedCategory === 'all'
    ? categories.slice(1).map(cat => ({
        category: cat,
        solutions: solutions.filter(s => s.category === cat.id)
      }))
    : null;

  return (
    <>
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <h1>{t('portfolioPage.title')}</h1>
          <p className={styles.heroDescription}>
            {t('portfolioPage.subtitle')}
          </p>
        </div>
      </section>
      
      <section className={styles.portfolioSection}>
        <div className={styles.container}>
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

            {selectedCategory === 'all' && groupedSolutions ? (
              <div className={styles.groupedContainer}>
                {groupedSolutions.map(group => (
                  <div key={group.category.id} className={styles.categoryGroup}>
                    <h2 className={styles.categoryTitle}>
                      <span className={styles.categoryIcon}>{group.category.icon}</span>
                      {group.category.name}
                    </h2>
                    <div className={styles.projectGrid}>
                      {group.solutions.map(solution => (
                        <SolutionCard key={solution.id} solution={solution} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.projectGrid}>
                {filteredSolutions.map(solution => (
                  <SolutionCard key={solution.id} solution={solution} />
                ))}
              </div>
            )}
          </div>
        </section>
    </>
  );
}

function SolutionCard({ solution }: { solution: Solution }) {
  const { t } = useLanguage();
  const phaseInfo = getPhaseInfo(t);
  const phase = phaseInfo[solution.phase as keyof typeof phaseInfo];
  
  return (
    <div className={styles.projectCard}>
      <div className={styles.projectImageWrapper}>
        {solution.image ? (
          <img 
            src={solution.image} 
            alt={solution.title}
            className={styles.projectImage}
          />
        ) : (
          <div 
            className={styles.projectPlaceholder}
            style={{ backgroundColor: solution.color }}
          >
            <span className={styles.placeholderText}>{t('portfolioPage.comingSoon') || 'Coming Soon'}</span>
          </div>
        )}
        <div 
          className={styles.phaseBadge}
          style={{ backgroundColor: phase.color }}
        >
          {phase.label}
        </div>
      </div>
      <div className={styles.projectContent}>
        <h3 className={styles.projectTitle}>{solution.title}</h3>
        <p className={styles.projectDescription}>{solution.description}</p>
        {solution.url && (
          <a 
            href={solution.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.projectLink}
          >
            {t('portfolioPage.viewSolution')} →
          </a>
        )}
      </div>
    </div>
  );
}