# CyberEco Applications

> Documentation for all applications in the CyberEco platform ecosystem

## Current Applications

### [Hub](./hub.md)

Central authentication and application management platform that serves as the digital home for users across the CyberEco ecosystem.

**Status**: 🟡 Active Development

**Key Features**:
- User authentication and account management
- Application discovery and access
- User profile management
- Cross-app permissions

### [JustSplit](./justsplit.md)

Expense splitting application that helps friends and groups track, share, and settle expenses with multiple currencies and event-based organization.

**Status**: 🟡 Active Development

**Key Features**:
- Multi-currency expense tracking
- Group and event management
- Settlement optimization
- Real-time collaboration

## Priority Applications (Next Wave)

### [Somos](./priority-apps.md#-somos---family-roots-explorer)

Family roots exploration and cultural heritage platform for preserving and sharing family history.

**Status**: 🔵 Planned (2025-2026)

**Key Features**:
- Family tree visualization
- Cultural heritage preservation
- Memory collection with media
- Privacy-controlled family connections

### [Demos](./priority-apps.md#%EF%B8%8F-demos---community-governance)

Transparent voting and community governance platform for collective decision-making.

**Status**: 🔵 Planned (2025-2026)

**Key Features**:
- Structured proposal system
- Secure, verifiable voting
- Decision tracking and implementation
- Community management tools

### [Plantopia](./priority-apps.md#-plantopia---smart-gardening)

Smart gardening platform with plant care knowledge and community sharing.

**Status**: 🔵 Planned (2025-2026)

**Key Features**:
- Plant care management and tracking
- Comprehensive knowledge base
- Community plant swapping
- Sustainable gardening tools

## Secondary Applications (Future)

### Nexus

Digital wellbeing social media hub for managing online presence and fostering meaningful connections.

**Status**: 🔶 Future (2026-2027)

**Key Features**:
- Social media integration
- Digital wellbeing tools
- Focused communication
- Community building

### MyWealth

Personal finance platform for tracking financial goals, budgeting, and investment management.

**Status**: 🔶 Future (2026-2027)

**Key Features**:
- Budget tracking and planning
- Investment portfolio management
- Financial goal setting
- Integration with JustSplit

### CrowdPool

Community tasks system for collaborative problem-solving and skill sharing.

**Status**: 🔶 Future (2026-2027)

**Key Features**:
- Task creation and management
- Skill matching
- Community collaboration
- Recognition and rewards

## Additional Planned Applications

For a complete list of all planned applications in the CyberEco ecosystem, see the [Application Matrix](../planning/app-matrix.md).

## Application Development

### Technical Specifications

Each application in the CyberEco ecosystem follows these technical guidelines:

- **Framework**: Next.js with App Router
- **Language**: TypeScript
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **State Management**: React Context API
- **Styling**: CSS Modules with design system
- **Testing**: Jest with React Testing Library (70% coverage minimum)

### Integration Guidelines

All applications integrate with the Hub for authentication and with each other through:

- **Shared Authentication**: Single sign-on through the Hub
- **User-Controlled Data Sharing**: Explicit consent for cross-app data
- **Consistent UI/UX**: Shared UI component library and design system
- **Cross-App Navigation**: Seamless transitions between applications

### Documentation Standards

Each application should have the following documentation:

- **Overview**: Purpose, key features, and user value
- **Technical Specification**: Architecture, data models, and integrations
- **User Guide**: How to use the application
- **API Reference**: Data models and endpoint documentation
- **Development Guide**: How to work on the application

## Resources

- [Application Matrix](../planning/app-matrix.md) - Complete listing of all planned applications
- [Priority Applications Technical Specification](./priority-apps.md) - Detailed technical documentation for priority apps
- [Platform Roadmap](../ROADMAP.md) - Overall development timeline
- [Project Roadmap](../planning/project-roadmap.md) - Detailed implementation plans