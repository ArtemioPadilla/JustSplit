'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaBook, FaSearch, FaChevronRight } from 'react-icons/fa';
import { useLanguage } from '@cybereco/ui-components';
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
  const [filteredDocs, setFilteredDocs] = useState<string[]>([]);
  const { t } = useLanguage();
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredDocs([]);
      return;
    }
    
    // Create searchable content for each document (English and Spanish)
    const searchableContent = {
      'getting-started': `getting started introduction cybereco digital ecosystem expense financial collaboration community engagement social connectivity human-centered framework conscious connected sustainable living primeros pasos introducción ecosistema digital colaboración financiera compromiso comunitario marco centrado humano vida consciente conectada sostenible`,
      'key-concepts': `key concepts architecture digital sovereignty human-centered design community-driven development ecosystem modular applications interoperable user-controlled privacy core design conceptos clave arquitectura soberanía digital diseño centrado humano desarrollo impulsado comunidad ecosistema aplicaciones modulares interoperables controladas usuario privacidad diseño central`,
      'philosophy': `philosophy platform digital sovereignty human-centered design sustainable development users own data technology serves human wellbeing long-term thinking short-term profits filosofía plataforma soberanía digital diseño centrado humano desarrollo sostenible usuarios poseen datos tecnología sirve bienestar humano pensamiento largo plazo ganancias corto`,
      'vision': `vision decentralized future mobile p2p networks complete data sovereignty token economics global accessibility smartphones network nodes cryptographic guarantees participation rewards censorship-resistant visión futuro descentralizado redes p2p móviles soberanía completa datos economía tokens accesibilidad global smartphones nodos red garantías criptográficas recompensas participación resistente censura`,
      'roadmap': `roadmap development foundation growth integration decentralization 2024 2025 2026 2027 2028 2029 2030 core applications priority apps ecosystem p2p networks hoja ruta desarrollo fundación crecimiento integración descentralización aplicaciones centrales prioritarias ecosistema redes`,
      'portfolio': `portfolio solutions current hub justsplit website priority somos demos plantopia future applications finance community education health sustainability portafolio soluciones actuales futuras aplicaciones finanzas comunidad educación salud sostenibilidad`,
      'community-governance': `community governance demos participatory digital democracy voting decision-making organizations neighborhoods community manager mycommunity conciliation conflict resolution comunidad gobernanza democracia digital participativa votación toma decisiones organizaciones vecindarios gestor comunitario conciliación resolución conflictos`,
      'finance-economy': `finance economy collaborative justsplit expense tracking sharing mywealth personal finances investments mybusiness entrepreneurs operational accounting management finanzas economía colaborativa seguimiento gastos compartir riqueza personal inversiones negocio emprendedores gestión operativa contable`,
      'sustainability-home': `sustainability home life plantopia smart gardening iot technology plant care ecotul eco-friendly products environmental impact myhome maintenance improvements sostenibilidad vida hogar jardinería inteligente tecnología iot cuidado plantas productos ecológicos impacto ambiental mantenimiento mejoras`,
      'education-growth': `education personal growth education hub learning paths educational content skill share collaborative network habits tracking goals one step micro-action system educación crecimiento personal rutas aprendizaje contenido educativo compartir habilidades red colaborativa hábitos seguimiento objetivos sistema micro-acción`,
      'api-reference': `api reference overview restful apis developers oauth authentication bearer tokens json format http methods client credentials authorization header referencia apis desarrolladores autenticación oauth tokens portador formato json métodos http credenciales cliente encabezado autorización`,
      'user-guides': `user guides tutorials getting started account setup justsplit mobile privacy settings group management data export step-by-step walkthrough beginner intermediate advanced guías usuario tutoriales primeros pasos configuración cuenta móvil privacidad gestión grupos exportación datos paso a paso principiante intermedio avanzado`,
      'faq': `frequently asked questions faq general justsplit privacy security currency offline help answers quick solutions community support preguntas frecuentes generales privacidad seguridad moneda sin conexión ayuda respuestas soluciones rápidas soporte comunitario`,
      'troubleshooting': `troubleshooting common issues critical problems account access missing data notifications performance app crashes solutions steps emergency procedures support solución problemas comunes críticos acceso cuenta datos perdidos notificaciones rendimiento fallas aplicación soluciones pasos procedimientos emergencia soporte`,
      'community': `community support governance forums discord local groups events learning sessions coffee chats hackathons working groups council involvement leadership resources comunicad soporte gobernanza foros grupos locales eventos sesiones aprendizaje charlas café hackathons grupos trabajo consejo participación liderazgo recursos`,
      'development-setup': `development setup prerequisites nodejs firebase nx tools monorepo development workflow git clone install npm run dev hub justsplit website ports localhost environment configuración desarrollo requisitos previos herramientas flujo trabajo entorno puertos`,
      'architecture': `architecture monorepo structure nx build system applications shared libraries firebase configuration tech stack nextjs typescript css modules jest testing arquitectura estructura sistema construcción aplicaciones bibliotecas compartidas configuración tecnología pila`
    };
    
    // Filter documents based on search query
    const matches = Object.keys(searchableContent).filter(docKey => {
      const content = searchableContent[docKey as keyof typeof searchableContent];
      return content.includes(query);
    });
    
    setFilteredDocs(matches);
    
    // Auto-select first match if available
    if (matches.length > 0 && !matches.includes(activeDoc)) {
      setActiveDoc(matches[0]);
    }
  };

  const docs: DocSections = {
    'getting-started': {
      title: t('documentationPage.gettingStartedTitle') || 'Getting Started with CyberEco',
      content: (
        <>
          <div className={styles.contentSection}>
            <div className={styles.progressIndicator}>
              <span className={styles.progressLabel}>{t('documentationPage.quickStartLabel') || '📍 Quick Start Guide'}</span>
              <div className={styles.estimatedTime}>{t('documentationPage.quickStartTime') || '⏱️ 5 minutes'}</div>
            </div>
            <h3 className={styles.subTitle}>{t('documentationPage.introductionTitle') || 'Introduction'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.introductionText') || 'Welcome to CyberEco documentation! This guide will help you get started with our digital ecosystem. CyberEco offers a suite of digital solutions designed to enhance financial collaboration, community engagement, and social connectivity, all within a human-centered framework for conscious, connected, and sustainable living.'}
            </p>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>🚀 {t('documentationPage.quickStartTitle') || 'Quick Start'}</h3>
            <div className={styles.stepByStepGuide}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h4>{t('documentationPage.step1Title') || 'Create Your Account'}</h4>
                  <p>{t('documentationPage.step1Desc') || 'Sign up for a CyberEco Hub account to access all applications with a single identity.'}</p>
                  <button className={styles.actionButton}>
                    {t('documentationPage.signUpNow') || 'Sign Up Now'} →
                  </button>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h4>{t('documentationPage.step2Title') || 'Explore Applications'}</h4>
                  <p>{t('documentationPage.step2Desc') || 'Start with JustSplit for expense sharing, then discover our growing ecosystem.'}</p>
                  <button className={styles.actionButton}>
                    {t('documentationPage.exploreApps') || 'Explore Apps'} →
                  </button>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <h4>{t('documentationPage.step3Title') || 'Join the Community'}</h4>
                  <p>{t('documentationPage.step3Desc') || 'Connect with other users and contribute to our human-centered technology vision.'}</p>
                  <button className={styles.actionButton}>
                    {t('documentationPage.joinCommunity') || 'Join Community'} →
                  </button>
                </div>
              </div>
            </div>
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
            <div className={styles.learningPath}>
              <h3 className={styles.subTitle}>🎯 {t('documentationPage.learningPathTitle') || 'Choose Your Learning Path'}</h3>
              <div className={styles.pathOptions}>
                <a href="/learning-paths/business-user" className={styles.pathCard}>
                  <div className={styles.pathIcon}>👨‍💼</div>
                  <h4>{t('documentationPage.businessUserPath') || 'Business User'}</h4>
                  <p>{t('documentationPage.businessUserDesc') || 'Learn to use applications for team collaboration and expense management.'}</p>
                  <div className={styles.pathStats}>
                    <span>{t('documentationPage.fifteenMin') || '⏱️ 15 min'}</span>
                    <span>{t('documentationPage.fiveTopics') || '📚 5 topics'}</span>
                  </div>
                </a>
                <a href="/learning-paths/developer" className={styles.pathCard}>
                  <div className={styles.pathIcon}>👩‍💻</div>
                  <h4>{t('documentationPage.developerPath') || 'Developer'}</h4>
                  <p>{t('documentationPage.developerDesc') || 'Technical integration, API usage, and platform architecture.'}</p>
                  <div className={styles.pathStats}>
                    <span>{t('documentationPage.fortyFiveMin') || '⏱️ 45 min'}</span>
                    <span>{t('documentationPage.twelveTopics') || '📚 12 topics'}</span>
                  </div>
                </a>
                <a href="/learning-paths/community-leader" className={styles.pathCard}>
                  <div className={styles.pathIcon}>🏛️</div>
                  <h4>{t('documentationPage.communityPath') || 'Community Leader'}</h4>
                  <p>{t('documentationPage.communityDesc') || 'Governance, digital sovereignty, and platform philosophy.'}</p>
                  <div className={styles.pathStats}>
                    <span>{t('documentationPage.thirtyMin') || '⏱️ 30 min'}</span>
                    <span>{t('documentationPage.eightTopics') || '📚 8 topics'}</span>
                  </div>
                </a>
              </div>
            </div>
          </div>

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
            
            <div className={styles.interactiveCodeBlock}>
              <div className={styles.codeHeader}>
                <span className={styles.codeLanguage}>JavaScript</span>
                <button className={styles.copyButton} onClick={() => navigator.clipboard.writeText(`fetch('https://api.cybere.co/auth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client_id: 'your_client_id',
    client_secret: 'your_client_secret',
    grant_type: 'client_credentials'
  })
})`)}>
                  📋 Copy
                </button>
              </div>
              <pre className={styles.codeBlock}>
                {`// Authentication request
fetch('https://api.cybere.co/auth/token', {
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
              <div className={styles.codeActions}>
                <button className={styles.tryButton}>
                  ⚡ Try in Sandbox
                </button>
                <a href="#api-playground" className={styles.playgroundLink}>
                  🔗 Open in API Playground
                </a>
              </div>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.apiRequestsTitle') || 'Making API Requests'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.apiRequestsText') || 'Once you have your token, include it in the Authorization header for all subsequent requests. Our API endpoints follow a consistent structure for all applications.'}
            </p>
            
            <pre className={styles.codeBlock}>
              {`// Example API request
fetch('https://api.cybere.co/justsplit/expenses', {
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
    'user-guides': {
      title: t('documentationPage.userGuidesTitle') || 'User Guides',
      content: (
        <>
          <div className={styles.contentSection}>
            <div className={styles.progressIndicator}>
              <span className={styles.progressLabel}>📚 {t('documentationPage.completeUserDocsLabel') || 'Complete User Documentation'}</span>
              <div className={styles.estimatedTime}>⏱️ {t('documentationPage.userDocsTime') || '10-30 minutes per guide'}</div>
            </div>
            <h3 className={styles.subTitle}>{t('documentationPage.gettingStartedGuidesTitle') || 'Getting Started Guides'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.gettingStartedGuidesText') || 'Step-by-step guides to help you set up your account and start using CyberEco applications effectively.'}
            </p>
            
            <div className={styles.guideGrid}>
              <a href="/guides/account-setup" className={styles.guideCard}>
                <div className={styles.guideIcon}>🚀</div>
                <h4>{t('documentationPage.accountSetupGuide') || 'Account Creation & Setup'}</h4>
                <p>{t('documentationPage.accountSetupDesc') || 'Complete walkthrough of creating your CyberEco Hub account with privacy settings and security setup.'}</p>
                <div className={styles.guideStats}>
                  <span>⏱️ 10-15 min</span>
                  <span>📈 Beginner</span>
                </div>
              </a>
              
              <a href="/guides/justsplit" className={styles.guideCard}>
                <div className={styles.guideIcon}>💰</div>
                <h4>{t('documentationPage.justSplitGuide') || 'JustSplit User Guide'}</h4>
                <p>{t('documentationPage.justSplitGuideDesc') || 'Master expense splitting, group management, receipt scanning, and settlement tracking.'}</p>
                <div className={styles.guideStats}>
                  <span>⏱️ 30-45 min</span>
                  <span>📈 Intermediate</span>
                </div>
              </a>
              
              <a href="/guides/mobile-app" className={styles.guideCard}>
                <div className={styles.guideIcon}>📱</div>
                <h4>{t('documentationPage.mobileAppGuide') || 'Mobile App Guide'}</h4>
                <p>{t('documentationPage.mobileAppDesc') || 'Optimize your mobile experience with offline features, quick actions, and location-based suggestions.'}</p>
                <div className={styles.guideStats}>
                  <span>⏱️ 15-20 min</span>
                  <span>📈 Beginner</span>
                </div>
              </a>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.advancedTutorialsTitle') || 'Advanced Tutorials'}</h3>
            <div className={styles.tutorialList}>
              <a href="/guides/privacy-settings" className={styles.tutorialItem}>
                <div className={styles.tutorialIcon}>🔐</div>
                <div className={styles.tutorialContent}>
                  <h4>{t('documentationPage.privacySettingsGuide') || 'Privacy Settings Deep Dive'}</h4>
                  <p>{t('documentationPage.privacySettingsDesc') || 'Master all privacy controls, data sharing options, and security features.'}</p>
                </div>
                <div className={styles.tutorialMeta}>
                  <span>⏱️ 25 min</span>
                </div>
              </a>
              
              <a href="/guides/group-management" className={styles.tutorialItem}>
                <div className={styles.tutorialIcon}>👥</div>
                <div className={styles.tutorialContent}>
                  <h4>{t('documentationPage.groupManagementGuide') || 'Advanced Group Management'}</h4>
                  <p>{t('documentationPage.groupManagementDesc') || 'Create, manage, and optimize groups for various scenarios and team sizes.'}</p>
                </div>
                <div className={styles.tutorialMeta}>
                  <span>⏱️ 35 min</span>
                </div>
              </a>
              
              <a href="/guides/data-export" className={styles.tutorialItem}>
                <div className={styles.tutorialIcon}>📊</div>
                <div className={styles.tutorialContent}>
                  <h4>{t('documentationPage.dataExportGuide') || 'Data Export & Analysis'}</h4>
                  <p>{t('documentationPage.dataExportDesc') || 'Export your data, generate reports, and analyze spending patterns.'}</p>
                </div>
                <div className={styles.tutorialMeta}>
                  <span>⏱️ 20 min</span>
                </div>
              </a>
            </div>
          </div>
        </>
      )
    },
    'faq': {
      title: t('documentationPage.faqTitle') || 'Frequently Asked Questions',
      content: (
        <>
          <div className={styles.contentSection}>
            <div className={styles.progressIndicator}>
              <span className={styles.progressLabel}>❓ {t('documentationPage.quickAnswersLabel') || 'Quick Answers'}</span>
              <div className={styles.estimatedTime}>⏱️ {t('documentationPage.quickAnswersTime') || '2-5 minutes per question'}</div>
            </div>
            <h3 className={styles.subTitle}>{t('documentationPage.generalQuestionsTitle') || 'General Questions'}</h3>
            
            <div className={styles.faqSection}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  {t('documentationPage.faq1Question') || 'What is CyberEco and how is it different?'}
                </summary>
                <div className={styles.faqAnswer}>
                  <p>{t('documentationPage.faq1Answer') || 'CyberEco is a digital ecosystem designed for human flourishing. Unlike traditional apps that prioritize engagement and data collection, we focus on enhancing real-world relationships and giving you complete control over your digital life.'}</p>
                </div>
              </details>
              
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  {t('documentationPage.faq2Question') || 'Is CyberEco free to use?'}
                </summary>
                <div className={styles.faqAnswer}>
                  <p>{t('documentationPage.faq2Answer') || 'Hub Account is free forever. JustSplit is free for personal use (up to 10 expenses/month). Pro plans start at $4.99/month for unlimited features.'}</p>
                </div>
              </details>
              
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  {t('documentationPage.faq3Question') || 'How do you protect my privacy?'}
                </summary>
                <div className={styles.faqAnswer}>
                  <p>{t('documentationPage.faq3Answer') || 'We use end-to-end encryption, minimal data collection, and give you complete control over your information. We never sell your data or use it for advertising.'}</p>
                </div>
              </details>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.justSplitQuestionsTitle') || 'JustSplit Questions'}</h3>
            
            <div className={styles.faqSection}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  {t('documentationPage.faq4Question') || 'How does expense splitting work?'}
                </summary>
                <div className={styles.faqAnswer}>
                  <p>{t('documentationPage.faq4Answer') || 'Add an expense with participants, choose a splitting method (equal, custom, percentage, or shares), and everyone gets notified. Track settlements as people pay each other back.'}</p>
                </div>
              </details>
              
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  {t('documentationPage.faq5Question') || 'Can I use different currencies?'}
                </summary>
                <div className={styles.faqAnswer}>
                  <p>{t('documentationPage.faq5Answer') || 'Yes! JustSplit supports 150+ currencies with real-time conversion. Each person sees amounts in their preferred currency automatically.'}</p>
                </div>
              </details>
              
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  {t('documentationPage.faq6Question') || 'Does it work offline?'}
                </summary>
                <div className={styles.faqAnswer}>
                  <p>{t('documentationPage.faq6Answer') || 'Yes, mobile apps work offline. You can add expenses, view data, and take receipt photos. Everything syncs when you reconnect.'}</p>
                </div>
              </details>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.needMoreHelpTitle') || 'Need More Help?'}</h3>
            <div className={styles.helpOptions}>
              <div className={styles.helpOption}>
                <div className={styles.helpIcon}>📚</div>
                <h4>{t('documentationPage.fullFaqTitle') || 'Complete FAQ'}</h4>
                <p>{t('documentationPage.fullFaqDesc') || 'Browse our comprehensive FAQ covering all topics and use cases.'}</p>
              </div>
              
              <div className={styles.helpOption}>
                <div className={styles.helpIcon}>🛠️</div>
                <h4>{t('documentationPage.troubleshootingTitle') || 'Troubleshooting'}</h4>
                <p>{t('documentationPage.troubleshootingDesc') || 'Step-by-step solutions for common issues and problems.'}</p>
              </div>
              
              <div className={styles.helpOption}>
                <div className={styles.helpIcon}>💬</div>
                <h4>{t('documentationPage.communityForumsTitle') || 'Community Support'}</h4>
                <p>{t('documentationPage.communityForumsDesc') || 'Get help from other users and our support team.'}</p>
              </div>
            </div>
          </div>
        </>
      )
    },
    'troubleshooting': {
      title: t('documentationPage.troubleshootingTitle') || 'Troubleshooting',
      content: (
        <>
          <div className={styles.contentSection}>
            <div className={styles.progressIndicator}>
              <span className={styles.progressLabel}>🛠️ Self-Service Solutions</span>
              <div className={styles.estimatedTime}>⏱️ 5-15 minutes per issue</div>
            </div>
            <h3 className={styles.subTitle}>{t('documentationPage.criticalIssuesTitle') || 'Critical Issues (Immediate Resolution)'}</h3>
            
            <div className={styles.troubleshootingSection}>
              <div className={styles.issueCard}>
                <div className={styles.issueHeader}>
                  <div className={styles.issueSeverity} data-severity="critical">🚨 Critical</div>
                  <h4>{t('documentationPage.cannotAccessAccountTitle') || 'Cannot Access Account'}</h4>
                </div>
                <div className={styles.issueContent}>
                  <p><strong>{t('documentationPage.symptomsLabel') || 'Symptoms'}:</strong> {t('documentationPage.loginIssuesSymptoms') || 'Login fails, password reset not working, 2FA problems'}</p>
                  <div className={styles.solutionSteps}>
                    <h5>{t('documentationPage.quickSolutionsTitle') || 'Quick Solutions'}:</h5>
                    <ol>
                      <li>{t('documentationPage.passwordResetStep') || 'Try password reset from login page'}</li>
                      <li>{t('documentationPage.use2faBackupStep') || 'Use 2FA backup codes if available'}</li>
                      <li>{t('documentationPage.contactRecoveryStep') || 'Email recovery@cybere.co with account details'}</li>
                    </ol>
                  </div>
                  <div className={styles.responseTime}>
                    <span>⏱️ {t('documentationPage.responseTimeLabel') || 'Response time'}: 2 {t('documentationPage.hoursLabel') || 'hours'}</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.issueCard}>
                <div className={styles.issueHeader}>
                  <div className={styles.issueSeverity} data-severity="critical">🚨 Critical</div>
                  <h4>{t('documentationPage.missingDataTitle') || 'Missing or Incorrect Data'}</h4>
                </div>
                <div className={styles.issueContent}>
                  <p><strong>{t('documentationPage.symptomsLabel')}:</strong> {t('documentationPage.dataIssuesSymptoms') || 'Expenses disappeared, amounts wrong, participants missing'}</p>
                  <div className={styles.solutionSteps}>
                    <h5>{t('documentationPage.quickSolutionsTitle')}:</h5>
                    <ol>
                      <li>{t('documentationPage.forceSyncStep') || 'Force sync by pulling down on expense list'}</li>
                      <li>{t('documentationPage.checkDraftsStep') || 'Check Profile → Drafts for unsaved expenses'}</li>
                      <li>{t('documentationPage.contactDataRecoveryStep') || 'Email data-recovery@cybere.co if data truly lost'}</li>
                    </ol>
                  </div>
                  <div className={styles.responseTime}>
                    <span>⏱️ {t('documentationPage.responseTimeLabel')}: 4 {t('documentationPage.hoursLabel')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.commonIssuesTitle') || 'Common Issues'}</h3>
            
            <div className={styles.troubleshootingSection}>
              <div className={styles.issueCard}>
                <div className={styles.issueHeader}>
                  <div className={styles.issueSeverity} data-severity="warning">⚠️ Common</div>
                  <h4>{t('documentationPage.appPerformanceTitle') || 'App Performance Problems'}</h4>
                </div>
                <div className={styles.issueContent}>
                  <p><strong>{t('documentationPage.symptomsLabel')}:</strong> {t('documentationPage.performanceSymptoms') || 'Slow loading, crashes, freezing, high battery usage'}</p>
                  <div className={styles.solutionSteps}>
                    <h5>{t('documentationPage.quickFixesTitle') || 'Quick Fixes'}:</h5>
                    <ol>
                      <li>{t('documentationPage.restartAppStep') || 'Close app completely and reopen'}</li>
                      <li>{t('documentationPage.restartDeviceStep') || 'Restart your device'}</li>
                      <li>{t('documentationPage.checkStorageStep') || 'Check available storage (need 500MB+)'}</li>
                      <li>{t('documentationPage.updateAppStep') || 'Update app to latest version'}</li>
                    </ol>
                  </div>
                </div>
              </div>
              
              <div className={styles.issueCard}>
                <div className={styles.issueHeader}>
                  <div className={styles.issueSeverity} data-severity="warning">⚠️ Common</div>
                  <h4>{t('documentationPage.notificationsTitle') || 'Notifications Not Working'}</h4>
                </div>
                <div className={styles.issueContent}>
                  <p><strong>{t('documentationPage.symptomsLabel')}:</strong> {t('documentationPage.notificationSymptoms') || 'Not receiving expense notifications, reminders, or updates'}</p>
                  <div className={styles.solutionSteps}>
                    <h5>{t('documentationPage.quickFixesTitle')}:</h5>
                    <ol>
                      <li>{t('documentationPage.checkNotificationSettingsStep') || 'Check notification settings in app and device'}</li>
                      <li>{t('documentationPage.checkSpamStep') || 'Check email spam/junk folder'}</li>
                      <li>{t('documentationPage.testNotificationsStep') || 'Use "Send Test Email" in settings'}</li>
                      <li>{t('documentationPage.addToContactsStep') || 'Add support@cybere.co to contacts'}</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.emergencyProceduresTitle') || 'Emergency Procedures'}</h3>
            
            <div className={styles.emergencySection}>
              <div className={styles.emergencyCard}>
                <div className={styles.emergencyHeader}>
                  <div className={styles.emergencyIcon}>🚨</div>
                  <h4>{t('documentationPage.securityBreachTitle') || 'Suspected Security Breach'}</h4>
                </div>
                <div className={styles.emergencyContent}>
                  <p><strong>{t('documentationPage.immediateActionsLabel') || 'Immediate Actions (within 5 minutes)'}:</strong></p>
                  <ol>
                    <li>{t('documentationPage.changePasswordStep') || 'Change password immediately'}</li>
                    <li>{t('documentationPage.enable2faStep') || 'Enable 2FA if not already active'}</li>
                    <li>{t('documentationPage.logoutAllStep') || 'Log out all devices in Settings → Security'}</li>
                    <li>{t('documentationPage.emailSecurityStep') || 'Email security@cybere.co with details'}</li>
                  </ol>
                  <div className={styles.emergencyContact}>
                    <span>📧 security@cybere.co | ⏱️ 1 {t('documentationPage.hourResponseLabel') || 'hour response'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.getMoreHelpTitle') || 'Get More Help'}</h3>
            <div className={styles.supportOptions}>
              <div className={styles.supportOption}>
                <div className={styles.supportIcon}>📧</div>
                <h4>{t('documentationPage.directSupportTitle') || 'Direct Support'}</h4>
                <p>{t('documentationPage.directSupportDesc') || 'Email support@cybere.co for personalized help with your specific issue.'}</p>
                <p><strong>{t('documentationPage.responseTimeLabel')}:</strong> 24 {t('documentationPage.hoursLabel')} | 4 {t('documentationPage.hoursLabel')} {t('documentationPage.forPaidUsersLabel') || 'for paid users'}</p>
              </div>
              
              <div className={styles.supportOption}>
                <div className={styles.supportIcon}>🤝</div>
                <h4>{t('documentationPage.communityHelpTitle') || 'Community Help'}</h4>
                <p>{t('documentationPage.communityHelpDesc') || 'Get help from other users in our forums and Discord community.'}</p>
                <p><strong>{t('documentationPage.availabilityLabel') || 'Availability'}:</strong> 24/7 {t('documentationPage.communityLabel') || 'community'}</p>
              </div>
              
              <div className={styles.supportOption}>
                <div className={styles.supportIcon}>📚</div>
                <h4>{t('documentationPage.fullGuideTitle') || 'Complete Troubleshooting Guide'}</h4>
                <p>{t('documentationPage.fullGuideDesc') || 'Access our comprehensive troubleshooting documentation with detailed solutions.'}</p>
                <p><strong>{t('documentationPage.coverageLabel') || 'Coverage'}:</strong> 100+ {t('documentationPage.issuesLabel') || 'issues'}</p>
              </div>
            </div>
          </div>
        </>
      )
    },
    'community': {
      title: t('documentationPage.communityResourcesTitle') || 'Community & Support',
      content: (
        <>
          <div className={styles.contentSection}>
            <div className={styles.progressIndicator}>
              <span className={styles.progressLabel}>🤝 {t('documentationPage.communityPoweredLabel') || 'Community Powered'}</span>
              <div className={styles.estimatedTime}>⏱️ {t('documentationPage.joinCommunityTime') || 'Join our growing community'}</div>
            </div>
            <h3 className={styles.subTitle}>{t('documentationPage.communityVisionTitle') || 'Our Community Vision'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.communityVisionText') || 'CyberEco is more than a platform—it\'s a community of people who believe technology should serve human flourishing. We organize around principles of digital sovereignty, human-centered design, and sustainable growth.'}
            </p>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.communityChannelsTitle') || 'Community Channels'}</h3>
            
            <div className={styles.communityChannels}>
              <div className={styles.channelCard}>
                <div className={styles.channelIcon}>💬</div>
                <h4>{t('documentationPage.communityForumsTitle') || 'Community Forums'}</h4>
                <p>{t('documentationPage.communityForumsFullDesc') || 'Primary platform for discussion, feature requests, and community voting. All major decisions start here.'}</p>
                <div className={styles.channelStats}>
                  <div className={styles.channelStat}>
                    <span className={styles.statNumber}>2,156</span>
                    <span className={styles.statLabel}>{t('documentationPage.membersLabel') || 'members'}</span>
                  </div>
                  <div className={styles.channelStat}>
                    <span className={styles.statNumber}>45+</span>
                    <span className={styles.statLabel}>{t('documentationPage.weeklyPostsLabel') || 'weekly posts'}</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.channelCard}>
                <div className={styles.channelIcon}>🎮</div>
                <h4>{t('documentationPage.discordServerTitle') || 'Discord Server'}</h4>
                <p>{t('documentationPage.discordServerDesc') || 'Real-time chat, technical help, and social events. Connect with other users and the development team.'}</p>
                <div className={styles.channelStats}>
                  <div className={styles.channelStat}>
                    <span className={styles.statNumber}>1,234</span>
                    <span className={styles.statLabel}>{t('documentationPage.membersLabel') || 'members'}</span>
                  </div>
                  <div className={styles.channelStat}>
                    <span className={styles.statNumber}>200+</span>
                    <span className={styles.statLabel}>{t('documentationPage.activeUsersLabel') || 'active daily'}</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.channelCard}>
                <div className={styles.channelIcon}>🌍</div>
                <h4>{t('documentationPage.localGroupsTitle') || 'Local Groups'}</h4>
                <p>{t('documentationPage.localGroupsDesc') || 'In-person meetups in major cities for user training, feedback sessions, and social events.'}</p>
                <div className={styles.channelStats}>
                  <div className={styles.channelStat}>
                    <span className={styles.statNumber}>8</span>
                    <span className={styles.statLabel}>{t('documentationPage.citiesLabel') || 'cities'}</span>
                  </div>
                  <div className={styles.channelStat}>
                    <span className={styles.statNumber}>456</span>
                    <span className={styles.statLabel}>{t('documentationPage.localMembersLabel') || 'local members'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.governanceTitle') || 'Community Governance'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.governanceText') || 'Our community is guided by a representative Community Council and specialized Working Groups that shape platform development and policies.'}
            </p>
            
            <div className={styles.governanceStructure}>
              <div className={styles.governanceLevel}>
                <h4>{t('documentationPage.communityCouncilTitle') || 'Community Council'}</h4>
                <p>{t('documentationPage.communityCouncilDesc') || '9 members: 6 user representatives, 2 developers, 1 founder. Guides major decisions and policy.'}</p>
                <div className={styles.governanceFeatures}>
                  <span>🗳️ {t('documentationPage.electedMembersLabel') || 'Elected members'}</span>
                  <span>📅 {t('documentationPage.yearTermsLabel') || '2-year terms'}</span>
                  <span>🔄 {t('documentationPage.rotationLabel') || '50% rotation'}</span>
                </div>
              </div>
              
              <div className={styles.governanceLevel}>
                <h4>{t('documentationPage.workingGroupsTitle') || 'Working Groups'}</h4>
                <p>{t('documentationPage.workingGroupsDesc') || 'Specialized teams focusing on features, privacy, outreach, and design. Open to community participation.'}</p>
                <div className={styles.governanceFeatures}>
                  <span>🛠️ {t('documentationPage.featureDevelopmentLabel') || 'Feature Development'}</span>
                  <span>🔒 {t('documentationPage.privacySecurityLabel') || 'Privacy & Security'}</span>
                  <span>🎨 {t('documentationPage.designAccessibilityLabel') || 'Design & Accessibility'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.communityEventsTitle') || 'Community Events'}</h3>
            
            <div className={styles.eventsList}>
              <div className={styles.eventItem}>
                <div className={styles.eventFrequency}>📅 {t('documentationPage.monthlyLabel') || 'Monthly'}</div>
                <div className={styles.eventContent}>
                  <h4>{t('documentationPage.learningSessionsTitle') || 'Learning Sessions'}</h4>
                  <p>{t('documentationPage.learningSessionsDesc') || 'Interactive workshops on digital privacy, sustainable technology, and community organizing.'}</p>
                </div>
                <div className={styles.eventMeta}>
                  <span>⏱️ 90 min</span>
                </div>
              </div>
              
              <div className={styles.eventItem}>
                <div className={styles.eventFrequency}>📅 {t('documentationPage.weeklyLabel') || 'Weekly'}</div>
                <div className={styles.eventContent}>
                  <h4>{t('documentationPage.coffeeChatsTitle') || 'Coffee Chats'}</h4>
                  <p>{t('documentationPage.coffeeChatsDesc') || 'Informal community building in small groups across multiple time zones.'}</p>
                </div>
                <div className={styles.eventMeta}>
                  <span>⏱️ 60 min</span>
                </div>
              </div>
              
              <div className={styles.eventItem}>
                <div className={styles.eventFrequency}>📅 {t('documentationPage.quarterlyLabel') || 'Quarterly'}</div>
                <div className={styles.eventContent}>
                  <h4>{t('documentationPage.hackathonsTitle') || 'Community Hackathons'}</h4>
                  <p>{t('documentationPage.hackathonsDesc') || 'Community-driven feature development with mentorship and implementation opportunities.'}</p>
                </div>
                <div className={styles.eventMeta}>
                  <span>⏱️ 2-3 days</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.gettingInvolvedTitle') || 'Getting Involved'}</h3>
            
            <div className={styles.involvementOptions}>
              <div className={styles.involvementCard}>
                <div className={styles.involvementLevel}>🌱 {t('documentationPage.beginnerLevel') || 'Beginner'}</div>
                <h4>{t('documentationPage.newMemberTitle') || 'New Member Path'}</h4>
                <ol>
                  <li>{t('documentationPage.joinForumsStep') || 'Join community forums'}</li>
                  <li>{t('documentationPage.introduceYourselfStep') || 'Introduce yourself'}</li>
                  <li>{t('documentationPage.attendCoffeeStep') || 'Attend a coffee chat'}</li>
                  <li>{t('documentationPage.findWorkingGroupStep') || 'Find your working group'}</li>
                </ol>
              </div>
              
              <div className={styles.involvementCard}>
                <div className={styles.involvementLevel}>🌟 {t('documentationPage.advancedLevel') || 'Advanced'}</div>
                <h4>{t('documentationPage.leadershipTitle') || 'Leadership Opportunities'}</h4>
                <ul>
                  <li>{t('documentationPage.workingGroupLeadershipItem') || 'Working Group Leadership'}</li>
                  <li>{t('documentationPage.communityCouncilItem') || 'Community Council'}</li>
                  <li>{t('documentationPage.localGroupOrganizerItem') || 'Local Group Organizer'}</li>
                  <li>{t('documentationPage.mentorshipItem') || 'New Member Mentorship'}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.contactCommunityTitle') || 'Contact Community Team'}</h3>
            
            <div className={styles.contactGrid}>
              <div className={styles.contactCard}>
                <div className={styles.contactIcon}>👋</div>
                <h4>{t('documentationPage.communityManagerTitle') || 'Community Manager'}</h4>
                <p>community@cybere.co</p>
                <p>{t('documentationPage.dayToDaySupportLabel') || 'Day-to-day community support'}</p>
              </div>
              
              <div className={styles.contactCard}>
                <div className={styles.contactIcon}>🏛️</div>
                <h4>{t('documentationPage.governanceCoordinatorTitle') || 'Governance Coordinator'}</h4>
                <p>governance@cybere.co</p>
                <p>{t('documentationPage.electionsProposalsLabel') || 'Elections, proposals, policy'}</p>
              </div>
              
              <div className={styles.contactCard}>
                <div className={styles.contactIcon}>🚨</div>
                <h4>{t('documentationPage.communitySafetyTitle') || 'Community Safety'}</h4>
                <p>safety@cybere.co</p>
                <p>{t('documentationPage.harassmentSafetyLabel') || 'Harassment and safety concerns'}</p>
              </div>
            </div>
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
                  <div className={styles.appChipWithStatus}>
                    <span className={styles.appChip}>Hub</span>
                    <span className={styles.statusBadge} data-status="live">🟢 Live</span>
                  </div>
                  <div className={styles.appChipWithStatus}>
                    <span className={styles.appChip}>JustSplit</span>
                    <span className={styles.statusBadge} data-status="live">🟢 Live</span>
                  </div>
                  <div className={styles.appChipWithStatus}>
                    <span className={styles.appChip}>Website</span>
                    <span className={styles.statusBadge} data-status="live">🟢 Live</span>
                  </div>
                </div>
              </div>
              <div className={styles.categorySection}>
                <h4 className={styles.categoryTitle}>🎯 {t('documentationPage.priorityApplications')}</h4>
                <div className={styles.categoryApps}>
                  <div className={styles.appChipWithStatus}>
                    <span className={styles.appChip}>Somos</span>
                    <span className={styles.statusBadge} data-status="development">🟡 In Development</span>
                  </div>
                  <div className={styles.appChipWithStatus}>
                    <span className={styles.appChip}>Demos</span>
                    <span className={styles.statusBadge} data-status="planning">🔵 Planned</span>
                  </div>
                  <div className={styles.appChipWithStatus}>
                    <span className={styles.appChip}>Plantopia</span>
                    <span className={styles.statusBadge} data-status="planning">🔵 Planned</span>
                  </div>
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
    },
    'development-setup': {
      title: t('documentationPage.developmentSetupTitle') || 'Development Setup',
      content: (
        <>
          <div className={styles.contentSection}>
            <div className={styles.progressIndicator}>
              <span className={styles.progressLabel}>💻 {t('documentationPage.setupOverviewTitle') || 'Development Environment'}</span>
              <div className={styles.estimatedTime}>{t('documentationPage.setupTimeEstimate') || '⏱️ 10-15 minutes setup'}</div>
            </div>
            <h3 className={styles.subTitle}>{t('documentationPage.prerequisitesTitle') || 'Prerequisites'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.prerequisitesText') || 'Required tools and software for CyberEco development.'}
            </p>
            <ul className={styles.conceptList}>
              <li>{t('documentationPage.prerequisiteNode') || 'Node.js 18+ (nvm recommended)'}</li>
              <li>{t('documentationPage.prerequisiteFirebase') || 'Firebase CLI tools'}</li>
              <li>{t('documentationPage.prerequisiteNx') || 'NX CLI for monorepo management'}</li>
            </ul>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.quickSetupTitle') || 'Quick Setup (3 Steps)'}</h3>
            <div className={styles.stepByStepGuide}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h4>{t('documentationPage.step1InstallTitle') || 'Install Prerequisites'}</h4>
                  <pre className={styles.codeBlock}>
                    {`# Install Node.js 18+
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install global tools
npm install -g firebase-tools nx`}
                  </pre>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h4>{t('documentationPage.step2CloneTitle') || 'Clone and Install'}</h4>
                  <pre className={styles.codeBlock}>
                    {`git clone <your-repository-url>
cd cybereco-monorepo
npm install`}
                  </pre>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <h4>{t('documentationPage.step3StartTitle') || 'Start Development'}</h4>
                  <pre className={styles.codeBlock}>
                    {`npm run dev`}
                  </pre>
                  <div className={styles.setupSuccess}>
                    <h5>🎉 {t('documentationPage.setupDoneTitle') || 'Development Ready!'}</h5>
                    <p>{t('documentationPage.setupDoneText') || 'Your development environment is now running on:'}</p>
                    <ul>
                      <li>{t('documentationPage.hubPortLabel') || 'Hub: http://localhost:3000'}</li>
                      <li>{t('documentationPage.justSplitPortLabel') || 'JustSplit: http://localhost:4000'}</li>
                      <li>{t('documentationPage.websitePortLabel') || 'Website: http://localhost:5000'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.developmentWorkflowTitle') || 'Development Workflow'}</h3>
            <div className={styles.tutorialList}>
              <div className={styles.tutorialItem}>
                <div className={styles.tutorialIcon}>🌿</div>
                <div className={styles.tutorialContent}>
                  <h4>{t('documentationPage.workflowCreateBranch') || '1. Create feature branch'}</h4>
                  <pre className={styles.codeBlock}>
                    {`git checkout -b feature/your-feature-name`}
                  </pre>
                </div>
              </div>
              
              <div className={styles.tutorialItem}>
                <div className={styles.tutorialIcon}>🔧</div>
                <div className={styles.tutorialContent}>
                  <h4>{t('documentationPage.workflowDevelop') || '2. Develop with testing'}</h4>
                  <pre className={styles.codeBlock}>
                    {`npm run dev          # Start development servers
nx test justsplit-app --watch  # Run tests in watch mode`}
                  </pre>
                </div>
              </div>
              
              <div className={styles.tutorialItem}>
                <div className={styles.tutorialIcon}>✅</div>
                <div className={styles.tutorialContent}>
                  <h4>{t('documentationPage.workflowQuality') || '3. Quality checks'}</h4>
                  <pre className={styles.codeBlock}>
                    {`npm run lint         # Check code style
npm run build        # Verify builds work`}
                  </pre>
                </div>
              </div>
              
              <div className={styles.tutorialItem}>
                <div className={styles.tutorialIcon}>🚀</div>
                <div className={styles.tutorialContent}>
                  <h4>{t('documentationPage.workflowSubmit') || '4. Submit changes'}</h4>
                  <pre className={styles.codeBlock}>
                    {`git commit -m "feat(justsplit): add new feature"
git push origin feature/your-feature-name
# Create Pull Request`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </>
      )
    },
    'architecture': {
      title: t('documentationPage.architectureTitle') || 'System Architecture',
      content: (
        <>
          <div className={styles.contentSection}>
            <div className={styles.progressIndicator}>
              <span className={styles.progressLabel}>🏗️ {t('documentationPage.architectureTitle') || 'System Architecture'}</span>
              <div className={styles.estimatedTime}>{t('documentationPage.technicalOverviewTime') || '⏱️ Technical overview'}</div>
            </div>
            <h3 className={styles.subTitle}>{t('documentationPage.monorepoStructureTitle') || 'Monorepo Structure'}</h3>
            <p className={styles.contentText}>
              {t('documentationPage.monorepoStructureText') || 'CyberEco uses NX monorepo architecture for shared code and optimized builds.'}
            </p>
            
            <pre className={styles.codeBlock}>
              {`cybereco-monorepo/
├── apps/                    # 🏠 Applications
│   ├── hub/                # Authentication hub
│   ├── justsplit/          # ${t('documentationPage.expenseAppComment') || 'Expense app'}
│   └── website/            # ${t('documentationPage.marketingWebsiteComment') || 'Marketing website'}
├── libs/                   # 📚 ${t('documentationPage.sharedCodeComment') || 'Shared code'}
│   ├── shared-types/       # ${t('documentationPage.typescriptTypesComment') || 'TypeScript types'}
│   ├── firebase-config/    # ${t('documentationPage.firebaseUtilitiesComment') || 'Firebase utilities'}
│   ├── ui-components/      # ${t('documentationPage.reactComponentsComment') || 'React components'}
│   └── shared-assets/      # ${t('documentationPage.commonAssetsComment') || 'Common assets'}
├── firebase/               # 🔥 ${t('documentationPage.deploymentConfigsComment') || 'Deployment configs'}
└── docs/                   # 📖 ${t('documentationPage.documentationComment') || 'Documentation'}`}
            </pre>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.techStackTitle') || 'Technology Stack'}</h3>
            <div className={styles.enhancedContentList}>
              <div className={styles.contentListItem}>
                <h4 className={styles.listItemTitle}>⚛️ {t('documentationPage.frameworkStack') || 'Framework: Next.js 15 with App Router'}</h4>
              </div>
              <div className={styles.contentListItem}>
                <h4 className={styles.listItemTitle}>🏗️ {t('documentationPage.buildStack') || 'Build System: NX Monorepo with computation caching'}</h4>
              </div>
              <div className={styles.contentListItem}>
                <h4 className={styles.listItemTitle}>🔥 {t('documentationPage.backendStack') || 'Backend: Firebase (Firestore, Auth, Hosting)'}</h4>
              </div>
              <div className={styles.contentListItem}>
                <h4 className={styles.listItemTitle}>📝 {t('documentationPage.languageStack') || 'Language: TypeScript'}</h4>
              </div>
              <div className={styles.contentListItem}>
                <h4 className={styles.listItemTitle}>🎨 {t('documentationPage.stylingStack') || 'Styling: CSS Modules'}</h4>
              </div>
              <div className={styles.contentListItem}>
                <h4 className={styles.listItemTitle}>🧪 {t('documentationPage.testingStack') || 'Testing: Jest with React Testing Library'}</h4>
              </div>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.appsStructureTitle') || 'Applications'}</h3>
            <div className={styles.principleCards}>
              <div className={styles.principleCard}>
                <div className={styles.principleIcon}>🌐</div>
                <h4 className={styles.principleTitle}>{t('documentationPage.websitePortTitle') || 'Website (Port 5000)'}</h4>
                <p className={styles.principleDescription}>{t('documentationPage.websitePortDesc') || 'Marketing website and application hub'}</p>
              </div>
              <div className={styles.principleCard}>
                <div className={styles.principleIcon}>🔐</div>
                <h4 className={styles.principleTitle}>{t('documentationPage.hubPortTitle') || 'Hub (Port 3000)'}</h4>
                <p className={styles.principleDescription}>{t('documentationPage.hubPortDesc') || 'Central authentication and app launcher'}</p>
              </div>
              <div className={styles.principleCard}>
                <div className={styles.principleIcon}>💰</div>
                <h4 className={styles.principleTitle}>{t('documentationPage.justSplitPortTitle') || 'JustSplit (Port 4000)'}</h4>
                <p className={styles.principleDescription}>{t('documentationPage.justSplitPortDesc') || 'Expense splitting and financial management'}</p>
              </div>
            </div>
          </div>

          <div className={styles.contentSection}>
            <h3 className={styles.subTitle}>{t('documentationPage.libsStructureTitle') || 'Shared Libraries'}</h3>
            <ul className={styles.conceptList}>
              <li><strong>shared-types</strong>: {t('documentationPage.sharedTypesDesc') || 'Common TypeScript interfaces and types'}</li>
              <li><strong>firebase-config</strong>: {t('documentationPage.firebaseConfigDesc') || 'Firebase utilities and multi-project configuration'}</li>
              <li><strong>ui-components</strong>: {t('documentationPage.uiComponentsDesc') || 'Reusable React components with CSS Modules'}</li>
              <li><strong>shared-assets</strong>: {t('documentationPage.sharedAssetsDesc') || 'Common assets including logos and brand materials'}</li>
            </ul>
          </div>
        </>
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
          {searchQuery && filteredDocs.length > 0 && (
            <div className={`${styles.navSection} ${styles.searchSection}`}>
              <h3 className={`${styles.navTitle} ${styles.searchTitle}`}>🔍 Search Results ({filteredDocs.length})</h3>
              {filteredDocs.map(docKey => {
                const docTitles: {[key: string]: string} = {
                  'getting-started': t('documentationPage.introductionNavItem') || 'Introduction',
                  'key-concepts': t('documentationPage.keyConceptsTitle'),
                  'philosophy': t('documentationPage.philosophyDocTitle'),
                  'vision': t('documentationPage.visionDocTitle'),
                  'roadmap': t('documentationPage.roadmapDocTitle'),
                  'portfolio': t('documentationPage.portfolioDocTitle'),
                  'community-governance': t('documentationPage.communityGovernanceNavItem') || 'Community & Governance',
                  'finance-economy': t('documentationPage.financeEconomyNavItem') || 'Finance & Economy',
                  'sustainability-home': t('documentationPage.sustainabilityHomeNavItem') || 'Sustainability & Home',
                  'education-growth': t('documentationPage.educationGrowthNavItem') || 'Education & Growth',
                  'api-reference': t('documentationPage.apiReferenceNavItem') || 'API Reference',
                  'user-guides': t('documentationPage.userGuidesNavItem') || 'User Guides',
                  'faq': t('documentationPage.faqNavItem') || 'FAQ',
                  'troubleshooting': t('documentationPage.troubleshootingNavItem') || 'Troubleshooting',
                  'community': t('documentationPage.communityNavItem') || 'Community & Support',
                  'development-setup': t('documentationPage.developmentNavItem') || 'Development Setup',
                  'architecture': t('documentationPage.architectureNavItem') || 'System Architecture'
                };
                
                return (
                  <button 
                    key={docKey}
                    onClick={() => setActiveDoc(docKey)}
                    className={`${styles.navItem} ${styles.searchResult} ${activeDoc === docKey ? styles.active : ''}`}
                  >
                    {docTitles[docKey]}
                    <FaChevronRight size={10} />
                  </button>
                );
              })}
            </div>
          )}
          
          {searchQuery && filteredDocs.length === 0 && (
            <div className={styles.navSection}>
              <div className={styles.noResults}>
                <p>No results found for "{searchQuery}"</p>
              </div>
            </div>
          )}
          
          {!searchQuery && (
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
              <button 
                onClick={() => setActiveDoc('development-setup')}
                className={`${styles.navItem} ${activeDoc === 'development-setup' ? styles.active : ''}`}
              >
                💻 {t('documentationPage.developmentNavItem') || 'Development Setup'}
                <FaChevronRight size={10} />
              </button>
              <button 
                onClick={() => setActiveDoc('architecture')}
                className={`${styles.navItem} ${activeDoc === 'architecture' ? styles.active : ''}`}
              >
                🏗️ {t('documentationPage.architectureNavItem') || 'System Architecture'}
                <FaChevronRight size={10} />
              </button>
            </div>
          )}
          
          {!searchQuery && (
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
          )}
          
          {!searchQuery && (
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
          )}
          
          {!searchQuery && (
            <div className={styles.navSection}>
              <h3 className={styles.navTitle}>{t('documentationPage.userResourcesNavTitle') || 'User Resources'}</h3>
              <button 
                onClick={() => setActiveDoc('user-guides')}
                className={`${styles.navItem} ${activeDoc === 'user-guides' ? styles.active : ''}`}
              >
                📚 {t('documentationPage.userGuidesNavItem') || 'User Guides'}
                <FaChevronRight size={10} />
              </button>
              <button 
                onClick={() => setActiveDoc('faq')}
                className={`${styles.navItem} ${activeDoc === 'faq' ? styles.active : ''}`}
              >
                ❓ {t('documentationPage.faqNavItem') || 'FAQ'}
                <FaChevronRight size={10} />
              </button>
              <button 
                onClick={() => setActiveDoc('troubleshooting')}
                className={`${styles.navItem} ${activeDoc === 'troubleshooting' ? styles.active : ''}`}
              >
                🛠️ {t('documentationPage.troubleshootingNavItem') || 'Troubleshooting'}
                <FaChevronRight size={10} />
              </button>
              <button 
                onClick={() => setActiveDoc('community')}
                className={`${styles.navItem} ${activeDoc === 'community' ? styles.active : ''}`}
              >
                🤝 {t('documentationPage.communityNavItem') || 'Community & Support'}
                <FaChevronRight size={10} />
              </button>
            </div>
          )}
          
          {!searchQuery && (
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
          )}
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