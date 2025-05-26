# Data Models Documentation Index

This directory contains comprehensive documentation for all data models used across the JustSplit platform.

## Documentation Structure

### 📋 Quick Reference
- **[data-models.md](./data-models.md)** - High-level overview and quick reference
- **[data-models-nx-comprehensive.md](./data-models-nx-comprehensive.md)** - Complete NX monorepo documentation
- **[data-models-comprehensive.md](./data-models-comprehensive.md)** - Legacy comprehensive documentation
- **[endpoints.md](./endpoints.md)** - API endpoints documentation

## Platform Architecture

The JustSplit platform follows an NX monorepo architecture with the following structure:

### Applications
- **Hub App** (`apps/hub`) - Central authentication and app management
- **JustSplit App** (`apps/justsplit`) - Core expense splitting functionality

### Shared Libraries
- **Shared Types** (`libs/shared-types`) - Platform-wide type definitions
- **Firebase Config** (`libs/firebase-config`) - Shared Firebase configuration
- **UI Components** (`libs/ui-components`) - Shared component library

## Data Model Categories

### 🔐 Authentication & User Management
Located in `libs/shared-types/src/`
- **AuthUser** - Firebase authentication user
- **HubUser** - Platform user with preferences and permissions
- **AppPermission** - Role-based access control

### 🏢 Platform Management
Located in `libs/shared-types/src/`
- **App** - Application registry and metadata

### 💰 Expense Management
Located in `apps/justsplit/src/types/`
- **User** - JustSplit application user
- **Expense** - Shared expense records
- **Settlement** - Payment settlements between users

### 👥 Group & Event Management
Located in `apps/justsplit/src/types/`
- **Group** - User groups for organizing expenses
- **Event** - Time-bound events with expenses
- **Friendship** - Social connections between users

### 📊 Supporting Types
Located in `apps/justsplit/src/types/`
- **TimelineEvent** - Timeline display data
- **TimelineExpense** - Expense timeline visualization
- **CategoryData** - Expense category analytics
- **Participant** - Expense splitting participants

## Key Relationships

### Cross-App Integration
```
HubUser (Hub) ←→ User (JustSplit)
AuthUser (Firebase) ←→ HubUser (Platform)
App (Registry) ←→ AppPermission (Access Control)
```

### JustSplit Internal Relationships
```
User ←→ Expense (Many-to-Many via participants)
User ←→ Group (Many-to-Many via members)
User ←→ Event (Many-to-Many via members)
Group ←→ Event (One-to-Many)
Event ←→ Expense (One-to-Many)
Settlement ←→ Expense (Many-to-Many)
```

## Firebase Collections

### Hub App Collections
- `users` - HubUser documents
- `apps` - App registry
- `permissions` - User app permissions

### JustSplit App Collections
- `users` - JustSplit User documents
- `expenses` - Expense records
- `groups` - Group definitions
- `events` - Event records
- `settlements` - Settlement transactions
- `friendships` - Friend relationships

## Development Guidelines

### Type Safety
- All models defined in TypeScript interfaces
- Shared types in `libs/shared-types` for cross-app consistency
- App-specific types in respective app directories

### Validation
- Required fields clearly marked in type definitions
- Business rules documented with each model
- Firebase Security Rules enforce access control

### Testing
- Mock data factories for consistent test data
- Type-safe test utilities
- Cross-app integration testing

## Migration Considerations

### From Legacy to NX Architecture
- User data migration between local storage and Firebase
- Type definition consolidation in shared libraries
- Component library migration to shared packages

### Future Enhancements
- Real-time collaboration features
- Payment integration models
- Advanced analytics and reporting types

---

## Quick Navigation

| Model Category | Location | Key Models |
|---|---|---|
| **Authentication** | `libs/shared-types/src/auth.ts` | AuthUser, AppPermission |
| **Platform Users** | `libs/shared-types/src/user.ts` | HubUser |
| **Apps** | `libs/shared-types/src/app.ts` | App |
| **JustSplit Users** | `apps/justsplit/src/types/index.ts` | User, Friendship |
| **Expenses** | `apps/justsplit/src/types/index.ts` | Expense, Settlement |
| **Organization** | `apps/justsplit/src/types/index.ts` | Group, Event |
| **UI Support** | `apps/justsplit/src/types/index.ts` | TimelineEvent, CategoryData |

For detailed information about any specific model, refer to the comprehensive documentation files listed above.
