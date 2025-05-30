'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaBook, FaSearch, FaChevronRight } from 'react-icons/fa';
import { useLanguage } from '@justsplit/ui-components';
import styles from './page.module.css';

interface DocContent {
  title: string;
  content: React.ReactElement;
}

interface DocSections {
  [key: string]: DocContent;
}

export default function DocumentationPage() {
  const [activeDoc, setActiveDoc] = useState<string>('getting-started');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { t } = useLanguage();
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
  };

  const docs: DocSections = {
    'getting-started': {
      title: t('documentationPage.gettingStartedTitle') || 'Getting Started with CyberEco',
      content: (
        <>
          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.introductionTitle') || 'Introduction'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.introductionText') || 'Welcome to CyberEco documentation! This guide will help you get started with our digital ecosystem. CyberEco offers a suite of digital solutions designed to enhance financial collaboration, community engagement, and social connectivity, all within a human-centered framework for conscious, connected, and sustainable living.'}
            </p>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>📚 {t('documentationPage.keyDocumentationPagesTitle')}</h3>
            <div className={styles.docLinksGrid}>
              <a href="/philosophy" className={styles.docLinkCard}>
                <div className={styles.docLinkIcon}>📖</div>
                <h4>{t('documentationPage.platformPhilosophyTitle')}</h4>
                <p>{t('documentationPage.platformPhilosophyDesc')}</p>
              </a>
              <a href="/vision" className={styles.docLinkCard}>
                <div className={styles.docLinkIcon}>🔮</div>
                <h4>{t('documentationPage.decentralizedFutureTitle')}</h4>
                <p>{t('documentationPage.decentralizedFutureDesc')}</p>
              </a>
              <a href="/roadmap" className={styles.docLinkCard}>
                <div className={styles.docLinkIcon}>🛠️</div>
                <h4>{t('documentationPage.developmentRoadmapTitle')}</h4>
                <p>{t('documentationPage.developmentRoadmapDesc')}</p>
              </a>
              <a href="/portfolio" className={styles.docLinkCard}>
                <div className={styles.docLinkIcon}>🚀</div>
                <h4>{t('documentationPage.solutionsPortfolioTitle')}</h4>
                <p>{t('documentationPage.solutionsPortfolioDesc')}</p>
              </a>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.accountCreationTitle') || 'Digital Sovereignty'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.digitalSovereigntyText') || 'At the core of CyberEco is the principle of digital sovereignty. You own your identity, your data, and your narrative. All our applications are designed with this principle in mind, ensuring that your digital presence empowers you, not exploits you.'}
            </p>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.exploringSolutionsTitle') || 'Exploring Our Solutions'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.exploringSolutionsText') || 'CyberEco is not just another app. It is a modular digital ecosystem — an operating system for life — where each platform solves a real need while contributing to a greater whole. Our solutions are organized into categories that cover different aspects of life, from community governance to sustainability, from finance to education.'}
            </p>
          </div>
        </>
      )
    },
    'key-concepts': {
      title: t('documentationPage.keyConceptsTitle'),
      content: (
        <>
          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.digitalSovereigntyConceptTitle')}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.digitalSovereigntyConceptText')}
            </p>
            <ul className={styles.conceptList}>
              <li>{t('documentationPage.digitalSovereigntyPoint1')}</li>
              <li>{t('documentationPage.digitalSovereigntyPoint2')}</li>
              <li>{t('documentationPage.digitalSovereigntyPoint3')}</li>
              <li>{t('documentationPage.digitalSovereigntyPoint4')}</li>
            </ul>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.ecosystemArchitectureTitle')}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.ecosystemArchitectureText')}
            </p>
            <ul className={styles.conceptList}>
              <li><strong>{t('documentationPage.architecturePoint1')}</strong></li>
              <li><strong>{t('documentationPage.architecturePoint2')}</strong></li>
              <li><strong>{t('documentationPage.architecturePoint3')}</strong></li>
              <li><strong>{t('documentationPage.architecturePoint4')}</strong></li>
            </ul>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.humanCenteredDesignTitle')}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.humanCenteredDesignText')}
            </p>
            <ul className={styles.conceptList}>
              <li>{t('documentationPage.humanCenteredPoint1')}</li>
              <li>{t('documentationPage.humanCenteredPoint2')}</li>
              <li>{t('documentationPage.humanCenteredPoint3')}</li>
              <li>{t('documentationPage.humanCenteredPoint4')}</li>
            </ul>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.communityDrivenTitle')}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.communityDrivenText')}
            </p>
            <ul className={styles.conceptList}>
              <li>{t('documentationPage.communityDrivenPoint1')}</li>
              <li>{t('documentationPage.communityDrivenPoint2')}</li>
              <li>{t('documentationPage.communityDrivenPoint3')}</li>
              <li>{t('documentationPage.communityDrivenPoint4')}</li>
            </ul>
          </div>
        </>
      )
    },
    'community-governance': {
      title: t('documentationPage.communityGovernanceTitle') || 'Community & Governance',
      content: (
        <>
          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.demosTitle') || 'Demos'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.demosDesc') || 'A participatory digital democracy platform that enables transparent voting and decision-making for organizations and neighborhoods.'}
            </p>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.communityManagerTitle') || 'Community Manager'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.communityManagerDesc') || 'Advanced tools to create, organize, and govern digital or physical communities with ease and transparency.'}
            </p>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.myCommunityTitle') || 'MyCommunity'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.myCommunityDesc') || 'A platform to discover relevant local resources, events, and initiatives in your environment and strengthen community ties.'}
            </p>
          </div>
          
          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.conciliationTitle') || 'Conciliation'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.conciliationDesc') || 'Conflict resolution tools with neutral human or AI mediators to resolve disputes in a fair and constructive manner.'}
            </p>
          </div>
        </>
      )
    },
    'finance-economy': {
      title: t('documentationPage.financeEconomyTitle') || 'Finance & Collaborative Economy',
      content: (
        <>
          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.justSplitTitle') || 'JustSplit'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.justSplitAboutText') || 'A simple and intuitive expense tracking and sharing app that helps friends, roommates, and groups easily manage shared finances.'}
            </p>
            
            <pre className={styles.codeBlock}>
              {`// Example expense object
{
  "id": "exp_12345",
  "amount": 45.60,
  "description": "Dinner at Restaurant",
  "date": "2023-01-15",
  "paidBy": "user_789",
  "splitType": "equal",
  "participants": ["user_789", "user_456", "user_123"]
}`}
            </pre>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.myWealthTitle') || 'MyWealth'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.myWealthDesc') || 'A comprehensive platform to visualize and control personal finances and investments in one secure place.'}
            </p>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.myBusinessTitle') || 'MyBusiness'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.myBusinessDesc') || 'A lightweight tool for entrepreneurs that combines operational and accounting management in a single interface.'}
            </p>
          </div>
        </>
      )
    },
    'sustainability-home': {
      title: t('documentationPage.sustainabilityHomeTitle') || 'Sustainability & Home Life',
      content: (
        <>
          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.plantopiaTitle') || 'Plantopia'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.plantopiaAboutText') || 'A smart gardening platform that combines IoT technology with plant care knowledge to help users cultivate thriving gardens sustainably.'}
            </p>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.ecoTulTitle') || 'EcoTul'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.ecoTulDesc') || 'A curated recommender of eco-friendly products and services evaluated by real environmental impact.'}
            </p>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.myHomeTitle') || 'MyHome'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.myHomeDesc') || 'A comprehensive app to organize home maintenance, track expenses, and plan improvements for sustainable living.'}
            </p>
          </div>
        </>
      )
    },
    'education-growth': {
      title: t('documentationPage.educationTitle') || 'Education & Personal Growth',
      content: (
        <>
          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.educationHubTitle') || 'Education Hub'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.educationHubDesc') || 'A modular platform to access learning paths and educational content in a community-oriented environment.'}
            </p>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.skillShareTitle') || 'Skill Share'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.skillShareDesc') || 'A collaborative network where people can share and teach their skills to others in the community.'}
            </p>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.habitsTitle') || 'Habits'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.habitsDesc') || 'A tool to record and track habits to achieve personal goals and foster continuous improvement.'}
            </p>
          </div>
          
          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.oneStepTitle') || 'One Step'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.oneStepDesc') || 'A micro-action system designed to help you advance toward big goals with manageable small steps.'}
            </p>
          </div>
        </>
      )
    },
    'api-reference': {
      title: t('documentationPage.apiReferenceTitle') || 'API Reference',
      content: (
        <>
          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.apiOverviewTitle') || 'Overview'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.apiOverviewText') || 'CyberEco provides RESTful APIs for all our applications, allowing developers to integrate our services into their own solutions. Our APIs use standard HTTP methods and return responses in JSON format.'}
            </p>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.apiAuthTitle') || 'Authentication'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.apiAuthText') || 'All API requests require authentication using OAuth 2.0 bearer tokens. To obtain a token, make a POST request to our authentication endpoint with your client credentials.'}
            </p>
            
            <pre className={styles.codeBlock}>
              {`// Authentication request
fetch('https://api.cybereco.io/auth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client_id: 'your_client_id',
    client_secret: 'your_client_secret',
    grant_type: 'client_credentials'
  })
})`}
            </pre>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.apiRequestsTitle') || 'Making API Requests'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.apiRequestsText') || 'Once you have your token, include it in the Authorization header for all subsequent requests. Our API endpoints follow a consistent structure for all applications.'}
            </p>
            
            <pre className={styles.codeBlock}>
              {`// Example API request
fetch('https://api.cybereco.io/justsplit/expenses', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  }
})`}
            </pre>
          </div>
        </>
      )
    },
    'philosophy': {
      title: t('documentationPage.philosophyDocTitle'),
      content: (
        <div className={styles.coreDocSection}>
          <div className={styles.coreDocHeader}>
            <div className={styles.coreDocIcon}>📖</div>
            <div className={styles.docTypeTag}>
              <span>{t('documentationPage.coreDocument')}</span>
            </div>
            <p className={styles.coreDocSummary}>
              {t('documentationPage.philosophyDocSummary')}
            </p>
          </div>
          
          <div className={`${styles.contentSection} ${styles.coreDocContent}`}>
            <h3 className={styles.subTitle}>{t('documentationPage.keyPrinciples')}</h3>
            <div className={styles.principleCards}>
              <div className={styles.principleCard}>
                <div className={styles.principleIcon}>🔐</div>
                <h4 className={styles.principleTitle}>{t('documentationPage.digitalSovereigntyPrinciple')}</h4>
                <p className={styles.principleDescription}>{t('documentationPage.digitalSovereigntyDesc')}</p>
              </div>
              <div className={styles.principleCard}>
                <div className={styles.principleIcon}>❤️</div>
                <h4 className={styles.principleTitle}>{t('documentationPage.humanCenteredPrinciple')}</h4>
                <p className={styles.principleDescription}>{t('documentationPage.humanCenteredDesc')}</p>
              </div>
              <div className={styles.principleCard}>
                <div className={styles.principleIcon}>🌱</div>
                <h4 className={styles.principleTitle}>{t('documentationPage.sustainablePrinciple')}</h4>
                <p className={styles.principleDescription}>{t('documentationPage.sustainableDesc')}</p>
              </div>
            </div>
          </div>
          
          <div className={styles.contentSection}>
            <div className={styles.redirectCard}>
              <h4>{t('documentationPage.completePhilosophyDoc')}</h4>
              <p>{t('documentationPage.completePhilosophyDesc')}</p>
              <a href="/philosophy" className={styles.redirectButton}>
                {t('documentationPage.viewFullPhilosophy')}
                <FaChevronRight />
              </a>
            </div>
          </div>
        </div>
      )
    },
    'vision': {
      title: t('documentationPage.visionDocTitle'),
      content: (
        <div className={styles.coreDocSection}>
          <div className={styles.coreDocHeader}>
            <div className={styles.coreDocIcon}>🔮</div>
            <div className={styles.docTypeTag}>
              <span>{t('documentationPage.futureVision')}</span>
            </div>
            <p className={styles.coreDocSummary}>
              {t('documentationPage.visionDocSummary')}
            </p>
          </div>
          
          <div className={`${styles.contentSection} ${styles.coreDocContent}`}>
            <h3 className={styles.subTitle}>{t('documentationPage.visionComponents')}</h3>
            <div className={styles.enhancedContentList}>
              <div className={styles.contentListItem}>
                <h4 className={styles.listItemTitle}>📱 {t('documentationPage.mobileP2PComponent')}</h4>
                <p className={styles.listItemDescription}>{t('documentationPage.mobileP2PDesc')}</p>
              </div>
              <div className={styles.contentListItem}>
                <h4 className={styles.listItemTitle}>🔐 {t('documentationPage.dataSovereigntyComponent')}</h4>
                <p className={styles.listItemDescription}>{t('documentationPage.dataSovereigntyDesc')}</p>
              </div>
              <div className={styles.contentListItem}>
                <h4 className={styles.listItemTitle}>🪙 {t('documentationPage.tokenEconomicsComponent')}</h4>
                <p className={styles.listItemDescription}>{t('documentationPage.tokenEconomicsDesc')}</p>
              </div>
              <div className={styles.contentListItem}>
                <h4 className={styles.listItemTitle}>🌍 {t('documentationPage.globalAccessComponent')}</h4>
                <p className={styles.listItemDescription}>{t('documentationPage.globalAccessDesc')}</p>
              </div>
            </div>
          </div>
          
          <div className={styles.contentSection}>
            <div className={styles.redirectCard}>
              <h4>{t('documentationPage.completeVisionDoc')}</h4>
              <p>{t('documentationPage.completeVisionDesc')}</p>
              <a href="/vision" className={styles.redirectButton}>
                {t('documentationPage.viewFullVision')}
                <FaChevronRight />
              </a>
            </div>
          </div>
        </div>
      )
    },
    'roadmap': {
      title: t('documentationPage.roadmapDocTitle'),
      content: (
        <div className={styles.coreDocSection}>
          <div className={styles.coreDocHeader}>
            <div className={styles.coreDocIcon}>🛠️</div>
            <div className={styles.docTypeTag}>
              <span>{t('documentationPage.developmentPlan')}</span>
            </div>
            <p className={styles.coreDocSummary}>
              {t('documentationPage.roadmapDocSummary')}
            </p>
          </div>
          
          <div className={`${styles.contentSection} ${styles.coreDocContent}`}>
            <h3 className={styles.subTitle}>{t('documentationPage.developmentPhases')}</h3>
            <div className={styles.phaseTimeline}>
              <div className={styles.phaseItem}>
                <div className={styles.phaseNumber}>1</div>
                <div className={styles.phaseContent}>
                  <h4 className={styles.phaseTitle}>{t('documentationPage.foundationPhase')}</h4>
                  <p className={styles.phaseDescription}>{t('documentationPage.foundationDesc')}</p>
                </div>
              </div>
              <div className={styles.phaseItem}>
                <div className={styles.phaseNumber}>2</div>
                <div className={styles.phaseContent}>
                  <h4 className={styles.phaseTitle}>{t('documentationPage.growthPhase')}</h4>
                  <p className={styles.phaseDescription}>{t('documentationPage.growthDesc')}</p>
                </div>
              </div>
              <div className={styles.phaseItem}>
                <div className={styles.phaseNumber}>3</div>
                <div className={styles.phaseContent}>
                  <h4 className={styles.phaseTitle}>{t('documentationPage.integrationPhase')}</h4>
                  <p className={styles.phaseDescription}>{t('documentationPage.integrationDesc')}</p>
                </div>
              </div>
              <div className={styles.phaseItem}>
                <div className={styles.phaseNumber}>4</div>
                <div className={styles.phaseContent}>
                  <h4 className={styles.phaseTitle}>{t('documentationPage.decentralizationPhase')}</h4>
                  <p className={styles.phaseDescription}>{t('documentationPage.decentralizationDesc')}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.contentSection}>
            <div className={styles.redirectCard}>
              <h4>{t('documentationPage.completeRoadmapDoc')}</h4>
              <p>{t('documentationPage.completeRoadmapDesc')}</p>
              <a href="/roadmap" className={styles.redirectButton}>
                {t('documentationPage.viewFullRoadmap')}
                <FaChevronRight />
              </a>
            </div>
          </div>
        </div>
      )
    },
    'portfolio': {
      title: t('documentationPage.portfolioDocTitle'),
      content: (
        <div className={styles.coreDocSection}>
          <div className={styles.coreDocHeader}>
            <div className={styles.coreDocIcon}>🚀</div>
            <div className={styles.docTypeTag}>
              <span>{t('documentationPage.solutionsOverview')}</span>
            </div>
            <p className={styles.coreDocSummary}>
              {t('documentationPage.portfolioDocSummary')}
            </p>
          </div>
          
          <div className={`${styles.contentSection} ${styles.coreDocContent}`}>
            <h3 className={styles.subTitle}>{t('documentationPage.solutionCategories')}</h3>
            <div className={styles.solutionCategories}>
              <div className={styles.categorySection}>
                <h4 className={styles.categoryTitle}>✅ {t('documentationPage.currentSolutions')}</h4>
                <div className={styles.categoryApps}>
                  <span className={styles.appChip}>Hub</span>
                  <span className={styles.appChip}>JustSplit</span>
                  <span className={styles.appChip}>Website</span>
                </div>
              </div>
              <div className={styles.categorySection}>
                <h4 className={styles.categoryTitle}>🎯 {t('documentationPage.priorityApplications')}</h4>
                <div className={styles.categoryApps}>
                  <span className={styles.appChip}>Somos</span>
                  <span className={styles.appChip}>Demos</span>
                  <span className={styles.appChip}>Plantopia</span>
                </div>
              </div>
              <div className={styles.categorySection}>
                <h4 className={styles.categoryTitle}>🚀 {t('documentationPage.futureEcosystem')}</h4>
                <div className={styles.categoryApps}>
                  <span className={styles.appChip}>{t('documentationPage.thirtyPlusApplications')}</span>
                  <span className={styles.appChip}>Finance</span>
                  <span className={styles.appChip}>Community</span>
                  <span className={styles.appChip}>Education</span>
                  <span className={styles.appChip}>Health</span>
                  <span className={styles.appChip}>Sustainability</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.contentSection}>
            <div className={styles.redirectCard}>
              <h4>{t('documentationPage.completeSolutionsPortfolio')}</h4>
              <p>{t('documentationPage.completeSolutionsDesc')}</p>
              <a href="/portfolio" className={styles.redirectButton}>
                {t('documentationPage.viewFullPortfolio')}
                <FaChevronRight />
              </a>
            </div>
          </div>
        </div>
      )
    }
  };
  
  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {t('documentationPage.title') || 'Documentation'}
        </motion.h1>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {t('documentationPage.subtitle') || 'Comprehensive guides and technical documentation for CyberEco applications'}
        </motion.p>
      </header>

      <div className={styles.searchContainer}>
        <div className={styles.searchIcon}>
          <FaSearch />
        </div>
        <input 
          type="text" 
          className={styles.searchInput}
          placeholder={t('documentationPage.searchPlaceholder') || "Search documentation..."} 
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>
      
      <div className={styles.docGrid}>
        <nav className={styles.sidebarNav}>
          <div className={styles.navSection}>
            <h3 className={styles.navTitle}>{t('documentationPage.gettingStartedNavTitle') || 'Getting Started'}</h3>
            <button 
              onClick={() => setActiveDoc('getting-started')}
              className={`${styles.navItem} ${activeDoc === 'getting-started' ? styles.active : ''}`}
            >
              {t('documentationPage.introductionNavItem') || 'Introduction'}
              <FaChevronRight size={10} />
            </button>
            <button 
              onClick={() => setActiveDoc('key-concepts')}
              className={`${styles.navItem} ${activeDoc === 'key-concepts' ? styles.active : ''}`}
            >
{t('documentationPage.keyConceptsTitle')}
              <FaChevronRight size={10} />
            </button>
          </div>
          
          <div className={styles.navSection}>
            <h3 className={styles.navTitle}>{t('documentationPage.coreDocumentationTitle')}</h3>
            <button 
              onClick={() => setActiveDoc('philosophy')}
              className={`${styles.navItem} ${activeDoc === 'philosophy' ? styles.active : ''}`}
            >
              📖 {t('documentationPage.philosophyDocTitle')}
              <FaChevronRight size={10} />
            </button>
            <button 
              onClick={() => setActiveDoc('vision')}
              className={`${styles.navItem} ${activeDoc === 'vision' ? styles.active : ''}`}
            >
              🔮 {t('documentationPage.visionDocTitle')}
              <FaChevronRight size={10} />
            </button>
            <button 
              onClick={() => setActiveDoc('roadmap')}
              className={`${styles.navItem} ${activeDoc === 'roadmap' ? styles.active : ''}`}
            >
              🛠️ {t('documentationPage.roadmapDocTitle')}
              <FaChevronRight size={10} />
            </button>
            <button 
              onClick={() => setActiveDoc('portfolio')}
              className={`${styles.navItem} ${activeDoc === 'portfolio' ? styles.active : ''}`}
            >
              🚀 {t('documentationPage.portfolioDocTitle')}
              <FaChevronRight size={10} />
            </button>
          </div>
          
          <div className={styles.navSection}>
            <h3 className={styles.navTitle}>{t('documentationPage.applicationsNavTitle') || 'Solution Categories'}</h3>
            <button 
              onClick={() => setActiveDoc('community-governance')}
              className={`${styles.navItem} ${activeDoc === 'community-governance' ? styles.active : ''}`}
            >
              {t('documentationPage.communityGovernanceNavItem') || 'Community & Governance'}
              <FaChevronRight size={10} />
            </button>
            <button 
              onClick={() => setActiveDoc('finance-economy')}
              className={`${styles.navItem} ${activeDoc === 'finance-economy' ? styles.active : ''}`}
            >
              {t('documentationPage.financeEconomyNavItem') || 'Finance & Economy'}
              <FaChevronRight size={10} />
            </button>
            <button 
              onClick={() => setActiveDoc('sustainability-home')}
              className={`${styles.navItem} ${activeDoc === 'sustainability-home' ? styles.active : ''}`}
            >
              {t('documentationPage.sustainabilityHomeNavItem') || 'Sustainability & Home'}
              <FaChevronRight size={10} />
            </button>
            <button 
              onClick={() => setActiveDoc('education-growth')}
              className={`${styles.navItem} ${activeDoc === 'education-growth' ? styles.active : ''}`}
            >
              {t('documentationPage.educationGrowthNavItem') || 'Education & Growth'}
              <FaChevronRight size={10} />
            </button>
          </div>
          
          <div className={styles.navSection}>
            <h3 className={styles.navTitle}>{t('documentationPage.developerNavTitle') || 'Developer'}</h3>
            <button 
              onClick={() => setActiveDoc('api-reference')}
              className={`${styles.navItem} ${activeDoc === 'api-reference' ? styles.active : ''}`}
            >
              {t('documentationPage.apiReferenceNavItem') || 'API Reference'}
              <FaChevronRight size={10} />
            </button>
          </div>
        </nav>
        
        <main className={styles.mainContent}>
          <motion.div
            key={activeDoc}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className={styles.contentTitle}>
              <FaBook style={{ marginRight: '10px', verticalAlign: 'text-top' }} />
              {docs[activeDoc].title}
            </h2>
            {docs[activeDoc].content}
          </motion.div>
        </main>
      </div>
    </div>
  );
}