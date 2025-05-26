# JustSplit Platform Data Models - NX Monorepo Architecture

## Overview

This document provides comprehensive documentation for all data models used across the JustSplit platform, which follows an NX monorepo architecture with multiple applications and shared libraries. The platform consists of:

- **Hub App** (`apps/hub`): Central authentication and application management
- **JustSplit App** (`apps/justsplit`): Core expense splitting functionality
- **Shared Types** (`libs/shared-types`): Platform-wide type definitions
- **Firebase Config** (`libs/firebase-config`): Shared Firebase configuration
- **UI Components** (`libs/ui-components`): Shared UI component library

---

## Platform Architecture

### Shared Libraries

#### `libs/shared-types`
Contains platform-wide type definitions used across all applications.

#### `libs/firebase-config`
Provides shared Firebase configuration and utilities.

#### `libs/ui-components`
Reusable UI components following the platform design system.

---

## Hub App Data Models (`apps/hub`)

The Hub application serves as the central authentication and application management system for the JustSplit platform.

### HubUser

**Location**: `libs/shared-types/src/user.ts`

Enhanced user model for platform-wide user management with preferences and app permissions.

```typescript
interface HubUser {
  uid: string;                    // Firebase UID
  email: string;                  // User's email
  displayName: string;            // Display name
  photoURL?: string;              // Profile photo URL
  createdAt: string;              // Account creation timestamp
  updatedAt: string;              // Last update timestamp
  preferences: {
    theme: 'light' | 'dark' | 'system';  // UI theme preference
    language: string;             // Preferred language
  };
  permissions: {
    [appId: string]: AppPermission;  // App-specific permissions
  };
}
```

**Usage**: Central user management across all platform applications.

**Relationships**:
- Has permissions for multiple `App` instances
- Links to `AuthUser` for authentication

### AuthUser

**Location**: `libs/shared-types/src/auth.ts`

Core authentication user model used by Firebase Auth.

```typescript
interface AuthUser {
  uid: string;                    // Firebase UID
  email: string | null;           // User's email
  displayName: string | null;     // Display name
  photoURL: string | null;        // Profile photo URL
  emailVerified: boolean;         // Email verification status
}
```

**Usage**: Firebase authentication integration across all apps.

### App

**Location**: `libs/shared-types/src/app.ts`

Represents applications available in the platform ecosystem.

```typescript
interface App {
  id: string;                     // Unique app identifier
  name: string;                   // Application name
  description: string;            // App description
  icon: string;                   // App icon URL
  url: string;                    // App access URL
  category: 'finance' | 'productivity' | 'social' | 'utility';
  status: 'active' | 'beta' | 'maintenance' | 'deprecated';
  requiresAuth: boolean;          // Whether app requires authentication
  minRole?: 'user' | 'admin';    // Minimum role required
  features: string[];             // Available features
  createdAt: string;              // Creation timestamp
  updatedAt: string;              // Last update timestamp
}
```

**Usage**: Platform application registry and access control.

### AppPermission

**Location**: `libs/shared-types/src/auth.ts` and `libs/shared-types/src/user.ts`

Defines user permissions for specific applications.

```typescript
interface AppPermission {
  role: 'user' | 'admin' | 'owner';
  grantedAt: string;              // When permission was granted
  grantedBy: string;              // Who granted the permission
}
```

**Usage**: Role-based access control for platform applications.

---

## JustSplit App Data Models (`apps/justsplit`)

The JustSplit application handles expense splitting, group management, and financial settlements.

### User

**Location**: `apps/justsplit/src/types/index.ts`

JustSplit-specific user model with expense-related properties.

```typescript
interface User {
  id: string;                     // Unique user identifier
  name: string;                   // User's full name
  email?: string;                 // Email address (optional)
  avatarUrl?: string;             // Profile avatar URL
  preferredCurrency?: string;     // Default currency preference
  balance: number;                // Current balance across all expenses
  phoneNumber?: string;           // Phone number
  friends?: string[];             // Array of friend user IDs
  friendRequestsSent?: string[];  // Sent friend requests
  friendRequestsReceived?: string[]; // Received friend requests
}
```

**Usage**: User management within JustSplit application.

**Relationships**:
- Has many `Expense` records as payer or participant
- Belongs to many `Group` and `Event` instances
- Has many `Settlement` records
- Can have `Friendship` relationships

### Expense

**Location**: `apps/justsplit/src/types/index.ts`

Core expense model representing shared costs.

```typescript
interface Expense {
  id: string;                     // Unique expense identifier
  description: string;            // Expense description
  amount: number;                 // Total amount
  currency: string;               // Currency code (ISO 4217)
  date: string;                   // Expense date (ISO string)
  paidBy: string;                 // User ID who paid
  participants: string[];         // Array of participant user IDs
  eventId?: string;               // Optional event association
  groupId?: string;               // Optional group association
  settled: boolean;               // Settlement status
  notes?: string;                 // Additional notes
  images?: string[];              // Expense receipt/photo URLs
  splitMethod?: string;           // 'equal', 'custom', 'percentage'
  participantShares?: ParticipantShare[]; // Custom split shares
  category?: string;              // Expense category
  createdAt: string;              // Creation timestamp
}

interface ParticipantShare {
  id: string;                     // Participant user ID
  name: string;                   // Participant name
  share: number;                  // Share amount or percentage
}
```

**Usage**: Core expense tracking and splitting functionality.

**Relationships**:
- Belongs to one `User` (payer)
- Has many participant `User` records
- Optionally belongs to an `Event` or `Group`
- Can be referenced by `Settlement` records

### Group

**Location**: `apps/justsplit/src/types/index.ts`

Represents a group of users for organizing related expenses.

```typescript
interface Group {
  id: string;                     // Unique group identifier
  name: string;                   // Group name
  description?: string;           // Group description
  createdAt: string;              // Creation timestamp
  updatedAt?: string;             // Last update timestamp
  members: string[];              // Array of member user IDs
  eventIds: string[];             // Associated event IDs
  expenseIds: string[];           // Associated expense IDs
}
```

**Usage**: Organizing users and expenses into logical groups.

**Relationships**:
- Has many `User` members
- Has many `Event` instances
- Has many `Expense` records

### Event

**Location**: `apps/justsplit/src/types/index.ts`

Represents time-bound events with associated expenses (trips, parties, etc.).

```typescript
interface Event {
  id: string;                     // Unique event identifier
  name: string;                   // Event name
  description?: string;           // Event description
  date: string;                   // Event date
  startDate: string;              // Start date (required for timeline)
  endDate?: string;               // Optional end date
  location?: string;              // Event location
  createdAt: string;              // Creation timestamp
  updatedAt?: string;             // Last update timestamp
  createdBy: string;              // Creator user ID
  members: string[];              // Array of member user IDs
  expenseIds: string[];           // Associated expense IDs
  groupId?: string;               // Optional parent group
  preferredCurrency?: string;     // Default currency for event
}
```

**Usage**: Time-based organization of expenses and participants.

**Relationships**:
- Created by one `User`
- Has many `User` members
- Has many `Expense` records
- Optionally belongs to a `Group`

### Settlement

**Location**: `apps/justsplit/src/types/index.ts`

Represents payment settlements between users.

```typescript
interface Settlement {
  id: string;                     // Unique settlement identifier
  fromUser: string;               // Payer user ID
  toUser: string;                 // Recipient user ID
  amount: number;                 // Settlement amount
  currency: string;               // Currency code
  date: string;                   // Settlement date
  expenseIds: string[];           // Related expense IDs
  eventId?: string;               // Optional event association
  method?: string;                // Payment method
  notes?: string;                 // Settlement notes
}
```

**Usage**: Tracking payments between users to settle shared expenses.

**Relationships**:
- Links two `User` records (payer and recipient)
- References multiple `Expense` records
- Optionally belongs to an `Event`

### Friendship

**Location**: `apps/justsplit/src/types/index.ts`

Manages friend relationships between users.

```typescript
interface Friendship {
  id: string;                     // Unique friendship identifier
  users: string[];                // Array of two user IDs
  status: 'pending' | 'accepted' | 'rejected';
  requestedBy: string;            // User who initiated request
  createdAt: Date;                // Request creation date
  updatedAt: Date;                // Last status update
}
```

**Usage**: Social features and friend management.

**Relationships**:
- Links two `User` records
- Created by one `User` (requester)

---

## Supporting Types

### TimelineEvent

**Location**: `apps/justsplit/src/types/index.ts`

Generic timeline event for UI timeline components.

```typescript
interface TimelineEvent {
  id: string;                     // Event identifier
  name: string;                   // Event name
  startDate: string;              // Start date
  endDate?: string;               // Optional end date
  [key: string]: unknown;         // Additional properties
}
```

### TimelineExpense

**Location**: `apps/justsplit/src/types/index.ts`

Expense data formatted for timeline display.

```typescript
interface TimelineExpense {
  id: string;                     // Expense identifier
  type: string;                   // Display type
  date: Date;                     // Expense date
  title: string;                  // Display title
  amount: number;                 // Expense amount
  currency: string;               // Currency code
  category: string;               // Expense category
  eventName: string;              // Associated event name
  eventId?: string;               // Optional event ID
  settled: boolean;               // Settlement status
  paidBy: string;                 // Payer user ID
  participants: string[];         // Participant user IDs
  userNames: Record<string, string>; // User ID to name mapping
}
```

### CategoryData

**Location**: `apps/justsplit/src/types/index.ts`

Expense category analytics data.

```typescript
interface CategoryData {
  name: string;                   // Category name
  amount: number;                 // Total amount in category
  percentage: number;             // Percentage of total expenses
}
```

### Participant

**Location**: `apps/justsplit/src/types/index.ts`

Participant data for expense splitting.

```typescript
type Participant = {
  id: string;                     // Participant user ID
  name: string;                   // Participant name
  share: number;                  // Share amount or percentage
};
```

---

## Data Relationships Overview

### Cross-App Relationships

1. **Hub to JustSplit User Mapping**:
   - `HubUser.uid` maps to `User.id` in JustSplit
   - Authentication flows through Hub, user data stored in JustSplit

2. **App Permissions**:
   - `HubUser.permissions` controls access to JustSplit app
   - Role-based features within JustSplit based on Hub permissions

### JustSplit Internal Relationships

1. **User-Centric Model**:
   - Users can belong to multiple Groups and Events
   - Users can pay for and participate in multiple Expenses
   - Users can have multiple Settlement records

2. **Hierarchical Organization**:
   - Groups contain multiple Events
   - Events contain multiple Expenses
   - Expenses can belong to Events or exist independently

3. **Financial Tracking**:
   - Expenses track who paid and who participated
   - Settlements resolve debts between users
   - User balance reflects net position across all expenses

---

## Firebase Integration

### Authentication
- Uses Firebase Auth for user authentication
- `AuthUser` type maps directly to Firebase Auth user object
- Token-based authentication across all apps

### Firestore Collections

#### Hub App Collections
- `users`: HubUser documents
- `apps`: App registry documents
- `permissions`: App permission documents

#### JustSplit App Collections
- `users`: JustSplit User documents
- `expenses`: Expense documents
- `groups`: Group documents
- `events`: Event documents
- `settlements`: Settlement documents
- `friendships`: Friendship documents

### Security Rules
- Firebase Security Rules enforce access control
- User-based data isolation
- Role-based feature access

---

## Migration Considerations

### From Local Storage to Firebase
- Existing localStorage data needs migration to Firestore
- User consolidation between local and authenticated users
- Data consistency during migration period

### Cross-App Data Consistency
- Ensure user data consistency between Hub and JustSplit
- Handle user deletion across multiple apps
- Sync user preferences and profile updates

---

## API Integration Points

### Currency Exchange
- External API integration for real-time exchange rates
- Support for multiple currencies in expenses
- Automatic conversion for display purposes

### Payment Integration (Future)
- Payment platform integration (PayPal, Venmo)
- Settlement automation
- Transaction verification

---

## Performance Considerations

### Data Fetching
- Lazy loading for large expense lists
- Pagination for historical data
- Caching strategies for frequently accessed data

### Real-time Updates
- Firestore real-time listeners for collaborative features
- Optimistic updates for better UX
- Conflict resolution for concurrent edits

---

## Validation and Constraints

### Data Validation
- Required fields marked in type definitions
- Currency code validation (ISO 4217)
- Date format validation (ISO strings)
- Email format validation
- Amount precision constraints

### Business Rules
- Expense participants must include payer
- Settlement amounts cannot exceed debt amounts
- Group members must exist as users
- Event dates must be valid ranges

---

## Testing Considerations

### Mock Data
- Factory functions for generating test data
- Consistent test user IDs across apps
- Mock Firebase services for testing

### Type Safety
- TypeScript ensures type consistency
- Interface contracts between apps
- Compile-time validation of data structures

This comprehensive documentation serves as the single source of truth for all data models used across the JustSplit platform's NX monorepo architecture.
