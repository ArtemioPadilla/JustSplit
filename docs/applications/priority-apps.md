# 🌟 CyberEco Priority Applications

> Technical specifications and integration details for the next wave of CyberEco applications: Somos, Demos, and Plantopia.

## Overview

Following the successful development of JustSplit and Hub, the CyberEco platform is expanding with three priority applications that further our mission of building a human-centered digital ecosystem. These applications were selected based on community impact, technical feasibility, and alignment with our core values.

## 📱 Priority Applications

### 🌱 Somos - Community Roots Explorer

**Purpose**: Help people discover, preserve, and share their community and family to find themselfs within their environment, and rediscover the relationships, heritage and cultural roots.

#### Technical Specifications

| Aspect | Details |
|--------|---------|
| **Framework** | Next.js with App Router |
| **Database** | Firebase Firestore with hierarchical data model |
| **Authentication** | Hub integration via cross-project Firebase |
| **Storage** | Firebase Storage for media preservation |
| **Key Libraries** | D3.js (visualizations), React Flow (family trees) |

#### Core Features

1. **Family Tree Visualization**
   - Interactive, customizable family tree mapping
   - Relationship visualization with flexible layouts
   - Multi-generational exploration

2. **Cultural Heritage Preservation**
   - Cultural traditions and customs documentation
   - Language and dialect preservation tools
   - Family recipes and cultural practices archive

3. **Memory Collection**
   - Story capturing with text, audio, and video
   - Photo archiving with AI tagging and recognition
   - Memory timeline with correlation to historical events

4. **Community Connections**
   - Privacy-controlled family connections
   - Cultural group affiliations and shared heritage
   - Collaborative family history building

5. **Community Discovery**
   - Find yourself within your community, understand where you stand and others perspectives.

#### Integration Points

- **Hub**: Authentication and profile management
- **JustSplit**: Optional integration for family event expenses
- **Future - Demos**: Cultural community governance
- **Future - Plantopia**: Family recipes with plant connections

#### Data Models

```typescript
interface FamilyMember {
  id: string;
  name: string;
  birthDate?: Date;
  birthPlace?: string;
  deathDate?: Date;
  deathPlace?: string;
  bio?: string;
  profileImage?: string;
  relationships: Relationship[];
  culturalBackground?: CulturalBackground[];
  memories: Memory[];
  userId: string; // Connection to Hub user
}

interface Relationship {
  type: 'parent' | 'child' | 'sibling' | 'spouse' | 'other';
  toMemberId: string;
  relationshipDescription?: string;
  startDate?: Date;
  endDate?: Date;
}

interface Memory {
  id: string;
  title: string;
  description?: string;
  date?: Date;
  location?: string;
  mediaItems: MediaItem[];
  tags: string[];
  contributors: string[]; // User IDs
  isPrivate: boolean;
}

interface CulturalBackground {
  culture: string;
  region?: string;
  language?: string;
  traditions?: Tradition[];
  significance: string;
  timeframe?: string;
}
```

---

### 🗳️ Demos - Community Governance

**Purpose**: Enable transparent, collective decision-making and governance for communities of any size.

#### Technical Specifications

| Aspect | Details |
|--------|---------|
| **Framework** | Next.js with App Router |
| **Database** | Firebase Firestore with real-time updates |
| **Authentication** | Hub integration with role-based permissions |
| **Security** | Multi-level verification for vote integrity |
| **Key Libraries** | Chart.js (visualizations), Socket.io (real-time) |

#### Core Features

1. **Proposal System**
   - Structured proposal creation and submission
   - Version tracking and collaborative editing
   - Impact assessment tools
   - Discussion and commentary

2. **Voting Mechanisms**
   - Multiple voting methods (majority, ranked choice, etc.)
   - Secure, verifiable vote casting
   - Anonymous voting with cryptographic verification
   - Delegated voting (proxy system)

3. **Decision Tracking**
   - Decision implementation tracking
   - Historical record of community decisions
   - Outcome evaluation and impact measurement
   - Timeline visualization of governance

4. **Community Management**
   - Role-based governance structure
   - Community rules and constitutions
   - Reputation systems and trust metrics
   - Moderation tools and conflict resolution

#### Integration Points

- **Hub**: Authentication and permissions management
- **JustSplit**: Community treasury and expense governance
- **Future - Somos**: Cultural community decision-making
- **Future - Plantopia**: Community garden planning

#### Data Models

```typescript
interface Community {
  id: string;
  name: string;
  description: string;
  creationDate: Date;
  members: Member[];
  governanceSettings: GovernanceSettings;
  proposals: Proposal[];
  decisions: Decision[];
  rules: Rule[];
}

interface Member {
  userId: string; // Connection to Hub user
  joinDate: Date;
  roles: Role[];
  reputationScore: number;
  activity: ActivityMetric;
  delegations: Delegation[];
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  author: string; // User ID
  creationDate: Date;
  category: string;
  status: 'draft' | 'submitted' | 'discussion' | 'voting' | 'approved' | 'rejected' | 'implemented';
  versionHistory: ProposalVersion[];
  votes: Vote[];
  comments: Comment[];
  attachments: Attachment[];
  impactAssessment?: ImpactAssessment;
}

interface Vote {
  userId: string;
  timestamp: Date;
  choice: any; // Depends on voting method
  weight: number;
  verificationHash: string; // For integrity verification
  delegatedBy?: string[]; // If vote represents delegated votes
}

interface GovernanceSettings {
  votingMethods: VotingMethod[];
  quorumRequirements: number;
  proposalLifecycle: ProposalStage[];
  privacySettings: PrivacySettings;
  roleDefinitions: Role[];
}
```

---

### 🌿 Plantopia - Smart Gardening

**Purpose**: Support plant enthusiasts with tools for plant care, community knowledge sharing, and sustainable gardening.

#### Technical Specifications

| Aspect | Details |
|--------|---------|
| **Framework** | Next.js with App Router |
| **Database** | Firebase Firestore with geo-indexing |
| **Authentication** | Hub integration |
| **Storage** | Firebase Storage for plant images |
| **Key Libraries** | React Native modules (for mobile), leaflet.js (for mapping) |

#### Core Features

1. **Plant Care Management**
   - Personal plant collection tracking
   - Care schedule and reminders
   - Growth and health monitoring
   - Seasonal care recommendations

2. **Knowledge Base**
   - Comprehensive plant database
   - Growing guides and care instructions
   - Community-contributed knowledge
   - Local growing conditions and climate adaptation

3. **Community Engagement**
   - Plant swapping and sharing marketplace
   - Local gardening community groups
   - Expert Q&A and problem solving
   - Collaborative gardens and projects

4. **Sustainable Gardening**
   - Ecological impact tracking
   - Native plant recommendations
   - Resource efficiency monitoring
   - Biodiversity encouragement

#### Integration Points

- **Hub**: Authentication and community membership
- **JustSplit**: Garden expense sharing and supply costs
- **Future - Demos**: Community garden governance
- **Future - Somos**: Family heritage plants and traditions

#### Data Models

```typescript
interface UserGarden {
  id: string;
  userId: string; // Connection to Hub user
  name: string;
  description?: string;
  location: GeoLocation;
  climate: ClimateData;
  plants: PlantInstance[];
  growingConditions: GrowingConditions;
  careSchedule: CareEvent[];
}

interface PlantInstance {
  id: string;
  plantSpeciesId: string; // Reference to plant database
  nickname?: string;
  plantedDate: Date;
  location: 'indoor' | 'outdoor' | 'greenhouse';
  position?: GeoPosition; // Within garden
  growth: GrowthRecord[];
  health: HealthRecord[];
  careHistory: CareEvent[];
  images: PlantImage[];
  notes: Note[];
}

interface PlantSpecies {
  id: string;
  scientificName: string;
  commonNames: string[];
  family: string;
  careRequirements: CareRequirements;
  growthHabits: GrowthHabits;
  idealConditions: IdealConditions;
  propagationMethods: PropagationMethod[];
  nativeRegions: string[];
  sustainabilityMetrics: SustainabilityMetrics;
  commonProblems: PlantProblem[];
}

interface CareEvent {
  id: string;
  plantId: string;
  eventType: 'watering' | 'fertilizing' | 'pruning' | 'repotting' | 'harvesting' | 'treatment' | 'other';
  scheduledDate: Date;
  completionDate?: Date;
  notes?: string;
  images?: PlantImage[];
  recurrence?: Recurrence;
}

interface CommunityInteraction {
  id: string;
  type: 'swap' | 'share' | 'question' | 'advice' | 'event';
  userId: string;
  title: string;
  description: string;
  creationDate: Date;
  location?: GeoLocation;
  plant?: PlantSpecies;
  responses: Response[];
  status: 'active' | 'completed' | 'cancelled';
}
```

---

## 🔄 Integration Architecture

### Cross-Application Authentication

All priority applications will integrate with CyberEco Hub for authentication using Firebase Authentication with the following flow:

1. User signs in through Hub (primary authentication point)
2. Hub generates a custom Firebase token for the target application
3. Target application exchanges the custom token for an application-specific session
4. User profile information is synchronized through Firestore with appropriate security rules

### Data Sharing & Privacy

1. **User-Controlled Sharing**
   - Default: No cross-app data sharing
   - Explicit user consent required for all sharing
   - Granular permission controls for each data type

2. **Shared Data Storage**
   - Hub maintains master user profile
   - Application-specific data in separate Firestore collections
   - Cross-references using consistent user IDs

3. **Privacy Implementation**
   ```typescript
   interface CrossAppPermission {
     sourceApp: 'hub' | 'justsplit' | 'somos' | 'demos' | 'plantopia';
     targetApp: 'hub' | 'justsplit' | 'somos' | 'demos' | 'plantopia';
     dataTypes: string[]; // What data can be shared
     expirationDate?: Date; // Optional time limit
     accessLevel: 'read' | 'write' | 'read-write';
     createdAt: Date;
     lastModified: Date;
   }
   ```

## 🏗️ NX Workspace Integration

Each priority application will be added to the NX monorepo with the following structure:

```
cybereco-monorepo/
├── apps/
│   ├── hub/                # Existing Hub application
│   ├── justsplit/          # Existing JustSplit application
│   ├── somos/              # Family roots explorer application
│   ├── demos/              # Community governance application
│   └── plantopia/          # Smart gardening application
├── libs/
│   ├── shared-types/       # Expanded to include new app types
│   ├── firebase-config/    # Updated for multi-project config
│   ├── ui-components/      # Common UI components for all apps
│   └── app-specific-libs/  # Specialized shared libraries
└── firebase/
    ├── hub/
    ├── justsplit/
    ├── somos/
    ├── demos/
    └── plantopia/
```

## 📅 Implementation Timeline

| Application | Design Phase | Development | Testing | Launch |
|-------------|--------------|-------------|---------|--------|
| **Somos** | Q3 2025 | Q4 2025 | Q1 2026 | Q2 2026 |
| **Demos** | Q3 2025 | Q4 2025-Q1 2026 | Q1-Q2 2026 | Q2 2026 |
| **Plantopia** | Q4 2025 | Q1-Q2 2026 | Q2 2026 | Q3 2026 |

## 🎯 Success Metrics

### Somos
- **User Adoption**: 5,000 active families in first six months
- **Content Creation**: Average 25 memories per family
- **Engagement**: 65% monthly active user retention

### Demos
- **Communities Created**: 1,000 active communities in first six months
- **Decision Making**: Average 15 proposals per month across all communities
- **Participation**: 70% of community members participating in votes

### Plantopia
- **Plant Tracking**: 10,000 users tracking 50,000+ plants in first six months
- **Knowledge Base**: 5,000 community contributions to plant knowledge
- **Community Activity**: 2,500 plant shares/swaps facilitated

## 🔗 Related Documentation

- [Application Matrix](../planning/app-matrix.md) - Overview of all CyberEco applications
- [Platform Roadmap](../ROADMAP.md) - Complete platform development timeline
- [Integration Architecture](../architecture/nx-monorepo-architecture.md) - NX monorepo structure
- [Data Models](../api/data-models-nx-comprehensive.md) - Existing data models for Hub and JustSplit