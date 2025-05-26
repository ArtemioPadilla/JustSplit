# Architecture Overview

JustSplit uses a modern monorepo architecture with NX, designed for low-cost deployment and scalability.

## High-Level Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│   User Device   │────▶│   Hub App (Auth) │────▶│ Firebase Auth   │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│                 │     │                  │
│  JustSplit App  │────▶│ Firebase         │
│                 │     │ Firestore        │
└─────────────────┘     └──────────────────┘
```

## Core Principles

### 1. Multi-App Architecture
- Central authentication hub manages user accounts
- Individual apps have their own data stores
- Shared libraries for code reuse
- Token-based authentication across apps

### 2. Low Operational Cost
- Optimized for Firebase free tier limits
- Efficient data structures to minimize reads/writes
- Client-side computation where possible
- Smart caching strategies

### 3. Offline-First Design
- IndexedDB for local data persistence
- Optimistic UI updates
- Background sync when online
- Conflict resolution strategies

### 4. Type Safety
- Full TypeScript coverage
- Shared type definitions across apps
- Runtime validation for external data
- Type-safe API contracts

## Technology Choices

### NX Monorepo
- **Why**: Superior build caching, dependency graph visualization, and tooling
- **Benefits**: Faster builds, better code organization, easier refactoring

### Next.js 15
- **Why**: Server-side rendering, static generation, API routes
- **Benefits**: Fast page loads, SEO-friendly, built-in optimizations

### Firebase
- **Why**: Managed infrastructure, generous free tier, real-time capabilities
- **Benefits**: No server management, automatic scaling, integrated services

### TypeScript
- **Why**: Type safety, better IDE support, fewer runtime errors
- **Benefits**: Improved developer experience, easier refactoring, self-documenting code

## Security Model

### Authentication
- Firebase Authentication handles user management
- JWT tokens for session management
- Role-based access control (RBAC)
- Secure token exchange between apps

### Authorization
- Firestore security rules enforce access control
- Client-side validation plus server-side enforcement
- Principle of least privilege
- Audit logging for sensitive operations

### Data Protection
- HTTPS everywhere
- Encrypted data at rest (Firebase)
- No sensitive data in client-side storage
- Input sanitization and validation

## Scalability Considerations

### Horizontal Scaling
- Stateless application design
- Firebase handles infrastructure scaling
- CDN for static assets
- Load balancing through Firebase Hosting

### Data Partitioning
- User-based data sharding
- Efficient query patterns
- Denormalized data where appropriate
- Composite indexes for complex queries

### Performance Optimization
- Code splitting with Next.js
- Lazy loading of components
- Image optimization
- Minimal bundle sizes

## Deployment Architecture

### Firebase Hosting
- Automatic SSL certificates
- Global CDN
- Custom domain support
- Automatic scaling

### On-Premises Option
- Docker containers for each app
- Nginx reverse proxy
- Let's Encrypt for SSL
- PostgreSQL as Firestore alternative

## Monitoring and Observability

- Firebase Analytics for user behavior
- Performance monitoring
- Error tracking with Sentry (optional)
- Custom dashboards for business metrics