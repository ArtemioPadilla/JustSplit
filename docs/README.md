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
- **Hub** - Central authentication and app launcher
- **JustSplit** - Comprehensive expense splitting application
- **Future Apps** - TaskFlow, HealthTrack, LearnPath, and more

> 🔮 **Future Vision**: CyberEco is evolving toward a fully decentralized ecosystem powered by mobile peer-to-peer networks, blockchain technology, and privacy-first cryptographic architecture. [Learn more about our decentralized future →](./vision/decentralized-future.md)

## 📚 Documentation Structure

### 🏗️ Architecture Documentation
- **[System Overview](./architecture/overview.md)** - High-level platform architecture
- **[NX Monorepo Architecture](./architecture/nx-monorepo-architecture.md)** - Complete NX monorepo structure and configuration
- **[Technical Design](./architecture/technical-design.md)** - Detailed technical specifications
- **[Diagrams](./architecture/diagrams/)** - Architecture diagrams and visualizations

### 🛠️ Development Guides
- **[Getting Started](./development/getting-started.md)** - Comprehensive setup guide
- **[Development Workflow](./development/development-workflow.md)** - Daily development practices
- **[Contributing](./development/contributing.md)** - Contribution guidelines
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
- **[Decentralized Future Vision](./vision/decentralized-future.md)** - Comprehensive roadmap for blockchain-based, privacy-first ecosystem with mobile P2P networks

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

# Run with coverage
nx test justsplit-app --coverage
```

### Building
```bash
# Build all applications
npm run build

# Build specific application
nx build justsplit-app --configuration=production
```

## 🏗️ Platform Architecture

### Monorepo Structure
```
cybereco-monorepo/
├── apps/                    # Applications
│   ├── hub/                # Central authentication hub
│   └── justsplit/          # Expense splitting application
├── libs/                   # Shared libraries
│   ├── shared-types/       # Common TypeScript types
│   ├── firebase-config/    # Firebase utilities
│   └── ui-components/      # Shared UI components
├── firebase/               # Firebase configurations
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
npm run hosting:justsplit  # localhost:5000
npm run hosting:hub       # localhost:5001
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

### Near-term Applications
Planned applications for the CyberEco ecosystem:
- **TaskFlow** - Project and task management
- **HealthTrack** - Personal health and fitness tracking
- **LearnPath** - Educational content and progress tracking
- **TimeSync** - Calendar and scheduling management
- **DataVault** - Personal data management and backup

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

## 📄 Additional Resources

- **[Feature Matrix](./JustSplit%20Consolidated%20Feature%20Matrix%20and%20Detailed%20Roadmap.markdown)** - Comprehensive feature overview
- **[Development Goals](./Short-Term%20Goals%20(Next%201-2%20Weeks).md)** - Current development priorities
- **[Architecture Diagrams](./architecture/diagrams/)** - Visual system overviews

---

<div align="center">
  <strong>Welcome to the CyberEco Platform - Building the future of digital lifestyle management</strong>
</div>