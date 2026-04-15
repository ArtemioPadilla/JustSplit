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

### 🏠 Core Documentation
- **[About CyberEco](./ABOUT.md)** - Platform mission, vision, and application ecosystem
- **[Platform Philosophy](./PHILOSOPHY.md)** - Core values and design principles
- **[Platform Roadmap](./ROADMAP.md)** - 8-phase evolution from current to decentralized future
- **[Getting Started](./GETTING_STARTED.md)** - Quick 10-minute setup guide

### 📄 Legal & Community
- **[CYBERECO-LICENSE.md](../CYBERECO-LICENSE.md)** - CyberEco Digital Sovereignty License
- **[CONTRIBUTOR-AGREEMENT.md](../CONTRIBUTOR-AGREEMENT.md)** - Contributor legal agreement
- **[Community Guidelines](./community/README.md)** - Community participation and governance
- **[Licensing Documentation](./development/licensing.md)** - License and agreement explanations

### 🏗️ Architecture Documentation
- **[Architecture Overview](./architecture/overview.md)** - High-level platform architecture
- **[NX Monorepo Architecture](./architecture/nx-architecture-consolidated.md)** - Complete NX monorepo structure
- **[Technical Design](./architecture/technical-design.md)** - Detailed technical specifications
- **[Modular Application Strategy](./architecture/modular-application-strategy.md)** - Scaling strategy for ecosystem growth
- **[Architecture Diagrams](./architecture/diagrams/README.md)** - Visual architecture documentation
  - **[Ecosystem Architecture](./architecture/diagrams/mermaid/ecosystem-architecture.mermaid)** - NX monorepo visual blueprint
  - **[Technical Stack Diagram](./architecture/diagrams/mermaid/technical-stack-diagram.mermaid)** - End-to-end technical implementation

### 💻 Applications Documentation
- **[Applications Overview](./applications/README.md)** - Complete application ecosystem documentation
- **[Priority Applications](./applications/priority-apps.md)** - Detailed specifications for Somos, Demos, and Plantopia
- **[JustSplit App Docs](../apps/justsplit/docs/README.md)** - JustSplit-specific implementation details

### 🛠️ Development Guides
- **[Getting Started](./development/getting-started.md)** - Comprehensive developer setup
- **[Development Workflow](./development/development-workflow.md)** - Daily development practices
- **[Developer Workflow Diagram](./development/developer-workflow.mermaid)** - Visual workflow sequences
- **[Contributing Guidelines](./development/contributing.md)** - How to contribute to CyberEco
- **[Code Style Guide](./development/code-style.md)** - Coding standards and best practices
- **[Local Development](./development/local-development.md)** - Local environment setup
- **[Firebase Deployment](./development/firebase-deployment.md)** - Firebase-specific deployment
- **[Logo Creation](./development/logo-creation.md)** - Brand asset guidelines
- **[Testing Strategy](./development/testing/testing-strategy.md)** - Comprehensive testing approach

### 🚀 Deployment & Operations
- **[Firebase Deployment Guide](./deployment/firebase-deployment.md)** - Production deployment with cost optimization
- **[Low-Cost Optimization](./deployment/low-cost-optimization.md)** - Strategies for minimal operational costs
- **[On-Premises Deployment](./deployment/on-premises-deployment.md)** - Self-hosting options
- **[Performance Metrics](./operations/monitoring/performance-metrics.md)** - Monitoring and optimization
- **[Compliance Framework](./operations/security/compliance-framework.md)** - Security and compliance

### 📡 API & Data Models
- **[API Overview](./api/README.md)** - API documentation navigation
- **[NX Comprehensive Data Models](./api/data-models-nx-comprehensive.md)** - Complete platform-wide data models
- **[Data Models Overview](./api/data-models.md)** - High-level data model reference
- **[Comprehensive Models](./api/data-models-comprehensive.md)** - Detailed data specifications
- **[API Endpoints](./api/endpoints.md)** - REST API reference

### 🎨 Design System
- **[Style Guide](./design/style-guide.md)** - NX multiapp design system with human-centered principles
- **[UI Components](./design/ui-components.md)** - Shared component library documentation
- **[Wireframes](./design/wireframes.md)** - UI mockups and user flows

### 📋 Strategic Planning
- **[Planning Overview](./planning/README.md)** - Strategic planning documentation index
- **[Project Roadmap](./planning/project-roadmap.md)** - Feature roadmap and timeline
- **[Release Planning](./planning/release-planning.md)** - Release milestones and goals
- **[Application Matrix](./planning/app-matrix.md)** - Comprehensive application ecosystem
- **[Strategic Solution Matrix](./planning/strategic-solution-matrix.md)** - Business analysis of 30+ applications
- **[Interactive Roadmap](./planning/interactive-roadmap.ipynb)** - Data-driven planning with visual timeline

### 📖 User Guides
- **[User Guide Overview](./user-guides/README.md)** - User documentation navigation
- **[JustSplit User Guide](./user-guides/applications/justsplit-user-guide.md)** - Complete JustSplit usage guide
- **[FAQ](./user-guides/faq.md)** - Frequently asked questions
- **[Account Creation](./user-guides/getting-started/account-creation.md)** - Getting started with CyberEco
- **[Common Issues](./user-guides/troubleshooting/common-issues.md)** - Troubleshooting guide

### 🔮 Vision & Future
- **[Vision Overview](./vision/README.md)** - Future vision documentation
- **[Decentralized Future](./vision/decentralized-future.md)** - Comprehensive decentralized ecosystem roadmap

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

### 🎯 Strategic Resources
- **[Strategic Solution Matrix](./planning/strategic-solution-matrix.md)** - Business analysis of all 30+ CyberEco applications
- **[Interactive Roadmap](./planning/interactive-roadmap.ipynb)** - Data-driven timeline with resource allocation
- **[Application Matrix](./planning/app-matrix.md)** - Comprehensive application ecosystem overview
- **[Master Roadmap](./ROADMAP.md)** - 8-phase platform evolution timeline

### 🏗️ Technical Resources
- **[Modular Application Strategy](./architecture/modular-application-strategy.md)** - Technical scaling strategy
- **[Architecture Diagrams](./architecture/diagrams/README.md)** - Complete visual architecture documentation
- **[Developer Workflow Diagram](./development/developer-workflow.mermaid)** - Visual development processes
- **[NX Architecture Guide](./architecture/nx-architecture-consolidated.md)** - Monorepo structure details

### 📚 Learning Resources
- **[User Guides](./user-guides/README.md)** - Complete user documentation
- **[FAQ](./user-guides/faq.md)** - Frequently asked questions
- **[Getting Started](./GETTING_STARTED.md)** - Quick setup guide
- **[Testing Strategy](./development/testing/testing-strategy.md)** - Testing best practices

---

<div align="center">
  <strong>Welcome to the CyberEco Platform - Building the future of digital lifestyle management</strong>
</div>