# CyberEco Platform Documentation

Welcome to the CyberEco Platform documentation! This comprehensive NX monorepo contains multiple applications designed for conscious, connected, and sustainable digital living.

## 🌟 Platform Overview

CyberEco is a human-centered digital ecosystem — an operating system for life — where each platform solves a real need while contributing to a greater whole.

### Platform Philosophy

We believe your digital presence should empower you, not exploit you. Your identity should belong to you. Your data should serve you. Your actions should connect you with others meaningfully.

### Core Values

- **🔐 Digital Sovereignty** - You own your identity, your data, your narrative
- **🌱 Wellbeing by Design** - Tech must serve your life — not consume it
- **🔗 Interconnection with Purpose** - Every platform is useful alone, but transformative together
- **🤝 Community is Core** - We build tools for individuals, powered by the collective
- **📖 Open by Nature** - Modular, transparent, and interoperable wherever possible

### Current Applications
- **Website** - Main CyberEco marketing website and application hub
- **Hub** - Central authentication and app launcher
- **JustSplit** - Comprehensive expense splitting application

### Priority Applications (Next Wave)
- **Somos** - Family roots exploration and cultural heritage platform
- **Demos** - Transparent voting and community decision-making platform
- **Plantopia** - Smart gardening platform with plant care knowledge

### Secondary Applications (Future)
- **Nexus** - Digital wellbeing social media hub
- **MyWealth** - Personal finance platform
- **CrowdPool** - Community tasks and collaboration system

> 🔮 **Future Vision**: CyberEco is evolving toward a fully decentralized ecosystem powered by mobile peer-to-peer networks, blockchain technology, and privacy-first cryptographic architecture. Our roadmap spans multiple applications including Somos, Demos, and Plantopia, building toward our decentralized future. [Learn more about our vision →](./vision/decentralized-future.md)

## 📚 Documentation Structure

### 📄 Legal & Community
- **[CYBERECO-LICENSE.md](../CYBERECO-LICENSE.md)** - CyberEco Digital Sovereignty License
- **[CONTRIBUTOR-AGREEMENT.md](../CONTRIBUTOR-AGREEMENT.md)** - Contributor legal agreement
- **[PHILOSOPHY.md](./PHILOSOPHY.md)** - Platform philosophy and principles
- **[Licensing](./development/licensing.md)** - License and agreement explanations

### 💻 Applications Documentation
- **[Applications Overview](./applications/README.md)** - Complete application ecosystem documentation
- **[Priority Applications](./applications/priority-apps.md)** - Detailed specifications for Somos, Demos, and Plantopia
- **[Application Matrix](./planning/app-matrix.md)** - Comprehensive overview of all CyberEco applications

### 🏗️ Architecture Documentation
- **[System Overview](./architecture/overview.md)** - High-level platform architecture
- **[NX Monorepo Architecture](./architecture/nx-architecture-consolidated.md)** - Complete NX monorepo structure and configuration
- **[Technical Design](./architecture/technical-design.md)** - Detailed technical specifications
- **[Diagrams](./architecture/diagrams/)** - Architecture diagrams and visualizations

### 🛠️ Development Guides
- **[Getting Started](./development/getting-started.md)** - Comprehensive setup guide
- **[Development Workflow](./development/development-workflow.md)** - Daily development practices
- **[Contributing](./development/contributing.md)** - Contribution guidelines
- **[Licensing](./development/licensing.md)** - Platform license and contributor agreement
- **[Code Style](./development/code-style.md)** - Coding standards and best practices

### 🚀 Deployment Documentation
- **[Firebase Deployment](./deployment/firebase-deployment.md)** - Production deployment guide
- **[Low-Cost Optimization](./deployment/low-cost-optimization.md)** - Cost optimization strategies
- **[On-Premises Deployment](./deployment/on-premises-deployment.md)** - Self-hosting options

### 📡 API & Integration
- **[Data Models Overview](./api/README.md)** - Navigation index for all data model documentation
- **[Comprehensive Data Models](./api/data-models-nx-comprehensive.md)** - Complete platform-wide data models for NX monorepo
- **[Legacy Data Models](./api/data-models.md)** - Original data models reference
- **[Endpoints](./api/endpoints.md)** - API reference and documentation
- **[Authentication](./api/authentication.md)** - Cross-app authentication flows

### 🎨 Design System
- **[UI Components](./design/ui-components.md)** - Shared component library
- **[Style Guide](./design/style-guide.md)** - NX multiapp design system and patterns
- **[Wireframes](./design/wireframes.md)** - UI mockups and user flows

### 📋 Project Planning
- **[Project Roadmap](./planning/project-roadmap.md)** - Feature roadmap and timeline
- **[Milestones](./planning/milestones.md)** - Release milestones and goals

### 📱 Application-Specific Documentation
- **[JustSplit App Docs](../apps/justsplit/docs/README.md)** - JustSplit-specific requirements, features, and implementation details

### 🔮 Future Vision & Strategy
- **[Vision Overview](./vision/README.md)** - Navigation index for vision documents
- **[Decentralized Future Vision](./vision/decentralized-future.md)** - Comprehensive roadmap for blockchain-based, privacy-first ecosystem
- **[Platform Roadmap](./ROADMAP.md)** - Complete platform evolution timeline
- **[Application Matrix](./planning/app-matrix.md)** - Full ecosystem of planned applications

## 🚀 Quick Start

### Prerequisites
```bash
# Install Node.js 18+ and global tools
npm install -g firebase-tools nx
```

### Development Setup
```bash
# Clone and install dependencies
git clone <repository-url>
cd cybereco-monorepo
npm install

# Start all applications
npm run dev
# Website: http://localhost:5000
# Hub: http://localhost:3000
# JustSplit: http://localhost:4000
```

### Testing
```bash
# Run all tests
npm run test

# Run specific app tests
nx test hub
nx test justsplit-app
nx test website

# Run with coverage
nx test justsplit-app --coverage
```

### Building
```bash
# Build all applications
npm run build

# Build specific application
nx build justsplit-app --configuration=production
nx build hub --configuration=production
nx build website

# Build website (static export)
cd apps/website && npm run build
```

## 🏗️ Platform Architecture

### Monorepo Structure
```
cybereco-monorepo/
├── apps/                    # Applications
│   ├── website/            # Main marketing website
│   ├── hub/                # Central authentication hub
│   └── justsplit/          # Expense splitting application
├── libs/                   # Shared libraries
│   ├── shared-types/       # Common TypeScript types
│   ├── firebase-config/    # Firebase utilities
│   ├── shared-assets/      # Common assets
│   └── ui-components/      # Shared UI components
├── firebase/               # Firebase configurations
│   ├── website/           # Website Firebase config
│   ├── hub/               # Hub Firebase config
│   └── justsplit/         # JustSplit Firebase config
├── scripts/               # Deployment scripts
└── docs/                  # Documentation
```

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Build System**: NX Monorepo with computation caching
- **Backend**: Firebase (Firestore, Auth, Hosting)
- **Language**: TypeScript
- **Styling**: CSS Modules
- **Testing**: Jest with React Testing Library
- **CI/CD**: GitHub Actions

## 📱 Applications

### Website Application
**Port: 5000** | **Purpose**: Marketing website and application hub

Features:
- Application showcase
- Platform features and benefits
- Shared branding and assets

### Hub Application
**Port: 3000** | **Purpose**: Central authentication and app launcher

Features:
- User authentication and management
- Application discovery and access
- Cross-app permission management
- Shared authentication context

### JustSplit Application
**Port: 4000** | **Purpose**: Expense splitting and financial management

Features:
- Group expense management
- Event-based expense tracking
- Real-time currency conversion
- Settlement calculations
- Visual dashboards and analytics
- CSV export functionality

## 🔥 Firebase Development

### Emulator Usage
```bash
# Start all Firebase emulators
npm run emulators

# Start hosting emulators for testing
npm run hosting:website    # localhost:5000
npm run hosting:justsplit  # localhost:4000
npm run hosting:hub       # localhost:3000
```

### NX Commands
```bash
# View dependency graph
nx dep-graph

# Run affected projects only
nx affected:test
nx affected:build

# Generate new components
nx g @nx/react:component Button --project=ui-components
```

## 🧪 Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Develop with Testing**
   ```bash
   npm run dev          # Start development servers
   nx test justsplit-app --watch  # Run tests in watch mode
   ```

3. **Quality Checks**
   ```bash
   npm run lint         # Check code style
   npm run build        # Verify builds work
   ```

4. **Submit Changes**
   ```bash
   git commit -m "feat(justsplit): add new expense splitting feature"
   git push origin feature/your-feature-name
   # Create Pull Request
   ```

## 🎯 Key Features

### Platform Benefits
- **Modular Architecture** - Apps can be deployed independently
- **Shared Infrastructure** - Common authentication and utilities
- **Cost-Effective** - Optimized for Firebase free tier limits
- **Type-Safe** - Full TypeScript coverage across all projects
- **Developer Experience** - Hot reload, testing, and comprehensive tooling

### Technical Highlights
- **Incremental Builds** - NX caching for faster development
- **Offline-First** - Progressive web app capabilities
- **Multi-Project Firebase** - Scalable backend architecture
- **Real-time Updates** - Firestore real-time synchronization
- **Security** - Firebase Auth with custom security rules

## 🔮 Future Roadmap

### Prioritized Application Development
The comprehensive set of applications for the CyberEco ecosystem is prioritized as follows:

**Current (Active Development)**
- **Website** - Marketing website and application hub
- **Hub** - Central authentication and application management
- **JustSplit** - Expense splitting and financial management

**Priority Applications (Next Wave)**
- **Somos** - Family roots exploration and cultural heritage platform
- **Demos** - Transparent voting and community governance
- **Plantopia** - Smart gardening and plant care platform

**Secondary Applications (Future)**
- **Nexus** - Digital wellbeing social media hub
- **MyWealth** - Personal finance and investment tracking
- **CrowdPool** - Community tasks system for collaboration

**For the complete application ecosystem, see the [Application Matrix](./planning/app-matrix.md)**

### Long-term Vision: Decentralized Ecosystem
The platform is evolving toward a revolutionary decentralized architecture featuring:
- **🌐 Mobile P2P Networks** - User devices as distributed computing nodes
- **🔗 Blockchain Integration** - On-chain data with cryptographic privacy layers
- **🔐 Self-Sovereign Identity** - Complete user data ownership and control
- **🎯 Privacy-First Design** - Zero-knowledge proofs and selective data sharing
- **💎 Community Governance** - Decentralized platform governance and tokenomics

**[📖 Read our complete Decentralized Future Vision →](./vision/decentralized-future.md)**

## 🤝 Getting Help

- **Documentation**: Browse this docs folder for detailed guides
- **Issues**: Create an issue for bugs or feature requests
- **Development**: See [Getting Started Guide](./development/getting-started.md)
- **Contributing**: Check [Contributing Guidelines](./development/contributing.md)
- **Licensing**: Review our [Licensing Documentation](./development/licensing.md)

## 📄 Additional Resources

- **[Application Matrix](./planning/app-matrix.md)** - Comprehensive application ecosystem overview
- **[Master Roadmap](./ROADMAP.md)** - Complete platform evolution timeline
- **[Project Roadmap](./planning/project-roadmap.md)** - Detailed implementation timeline
- **[Architecture Diagrams](./architecture/diagrams/)** - Visual system overviews

---

<div align="center">
  <strong>Welcome to the CyberEco Platform - Building the future of digital lifestyle management</strong>
</div>