# JustSplit Documentation

Welcome to the JustSplit documentation! This NX monorepo contains multiple applications designed for low-cost deployment on Firebase or on-premises hosting.

## Documentation Structure

### Core Documentation
- **[Architecture](./architecture/)** - System design and technical architecture
  - [Overview](./architecture/overview.md) - High-level architecture
  - [NX Monorepo Architecture](./architecture/nx-architecture.md) - Monorepo structure
  - [Multi-Project Firebase](./architecture/firebase-multi-project.md) - Firebase setup
  - [Technical Design](./architecture/technical-design.md) - Detailed technical design
  - [Diagrams](./architecture/diagrams/) - Architecture diagrams

### Development Guides
- **[Development](./development/)** - Development guides and workflows
  - [Getting Started](./development/getting-started.md) - Quick start guide
  - [NX Guide](./development/nx-guide.md) - Working with NX
  - [Local Development](./development/local-development.md) - Local setup
  - [Development Workflow](./development/development-workflow.md) - Git workflow
  - [Code Style](./development/code-style.md) - Coding standards
  - [Testing Guide](./development/testing-guide.md) - Testing strategies

### Deployment Documentation
- **[Deployment](./deployment/)** - Deployment strategies and guides
  - [Firebase Deployment](./deployment/firebase-deployment.md) - Deploy to Firebase
  - [On-Premises Deployment](./deployment/on-premises-deployment.md) - Self-hosting
  - [Low-Cost Optimization](./deployment/low-cost-optimization.md) - Cost optimization
  - [CI/CD Setup](./deployment/ci-cd-setup.md) - Automated deployment

### API & Design
- **[API](./api/)** - API documentation
  - [Data Models](./api/data-models.md) - Data structures
  - [Endpoints](./api/endpoints.md) - API endpoints
  - [Authentication](./api/authentication.md) - Auth flows

- **[Design](./design/)** - UI/UX documentation
  - [UI Components](./design/ui-components.md) - Component library
  - [Style Guide](./design/style-guide.md) - Design system
  - [Wireframes](./design/wireframes.md) - UI mockups

### Planning & Requirements
- **[Planning](./planning/)** - Project planning
  - [Project Roadmap](./planning/project-roadmap.md) - Feature roadmap
  - [Milestones](./planning/milestones.md) - Release milestones
  - [Release Planning](./planning/release-planning.md) - Release strategy

- **[Requirements](./requirements/)** - Project requirements
  - [Functional Requirements](./requirements/functional-requirements.md)
  - [Non-Functional Requirements](./requirements/non-functional-requirements.md)
  - [User Stories](./requirements/user-stories.md)

## Quick Start

1. **Setup Development Environment**
   ```bash
   npm install -g nx
   npm install
   nx serve justsplit-app  # Start JustSplit app
   nx serve hub           # Start Hub app
   ```

2. **Run Tests**
   ```bash
   nx test justsplit-app
   nx run-many --target=test --all
   ```

3. **Build for Production**
   ```bash
   nx build justsplit-app --configuration=production
   nx build hub --configuration=production
   ```

## Technology Stack

- **Monorepo**: NX with npm workspaces
- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **Styling**: CSS Modules
- **Testing**: Jest, React Testing Library
- **CI/CD**: GitHub Actions

## Project Structure

```
justsplit-monorepo/
├── apps/                    # Applications
│   ├── hub/                # Authentication hub
│   └── justsplit/          # Expense management app
├── libs/                   # Shared libraries
│   ├── shared-types/       # TypeScript types
│   ├── firebase-config/    # Firebase utilities
│   └── ui-components/      # Reusable components
├── firebase/               # Firebase configurations
├── scripts/               # Deployment scripts
└── docs/                  # Documentation
```

## Key Features

- **Multi-app Architecture** - Central hub with multiple applications
- **Low Operational Cost** - Optimized for Firebase free tier
- **On-Premises Support** - Can be self-hosted
- **Offline-First** - Works without internet connection
- **Type-Safe** - Full TypeScript support
- **Incremental Builds** - Fast builds with NX caching

## Getting Help

- Check the [FAQ](./faq.md)
- Open an [issue](https://github.com/your-repo/issues)
- Join our [community](./community.md)

Thank you for using JustSplit!