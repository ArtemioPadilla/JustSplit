import { TranslationsMap } from '@justsplit/ui-components';

// Helper function to flatten nested objects
function flattenTranslations(obj: any, prefix = ''): { [key: string]: string } {
  return Object.keys(obj).reduce((acc: { [key: string]: string }, key) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(acc, flattenTranslations(value, newKey));
    } else {
      // Add the key-value pair to the accumulator
      acc[newKey] = String(value);
    }
    
    return acc;
  }, {});
}

// Define translations with nested structure for easier maintenance
const nestedTranslations = {
  en: {
    // Navigation and common UI elements
    navigation: {
      home: 'Home',
      portfolio: 'Solutions',
      documentation: 'Documentation',
      about: 'About Us',
      help: 'Help',
      hub: 'Hub',
      settings: 'Settings'
    },
    
    // Theme settings
    theme: {
      title: 'Theme',
      light: 'Light',
      dark: 'Dark'
    },
    
    // Language settings
    language: {
      title: 'Language'
    },
    
    footer: {
      tagline: 'A human-centered digital ecosystem for conscious, connected, and sustainable living',
      solutions: 'Solutions',
      communityGovernanceTitle: 'Community & Governance',
      financeEconomyTitle: 'Finance & Economy',
      sustainabilityHomeTitle: 'Sustainability & Home',
      educationTitle: 'Education & Growth',
      healthWellnessTitle: 'Health & Wellness',
      company: 'Company',
      about: 'About Us',
      status: 'Status',
      support: 'Support',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      contact: 'Contact',
      address: '123 Innovation Way',
      cityCountry: 'San Francisco, CA 94103',
      rightsReserved: 'All rights reserved.'
    },
    
    // HomePage translations
    homePage: {
      hero: {
        title: 'Digital Solutions for a Connected World',
        subtitle: 'CyberEco creates innovative applications that enhance how people manage finances, engage with communities, and connect with each other in the digital age.',
        exploreSolutions: 'Explore Solutions',
        learnAboutUs: 'Learn About Us'
      },
      features: {
        sectionTitle: 'Transformative Technology Solutions',
        sectionSubtitle: 'What sets our solutions apart from the rest',
        communityTitle: 'Community Building',
        communityDesc: 'Create and nurture thriving digital communities with tools designed for meaningful connection and collaboration.',
        sustainabilityTitle: 'Sustainability',
        sustainabilityDesc: 'Eco-friendly digital solutions designed with environmental impact in mind, promoting sustainable practices.',
        securityTitle: 'Enhanced Security',
        securityDesc: 'State-of-the-art security measures to protect your data and ensure privacy across all our applications.',
        innovationTitle: 'Innovative Tech',
        innovationDesc: 'Cutting-edge technology solutions that anticipate needs and solve problems before they arise.'
      },
      mission: {
        sectionTitle: 'OUR MISSION',
        sectionSubtitle: 'Creating harmony between technology and sustainability',
        missionText: 'At CyberEco, our mission is to design and implement user-centered digital applications that enhance financial collaboration, community engagement, and social connectivity. We develop tools that promote transparency, efficiency, and healthy relationships between people and technology, enabling individuals and communities to thrive in our increasingly digital world.',
        learnMore: 'Learn More About Us',
        vision: 'Vision',
        visionText: 'A world where technology facilitates meaningful connections, efficient collaboration, and sustainable resource management.',
        approach: 'Approach',
        approachText: 'We develop user-centered applications that combine intuitive functionality with innovative features to solve real-world problems.'
      },
      solutions: {
        sectionTitle: 'Our Solutions',
        sectionSubtitle: 'Explore our diverse portfolio of digital applications designed to enhance productivity, connectivity, and community engagement',
        learnMore: 'Learn more',
        viewAll: 'View All Solutions'
      },
      callToAction: {
        title: 'Ready to Transform Your Relationship with Technology?',
        subtitle: 'Discover how CyberEco\'s innovative applications can help you manage finances, engage with communities, and navigate social connections more effectively.',
        exploreSolutions: 'Explore Solutions',
        contactUs: 'Get Support'
      }
    },
    
    // AboutPage translations
    aboutPage: {
      title: 'About CyberEco',
      subtitle: 'A human-centered digital ecosystem for conscious, connected, and sustainable living.',
      whoWeAreTitle: 'Who We Are',
      whoWeAreP1: 'CyberEco is a human-centered digital ecosystem for conscious, connected, and sustainable living. In a world where digital life is fragmented, extractive, and overwhelming, CyberEco exists to offer a better path — one rooted in sovereignty, community, and balance.',
      whoWeAreP2: 'We believe your digital presence should empower you, not exploit you. Your identity should belong to you. Your data should serve you. Your actions should connect you with others meaningfully.',
      teamImage: 'Team Image',
      whyWeExistTitle: 'Why We Exist',
      manifestoQuote: 'In a world where digital life is fragmented, extractive, and overwhelming, CyberEco exists to offer a better path — one rooted in sovereignty, community, and balance.',
      whyWeExistText: 'The digital world has become increasingly disconnected from human values. We created CyberEco to bridge this gap, providing digital solutions that align with how people naturally want to connect, collaborate, and live sustainably.',
      whatWeAreTitle: 'What We Are',
      whatWeAreText: 'CyberEco is not just another app. It is a modular digital ecosystem — an operating system for life — where each platform solves a real need while contributing to a greater whole.',
      whatWeArePoint1: 'A place to manage your finances.',
      whatWeArePoint2: 'A place to resolve conflicts peacefully.',
      whatWeArePoint3: 'A place to grow, learn, vote, connect, and belong.',
      whatWeArePoint4: 'A place where your values and data align.',
      whatWeAreConclusion: 'At the center is the CyberEco Hub — your identity, your dashboard, your digital home.',
      visionMissionTitle: 'Our Vision & Mission',
      visionTitle: 'Vision',
      visionText: 'To empower millions of people — not with more notifications, but with clarity, autonomy, and connection. To create a digital environment as human, intentional, and resilient as the world we deserve offline.',
      missionTitle: 'Mission',
      missionText: 'To create a modular digital ecosystem — an operating system for life — where each platform solves a real need while contributing to a greater whole, centered around the CyberEco Hub as your identity, your dashboard, your digital home.',
      valuesTitle: 'Our Values',
      value1Title: 'Digital Sovereignty',
      value1Text: 'You own your identity, your data, your narrative. We create technology that empowers rather than exploits.',
      value2Title: 'Wellbeing by Design',
      value2Text: 'Tech must serve your life — not consume it. We design solutions that enhance your wellbeing rather than draining it.',
      value3Title: 'Interconnection with Purpose',
      value3Text: 'Every platform is useful alone, but transformative together. We create an ecosystem of solutions that complement each other.',
      value4Title: 'Community is Core',
      value4Text: 'We build tools for individuals, powered by the collective. Community engagement and collaborative growth are at the heart of our ecosystem.',
      value5Title: 'Open by Nature',
      value5Text: 'Wherever possible, CyberEco is modular, transparent, and interoperable. We embrace openness and collaboration in our development approach.',
      joinUsTitle: 'Join Us',
      joinUsText: 'CyberEco is a platform — but also a movement. We welcome creators, collaborators, dreamers, and builders. Let\'s shape a digital future worth living in — together.'
    },
    
    // PortfolioPage translations
    portfolioPage: {
      title: 'Our Solutions',
      subtitle: 'Explore our diverse portfolio of digital solutions designed to enhance the productivity, sustainability, connectivity, and community engagement through innovative technology.',
      
      // Status section
      statusTitle: 'Development Status',
      currentAppsTitle: 'Current Applications',
      currentAppsDesc: '3 applications live and in active development',
      priorityDevTitle: 'Priority Development',
      priorityDevDesc: '3 applications planned for 2025-2026',
      futureEcosystemTitle: 'Future Ecosystem',
      futureEcosystemDesc: '25+ applications across all life domains',
      
      // Category names
      allSolutions: 'All Solutions',
      currentApplications: 'Current Applications',
      priorityApplications: 'Priority Applications',
      communityGovernance: 'Community & Governance',
      financeEconomy: 'Finance & Economy',
      sustainabilityHome: 'Sustainability & Home',
      educationGrowth: 'Education & Growth',
      healthWellness: 'Health & Wellness',
      identityLegal: 'Identity & Legal',
      travelDiscovery: 'Travel & Discovery',
      techSocial: 'Tech & Social',
      
      // Phase labels
      liveLabel: 'Live',
      planning2025Label: 'Planning 2025',
      futureEcosystemLabel: 'Future Ecosystem',
      
      // Priority Applications subtitle
      priorityAppsSubtitle: 'Priority Applications (2025-2026)',
      
      // Common text
      detailsComingSoon: 'Detailed information about each solution coming soon.',
      openSolution: 'Open Solution',
      
      // Domain areas
      financeArea: 'Finance',
      communityArea: 'Community',
      sustainabilityArea: 'Sustainability',
      educationArea: 'Education',
      healthArea: 'Health',
      identityArea: 'Identity',
      travelArea: 'Travel',
      techArea: 'Tech',
      
      // Current Applications
      hubTitle: 'CyberEco Hub',
      hubDesc: 'Central authentication and application management platform serving as the digital home for users across the ecosystem.',
      justSplitTitle: 'JustSplit',
      justSplitDesc: 'Expense splitting application helping friends and groups track, share, and settle expenses with multi-currency support.',
      websiteTitle: 'CyberEco Website',
      websiteDesc: 'Central marketing and information hub for the entire CyberEco ecosystem with comprehensive documentation.',
      
      // Priority Applications
      somosTitle: 'Somos - Family Roots Explorer',
      somosDesc: 'Preserve and explore family history with privacy-controlled heritage preservation, memory collection, and cultural connection tools.',
      demosTitle: 'Demos - Community Governance',
      demosDesc: 'Transparent voting and community governance platform enabling secure, verifiable collective decision-making.',
      plantopiaTitle: 'Plantopia - Smart Gardening',
      plantopiaDesc: 'Smart gardening platform combining plant care knowledge with community sharing and sustainable practices.',
      
      // Finance & Economy
      myWealthTitle: 'MyWealth',
      myWealthDesc: 'Comprehensive platform to visualize and control personal finances and investments in one secure place.',
      myBusinessTitle: 'MyBusiness',
      myBusinessDesc: 'Lightweight tool for entrepreneurs combining operational and accounting management in a single interface.',
      crowdFundTitle: 'CrowdFund',
      crowdFundDesc: 'Community-driven crowdfunding platform with transparent project tracking and milestone-based funding.',
      offerMeTitle: 'OfferMe',
      offerMeDesc: 'Marketplace for services and skills within the community with integrated payment and reputation systems.',
      
      // Community & Governance
      communityManagerTitle: 'Community Manager',
      communityManagerDesc: 'Advanced tools to create, organize, and govern digital or physical communities with ease and transparency.',
      myCommunityTitle: 'MyCommunity',
      myCommunityDesc: 'Platform to discover relevant local resources, events, and initiatives in your environment.',
      conciliationTitle: 'Conciliation',
      conciliationDesc: 'Conflict resolution tools with neutral human or AI mediators to resolve disputes fairly.',
      crowdPoolTitle: 'CrowdPool',
      crowdPoolDesc: 'Community tasks system for collaborative problem-solving and skill sharing with reward mechanisms.',
      
      // Sustainability & Home
      ecoTulTitle: 'EcoTul',
      ecoTulDesc: 'Curated recommender of eco-friendly products and services evaluated by real environmental impact.',
      myHomeTitle: 'MyHome',
      myHomeDesc: 'Comprehensive app to organize home maintenance, track expenses, and plan improvements for sustainable living.',
      
      // Education & Growth
      educationHubTitle: 'Education Hub',
      educationHubDesc: 'Modular platform to access learning paths and educational content in a community-oriented environment.',
      skillShareTitle: 'Skill Share',
      skillShareDesc: 'Collaborative network where people can share and teach their skills to others in the community.',
      habitsTitle: 'Habits',
      habitsDesc: 'Tool to record and track habits to achieve personal goals and foster continuous improvement.',
      oneStepTitle: 'One Step',
      oneStepDesc: 'Micro-action system designed to help you advance toward big goals with manageable small steps.',
      
      // Health & Wellness
      healthyTitle: 'Healthy',
      healthyDesc: 'Comprehensive health tracking platform integrating physical, mental, and social wellbeing metrics.',
      petPalTitle: 'PetPal',
      petPalDesc: 'Complete pet care management including health tracking, appointment scheduling, and community features.',
      
      // Identity & Legal
      lawPalTitle: 'LawPal',
      lawPalDesc: 'Legal assistance platform connecting users with legal resources and professional guidance.',
      myDataTitle: 'MyData',
      myDataDesc: 'Personal data sovereignty platform giving users complete control over their digital information.',
      digitalMeTitle: 'DigitalMe',
      digitalMeDesc: 'Unified digital identity management across all platforms and services with privacy controls.',
      myDocsTitle: 'MyDocs',
      myDocsDesc: 'Secure document storage and management with sharing controls and legal validation features.',
      
      // Travel & Discovery
      travelMateTitle: 'TravelMate',
      travelMateDesc: 'Intelligent travel companion for planning, booking, and experiencing authentic local culture.',
      eventConnectTitle: 'EventConnect',
      eventConnectDesc: 'Platform to discover and connect with local events, meetups, and cultural activities.',
      localWondersTitle: 'LocalWonders',
      localWondersDesc: 'Discover hidden gems and local attractions recommended by community members.',
      
      // Tech & Social
      nexusTitle: 'Nexus',
      nexusDesc: 'Digital wellbeing social media hub for managing online presence and fostering meaningful connections.',
      timeSyncTitle: 'TimeSync',
      timeSyncDesc: 'Smart scheduling and time management platform integrating with all CyberEco applications.',
      
      comingSoon: 'Detailed information about each solution coming soon.',
      viewSolution: 'View Solution'
    },
    
    // PhilosophyPage translations
    philosophyPage: {
      title: 'CyberEco Platform Philosophy',
      subtitle: 'Building technology that serves human flourishing, not corporate extraction',
      
      manifestoTitle: 'The Digital Sovereignty Manifesto',
      manifestoQuote: 'In a world where digital life has become fragmented, extractive, and overwhelming, CyberEco exists to offer a better path — one rooted in sovereignty, community, and balance.',
      manifestoBeliefTitle: 'We believe:',
      manifestoBelief1: 'Your digital presence should empower you, not exploit you',
      manifestoBelief2: 'Your identity should belong to you',
      manifestoBelief3: 'Your data should serve you',
      manifestoBelief4: 'Your actions should connect you with others meaningfully',
      
      principlesSectionTitle: 'Our Guiding Principles',
      
      digitalSovereigntyTitle: 'Digital Sovereignty',
      digitalSovereigntyQuote: 'You own your identity, your data, your narrative',
      digitalSovereigntyMeansTitle: 'What this means:',
      digitalSovereigntyMeans1: 'Complete control over personal data and digital identity',
      digitalSovereigntyMeans2: 'Transparency in how data is used and shared',
      digitalSovereigntyMeans3: 'Right to data portability and deletion',
      digitalSovereigntyMeans4: 'Freedom from vendor lock-in',
      digitalSovereigntyImplTitle: 'How we implement this:',
      digitalSovereigntyImpl1: 'Open data formats and APIs',
      digitalSovereigntyImpl2: 'Local-first data storage with cloud sync',
      digitalSovereigntyImpl3: 'User-controlled encryption keys',
      digitalSovereigntyImpl4: 'Transparent privacy policies',
      
      wellbeingTitle: 'Wellbeing by Design',
      wellbeingQuote: 'Tech must serve your life — not consume it',
      wellbeingMeansTitle: 'What this means:',
      wellbeingMeans1: 'Technology should enhance human capabilities',
      wellbeingMeans2: 'Interfaces designed to respect user attention',
      wellbeingMeans3: 'Features that promote healthy digital habits',
      wellbeingMeans4: 'No dark patterns or addictive mechanics',
      wellbeingImplTitle: 'How we implement this:',
      wellbeingImpl1: 'Mindful notification systems',
      wellbeingImpl2: 'Time-based usage insights',
      wellbeingImpl3: 'Intentional UI/UX design',
      wellbeingImpl4: 'Regular digital wellness features',
      
      interconnectionTitle: 'Interconnection with Purpose',
      interconnectionQuote: 'Every platform is useful alone, but transformative together',
      interconnectionMeansTitle: 'What this means:',
      interconnectionMeans1: 'Seamless integration between different applications',
      interconnectionMeans2: 'Shared identity and data across platforms',
      interconnectionMeans3: 'Network effects that benefit all users',
      interconnectionMeans4: 'Collaborative features that enhance individual tools',
      interconnectionImplTitle: 'How we implement this:',
      interconnectionImpl1: 'Unified authentication and identity management',
      interconnectionImpl2: 'Cross-platform data sharing and synchronization',
      interconnectionImpl3: 'Standardized APIs for third-party integration',
      interconnectionImpl4: 'Community-driven feature development',
      
      communityTitle: 'Community is Core',
      communityQuote: 'We build tools for individuals, powered by the collective',
      communityMeansTitle: 'What this means:',
      communityMeans1: 'Community engagement drives platform evolution',
      communityMeans2: 'Collaborative governance and decision-making',
      communityMeans3: 'Shared knowledge and resource pooling',
      communityMeans4: 'Individual empowerment through collective wisdom',
      communityImplTitle: 'How we implement this:',
      communityImpl1: 'Open-source development practices',
      communityImpl2: 'Community voting on feature priorities',
      communityImpl3: 'User-generated content and resources',
      communityImpl4: 'Transparent communication channels',
      
      opennessTitle: 'Open by Nature',
      opennessQuote: 'Wherever possible, CyberEco is modular, transparent, and interoperable',
      opennessMeansTitle: 'What this means:',
      opennessMeans1: 'Open-source code and documentation',
      opennessMeans2: 'Transparent development processes',
      opennessMeans3: 'Interoperable data formats and protocols',
      opennessMeans4: 'Community-driven innovation',
      opennessImplTitle: 'How we implement this:',
      opennessImpl1: 'Public GitHub repositories',
      opennessImpl2: 'Comprehensive API documentation',
      opennessImpl3: 'Standard data formats (JSON, CSV, etc.)',
      opennessImpl4: 'Plugin and extension architectures',
      
      ctaTitle: 'Join the Movement',
      ctaText: 'Experience technology that respects your sovereignty and serves your community.',
      ctaButton: 'Explore Our Solutions',
      ctaButtonSecondary: 'Our Vision',
      
      implementationTitle: 'Philosophy in Action',
      implementationText: 'These aren\'t just ideals — they\'re principles we actively implement in every line of code, every design decision, and every user interaction across the CyberEco ecosystem.',
      privacyTitle: 'Privacy First',
      privacyText: 'All user data is encrypted by default, with users controlling their own encryption keys.',
      decentralizedTitle: 'Decentralized Future',
      decentralizedText: 'Building toward a peer-to-peer network where users own and control their digital ecosystem.',
      innovationTitle: 'Open Innovation',
      innovationText: 'All development happens in the open, with community input shaping our roadmap.',
      humanCenteredTitle: 'Human-Centered',
      humanCenteredText: 'Every feature is evaluated through the lens of human wellbeing and empowerment.'
    },
    
    // VisionPage translations
    visionPage: {
      title: 'Our Vision',
      subtitle: 'Building toward a decentralized future where technology serves humanity',
      
      currentStateTitle: 'Where We Are Today',
      currentStateText: 'We start with practical applications that solve real problems while building the foundation for a decentralized future.',
      
      futureVisionTitle: 'Decentralized Future Vision',
      futureVisionText: 'By 2030+, CyberEco will transition to a revolutionary decentralized architecture that empowers users with complete data sovereignty and privacy.',
      
      // Vision cards
      mobileP2PTitle: 'Mobile P2P Network',
      mobileP2PText: 'Transform smartphones into distributed computing nodes, creating a resilient mesh network powered by community participation.',
      mobileP2PFeature1: 'User devices as network infrastructure',
      mobileP2PFeature2: 'Mesh networking for resilient connectivity',
      mobileP2PFeature3: 'Edge computing for local data processing',
      mobileP2PFeature4: 'Community-driven network maintenance',
      
      dataSovereigntyTitle: 'Complete Data Sovereignty',
      dataSovereigntyText: 'Users maintain full control over their data through cryptographic guarantees and self-sovereign identity systems.',
      dataSovereigntyFeature1: 'Zero-knowledge proofs for privacy',
      dataSovereigntyFeature2: 'Client-side encryption by default',
      dataSovereigntyFeature3: 'Self-sovereign digital identity',
      dataSovereigntyFeature4: 'Selective data sharing controls',
      
      tokenEconomicsTitle: 'Token Economics (CYE)',
      tokenEconomicsText: 'Participate in network value creation through token rewards for contributing resources and maintaining network health.',
      tokenEconomicsFeature1: 'Earn tokens by running network nodes',
      tokenEconomicsFeature2: 'Governance rights through token holding',
      tokenEconomicsFeature3: 'Pay for premium privacy features',
      tokenEconomicsFeature4: 'Community-driven development funding',
      
      globalAccessibilityTitle: 'Global Accessibility',
      globalAccessibilityText: 'Censorship-resistant platform accessible worldwide without geographic restrictions or corporate gatekeepers.',
      globalAccessibilityFeature1: 'No geographic restrictions',
      globalAccessibilityFeature2: 'Censorship-resistant architecture',
      globalAccessibilityFeature3: 'Works in low-connectivity areas',
      globalAccessibilityFeature4: 'Community-owned infrastructure',
      
      // Technical architecture
      architectureTitle: 'Decentralized Architecture',
      layer3Title: 'Layer 3: Application Layer',
      layer3Text: 'Privacy-preserving personal data and application state',
      layer3Component1: 'Personal Data Vaults',
      layer3Component2: 'Zero-Knowledge Computations',
      layer3Component3: 'Selective Disclosure',
      
      layer2Title: 'Layer 2: Protocol Layer',
      layer2Text: 'Application interactions and cross-app data sharing',
      layer2Component1: 'Smart Contracts',
      layer2Component2: 'Cross-App APIs',
      layer2Component3: 'Data Synchronization',
      
      layer1Title: 'Layer 1: Network Layer',
      layer1Text: 'Network governance, consensus, and tokenomics',
      layer1Component1: 'Consensus Mechanism',
      layer1Component2: 'Token Economics',
      layer1Component3: 'Network Governance',
      
      deviceLayerTitle: 'Device Layer: Mobile Nodes',
      deviceLayerText: 'User smartphones as distributed computing infrastructure',
      deviceLayerComponent1: 'P2P Networking',
      deviceLayerComponent2: 'Local Storage',
      deviceLayerComponent3: 'Edge Computing',
      
      timelineTitle: 'The Journey Ahead',
      phase1Title: 'Foundation (2024-2025)',
      phase1Text: 'Establish core applications and user base',
      phase2Title: 'Growth (2025-2027)',
      phase2Text: 'Expand ecosystem with priority applications',
      phase3Title: 'Integration (2027-2030)',
      phase3Text: 'Build comprehensive interconnected ecosystem',
      phase4Title: 'Decentralization (2030+)',
      phase4Text: 'Transition to fully decentralized P2P networks',
      
      ctaTitle: 'Be Part of the Future',
      ctaText: 'Join us in building a digital ecosystem that puts humanity first.',
      ctaButton: 'View Roadmap',
      ctaButtonSecondary: 'Our Philosophy'
    },
    
    // RoadmapPage translations
    roadmapPage: {
      title: 'Development Roadmap',
      subtitle: 'Our journey from current applications to a fully decentralized ecosystem',
      
      phase1Title: 'Phase 1: Foundation (2024-2025)',
      phase1Text: 'Launch core applications: Hub for authentication, JustSplit for expense sharing, and Website for community engagement.',
      
      phase2Title: 'Phase 2: Growth (2025-2027)',
      phase2Text: 'Expand with priority applications: Somos for family connections, Demos for community governance, and Plantopia for sustainable living.',
      
      phase3Title: 'Phase 3: Ecosystem (2027-2030)',
      phase3Text: 'Build comprehensive application ecosystem covering all aspects of digital life with seamless integration and data portability.',
      
      phase4Title: 'Phase 4: Decentralization (2030-2035)',
      phase4Text: 'Transition to fully decentralized architecture with mobile P2P networks, blockchain integration, and user-owned infrastructure.',
      
      milestonesTitle: 'Key Milestones',
      currentMilestone: 'Current: Building foundational applications',
      nextMilestone: 'Next: Launch priority application suite',
      futureMilestone: 'Future: Complete ecosystem integration',
      
      progressComplete: '75% Complete',
      planningPhase: 'Planning Phase',
      planned: 'Planned',
      longTermVision: 'Long-term Vision',
      
      currentFocusTitle: 'Current Focus',
      nextQuarterTitle: 'Next Quarter',
      longTermTitle: 'Long-term Goal',
      inProgressStatus: 'In Progress',
      q2Status: 'Q2 2025',
      timeframeStatus: '2027-2030',
      
      timelineTitle: 'Development Timeline',
      timeline2024: 'Foundation Launch',
      timeline2025: 'Priority Apps',
      timeline2027: 'Full Ecosystem',
      timeline2030: 'Decentralization',
      
      // Phase status labels
      currentStatus: 'Current',
      nextStatus: 'Next',
      futureStatus: 'Future',
      visionStatus: 'Vision',
      
      // App tags
      thirtyPlusApps: '30+ Apps',
      integration: 'Integration',
      ecosystem: 'Ecosystem',
      p2pNetworks: 'P2P Networks',
      blockchain: 'Blockchain',
      decentralized: 'Decentralized',
      
      // Current Development Focus
      currentFocusSectionTitle: 'Current Development Focus',
      criticalFixesTitle: 'Critical Fixes',
      justSplitStabilization: 'JustSplit Stabilization:',
      criticalFix1: 'Fix component prop type errors',
      criticalFix2: 'Implement proper data flow patterns',
      criticalFix3: 'Add comprehensive error boundaries',
      criticalFix4: 'Resolve TypeScript compilation issues',
      inProgressStatus2: 'In Progress',
      
      hubDevelopmentTitle: 'Hub Development',
      coreAuthentication: 'Core Authentication:',
      hubFeature1: 'User registration and login forms',
      hubFeature2: 'Password reset functionality',
      hubFeature3: 'Application launcher dashboard',
      hubFeature4: 'Cross-app session management',
      plannedStatus: 'Planned',
      
      integrationTitle: 'Integration',
      crossAppFeatures: 'Cross-App Features:',
      integrationFeature1: 'JWT token-based authentication',
      integrationFeature2: 'User profile synchronization',
      integrationFeature3: 'Unified navigation experience',
      integrationFeature4: 'Shared component libraries',
      nextQuarterStatus: 'Next Quarter',
      
      // Technical Evolution
      technicalEvolutionTitle: 'Technical Evolution',
      techPhase1Title: 'Phase 1: Centralized Foundation (2025-2026)',
      techPhase1Text: 'Build robust applications on traditional infrastructure',
      techStack1: 'Firebase',
      techStack2: 'Next.js',
      techStack3: 'TypeScript',
      techStack4: 'NX Monorepo',
      
      techPhase2Title: 'Phase 2: Privacy Enhancement (2026-2028)',
      techPhase2Text: 'Implement advanced privacy features and user control',
      techStack5: 'Client-side Encryption',
      techStack6: 'Local-first Data',
      techStack7: 'Zero-trust Architecture',
      
      techPhase3Title: 'Phase 3: Hybrid Systems (2028-2030)',
      techPhase3Text: 'Bridge centralized and decentralized architectures',
      techStack8: 'P2P Protocols',
      techStack9: 'Blockchain Integration',
      techStack10: 'Mobile Node Networks',
      
      techPhase4Title: 'Phase 4: Full Decentralization (2030+)',
      techPhase4Text: 'Complete transition to user-sovereign architecture',
      techStack11: 'Self-Sovereign Identity',
      techStack12: 'Zero-Knowledge Proofs',
      techStack13: 'Token Economics',
      
      ctaTitle: 'Join Our Journey',
      ctaText: 'Be part of building the future of human-centered technology.',
      ctaButton: 'Explore Solutions',
      ctaButtonSecondary: 'Our Vision'
    },
    
    // HelpPage translations
    helpPage: {
      title: 'Help & Support',
      subtitle: 'Find the resources and assistance you need to navigate the CyberEco digital ecosystem.',
      faqTitle: 'FAQ',
      faqDesc: 'Find answers to commonly asked questions about our solutions and the CyberEco ecosystem',
      docsTitle: 'Solution Documentation',
      docsDesc: 'Detailed guides and documentation for all solution categories in our digital ecosystem',
      supportTitle: 'Community Support',
      supportDesc: 'Get help from our support team and community for any issues across all solution categories',
      contactTitle: 'Contact',
      contactDesc: 'Reach out to us directly for questions about any of our solutions or to suggest new features',
      faqSectionTitle: 'Frequently Asked Questions',
      faq1Q: 'What is CyberEco?',
      faq1A: 'CyberEco is an innovative company focused on developing digital applications that enhance financial collaboration, community engagement, and social connectivity through user-centered design.',
      faq2Q: 'How can I start using CyberEco applications?',
      faq2A: 'You can explore our solutions in the Portfolio section and download or access them through the links provided for each application.',
      faq3Q: 'Are CyberEco\'s applications available on all platforms?',
      faq3A: 'Most of our applications are available as web apps, with iOS and Android versions available for our most popular tools like JustSplit and Nexus.',
      faq4Q: 'How does CyberEco ensure data privacy and security?',
      faq4A: 'We implement strong encryption, secure authentication protocols, and follow industry best practices for data protection. All our applications are designed with security as a priority.',
      faq5Q: 'Can I use CyberEco applications for my organization or business?',
      faq5A: 'Yes, many of our applications like Demos and Community Manager have business/organization versions with enhanced features for professional use.'
    },
    
    // ContactPage translations
    contactPage: {
      title: 'Contact Us',
      subtitle: 'We\'d love to hear from you. Send us a message and we\'ll respond as soon as possible.',
      nameLabel: 'Name',
      emailLabel: 'Email',
      subjectLabel: 'Subject',
      messageLabel: 'Message',
      submitButton: 'Send Message',
      successMessage: 'Your message has been sent successfully. We\'ll get back to you soon!',
      contactInfoTitle: 'Get in Touch',
      emailContactLabel: 'Email',
      addressLabel: 'Address',
      socialTitle: 'Follow Us'
    },
    
    // DocumentationPage translations
    documentationPage: {
      title: 'Documentation',
      subtitle: 'Comprehensive guides and technical documentation for the CyberEco digital ecosystem',
      searchPlaceholder: 'Search documentation...',
      gettingStartedTitle: 'Getting Started with CyberEco',
      introductionTitle: 'Introduction',
      introductionText: 'Welcome to CyberEco documentation! This guide will help you get started with our digital ecosystem. CyberEco offers a suite of digital solutions designed to enhance financial collaboration, community engagement, and social connectivity, all within a human-centered framework for conscious, connected, and sustainable living.',
      accountCreationTitle: 'Digital Sovereignty',
      digitalSovereigntyText: 'At the core of CyberEco is the principle of digital sovereignty. You own your identity, your data, and your narrative. All our applications are designed with this principle in mind, ensuring that your digital presence empowers you, not exploits you.',
      exploringSolutionsTitle: 'Exploring Our Solutions',
      exploringSolutionsText: 'CyberEco is not just another app. It is a modular digital ecosystem — an operating system for life — where each platform solves a real need while contributing to a greater whole. Our solutions are organized into categories that cover different aspects of life, from community governance to sustainability, from finance to education.',
      
      // Community & Governance section
      communityGovernanceTitle: 'Community & Governance',
      communityGovernanceNavItem: 'Community & Governance',
      demosTitle: 'Demos',
      demosDesc: 'A participatory digital democracy platform that enables transparent voting and decision-making for organizations and neighborhoods.',
      communityManagerTitle: 'Community Manager',
      communityManagerDesc: 'Advanced tools to create, organize, and govern digital or physical communities with ease and transparency.',
      myCommunityTitle: 'MyCommunity',
      myCommunityDesc: 'A platform to discover relevant local resources, events, and initiatives in your environment and strengthen community ties.',
      conciliationTitle: 'Conciliation',
      conciliationDesc: 'Conflict resolution tools with neutral human or AI mediators to resolve disputes in a fair and constructive manner.',
      crowdPoolTitle: 'CrowdPool',
      crowdPoolDesc: 'System to assign community tasks or micro-jobs with incentives for balanced participation.',
      
      // Finance & Economy section
      financeEconomyTitle: 'Finance & Collaborative Economy',
      financeEconomyNavItem: 'Finance & Economy',
      justSplitTitle: 'JustSplit',
      justSplitAboutText: 'A simple and intuitive expense tracking and sharing app that helps friends, roommates, and groups easily manage shared finances.',
      myWealthTitle: 'MyWealth',
      myWealthDesc: 'A comprehensive platform to visualize and control personal finances and investments in one secure place.',
      myBusinessTitle: 'MyBusiness',
      myBusinessDesc: 'A lightweight tool for entrepreneurs that combines operational and accounting management in a single interface.',
      crowdFundTitle: 'CrowdFund',
      crowdFundDesc: 'Create collective funding campaigns for ideas, causes, or products with transparent tracking.',
      offerMeTitle: 'OfferMe',
      offerMeDesc: 'Find verified local offers, discounts, and promotions from businesses in your community.',
      
      // Sustainability & Home Life section
      sustainabilityHomeTitle: 'Sustainability & Home Life',
      sustainabilityHomeNavItem: 'Sustainability & Home',
      plantopiaTitle: 'Plantopia',
      plantopiaAboutText: 'A smart gardening platform that combines IoT technology with plant care knowledge to help users cultivate thriving gardens sustainably.',
      ecoTulTitle: 'EcoTul',
      ecoTulDesc: 'A curated recommender of eco-friendly products and services evaluated by real environmental impact.',
      myHomeTitle: 'MyHome',
      myHomeDesc: 'A comprehensive app to organize home maintenance, track expenses, and plan improvements for sustainable living.',
      
      // Education & Growth
      educationTitle: 'Education & Personal Growth',
      educationGrowthNavItem: 'Education & Growth',
      educationHubTitle: 'Education Hub',
      educationHubDesc: 'A modular platform to access learning paths and educational content in a community-oriented environment.',
      skillShareTitle: 'Skill Share',
      skillShareDesc: 'A collaborative network where people can share and teach their skills to others in the community.',
      habitsTitle: 'Habits',
      habitsDesc: 'A tool to record and track habits to achieve personal goals and foster continuous improvement.',
      oneStepTitle: 'One Step',
      oneStepDesc: 'A micro-action system designed to help you advance toward big goals with manageable small steps.',
      
      // API Reference
      apiReferenceTitle: 'API Reference',
      apiOverviewTitle: 'Overview',
      apiOverviewText: 'CyberEco provides RESTful APIs for all our applications, allowing developers to integrate our services into their own solutions. Our APIs use standard HTTP methods and return responses in JSON format.',
      apiAuthTitle: 'Authentication',
      apiAuthText: 'All API requests require authentication using OAuth 2.0 bearer tokens. To obtain a token, make a POST request to our authentication endpoint with your client credentials.',
      apiRequestsTitle: 'Making API Requests',
      apiRequestsText: 'Once you have your token, include it in the Authorization header for all subsequent requests. Our API endpoints follow a consistent structure for all applications.',
      
      // Key Documentation Pages section
      keyDocumentationPagesTitle: 'Key Documentation Pages',
      platformPhilosophyTitle: 'Platform Philosophy',
      platformPhilosophyDesc: 'Digital sovereignty, human-centered design principles, and our commitment to user empowerment.',
      decentralizedFutureTitle: 'Decentralized Future',
      decentralizedFutureDesc: 'Long-term vision for P2P networks, blockchain integration, and complete data sovereignty.',
      developmentRoadmapTitle: 'Development Roadmap',
      developmentRoadmapDesc: 'Detailed technical roadmap from current centralized architecture to decentralized future.',
      solutionsPortfolioTitle: 'Solutions Portfolio',
      solutionsPortfolioDesc: 'Complete overview of current solutions and planned ecosystem expansion.',
      
      // Quick Start Guide section
      quickStartTitle: 'Quick Start',
      step1Title: 'Create Your Account',
      step1Desc: 'Sign up for a CyberEco Hub account to access all applications with a single identity.',
      signUpNow: 'Sign Up Now',
      step2Title: 'Explore Applications',
      step2Desc: 'Start with JustSplit for expense sharing, then discover our growing ecosystem.',
      exploreApps: 'Explore Apps',
      step3Title: 'Join the Community',
      step3Desc: 'Connect with other users and contribute to our human-centered technology vision.',
      joinCommunity: 'Join Community',
      
      // Learning Path section
      learningPathTitle: 'Choose Your Learning Path',
      businessUserPath: 'Business User',
      businessUserDesc: 'Learn to use applications for team collaboration and expense management.',
      developerPath: 'Developer',
      developerDesc: 'Technical integration, API usage, and platform architecture.',
      communityPath: 'Community Leader',
      communityDesc: 'Governance, digital sovereignty, and platform philosophy.',
      
      // Key Concepts section
      keyConceptsTitle: 'Key Concepts & Architecture',
      digitalSovereigntyConceptTitle: 'Digital Sovereignty',
      digitalSovereigntyConceptText: 'At the core of CyberEco is the principle of digital sovereignty - the idea that individuals should own and control their digital identity and data. Our architecture ensures that:',
      digitalSovereigntyPoint1: 'Users maintain ownership of their personal data',
      digitalSovereigntyPoint2: 'Applications are designed to be interoperable and user-controlled',
      digitalSovereigntyPoint3: 'No single entity has monopolistic control over user information',
      digitalSovereigntyPoint4: 'Privacy is built into the core design, not added as an afterthought',
      
      ecosystemArchitectureTitle: 'Ecosystem Architecture',
      ecosystemArchitectureText: 'CyberEco is built as a modular ecosystem where each application serves a specific purpose while contributing to the greater whole:',
      architecturePoint1: 'Hub: Central authentication and identity management',
      architecturePoint2: 'Application Layer: Specialized apps for different life domains',
      architecturePoint3: 'Data Layer: User-controlled data storage and sharing',
      architecturePoint4: 'Integration Layer: APIs and protocols for seamless interaction',
      
      humanCenteredDesignTitle: 'Human-Centered Design',
      humanCenteredDesignText: 'Every application in the CyberEco ecosystem is designed with human well-being and authentic connection at its center. This means:',
      humanCenteredPoint1: 'Minimizing addictive design patterns',
      humanCenteredPoint2: 'Promoting real-world relationships and activities',
      humanCenteredPoint3: 'Supporting individual growth and community building',
      humanCenteredPoint4: 'Respecting human attention and mental health',
      
      communityDrivenTitle: 'Community-Driven Development',
      communityDrivenText: 'Our development process is guided by actual community needs rather than profit maximization. We prioritize:',
      communityDrivenPoint1: 'Open-source development where possible',
      communityDrivenPoint2: 'Community feedback and involvement in feature development',
      communityDrivenPoint3: 'Transparent roadmaps and decision-making processes',
      communityDrivenPoint4: 'Sustainable business models that align with user interests',
      
      // Core Documentation navigation
      coreDocumentationTitle: 'Core Documentation',
      platformPhilosophyNav: 'Platform Philosophy - Digital Sovereignty & Human-Centered Design',
      decentralizedFutureNav: 'Decentralized Future - P2P Networks & Token Economics',
      developmentRoadmapNav: 'Development Roadmap - Technical Evolution & Milestones',
      solutionsPortfolioNav: 'Solutions Portfolio - Current & Future Solutions',
      
      // Core Documentation simplified pages
      philosophyDocTitle: 'Platform Philosophy',
      philosophyDocSummary: 'CyberEco is built on principles of digital sovereignty, human-centered design, and sustainable technology. We believe technology should empower individuals and communities, not exploit them.',
      philosophyDocPreview: 'Our philosophy centers on three core principles: Digital Sovereignty (users own their data), Human-Centered Design (technology serves human wellbeing), and Sustainable Development (long-term thinking over short-term profits).',
      viewFullPhilosophy: 'View Full Philosophy',
      
      visionDocTitle: 'Decentralized Future Vision',
      visionDocSummary: 'By 2030+, CyberEco will transition to a revolutionary decentralized architecture featuring mobile P2P networks, complete data sovereignty, and token-based economics.',
      visionDocPreview: 'Our vision includes: Mobile P2P Networks (smartphones as network nodes), Complete Data Sovereignty (cryptographic guarantees), Token Economics (participation rewards), and Global Accessibility (censorship-resistant platform).',
      viewFullVision: 'View Full Vision',
      
      roadmapDocTitle: 'Development Roadmap',
      roadmapDocSummary: 'Our journey from current centralized applications to a fully decentralized ecosystem, spanning four phases from 2024 to 2030+.',
      roadmapDocPreview: 'Phase 1: Foundation (2024-2025) - Core applications. Phase 2: Growth (2025-2027) - Priority apps. Phase 3: Integration (2027-2030) - Ecosystem. Phase 4: Decentralization (2030+) - P2P networks.',
      viewFullRoadmap: 'View Full Roadmap',
      
      portfolioDocTitle: 'Solutions Portfolio',
      portfolioDocSummary: 'Comprehensive overview of our current solutions and planned ecosystem expansion covering all aspects of digital life.',
      portfolioDocPreview: 'Current: Hub (authentication), JustSplit (expense sharing), Website. Priority: Somos (family roots), Demos (governance), Plantopia (gardening). Future: 30+ applications across finance, community, education, health, and sustainability.',
      viewFullPortfolio: 'View Full Portfolio',
      
      // Redirect card content
      keyPrinciples: 'Key Principles',
      visionComponents: 'Vision Components',
      developmentPhases: 'Development Phases',
      solutionCategories: 'Solution Categories',
      completePhilosophyDoc: 'Complete Philosophy Documentation',
      completePhilosophyDesc: 'For the full detailed philosophy including our commitment to digital sovereignty, human-centered design principles, and sustainable development practices.',
      completeVisionDoc: 'Complete Vision Documentation',
      completeVisionDesc: 'Explore the full decentralized future vision including technical architecture, timeline, and implementation details.',
      completeRoadmapDoc: 'Complete Roadmap Documentation',
      completeRoadmapDesc: 'View the detailed development roadmap including technical evolution, milestones, and current focus areas.',
      completeSolutionsPortfolio: 'Complete Solutions Portfolio',
      completeSolutionsDesc: 'Explore our full solutions portfolio with detailed descriptions, features, and status for all current and planned applications.',
      
      // Doc type tags
      coreDocument: 'Core Document',
      futureVision: 'Future Vision',
      developmentPlan: 'Development Plan',
      solutionsOverview: 'Solutions Overview',
      
      // Enhanced content components
      digitalSovereigntyPrinciple: 'Digital Sovereignty',
      digitalSovereigntyDesc: 'Users own their data and control their digital identity',
      humanCenteredPrinciple: 'Human-Centered Design',
      humanCenteredDesc: 'Technology serves human wellbeing and authentic connection',
      sustainablePrinciple: 'Sustainable Development',
      sustainableDesc: 'Long-term thinking over short-term profits',
      
      // Vision components
      mobileP2PComponent: 'Mobile P2P Networks',
      mobileP2PDesc: 'Smartphones as network nodes eliminating central servers',
      dataSovereigntyComponent: 'Complete Data Sovereignty',
      dataSovereigntyDesc: 'Cryptographic guarantees for user data control',
      tokenEconomicsComponent: 'Token Economics',
      tokenEconomicsDesc: 'Participation rewards for network contributions',
      globalAccessComponent: 'Global Accessibility',
      globalAccessDesc: 'Censorship-resistant platform worldwide',
      
      // Development phases
      foundationPhase: 'Foundation (2024-2025)',
      foundationDesc: 'Core applications and user base establishment',
      growthPhase: 'Growth (2025-2027)',
      growthDesc: 'Priority applications and ecosystem expansion',
      integrationPhase: 'Integration (2027-2030)',
      integrationDesc: 'Comprehensive interconnected ecosystem',
      decentralizationPhase: 'Decentralization (2030+)',
      decentralizationDesc: 'Fully decentralized P2P networks',
      
      // Solution categories
      currentSolutions: 'Current Solutions',
      priorityApplications: 'Priority Applications',
      futureEcosystem: 'Future Ecosystem',
      thirtyPlusApplications: '30+ Applications',
      
      // Navigation items
      gettingStartedNavTitle: 'Getting Started',
      introductionNavItem: 'Introduction',
      applicationsNavTitle: 'Solution Categories',
      developerNavTitle: 'Developer',
      apiReferenceNavItem: 'API Reference'
    },
    
    // FaqPage translations
    faqPage: {
      title: 'Frequently Asked Questions',
      subtitle: 'Find answers to common questions about CyberEco and our applications',
      generalQuestionsTitle: 'General Questions',
      technicalQuestionsTitle: 'Technical Questions',
      businessEnterpriseTitle: 'Business & Enterprise',
      enterpriseQuestion: 'Do you offer enterprise solutions?',
      enterpriseAnswer: 'Yes, we provide customized enterprise solutions for larger organizations. Please contact our sales team for more information about enterprise pricing and features.',
      contactText: 'Still have questions? We\'re here to help.',
      contactButton: 'Contact Support'
    },
    
    // SupportPage translations
    supportPage: {
      title: 'Support Center',
      subtitle: 'Get the assistance you need to solve problems and make the most of CyberEco applications',
      commonIssuesTitle: 'Common Issues',
      commonIssuesText: 'Find quick solutions to the most frequently encountered problems with our applications.',
      viewCommonIssues: 'View Common Issues',
      knowledgeBaseTitle: 'Knowledge Base',
      knowledgeBaseText: 'Access our detailed documentation and step-by-step guides for all CyberEco applications.',
      browseKnowledgeBase: 'Browse Knowledge Base',
      communityForumsTitle: 'Community Forums',
      communityForumsText: 'Join discussions, share experiences, and find solutions with other users in our community forums.',
      visitForums: 'Visit Forums',
      liveChatTitle: 'Live Chat',
      liveChatText: 'Connect with our support team in real-time for immediate assistance with urgent issues.',
      startChat: 'Start Chat',
      contactSupportTitle: 'Contact Support',
      nameLabel: 'Your Name',
      emailLabel: 'Email Address',
      subjectLabel: 'Subject',
      productLabel: 'Product',
      selectProduct: 'Select a product',
      messageLabel: 'Message',
      submitRequest: 'Submit Request'
    },
    
    // PrivacyPage translations
    privacyPage: {
      title: 'Privacy Policy',
      subtitle: 'How we collect, use, and protect your information',
      introTitle: 'Introduction',
      introText: 'CyberEco ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our applications.',
      collectionTitle: 'Information We Collect',
      collectionText: 'We may collect information about you in a variety of ways. The information we may collect includes:',
      useTitle: 'Use of Your Information',
      useText: 'Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. We may use information collected about you to:',
      disclosureTitle: 'Disclosure of Your Information',
      disclosureText: 'We may share information we have collected about you in certain situations. Your information may be disclosed as follows:',
      securityTitle: 'Security of Your Information',
      securityText: 'We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that no security measures are perfect or impenetrable.',
      contactTitle: 'Contact Us',
      contactText: 'If you have questions or concerns about this Privacy Policy, please contact us at privacy@cybereco.io.',
      lastUpdated: 'Last updated: January 2023'
    },
    
    // TermsPage translations
    termsPage: {
      title: 'Terms of Service',
      subtitle: 'Please read these terms of service carefully before using our platform',
      agreementTitle: '1. Agreement to Terms',
      agreementText: 'By accessing or using CyberEco\'s website or applications, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing our services.',
      licenseTitle: '2. Use License',
      licenseText: 'Permission is granted to temporarily access the materials on CyberEco\'s website or applications for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:',
      accountTitle: '3. Account Responsibilities',
      accountText: 'If you create an account with us, you are responsible for maintaining the confidentiality of your account and password, and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password.',
      liabilityTitle: '4. Limitation of Liability',
      liabilityText: 'In no event shall CyberEco or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on CyberEco\'s website, even if CyberEco or a CyberEco authorized representative has been notified orally or in writing of the possibility of such damage.',
      accuracyTitle: '5. Accuracy of Materials',
      accuracyText: 'The materials appearing on CyberEco\'s website or applications could include technical, typographical, or photographic errors. CyberEco does not warrant that any of the materials on its website are accurate, complete, or current.',
      linksTitle: '6. Links',
      linksText: 'CyberEco has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by CyberEco of the site. Use of any such linked website is at the user\'s own risk.',
      modificationsTitle: '7. Modifications',
      modificationsText: 'CyberEco may revise these terms of service at any time without notice. By using this website or our applications, you are agreeing to be bound by the current version of these Terms of Service.',
      contactTitle: '8. Contact Us',
      contactText: 'If you have any questions about these Terms, please contact us at terms@cybereco.io.',
      lastUpdated: 'Last updated: January 2023'
    },
    
    // Legacy compatibility - keeping simplified keys for components that may still use them
    home: 'Home',
    about: 'About',
    features: 'Features',
    solutions: 'Solutions',
    contact: 'Contact',
    portfolio: 'Portfolio',
    help: 'Help',
    
    // Hero section
    heroTitle: 'Digital Solutions for a Connected World',
    heroSubtitle: 'CyberEco creates innovative applications that enhance how people manage finances, engage with communities, and connect with each other in the digital age.',
    exploreSolutions: 'Explore Solutions',
    learnAboutUs: 'Learn About Us',
    
    // Features section
    featuresTitle: 'Our Core Principles',
    featuresDescription: 'Building technology that serves people, not the other way around',
    featureDecentralizedTitle: 'Decentralized by Design',
    featureDecentralizedDesc: 'Built for true digital sovereignty, allowing users to own and control their data.',
    featureEthicalTitle: 'Ethical Technology',
    featureEthicalDesc: 'Prioritizing user wellbeing and privacy over engagement metrics and data collection.',
    featureCommunityTitle: 'Community-Driven',
    featureCommunityDesc: 'Developed with real communities to solve real problems, not maximize profit.',
    featureOpenTitle: 'Open Source',
    featureOpenDesc: 'Transparent, auditable, and built on open standards for everyone to benefit.',
    
    // Mission section
    missionTitle: 'Our Mission',
    missionDescription: 'We believe in technology that enhances human connection and wellbeing. Our mission is to create digital tools that empower communities, respect privacy, and put people first.',
    missionDescription2: 'By building ethical, sustainable, and community-driven solutions, we\'re working towards a digital future that serves humanity, not the other way around.',
    
    // Solutions section
    solutionsTitle: 'Our Solutions',
    solutionsDescription: 'Discover our growing ecosystem of privacy-first applications',
    learnMore: 'Learn more',
    viewAllSolutions: 'View All Solutions',
    
    // CTA section
    ctaTitle: 'Ready to join the digital revolution?',
    ctaDescription: 'Experience technology that respects your privacy and serves your community',
    exploreApps: 'Explore Our Apps',
    getInTouch: 'Get in Touch',
    
    // Footer
    footerTagline: 'Digital solutions for a connected world',
    company: 'Company',
    support: 'Support',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    rightsReserved: 'All rights reserved.',
    communityGovernance: 'Community & Governance',
    financeEconomy: 'Finance & Economy',
    sustainabilityHome: 'Sustainability & Home',
    educationGrowth: 'Education & Growth',
    healthWellness: 'Health & Wellness',
  },
  es: {
    // Navigation and common UI elements
    navigation: {
      home: 'Inicio',
      portfolio: 'Soluciones',
      documentation: 'Documentación',
      about: 'Nosotros',
      help: 'Ayuda',
      hub: 'Hub',
      settings: 'Configuración'
    },
    
    // Theme settings
    theme: {
      title: 'Tema',
      light: 'Claro',
      dark: 'Oscuro'
    },
    
    // Language settings
    language: {
      title: 'Idioma'
    },
    
    footer: {
      tagline: 'Un ecosistema digital centrado en el ser humano para una vida consciente, conectada y sostenible',
      solutions: 'Soluciones',
      communityGovernanceTitle: 'Comunidad y Gobernanza',
      financeEconomyTitle: 'Finanzas y Economía',
      sustainabilityHomeTitle: 'Sostenibilidad y Hogar',
      educationTitle: 'Educación y Crecimiento',
      healthWellnessTitle: 'Salud y Bienestar',
      company: 'Empresa',
      about: 'Nosotros',
      status: 'Estado',
      support: 'Soporte',
      privacy: 'Política de Privacidad',
      terms: 'Términos de Servicio',
      contact: 'Contacto',
      address: '123 Camino de Innovación',
      cityCountry: 'San Francisco, CA 94103',
      rightsReserved: 'Todos los derechos reservados.'
    },
    
    // HomePage translations
    homePage: {
      hero: {
        title: 'Soluciones Digitales para un Mundo Conectado',
        subtitle: 'CyberEco crea aplicaciones innovadoras que mejoran cómo las personas gestionan sus finanzas, participan en comunidades y se conectan entre sí en la era digital.',
        exploreSolutions: 'Explorar Soluciones',
        learnAboutUs: 'Conócenos'
      },
      features: {
        sectionTitle: 'Soluciones Tecnológicas Transformadoras',
        sectionSubtitle: 'Lo que distingue nuestras soluciones del resto',
        communityTitle: 'Construcción de Comunidades',
        communityDesc: 'Crea y nutre comunidades digitales prósperas con herramientas diseñadas para conexiones significativas y colaboración.',
        sustainabilityTitle: 'Sostenibilidad',
        sustainabilityDesc: 'Soluciones digitales ecológicas diseñadas con el impacto ambiental en mente, promoviendo prácticas sostenibles.',
        securityTitle: 'Seguridad Mejorada',
        securityDesc: 'Medidas de seguridad de última generación para proteger tus datos y garantizar la privacidad en todas nuestras aplicaciones.',
        innovationTitle: 'Tecnología Innovadora',
        innovationDesc: 'Soluciones tecnológicas de vanguardia que anticipan necesidades y resuelven problemas antes de que surjan.'
      },
      mission: {
        sectionTitle: 'NUESTRA MISIÓN',
        sectionSubtitle: 'Creando armonía entre tecnología y sostenibilidad',
        missionText: 'En CyberEco, nuestra misión es diseñar e implementar aplicaciones digitales centradas en el usuario que mejoran la colaboración financiera, el compromiso comunitario y la conectividad social. Desarrollamos herramientas que promueven la transparencia, eficiencia y relaciones saludables entre las personas y la tecnología, permitiendo a individuos y comunidades prosperar en nuestro mundo cada vez más digital.',
        learnMore: 'Conozca Más Sobre Nosotros',
        vision: 'Visión',
        visionText: 'Un mundo donde la tecnología facilita conexiones significativas, colaboración eficiente y gestión sostenible de recursos.',
        approach: 'Enfoque',
        approachText: 'Desarrollamos aplicaciones centradas en el usuario que combinan funcionalidad intuitiva con características innovadoras para resolver problemas reales.'
      },
      solutions: {
        sectionTitle: 'Nuestras Soluciones',
        sectionSubtitle: 'Explore nuestro diverso portafolio de aplicaciones digitales diseñadas para mejorar la productividad, la conectividad y el compromiso comunitario',
        learnMore: 'Más información',
        viewAll: 'Ver Todas las Soluciones'
      },
      callToAction: {
        title: '¿Listo para Transformar Tu Relación con la Tecnología?',
        subtitle: 'Descubre cómo las aplicaciones innovadoras de CyberEco pueden ayudarte a gestionar finanzas, participar en comunidades y navegar por conexiones sociales de manera más efectiva.',
        exploreSolutions: 'Explorar Soluciones',
        contactUs: 'Obtener Soporte'
      }
    },
    
    // AboutPage translations
    aboutPage: {
      title: 'Sobre CyberEco',
      subtitle: 'Un ecosistema digital centrado en el ser humano para una vida consciente, conectada y sostenible.',
      whoWeAreTitle: 'Quiénes Somos',
      whoWeAreP1: 'CyberEco es un ecosistema digital centrado en el ser humano para una vida consciente, conectada y sostenible. En un mundo donde la vida digital está fragmentada, es extractiva y abrumadora, CyberEco existe para ofrecer un mejor camino, uno arraigado en la soberanía, la comunidad y el equilibrio.',
      whoWeAreP2: 'Creemos que tu presencia digital debería empoderarte, no explotarte. Tu identidad debería pertenecerte. Tus datos deberían servirte. Tus acciones deberían conectarte significativamente con otras personas.',
      teamImage: 'Imagen del Equipo',
      whyWeExistTitle: 'Por Qué Existimos',
      manifestoQuote: 'En un mundo donde la vida digital está fragmentada, es extractiva y abrumadora, CyberEco existe para ofrecer un mejor camino, uno arraigado en la soberanía, la comunidad y el equilibrio.',
      whyWeExistText: 'El mundo digital se ha desconectado cada vez más de los valores humanos. Creamos CyberEco para cerrar esta brecha, proporcionando soluciones digitales que se alinean con la forma en que las personas naturalmente quieren conectarse, colaborar y vivir de manera sostenible.',
      whatWeAreTitle: 'Qué Somos',
      whatWeAreText: 'CyberEco no es solo otra aplicación. Es un ecosistema digital modular — un sistema operativo para la vida — donde cada plataforma resuelve una necesidad real mientras contribuye a un todo mayor.',
      whatWeArePoint1: 'Un lugar para gestionar tus finanzas.',
      whatWeArePoint2: 'Un lugar para resolver conflictos pacíficamente.',
      whatWeArePoint3: 'Un lugar para crecer, aprender, votar, conectar y pertenecer.',
      whatWeArePoint4: 'Un lugar donde tus valores y tus datos se alinean.',
      whatWeAreConclusion: 'En el centro está el CyberEco Hub — tu identidad, tu panel de control, tu hogar digital.',
      visionMissionTitle: 'Nuestra Visión y Misión',
      visionTitle: 'Visión',
      visionText: 'Empoderar a millones de personas, no con más notificaciones, sino con claridad, autonomía y conexión. Crear un entorno digital tan humano, intencional y resiliente como el mundo que merecemos offline.',
      missionTitle: 'Misión',
      missionText: 'Crear un ecosistema digital modular — un sistema operativo para la vida — donde cada plataforma resuelve una necesidad real mientras contribuye a un todo mayor, centrado en el CyberEco Hub como tu identidad, tu panel de control, tu hogar digital.',
      valuesTitle: 'Nuestros Valores',
      value1Title: 'Soberanía Digital',
      value1Text: 'Tú eres dueño de tu identidad, tus datos, tu narrativa. Creamos tecnología que empodera en lugar de explotar.',
      value2Title: 'Bienestar por Diseño',
      value2Text: 'La tecnología debe servir a tu vida, no consumirla. Diseñamos soluciones que mejoran tu bienestar en lugar de agotarlo.',
      value3Title: 'Interconexión con Propósito',
      value3Text: 'Cada plataforma es útil por sí sola, pero transformadora en conjunto. Creamos un ecosistema de soluciones que se complementan entre sí.',
      value4Title: 'La Comunidad es el Núcleo',
      value4Text: 'Construimos herramientas para individuos, impulsadas por lo colectivo. El compromiso comunitario y el crecimiento colaborativo están en el corazón de nuestro ecosistema.',
      value5Title: 'Abiertos por Naturaleza',
      value5Text: 'Donde sea posible, CyberEco es modular, transparente e interoperable. Adoptamos la apertura y la colaboración en nuestro enfoque de desarrollo.',
      joinUsTitle: 'Únete a Nosotros',
      joinUsText: 'CyberEco es una plataforma, pero también un movimiento. Damos la bienvenida a creadores, colaboradores, soñadores y constructores. Formemos juntos un futuro digital en el que valga la pena vivir.'
    },
    
    // PortfolioPage translations
    portfolioPage: {
      title: 'Nuestras Soluciones',
      subtitle: 'Explore nuestro diverso portafolio de soluciones digitales diseñadas para mejorar la productividad, la sostenibilidad, la conectividad y el compromiso comunitario a través de tecnología innovadora.',
      
      // Status section
      statusTitle: 'Estado de Desarrollo',
      currentAppsTitle: 'Aplicaciones Actuales',
      currentAppsDesc: '3 aplicaciones en vivo y en desarrollo activo',
      priorityDevTitle: 'Desarrollo Prioritario',
      priorityDevDesc: '3 aplicaciones planificadas para 2025-2026',
      futureEcosystemTitle: 'Ecosistema Futuro',
      futureEcosystemDesc: '25+ aplicaciones en todos los dominios de la vida',
      
      // Category names
      allSolutions: 'Todas las Soluciones',
      currentApplications: 'Aplicaciones Actuales',
      priorityApplications: 'Aplicaciones Prioritarias',
      communityGovernance: 'Comunidad y Gobernanza',
      financeEconomy: 'Finanzas y Economía',
      sustainabilityHome: 'Sostenibilidad y Hogar',
      educationGrowth: 'Educación y Crecimiento',
      healthWellness: 'Salud y Bienestar',
      identityLegal: 'Identidad y Legal',
      travelDiscovery: 'Viajes y Descubrimiento',
      techSocial: 'Tecnología y Social',
      
      // Phase labels
      liveLabel: 'En Vivo',
      planning2025Label: 'Planificado 2025',
      futureEcosystemLabel: 'Ecosistema Futuro',
      
      // Priority Applications subtitle
      priorityAppsSubtitle: 'Aplicaciones Prioritarias (2025-2026)',
      
      // Common text
      detailsComingSoon: 'Información detallada sobre cada solución próximamente.',
      openSolution: 'Abrir Solución',
      
      // Domain areas
      financeArea: 'Finanzas',
      communityArea: 'Comunidad',
      sustainabilityArea: 'Sostenibilidad',
      educationArea: 'Educación',
      healthArea: 'Salud',
      identityArea: 'Identidad',
      travelArea: 'Viajes',
      techArea: 'Tecnología',
      
      // Current Applications
      hubTitle: 'CyberEco Hub',
      hubDesc: 'Plataforma central de autenticación y gestión de aplicaciones que sirve como hogar digital para usuarios en todo el ecosistema.',
      justSplitTitle: 'JustSplit',
      justSplitDesc: 'Aplicación para dividir gastos que ayuda a amigos y grupos a rastrear, compartir y liquidar gastos con soporte para múltiples monedas.',
      websiteTitle: 'Sitio Web CyberEco',
      websiteDesc: 'Centro central de marketing e información para todo el ecosistema CyberEco con documentación integral.',
      
      // Priority Applications
      somosTitle: 'Somos - Explorador de Raíces Familiares',
      somosDesc: 'Preserva y explora la historia familiar con herramientas de preservación del patrimonio controladas por privacidad, recopilación de memorias y conexión cultural.',
      demosTitle: 'Demos - Gobernanza Comunitaria',
      demosDesc: 'Plataforma transparente de votación y gobernanza comunitaria que permite la toma de decisiones colectivas segura y verificable.',
      plantopiaTitle: 'Plantopia - Jardinería Inteligente',
      plantopiaDesc: 'Plataforma de jardinería inteligente que combina conocimientos sobre el cuidado de plantas con intercambio comunitario y prácticas sostenibles.',
      
      // Finance & Economy
      myWealthTitle: 'MyWealth',
      myWealthDesc: 'Plataforma integral para visualizar y controlar finanzas personales e inversiones en un lugar seguro.',
      myBusinessTitle: 'MyBusiness',
      myBusinessDesc: 'Herramienta ligera para emprendedores que combina la gestión operativa y contable en una sola interfaz.',
      crowdFundTitle: 'CrowdFund',
      crowdFundDesc: 'Plataforma de financiación colectiva impulsada por la comunidad con seguimiento transparente de proyectos y financiación basada en hitos.',
      offerMeTitle: 'OfferMe',
      offerMeDesc: 'Mercado de servicios y habilidades dentro de la comunidad con sistemas integrados de pago y reputación.',
      
      // Community & Governance
      communityManagerTitle: 'Community Manager',
      communityManagerDesc: 'Herramientas avanzadas para crear, organizar y gobernar comunidades digitales o físicas con facilidad y transparencia.',
      myCommunityTitle: 'MyCommunity',
      myCommunityDesc: 'Plataforma para descubrir recursos locales relevantes, eventos e iniciativas en tu entorno.',
      conciliationTitle: 'Conciliación',
      conciliationDesc: 'Herramientas de resolución de conflictos con mediadores neutrales humanos o de IA para resolver disputas de manera justa.',
      crowdPoolTitle: 'CrowdPool',
      crowdPoolDesc: 'Sistema de tareas comunitarias para resolución colaborativa de problemas e intercambio de habilidades con mecanismos de recompensa.',
      
      // Sustainability & Home
      ecoTulTitle: 'EcoTul',
      ecoTulDesc: 'Recomendador curado de productos y servicios ecológicos evaluados por su impacto ambiental real.',
      myHomeTitle: 'MyHome',
      myHomeDesc: 'Aplicación integral para organizar el mantenimiento del hogar, rastrear gastos y planificar mejoras para una vida sostenible.',
      
      // Education & Growth
      educationHubTitle: 'Education Hub',
      educationHubDesc: 'Plataforma modular para acceder a rutas de aprendizaje y contenido educativo en un entorno orientado a la comunidad.',
      skillShareTitle: 'Skill Share',
      skillShareDesc: 'Red colaborativa donde las personas pueden compartir y enseñar sus habilidades a otros en la comunidad.',
      habitsTitle: 'Habits',
      habitsDesc: 'Herramienta para registrar y rastrear hábitos para lograr objetivos personales y fomentar la mejora continua.',
      oneStepTitle: 'One Step',
      oneStepDesc: 'Sistema de micro-acciones diseñado para ayudarte a avanzar hacia grandes objetivos con pasos manejables.',
      
      // Health & Wellness
      healthyTitle: 'Healthy',
      healthyDesc: 'Plataforma integral de seguimiento de salud que integra métricas de bienestar físico, mental y social.',
      petPalTitle: 'PetPal',
      petPalDesc: 'Gestión completa del cuidado de mascotas incluyendo seguimiento de salud, programación de citas y características comunitarias.',
      
      // Identity & Legal
      lawPalTitle: 'LawPal',
      lawPalDesc: 'Plataforma de asistencia legal que conecta a los usuarios con recursos legales y orientación profesional.',
      myDataTitle: 'MyData',
      myDataDesc: 'Plataforma de soberanía de datos personales que da a los usuarios control completo sobre su información digital.',
      digitalMeTitle: 'DigitalMe',
      digitalMeDesc: 'Gestión unificada de identidad digital en todas las plataformas y servicios con controles de privacidad.',
      myDocsTitle: 'MyDocs',
      myDocsDesc: 'Almacenamiento y gestión segura de documentos con controles de intercambio y características de validación legal.',
      
      // Travel & Discovery
      travelMateTitle: 'TravelMate',
      travelMateDesc: 'Compañero de viaje inteligente para planificar, reservar y experimentar la cultura local auténtica.',
      eventConnectTitle: 'EventConnect',
      eventConnectDesc: 'Plataforma para descubrir y conectarse con eventos locales, reuniones y actividades culturales.',
      localWondersTitle: 'LocalWonders',
      localWondersDesc: 'Descubre gemas ocultas y atracciones locales recomendadas por miembros de la comunidad.',
      
      // Tech & Social
      nexusTitle: 'Nexus',
      nexusDesc: 'Centro de redes sociales para el bienestar digital para gestionar la presencia en línea y fomentar conexiones significativas.',
      timeSyncTitle: 'TimeSync',
      timeSyncDesc: 'Plataforma inteligente de programación y gestión del tiempo que se integra con todas las aplicaciones de CyberEco.',
      
      
      comingSoon: 'Información detallada sobre cada solución próximamente.',
      viewSolution: 'Ver Solución'
    },
    
    // PhilosophyPage translations
    philosophyPage: {
      title: 'Filosofía de la Plataforma CyberEco',
      subtitle: 'Construyendo tecnología que sirve al florecimiento humano, no a la extracción corporativa',
      
      manifestoTitle: 'El Manifiesto de Soberanía Digital',
      manifestoQuote: 'En un mundo donde la vida digital se ha vuelto fragmentada, extractiva y abrumadora, CyberEco existe para ofrecer un mejor camino, uno arraigado en la soberanía, la comunidad y el equilibrio.',
      manifestoBeliefTitle: 'Creemos que:',
      manifestoBelief1: 'Tu presencia digital debe empoderarte, no explotarte',
      manifestoBelief2: 'Tu identidad debe pertenecerte',
      manifestoBelief3: 'Tus datos deben servirte',
      manifestoBelief4: 'Tus acciones deben conectarte significativamente con otros',
      
      principlesSectionTitle: 'Nuestros Principios Rectores',
      
      digitalSovereigntyTitle: 'Soberanía Digital',
      digitalSovereigntyQuote: 'Tú eres dueño de tu identidad, tus datos, tu narrativa',
      digitalSovereigntyMeansTitle: 'Qué significa esto:',
      digitalSovereigntyMeans1: 'Control completo sobre datos personales e identidad digital',
      digitalSovereigntyMeans2: 'Transparencia en cómo se usan y comparten los datos',
      digitalSovereigntyMeans3: 'Derecho a la portabilidad y eliminación de datos',
      digitalSovereigntyMeans4: 'Libertad del encierro de proveedores',
      digitalSovereigntyImplTitle: 'Cómo implementamos esto:',
      digitalSovereigntyImpl1: 'Formatos de datos abiertos y APIs',
      digitalSovereigntyImpl2: 'Almacenamiento local de datos con sincronización en la nube',
      digitalSovereigntyImpl3: 'Claves de encriptación controladas por el usuario',
      digitalSovereigntyImpl4: 'Políticas de privacidad transparentes',
      
      wellbeingTitle: 'Bienestar por Diseño',
      wellbeingQuote: 'La tecnología debe servir a tu vida, no consumirla',
      wellbeingMeansTitle: 'Qué significa esto:',
      wellbeingMeans1: 'La tecnología debe mejorar las capacidades humanas',
      wellbeingMeans2: 'Interfaces diseñadas para respetar la atención del usuario',
      wellbeingMeans3: 'Características que promueven hábitos digitales saludables',
      wellbeingMeans4: 'Sin patrones oscuros o mecánicas adictivas',
      wellbeingImplTitle: 'Cómo implementamos esto:',
      wellbeingImpl1: 'Sistemas de notificación conscientes',
      wellbeingImpl2: 'Insights de uso basados en tiempo',
      wellbeingImpl3: 'Diseño intencional de UI/UX',
      wellbeingImpl4: 'Características regulares de bienestar digital',
      
      interconnectionTitle: 'Interconexión con Propósito',
      interconnectionQuote: 'Cada plataforma es útil por sí sola, pero transformadora en conjunto',
      interconnectionMeansTitle: 'Qué significa esto:',
      interconnectionMeans1: 'Integración perfecta entre diferentes aplicaciones',
      interconnectionMeans2: 'Identidad y datos compartidos entre plataformas',
      interconnectionMeans3: 'Efectos de red que benefician a todos los usuarios',
      interconnectionMeans4: 'Características colaborativas que mejoran herramientas individuales',
      interconnectionImplTitle: 'Cómo implementamos esto:',
      interconnectionImpl1: 'Autenticación unificada y gestión de identidad',
      interconnectionImpl2: 'Compartición y sincronización de datos entre plataformas',
      interconnectionImpl3: 'APIs estandarizadas para integración de terceros',
      interconnectionImpl4: 'Desarrollo de características impulsado por la comunidad',
      
      communityTitle: 'La Comunidad es el Núcleo',
      communityQuote: 'Construimos herramientas para individuos, impulsadas por lo colectivo',
      communityMeansTitle: 'Qué significa esto:',
      communityMeans1: 'El compromiso comunitario impulsa la evolución de la plataforma',
      communityMeans2: 'Gobernanza colaborativa y toma de decisiones',
      communityMeans3: 'Conocimiento compartido y agrupación de recursos',
      communityMeans4: 'Empoderamiento individual a través de la sabiduría colectiva',
      communityImplTitle: 'Cómo implementamos esto:',
      communityImpl1: 'Prácticas de desarrollo de código abierto',
      communityImpl2: 'Votación comunitaria sobre prioridades de características',
      communityImpl3: 'Contenido y recursos generados por usuarios',
      communityImpl4: 'Canales de comunicación transparentes',
      
      opennessTitle: 'Abiertos por Naturaleza',
      opennessQuote: 'Donde sea posible, CyberEco es modular, transparente e interoperable',
      opennessMeansTitle: 'Qué significa esto:',
      opennessMeans1: 'Código abierto y documentación',
      opennessMeans2: 'Procesos de desarrollo transparentes',
      opennessMeans3: 'Formatos de datos y protocolos interoperables',
      opennessMeans4: 'Innovación impulsada por la comunidad',
      opennessImplTitle: 'Cómo implementamos esto:',
      opennessImpl1: 'Repositorios públicos de GitHub',
      opennessImpl2: 'Documentación completa de API',
      opennessImpl3: 'Formatos de datos estándar (JSON, CSV, etc.)',
      opennessImpl4: 'Arquitecturas de plugins y extensiones',
      
      ctaTitle: 'Únete al Movimiento',
      ctaText: 'Experimenta tecnología que respeta tu soberanía y sirve a tu comunidad.',
      ctaButton: 'Explora Nuestras Soluciones',
      ctaButtonSecondary: 'Nuestra Visión',
      
      implementationTitle: 'Filosofía en Acción',
      implementationText: 'Estos no son solo ideales: son principios que implementamos activamente en cada línea de código, cada decisión de diseño y cada interacción de usuario en todo el ecosistema CyberEco.',
      privacyTitle: 'Privacidad Primero',
      privacyText: 'Todos los datos de usuario están encriptados por defecto, con usuarios controlando sus propias claves de encriptación.',
      decentralizedTitle: 'Futuro Descentralizado',
      decentralizedText: 'Construyendo hacia una red peer-to-peer donde los usuarios poseen y controlan su ecosistema digital.',
      innovationTitle: 'Innovación Abierta',
      innovationText: 'Todo el desarrollo ocurre abiertamente, con la entrada de la comunidad dando forma a nuestra hoja de ruta.',
      humanCenteredTitle: 'Centrado en el Humano',
      humanCenteredText: 'Cada característica se evalúa a través del lente del bienestar y empoderamiento humano.'
    },
    
    // VisionPage translations
    visionPage: {
      title: 'Nuestra Visión',
      subtitle: 'Construyendo hacia un futuro descentralizado donde la tecnología sirve a la humanidad',
      
      currentStateTitle: 'Dónde Estamos Hoy',
      currentStateText: 'Comenzamos con aplicaciones prácticas que resuelven problemas reales mientras construimos la base para un futuro descentralizado.',
      
      futureVisionTitle: 'Visión del Futuro Descentralizado',
      futureVisionText: 'Para 2030+, CyberEco hará la transición a una arquitectura descentralizada revolucionaria que empodera a los usuarios con soberanía completa de datos y privacidad.',
      
      // Vision cards
      mobileP2PTitle: 'Red P2P Móvil',
      mobileP2PText: 'Transformar smartphones en nodos de computación distribuida, creando una red mesh resiliente impulsada por la participación comunitaria.',
      mobileP2PFeature1: 'Dispositivos de usuario como infraestructura de red',
      mobileP2PFeature2: 'Redes mesh para conectividad resiliente',
      mobileP2PFeature3: 'Computación en el borde para procesamiento local de datos',
      mobileP2PFeature4: 'Mantenimiento de red impulsado por la comunidad',
      
      dataSovereigntyTitle: 'Soberanía Completa de Datos',
      dataSovereigntyText: 'Los usuarios mantienen control total sobre sus datos a través de garantías criptográficas y sistemas de identidad auto-soberanos.',
      dataSovereigntyFeature1: 'Pruebas de conocimiento cero para privacidad',
      dataSovereigntyFeature2: 'Cifrado del lado del cliente por defecto',
      dataSovereigntyFeature3: 'Identidad digital auto-soberana',
      dataSovereigntyFeature4: 'Controles de compartir datos selectivos',
      
      tokenEconomicsTitle: 'Economía de Tokens (CYE)',
      tokenEconomicsText: 'Participa en la creación de valor de la red a través de recompensas de tokens por contribuir recursos y mantener la salud de la red.',
      tokenEconomicsFeature1: 'Gana tokens ejecutando nodos de red',
      tokenEconomicsFeature2: 'Derechos de gobierno a través de tenencia de tokens',
      tokenEconomicsFeature3: 'Paga por características de privacidad premium',
      tokenEconomicsFeature4: 'Financiamiento de desarrollo impulsado por la comunidad',
      
      globalAccessibilityTitle: 'Accesibilidad Global',
      globalAccessibilityText: 'Plataforma resistente a la censura accesible mundialmente sin restricciones geográficas o intermediarios corporativos.',
      globalAccessibilityFeature1: 'Sin restricciones geográficas',
      globalAccessibilityFeature2: 'Arquitectura resistente a la censura',
      globalAccessibilityFeature3: 'Funciona en áreas de baja conectividad',
      globalAccessibilityFeature4: 'Infraestructura propiedad de la comunidad',
      
      // Technical architecture
      architectureTitle: 'Arquitectura Descentralizada',
      layer3Title: 'Capa 3: Capa de Aplicación',
      layer3Text: 'Datos personales que preservan la privacidad y estado de la aplicación',
      layer3Component1: 'Bóvedas de Datos Personales',
      layer3Component2: 'Computaciones de Conocimiento Cero',
      layer3Component3: 'Divulgación Selectiva',
      
      layer2Title: 'Capa 2: Capa de Protocolo',
      layer2Text: 'Interacciones de aplicaciones e intercambio de datos entre aplicaciones',
      layer2Component1: 'Contratos Inteligentes',
      layer2Component2: 'APIs Entre Aplicaciones',
      layer2Component3: 'Sincronización de Datos',
      
      layer1Title: 'Capa 1: Capa de Red',
      layer1Text: 'Gobierno de red, consenso y tokenomics',
      layer1Component1: 'Mecanismo de Consenso',
      layer1Component2: 'Economía de Tokens',
      layer1Component3: 'Gobierno de Red',
      
      deviceLayerTitle: 'Capa de Dispositivo: Nodos Móviles',
      deviceLayerText: 'Smartphones de usuarios como infraestructura de computación distribuida',
      deviceLayerComponent1: 'Redes P2P',
      deviceLayerComponent2: 'Almacenamiento Local',
      deviceLayerComponent3: 'Computación en el Borde',
      
      timelineTitle: 'El Camino por Delante',
      phase1Title: 'Fundación (2024-2025)',
      phase1Text: 'Establecer aplicaciones centrales y base de usuarios',
      phase2Title: 'Crecimiento (2025-2027)',
      phase2Text: 'Expandir ecosistema con aplicaciones prioritarias',
      phase3Title: 'Integración (2027-2030)',
      phase3Text: 'Construir ecosistema interconectado integral',
      phase4Title: 'Descentralización (2030+)',
      phase4Text: 'Transición a redes P2P completamente descentralizadas',
      
      ctaTitle: 'Sé Parte del Futuro',
      ctaText: 'Únete a nosotros en la construcción de un ecosistema digital que pone a la humanidad primero.',
      ctaButton: 'Ver Hoja de Ruta',
      ctaButtonSecondary: 'Nuestra Filosofía'
    },
    
    // RoadmapPage translations
    roadmapPage: {
      title: 'Hoja de Ruta de Desarrollo',
      subtitle: 'Nuestro viaje desde las aplicaciones actuales hasta un ecosistema completamente descentralizado',
      
      phase1Title: 'Fase 1: Fundación (2024-2025)',
      phase1Text: 'Lanzar aplicaciones principales: Hub para autenticación, JustSplit para compartir gastos, y Website para compromiso comunitario.',
      
      phase2Title: 'Fase 2: Crecimiento (2025-2027)',
      phase2Text: 'Expandir con aplicaciones prioritarias: Somos para conexiones familiares, Demos para gobernanza comunitaria, y Plantopia para vida sostenible.',
      
      phase3Title: 'Fase 3: Ecosistema (2027-2030)',
      phase3Text: 'Construir ecosistema de aplicaciones integral cubriendo todos los aspectos de la vida digital con integración perfecta y portabilidad de datos.',
      
      phase4Title: 'Fase 4: Descentralización (2030-2035)',
      phase4Text: 'Transición a arquitectura completamente descentralizada con redes P2P móviles, integración blockchain e infraestructura propiedad del usuario.',
      
      milestonesTitle: 'Hitos Clave',
      currentMilestone: 'Actual: Construyendo aplicaciones fundamentales',
      nextMilestone: 'Próximo: Lanzar suite de aplicaciones prioritarias',
      futureMilestone: 'Futuro: Integración completa del ecosistema',
      
      currentFocusTitle: 'Enfoque Actual',
      nextQuarterTitle: 'Próximo Trimestre',
      longTermTitle: 'Meta a Largo Plazo',
      inProgressStatus: 'En Progreso',
      q2Status: 'Q2 2025',
      timeframeStatus: '2027-2030',
      
      timelineTitle: 'Cronograma de Desarrollo',
      timeline2024: 'Lanzamiento de Fundación',
      timeline2025: 'Aplicaciones Prioritarias',
      timeline2027: 'Ecosistema Completo',
      timeline2030: 'Descentralización',
      
      progressComplete: '75% Completo',
      planningPhase: 'Fase de Planificación',
      planned: 'Planificado',
      longTermVision: 'Visión a Largo Plazo',
      
      // Phase status labels
      currentStatus: 'Actual',
      nextStatus: 'Próximo',
      futureStatus: 'Futuro',
      visionStatus: 'Visión',
      
      // App tags
      thirtyPlusApps: '30+ Apps',
      integration: 'Integración',
      ecosystem: 'Ecosistema',
      p2pNetworks: 'Redes P2P',
      blockchain: 'Blockchain',
      decentralized: 'Descentralizado',
      
      // Current Development Focus
      currentFocusSectionTitle: 'Enfoque de Desarrollo Actual',
      criticalFixesTitle: 'Correcciones Críticas',
      justSplitStabilization: 'Estabilización de JustSplit:',
      criticalFix1: 'Corregir errores de tipos de props de componentes',
      criticalFix2: 'Implementar patrones de flujo de datos apropiados',
      criticalFix3: 'Agregar límites de error comprensivos',
      criticalFix4: 'Resolver problemas de compilación de TypeScript',
      inProgressStatus2: 'En Progreso',
      
      hubDevelopmentTitle: 'Desarrollo del Hub',
      coreAuthentication: 'Autenticación Central:',
      hubFeature1: 'Formularios de registro e inicio de sesión de usuario',
      hubFeature2: 'Funcionalidad de restablecimiento de contraseña',
      hubFeature3: 'Panel de lanzador de aplicaciones',
      hubFeature4: 'Gestión de sesión entre aplicaciones',
      plannedStatus: 'Planificado',
      
      integrationTitle: 'Integración',
      crossAppFeatures: 'Características Entre Aplicaciones:',
      integrationFeature1: 'Autenticación basada en tokens JWT',
      integrationFeature2: 'Sincronización de perfil de usuario',
      integrationFeature3: 'Experiencia de navegación unificada',
      integrationFeature4: 'Librerías de componentes compartidos',
      nextQuarterStatus: 'Próximo Trimestre',
      
      // Technical Evolution
      technicalEvolutionTitle: 'Evolución Técnica',
      techPhase1Title: 'Fase 1: Fundación Centralizada (2025-2026)',
      techPhase1Text: 'Construir aplicaciones robustas en infraestructura tradicional',
      techStack1: 'Firebase',
      techStack2: 'Next.js',
      techStack3: 'TypeScript',
      techStack4: 'Monorepo NX',
      
      techPhase2Title: 'Fase 2: Mejora de Privacidad (2026-2028)',
      techPhase2Text: 'Implementar características avanzadas de privacidad y control de usuario',
      techStack5: 'Cifrado del Lado del Cliente',
      techStack6: 'Datos Locales Primero',
      techStack7: 'Arquitectura de Confianza Cero',
      
      techPhase3Title: 'Fase 3: Sistemas Híbridos (2028-2030)',
      techPhase3Text: 'Conectar arquitecturas centralizadas y descentralizadas',
      techStack8: 'Protocolos P2P',
      techStack9: 'Integración de Blockchain',
      techStack10: 'Redes de Nodos Móviles',
      
      techPhase4Title: 'Fase 4: Descentralización Completa (2030+)',
      techPhase4Text: 'Transición completa a arquitectura soberana del usuario',
      techStack11: 'Identidad Auto-Soberana',
      techStack12: 'Pruebas de Conocimiento Cero',
      techStack13: 'Economía de Tokens',
      
      ctaTitle: 'Únete a Nuestro Viaje',
      ctaText: 'Sé parte de construir el futuro de la tecnología centrada en el ser humano.',
      ctaButton: 'Explorar Soluciones',
      ctaButtonSecondary: 'Nuestra Visión'
    },
    
    // ApplicationsPage translations
    applicationsPage: {
      title: 'Ecosistema de Aplicaciones',
      subtitle: 'Un conjunto integral de aplicaciones diseñadas para mejorar cada aspecto de la vida digital',
      
      currentAppsTitle: 'Disponibles Ahora',
      priorityAppsTitle: 'Aplicaciones Prioritarias',
      futureAppsTitle: 'Ecosistema Futuro',
      
      hubTitle: 'CyberEco Hub',
      hubDescription: 'Tu centro de identidad digital y autenticación. Una sola cuenta para todas las aplicaciones CyberEco con control completo de privacidad.',
      
      justSplitTitle: 'JustSplit',
      justSplitDescription: 'Compartir gastos transparente que promueve la claridad financiera y equidad entre amigos, familia y grupos.',
      
      somosTitle: 'Somos',
      somosDescription: 'Conecta con tus raíces a través de la exploración del patrimonio familiar, descubrimiento cultural y construcción comunitaria.',
      
      demosTitle: 'Demos',
      demosDescription: 'Gobernanza comunitaria transparente con votación segura, gestión de propuestas y herramientas de toma de decisiones colectivas.',
      
      plantopiaTitle: 'Plantopia',
      plantopiaDescription: 'Plataforma de jardinería inteligente que te conecta con la naturaleza mientras promueve prácticas de vida sostenible.',
      
      ecosystemVisionTitle: 'Visión Completa del Ecosistema',
      ecosystemVisionText: 'Más de 30 aplicaciones planificadas cubriendo finanzas, comunidad, educación, salud, sostenibilidad y crecimiento personal — todas trabajando juntas como un ecosistema digital unificado.'
    },
    
    // HelpPage translations
    helpPage: {
      title: 'Ayuda y Soporte',
      subtitle: 'Encuentre los recursos y la asistencia que necesita para navegar por el ecosistema digital de CyberEco.',
      faqTitle: 'Preguntas Frecuentes',
      faqDesc: 'Encuentre respuestas a preguntas comunes sobre nuestras soluciones y el ecosistema CyberEco',
      docsTitle: 'Documentación de Soluciones',
      docsDesc: 'Guías detalladas y documentación para todas las categorías de soluciones en nuestro ecosistema digital',
      supportTitle: 'Soporte Comunitario',
      supportDesc: 'Obtenga ayuda de nuestro equipo de soporte y la comunidad para cualquier problema en todas las categorías de soluciones',
      contactTitle: 'Contacto',
      contactDesc: 'Comuníquese directamente con nosotros para preguntas sobre cualquiera de nuestras soluciones o para sugerir nuevas funcionalidades',
      faqSectionTitle: 'Preguntas Frecuentes',
      faq1Q: '¿Qué es CyberEco?',
      faq1A: 'CyberEco es una empresa innovadora centrada en desarrollar aplicaciones digitales que mejoran la colaboración financiera, el compromiso comunitario y la conectividad social a través del diseño centrado en el usuario.',
      faq2Q: '¿Cómo puedo empezar a usar las aplicaciones de CyberEco?',
      faq2A: 'Puede explorar nuestras soluciones en la sección Portafolio y descargarlas o acceder a ellas a través de los enlaces proporcionados para cada aplicación.',
      faq3Q: '¿Están disponibles las aplicaciones de CyberEco en todas las plataformas?',
      faq3A: 'La mayoría de nuestras aplicaciones están disponibles como aplicaciones web, con versiones para iOS y Android disponibles para nuestras herramientas más populares como JustSplit y Nexus.',
      faq4Q: '¿Cómo garantiza CyberEco la privacidad y seguridad de los datos?',
      faq4A: 'Implementamos cifrado fuerte, protocolos de autenticación seguros y seguimos las mejores prácticas de la industria para la protección de datos. Todas nuestras aplicaciones están diseñadas con la seguridad como prioridad.',
      faq5Q: '¿Puedo usar las aplicaciones de CyberEco para mi organización o empresa?',
      faq5A: 'Sí, muchas de nuestras aplicaciones como Demos y Community Manager tienen versiones para empresas/organizaciones con características mejoradas para uso profesional.'
    },
    
    // ContactPage translations
    contactPage: {
      title: 'Contáctanos',
      subtitle: 'Nos encantaría saber de ti. Envíanos un mensaje y te responderemos lo antes posible.',
      nameLabel: 'Nombre',
      emailLabel: 'Correo Electrónico',
      subjectLabel: 'Asunto',
      messageLabel: 'Mensaje',
      submitButton: 'Enviar Mensaje',
      successMessage: '¡Tu mensaje ha sido enviado con éxito. Nos pondremos en contacto contigo pronto!',
      contactInfoTitle: 'Ponte en Contacto',
      emailContactLabel: 'Correo Electrónico',
      addressLabel: 'Dirección',
      socialTitle: 'Síguenos'
    },
    
    // DocumentationPage translations
    documentationPage: {
      title: 'Documentación',
      subtitle: 'Guías completas y documentación técnica para el ecosistema digital de CyberEco',
      searchPlaceholder: 'Buscar en la documentación...',
      gettingStartedTitle: 'Primeros Pasos con CyberEco',
      introductionTitle: 'Introducción',
      introductionText: '¡Bienvenido a la documentación de CyberEco! Esta guía te ayudará a comenzar con nuestro ecosistema digital. CyberEco ofrece un conjunto de soluciones digitales diseñadas para mejorar la colaboración financiera, el compromiso comunitario y la conectividad social, todo dentro de un marco centrado en el ser humano para una vida consciente, conectada y sostenible.',
      accountCreationTitle: 'Soberanía Digital',
      digitalSovereigntyText: 'En el núcleo de CyberEco está el principio de soberanía digital. Tú eres dueño de tu identidad, tus datos y tu narrativa. Todas nuestras aplicaciones están diseñadas con este principio en mente, asegurando que tu presencia digital te empodere, no te explote.',
      exploringSolutionsTitle: 'Explorando Nuestras Soluciones',
      exploringSolutionsText: 'CyberEco no es solo otra aplicación. Es un ecosistema digital modular — un sistema operativo para la vida — donde cada plataforma resuelve una necesidad real mientras contribuye a un todo mayor. Nuestras soluciones están organizadas en categorías que cubren diferentes aspectos de la vida, desde la gobernanza comunitaria hasta la sostenibilidad, desde las finanzas hasta la educación.',
      // Community & Governance section
      communityGovernanceTitle: 'Comunidad y Gobernanza',
      communityGovernanceNavItem: 'Comunidad y Gobernanza',
      demosTitle: 'Demos',
      demosDesc: 'Una plataforma de democracia digital participativa que permite la votación transparente y la toma de decisiones para organizaciones y vecindarios.',
      communityManagerTitle: 'Community Manager',
      communityManagerDesc: 'Herramientas avanzadas para crear, organizar y gobernar comunidades digitales o físicas con facilidad y transparencia.',
      myCommunityTitle: 'MyCommunity',
      myCommunityDesc: 'Una plataforma para descubrir recursos locales relevantes, eventos e iniciativas en tu entorno y fortalecer los lazos comunitarios.',
      conciliationTitle: 'Conciliación',
      conciliationDesc: 'Herramientas de resolución de conflictos con mediadores neutrales humanos o de IA para resolver disputas de manera justa y constructiva.',
      crowdPoolTitle: 'CrowdPool',
      crowdPoolDesc: 'Sistema para asignar tareas comunitarias o micro-trabajos con incentivos para una participación equilibrada.',
      
      // Finance & Economy section
      financeEconomyTitle: 'Finanzas y Economía Colaborativa',
      financeEconomyNavItem: 'Finanzas y Economía',
      justSplitTitle: 'JustSplit',
      justSplitAboutText: 'Una aplicación simple e intuitiva para seguimiento y compartición de gastos que ayuda a amigos, compañeros de habitación y grupos a gestionar fácilmente las finanzas compartidas.',
      myWealthTitle: 'MyWealth',
      myWealthDesc: 'Una plataforma integral para visualizar y controlar finanzas personales e inversiones en un solo lugar seguro.',
      myBusinessTitle: 'MyBusiness',
      myBusinessDesc: 'Una herramienta ligera para emprendedores que combina la gestión operativa y contable en una sola interfaz.',
      crowdFundTitle: 'CrowdFund',
      crowdFundDesc: 'Crea campañas de financiamiento colectivo para ideas, causas o productos con seguimiento transparente.',
      offerMeTitle: 'OfferMe',
      offerMeDesc: 'Encuentra ofertas locales verificadas, descuentos y promociones de negocios en tu comunidad.',
      
      // Sustainability & Home Life section
      sustainabilityHomeTitle: 'Sostenibilidad y Vida en el Hogar',
      sustainabilityHomeNavItem: 'Sostenibilidad y Hogar',
      plantopiaTitle: 'Plantopia',
      plantopiaAboutText: 'Una plataforma de jardinería inteligente que combina tecnología IoT con conocimientos sobre el cuidado de plantas para ayudar a los usuarios a cultivar jardines prósperos de manera sostenible.',
      ecoTulTitle: 'EcoTul',
      ecoTulDesc: 'Un recomendador curado de productos y servicios ecológicos evaluados por su impacto ambiental real.',
      myHomeTitle: 'MyHome',
      myHomeDesc: 'Una aplicación completa para organizar el mantenimiento del hogar, rastrear gastos y planificar mejoras para una vida sostenible.',
      // Education & Growth
      educationTitle: 'Educación y Crecimiento Personal',
      educationGrowthNavItem: 'Educación y Crecimiento',
      educationHubTitle: 'Education Hub',
      educationHubDesc: 'Una plataforma modular para acceder a rutas de aprendizaje y contenido educativo en un entorno orientado a la comunidad.',
      skillShareTitle: 'Skill Share',
      skillShareDesc: 'Una red colaborativa donde las personas pueden compartir y enseñar sus habilidades a otros en la comunidad.',
      habitsTitle: 'Habits',
      habitsDesc: 'Una herramienta para registrar y seguir hábitos para alcanzar objetivos personales y fomentar la mejora continua.',
      oneStepTitle: 'One Step',
      oneStepDesc: 'Un sistema de micro-acciones diseñado para ayudarte a avanzar hacia grandes metas con pequeños pasos manejables.',
      
      // API Reference
      apiReferenceTitle: 'Referencia de API',
      apiOverviewTitle: 'Descripción General',
      apiOverviewText: 'CyberEco proporciona APIs RESTful para todas nuestras aplicaciones, permitiendo a los desarrolladores integrar nuestros servicios en sus propias soluciones. Nuestras APIs utilizan métodos HTTP estándar y devuelven respuestas en formato JSON.',
      apiAuthTitle: 'Autenticación',
      apiAuthText: 'Todas las solicitudes a la API requieren autenticación usando tokens bearer OAuth 2.0. Para obtener un token, realiza una solicitud POST a nuestro endpoint de autenticación con tus credenciales de cliente.',
      apiRequestsTitle: 'Realizando Solicitudes a la API',
      apiRequestsText: 'Una vez que tengas tu token, inclúyelo en el encabezado de Autorización para todas las solicitudes subsiguientes. Nuestros endpoints de API siguen una estructura consistente para todas las aplicaciones.',
      
      // Key Documentation Pages section
      keyDocumentationPagesTitle: 'Páginas de Documentación Clave',
      platformPhilosophyTitle: 'Filosofía de la Plataforma',
      platformPhilosophyDesc: 'Soberanía digital, principios de diseño centrado en el ser humano, y nuestro compromiso con el empoderamiento del usuario.',
      decentralizedFutureTitle: 'Futuro Descentralizado',
      decentralizedFutureDesc: 'Visión a largo plazo para redes P2P, integración de blockchain y soberanía completa de datos.',
      developmentRoadmapTitle: 'Hoja de Ruta de Desarrollo',
      developmentRoadmapDesc: 'Hoja de ruta técnica detallada desde la arquitectura centralizada actual hasta el futuro descentralizado.',
      solutionsPortfolioTitle: 'Portafolio de Soluciones',
      solutionsPortfolioDesc: 'Visión completa de las soluciones actuales y la expansión del ecosistema planificada.',
      
      // Quick Start Guide section
      quickStartTitle: 'Inicio Rápido',
      step1Title: 'Crea tu Cuenta',
      step1Desc: 'Regístrate para una cuenta de CyberEco Hub para acceder a todas las aplicaciones con una sola identidad.',
      signUpNow: 'Regístrate Ahora',
      step2Title: 'Explora las Aplicaciones',
      step2Desc: 'Comienza con JustSplit para compartir gastos, luego descubre nuestro ecosistema en crecimiento.',
      exploreApps: 'Explorar Aplicaciones',
      step3Title: 'Únete a la Comunidad',
      step3Desc: 'Conecta con otros usuarios y contribuye a nuestra visión de tecnología centrada en el ser humano.',
      joinCommunity: 'Únete a la Comunidad',
      
      // Learning Path section
      learningPathTitle: 'Elige tu Ruta de Aprendizaje',
      businessUserPath: 'Usuario de Negocio',
      businessUserDesc: 'Aprende a usar las aplicaciones para colaboración en equipo y gestión de gastos.',
      developerPath: 'Desarrollador',
      developerDesc: 'Integración técnica, uso de API y arquitectura de la plataforma.',
      communityPath: 'Líder Comunitario',
      communityDesc: 'Gobernanza, soberanía digital y filosofía de la plataforma.',
      
      // Key Concepts section
      keyConceptsTitle: 'Conceptos Clave y Arquitectura',
      digitalSovereigntyConceptTitle: 'Soberanía Digital',
      digitalSovereigntyConceptText: 'En el núcleo de CyberEco está el principio de soberanía digital - la idea de que los individuos deben poseer y controlar su identidad digital y datos. Nuestra arquitectura asegura que:',
      digitalSovereigntyPoint1: 'Los usuarios mantienen la propiedad de sus datos personales',
      digitalSovereigntyPoint2: 'Las aplicaciones están diseñadas para ser interoperables y controladas por el usuario',
      digitalSovereigntyPoint3: 'Ninguna entidad única tiene control monopolístico sobre la información del usuario',
      digitalSovereigntyPoint4: 'La privacidad está integrada en el diseño central, no agregada como una idea tardía',
      
      ecosystemArchitectureTitle: 'Arquitectura del Ecosistema',
      ecosystemArchitectureText: 'CyberEco está construido como un ecosistema modular donde cada aplicación sirve un propósito específico mientras contribuye al todo mayor:',
      architecturePoint1: 'Hub: Gestión central de autenticación e identidad',
      architecturePoint2: 'Capa de Aplicación: Aplicaciones especializadas para diferentes dominios de vida',
      architecturePoint3: 'Capa de Datos: Almacenamiento y compartición de datos controlada por el usuario',
      architecturePoint4: 'Capa de Integración: APIs y protocolos para interacción perfecta',
      
      humanCenteredDesignTitle: 'Diseño Centrado en el Ser Humano',
      humanCenteredDesignText: 'Cada aplicación en el ecosistema CyberEco está diseñada con el bienestar humano y la conexión auténtica en su centro. Esto significa:',
      humanCenteredPoint1: 'Minimizar patrones de diseño adictivos',
      humanCenteredPoint2: 'Promover relaciones y actividades del mundo real',
      humanCenteredPoint3: 'Apoyar el crecimiento individual y la construcción comunitaria',
      humanCenteredPoint4: 'Respetar la atención humana y la salud mental',
      
      communityDrivenTitle: 'Desarrollo Impulsado por la Comunidad',
      communityDrivenText: 'Nuestro proceso de desarrollo está guiado por las necesidades reales de la comunidad en lugar de la maximización de beneficios. Priorizamos:',
      communityDrivenPoint1: 'Desarrollo de código abierto donde sea posible',
      communityDrivenPoint2: 'Retroalimentación e involucramiento de la comunidad en el desarrollo de características',
      communityDrivenPoint3: 'Hojas de ruta transparentes y procesos de toma de decisiones',
      communityDrivenPoint4: 'Modelos de negocio sostenibles que se alineen con los intereses del usuario',
      
      // Core Documentation navigation
      coreDocumentationTitle: 'Documentación Central',
      platformPhilosophyNav: 'Filosofía de la Plataforma - Soberanía Digital y Diseño Centrado en el Ser Humano',
      decentralizedFutureNav: 'Futuro Descentralizado - Redes P2P y Economía de Tokens',
      developmentRoadmapNav: 'Hoja de Ruta de Desarrollo - Evolución Técnica e Hitos',
      solutionsPortfolioNav: 'Portafolio de Soluciones - Soluciones Actuales y Futuras',
      
      // Core Documentation simplified pages
      philosophyDocTitle: 'Filosofía de la Plataforma',
      philosophyDocSummary: 'CyberEco está construido sobre principios de soberanía digital, diseño centrado en el ser humano y tecnología sostenible. Creemos que la tecnología debe empoderar a individuos y comunidades, no explotarlos.',
      philosophyDocPreview: 'Nuestra filosofía se centra en tres principios fundamentales: Soberanía Digital (los usuarios poseen sus datos), Diseño Centrado en el Ser Humano (la tecnología sirve al bienestar humano), y Desarrollo Sostenible (pensamiento a largo plazo sobre ganancias a corto plazo).',
      viewFullPhilosophy: 'Ver Filosofía Completa',
      
      visionDocTitle: 'Visión del Futuro Descentralizado',
      visionDocSummary: 'Para 2030+, CyberEco hará la transición a una arquitectura descentralizada revolucionaria con redes P2P móviles, soberanía completa de datos y economía basada en tokens.',
      visionDocPreview: 'Nuestra visión incluye: Redes P2P Móviles (smartphones como nodos de red), Soberanía Completa de Datos (garantías criptográficas), Economía de Tokens (recompensas por participación), y Accesibilidad Global (plataforma resistente a la censura).',
      viewFullVision: 'Ver Visión Completa',
      
      roadmapDocTitle: 'Hoja de Ruta de Desarrollo',
      roadmapDocSummary: 'Nuestro viaje desde las aplicaciones centralizadas actuales hasta un ecosistema completamente descentralizado, abarcando cuatro fases de 2024 a 2030+.',
      roadmapDocPreview: 'Fase 1: Fundación (2024-2025) - Aplicaciones centrales. Fase 2: Crecimiento (2025-2027) - Apps prioritarias. Fase 3: Integración (2027-2030) - Ecosistema. Fase 4: Descentralización (2030+) - Redes P2P.',
      viewFullRoadmap: 'Ver Hoja de Ruta Completa',
      
      portfolioDocTitle: 'Portafolio de Soluciones',
      portfolioDocSummary: 'Visión completa de nuestras soluciones actuales y expansión del ecosistema planificada cubriendo todos los aspectos de la vida digital.',
      portfolioDocPreview: 'Actuales: Hub (autenticación), JustSplit (compartir gastos), Website. Prioritarias: Somos (raíces familiares), Demos (gobernanza), Plantopia (jardinería). Futuras: 30+ aplicaciones en finanzas, comunidad, educación, salud y sostenibilidad.',
      viewFullPortfolio: 'Ver Portafolio Completo',
      
      // Redirect card content
      keyPrinciples: 'Principios Clave',
      visionComponents: 'Componentes de la Visión',
      developmentPhases: 'Fases de Desarrollo',
      solutionCategories: 'Categorías de Soluciones',
      completePhilosophyDoc: 'Documentación Completa de Filosofía',
      completePhilosophyDesc: 'Para la filosofía completa y detallada incluyendo nuestro compromiso con la soberanía digital, principios de diseño centrado en el ser humano y prácticas de desarrollo sostenible.',
      completeVisionDoc: 'Documentación Completa de Visión',
      completeVisionDesc: 'Explora la visión completa del futuro descentralizado incluyendo arquitectura técnica, cronología y detalles de implementación.',
      completeRoadmapDoc: 'Documentación Completa de Hoja de Ruta',
      completeRoadmapDesc: 'Ve la hoja de ruta de desarrollo detallada incluyendo evolución técnica, hitos y áreas de enfoque actual.',
      completeSolutionsPortfolio: 'Portafolio Completo de Soluciones',
      completeSolutionsDesc: 'Explora nuestro portafolio completo de soluciones con descripciones detalladas, características y estado de todas las aplicaciones actuales y planificadas.',
      
      // Doc type tags
      coreDocument: 'Documento Central',
      futureVision: 'Visión Futura',
      developmentPlan: 'Plan de Desarrollo',
      solutionsOverview: 'Resumen de Soluciones',
      
      // Enhanced content components
      digitalSovereigntyPrinciple: 'Soberanía Digital',
      digitalSovereigntyDesc: 'Los usuarios poseen sus datos y controlan su identidad digital',
      humanCenteredPrinciple: 'Diseño Centrado en el Ser Humano',
      humanCenteredDesc: 'La tecnología sirve al bienestar humano y la conexión auténtica',
      sustainablePrinciple: 'Desarrollo Sostenible',
      sustainableDesc: 'Pensamiento a largo plazo sobre ganancias a corto plazo',
      
      // Vision components
      mobileP2PComponent: 'Redes P2P Móviles',
      mobileP2PDesc: 'Smartphones como nodos de red eliminando servidores centrales',
      dataSovereigntyComponent: 'Soberanía Completa de Datos',
      dataSovereigntyDesc: 'Garantías criptográficas para el control de datos del usuario',
      tokenEconomicsComponent: 'Economía de Tokens',
      tokenEconomicsDesc: 'Recompensas por participación en contribuciones de red',
      globalAccessComponent: 'Accesibilidad Global',
      globalAccessDesc: 'Plataforma resistente a la censura mundialmente',
      
      // Development phases
      foundationPhase: 'Fundación (2024-2025)',
      foundationDesc: 'Establecimiento de aplicaciones centrales y base de usuarios',
      growthPhase: 'Crecimiento (2025-2027)',
      growthDesc: 'Aplicaciones prioritarias y expansión del ecosistema',
      integrationPhase: 'Integración (2027-2030)',
      integrationDesc: 'Ecosistema interconectado integral',
      decentralizationPhase: 'Descentralización (2030+)',
      decentralizationDesc: 'Redes P2P completamente descentralizadas',
      
      // Solution categories
      currentSolutions: 'Soluciones Actuales',
      priorityApplications: 'Aplicaciones Prioritarias',
      futureEcosystem: 'Ecosistema Futuro',
      thirtyPlusApplications: '30+ Aplicaciones',
      
      // Navigation items
      gettingStartedNavTitle: 'Primeros Pasos',
      introductionNavItem: 'Introducción',
      applicationsNavTitle: 'Categorías de Soluciones',
      developerNavTitle: 'Desarrollador',
      apiReferenceNavItem: 'Referencia de API'
    },
    
    // FaqPage translations
    faqPage: {
      title: 'Preguntas Frecuentes',
      subtitle: 'Encuentra respuestas a preguntas comunes sobre CyberEco y nuestras aplicaciones',
      generalQuestionsTitle: 'Preguntas Generales',
      technicalQuestionsTitle: 'Preguntas Técnicas',
      businessEnterpriseTitle: 'Empresas y Organizaciones',
      enterpriseQuestion: '¿Ofrecen soluciones empresariales?',
      enterpriseAnswer: 'Sí, proporcionamos soluciones empresariales personalizadas para organizaciones más grandes. Por favor, contacta a nuestro equipo de ventas para más información sobre precios y características empresariales.',
      contactText: '¿Todavía tienes preguntas? Estamos aquí para ayudarte.',
      contactButton: 'Contactar Soporte'
    },
    
    // SupportPage translations
    supportPage: {
      title: 'Centro de Soporte',
      subtitle: 'Obtén la asistencia que necesitas para resolver problemas y aprovechar al máximo las aplicaciones de CyberEco',
      commonIssuesTitle: 'Problemas Comunes',
      commonIssuesText: 'Encuentra soluciones rápidas a los problemas más frecuentes con nuestras aplicaciones.',
      viewCommonIssues: 'Ver Problemas Comunes',
      knowledgeBaseTitle: 'Base de Conocimiento',
      knowledgeBaseText: 'Accede a nuestras guías detalladas y documentación técnica para todas las aplicaciones de CyberEco.',
      browseKnowledgeBase: 'Explorar Base de Conocimiento',
      communityForumsTitle: 'Foros Comunitarios',
      communityForumsText: 'Únete a discusiones, comparte experiencias y encuentra soluciones con otros usuarios en nuestros foros comunitarios.',
      visitForums: 'Visitar Foros',
      liveChatTitle: 'Chat en Vivo',
      liveChatText: 'Conéctate con nuestro equipo de soporte en tiempo real para obtener asistencia inmediata con problemas urgentes.',
      startChat: 'Iniciar Chat',
      contactSupportTitle: 'Contactar Soporte',
      nameLabel: 'Tu Nombre',
      emailLabel: 'Correo Electrónico',
      subjectLabel: 'Asunto',
      productLabel: 'Producto',
      selectProduct: 'Selecciona un producto',
      messageLabel: 'Mensaje',
      submitRequest: 'Enviar Solicitud'
    },
    
    // PrivacyPage translations
    privacyPage: {
      title: 'Política de Privacidad',
      subtitle: 'Cómo recopilamos, usamos y protegemos tu información',
      introTitle: 'Introducción',
      introText: 'CyberEco ("nosotros", "nuestro", o "nos") está comprometido a proteger tu privacidad. Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y salvaguardamos tu información cuando visitas nuestro sitio web o usas nuestras aplicaciones.',
      collectionTitle: 'Información que Recopilamos',
      collectionText: 'Podemos recopilar información sobre ti de diversas formas. La información que podemos recopilar incluye:',
      useTitle: 'Uso de tu Información',
      useText: 'Tener información precisa sobre ti nos permite proporcionarte una experiencia fluida, eficiente y personalizada. Podemos usar la información recopilada sobre ti para:',
      disclosureTitle: 'Divulgación de tu Información',
      disclosureText: 'Podemos compartir información que hemos recopilado sobre ti en ciertas situaciones. Tu información puede ser divulgada de la siguiente manera:',
      securityTitle: 'Seguridad de tu Información',
      securityText: 'Utilizamos medidas administrativas, técnicas y físicas para ayudar a proteger tu información personal. Si bien hemos tomado medidas razonables para proteger la información personal que nos proporcionas, ten en cuenta que ninguna medida de seguridad es perfecta o impenetrable.',
      contactTitle: 'Contáctanos',
      contactText: 'Si tienes preguntas o inquietudes sobre esta Política de Privacidad, por favor contáctanos en privacy@cybereco.io.',
      lastUpdated: 'Última actualización: Enero 2023'
    },
    
    // TermsPage translations
    termsPage: {
      title: 'Términos de Servicio',
      subtitle: 'Por favor lee estos términos de servicio cuidadosamente antes de usar nuestra plataforma',
      agreementTitle: '1. Acuerdo de Términos',
      agreementText: 'Al acceder o usar el sitio web o las aplicaciones de CyberEco, aceptas estar sujeto a estos Términos de Servicio y todas las leyes y regulaciones aplicables. Si no estás de acuerdo con alguno de estos términos, se te prohíbe usar o acceder a nuestros servicios.',
      licenseTitle: '2. Licencia de Uso',
      licenseText: 'Se concede permiso para acceder temporalmente a los materiales en el sitio web o aplicaciones de CyberEco solo para visualización transitoria personal y no comercial. Esta es la concesión de una licencia, no una transferencia de título, y bajo esta licencia no puedes:',
      accountTitle: '3. Responsabilidades de la Cuenta',
      accountText: 'Si creas una cuenta con nosotros, eres responsable de mantener la confidencialidad de tu cuenta y contraseña, y de restringir el acceso a tu computadora. Aceptas la responsabilidad por todas las actividades que ocurran bajo tu cuenta o contraseña.',
      liabilityTitle: '4. Limitación de Responsabilidad',
      liabilityText: 'En ningún caso CyberEco o sus proveedores serán responsables por daños (incluyendo, sin limitación, daños por pérdida de datos o beneficios, o debido a interrupción del negocio) derivados del uso o la imposibilidad de usar los materiales en el sitio web de CyberEco, incluso si CyberEco o un representante autorizado de CyberEco ha sido notificado oralmente o por escrito de la posibilidad de tal daño.',
      accuracyTitle: '5. Precisión de los Materiales',
      accuracyText: 'Los materiales que aparecen en el sitio web o aplicaciones de CyberEco podrían incluir errores técnicos, tipográficos o fotográficos. CyberEco no garantiza que ninguno de los materiales en su sitio web sean precisos, completos o actuales.',
      linksTitle: '6. Enlaces',
      linksText: 'CyberEco no ha revisado todos los sitios vinculados a su sitio web y no es responsable del contenido de ningún sitio vinculado. La inclusión de cualquier enlace no implica respaldo por parte de CyberEco del sitio. El uso de cualquier sitio web vinculado es bajo el propio riesgo del usuario.',
      modificationsTitle: '7. Modificaciones',
      modificationsText: 'CyberEco puede revisar estos términos de servicio en cualquier momento sin previo aviso. Al usar este sitio web o nuestras aplicaciones, aceptas estar sujeto a la versión actual de estos Términos de Servicio.',
      contactTitle: '8. Contáctanos',
      contactText: 'Si tienes alguna pregunta sobre estos Términos, por favor contáctanos en terms@cybereco.io.',
      lastUpdated: 'Última actualización: Enero 2023'
    },
    
    // Legacy compatibility - keeping simplified keys for components that may still use them
    home: 'Inicio',
    about: 'Acerca de',
    features: 'Características',
    solutions: 'Soluciones',
    contact: 'Contacto',
    portfolio: 'Portafolio',
    help: 'Ayuda',
    
    // Hero section
    heroTitle: 'Soluciones Digitales para un Mundo Conectado',
    heroSubtitle: 'CyberEco crea aplicaciones innovadoras que mejoran la forma en que las personas gestionan las finanzas, participan en comunidades y se conectan entre sí en la era digital.',
    exploreSolutions: 'Explorar Soluciones',
    learnAboutUs: 'Conócenos',
    
    // Features section
    featuresTitle: 'Nuestros Principios Fundamentales',
    featuresDescription: 'Construyendo tecnología que sirve a las personas, no al revés',
    featureDecentralizedTitle: 'Descentralizado por Diseño',
    featureDecentralizedDesc: 'Construido para la verdadera soberanía digital, permitiendo a los usuarios poseer y controlar sus datos.',
    featureEthicalTitle: 'Tecnología Ética',
    featureEthicalDesc: 'Priorizando el bienestar y la privacidad del usuario sobre las métricas de engagement y la recolección de datos.',
    featureCommunityTitle: 'Impulsado por la Comunidad',
    featureCommunityDesc: 'Desarrollado con comunidades reales para resolver problemas reales, no para maximizar ganancias.',
    featureOpenTitle: 'Código Abierto',
    featureOpenDesc: 'Transparente, auditable y construido sobre estándares abiertos para el beneficio de todos.',
    
    // Mission section
    missionTitle: 'Nuestra Misión',
    missionDescription: 'Creemos en la tecnología que mejora la conexión humana y el bienestar. Nuestra misión es crear herramientas digitales que empoderen a las comunidades, respeten la privacidad y pongan a las personas primero.',
    missionDescription2: 'Al construir soluciones éticas, sostenibles e impulsadas por la comunidad, estamos trabajando hacia un futuro digital que sirva a la humanidad, no al revés.',
    
    // Solutions section
    solutionsTitle: 'Nuestras Soluciones',
    solutionsDescription: 'Descubre nuestro creciente ecosistema de aplicaciones centradas en la privacidad',
    learnMore: 'Saber más',
    viewAllSolutions: 'Ver Todas las Soluciones',
    
    // CTA section
    ctaTitle: '¿Listo para unirte a la revolución digital?',
    ctaDescription: 'Experimenta tecnología que respeta tu privacidad y sirve a tu comunidad',
    exploreApps: 'Explorar Nuestras Apps',
    getInTouch: 'Contáctanos',
    
    // Footer
    footerTagline: 'Soluciones digitales para un mundo conectado',
    company: 'Empresa',
    support: 'Soporte',
    privacyPolicy: 'Política de Privacidad',
    termsOfService: 'Términos de Servicio',
    rightsReserved: 'Todos los derechos reservados.'
  }
};

// Flatten the nested translations to match the expected TranslationsMap interface
const translations: TranslationsMap = {
  en: flattenTranslations(nestedTranslations.en),
  es: flattenTranslations(nestedTranslations.es)
};

export default translations;