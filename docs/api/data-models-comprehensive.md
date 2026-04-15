# CyberEco Platform Data Models Documentation

## Overview

This document provides comprehensive documentation for all data models used across the CyberEco platform, including the Hub application for authentication and the JustSplit application for expense management. The platform follows a modular NX monorepo architecture with shared types and app-specific models.

CyberEco is a human-centered digital ecosystem where each application solves real needs while contributing to a greater whole. This data architecture reflects our values of digital sovereignty, privacy by design, and user empowerment.

## Architecture

### Shared Types Library (`libs/shared-types`)

Common types used across all applications in the CyberEco platform.

### App-Specific Types

Each application has its own type definitions for domain-specific models.

---

## Platform-Wide Models (Shared Types)

### AuthUser

**Location**: `libs/shared-types/src/auth.ts`

Central authentication user model used across the platform.

```typescript
interface AuthUser {
  uid: string;                    // Firebase UID
  email: string | null;           // User's email
  displayName: string | null;     // Display name
  photoURL: string | null;        // Profile photo URL
  emailVerified: boolean;         // Email verification status
}
```

### HubUser

**Location**: `libs/shared-types/src/user.ts`

Enhanced user model for the Hub application with platform-wide preferences.

```typescript
interface HubUser {
  uid: string;                    // Firebase UID
  email: string;                  // User's email
  displayName: string;            // Display name
  photoURL?: string;              // Profile photo URL
  createdAt: string;              // Account creation timestamp
  updatedAt: string;              // Last update timestamp
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  permissions: {
    [appId: string]: AppPermission;
  };
}
```

### App

**Location**: `libs/shared-types/src/app.ts`

Model for applications available in the CyberEco platform.

```typescript
interface App {
  id: string;                     // Unique app identifier
  name: string;                   // App display name
  description: string;            // App description
  icon: string;                   // App icon URL
  url: string;                    // App URL
  category: 'finance' | 'productivity' | 'social' | 'utility';
  status: 'active' | 'beta' | 'maintenance' | 'deprecated';
  requiresAuth: boolean;          // Authentication requirement
  minRole?: 'user' | 'admin';     // Minimum role required
  features: string[];             // Available features
  createdAt: string;              // Creation timestamp
  updatedAt: string;              // Last update timestamp
}
```

### AppPermission

**Location**: `libs/shared-types/src/user.ts`

User permissions for specific applications.

```typescript
interface AppPermission {
  role: 'user' | 'admin' | 'owner';
  grantedAt: string;              // Permission grant timestamp
  grantedBy: string;              // User who granted permission
}
```

---

## JustSplit Application Models

**Location**: `apps/justsplit/src/types/index.ts`

### User

Local user model for JustSplit with expense-specific attributes.

```typescript
interface User {
  id: string;                     // Unique user identifier
  name: string;                   // User's full name
  email?: string;                 // Email address (optional)
  avatarUrl?: string;             // Avatar image URL
  preferredCurrency?: string;     // Preferred currency code
  balance: number;                // Current balance
  phoneNumber?: string;           // Phone number (optional)
  friends?: string[];             // Friend user IDs
  friendRequestsSent?: string[];  // Outgoing friend requests
  friendRequestsReceived?: string[]; // Incoming friend requests
}
```

**Relationships**:
- Can pay for multiple `Expense` records
- Can participate in multiple `Expense` records
- Can be a member of multiple `Group` records
- Can create and participate in multiple `Event` records

### Expense

Core expense tracking model with flexible splitting options.

```typescript
interface Expense {
  id: string;                     // Unique expense identifier
  description: string;            // Expense description
  amount: number;                 // Total expense amount
  currency: string;               // Currency code (ISO 4217)
  date: string;                   // Expense date (ISO format)
  paidBy: string;                 // User ID who paid
  participants: string[];         // User IDs of participants
  eventId?: string;               // Associated event ID
  groupId?: string;               // Associated group ID
  settled: boolean;               // Settlement status
  notes?: string;                 // Additional notes
  images?: string[];              // Attached image URLs
  splitMethod?: string;           // 'equal', 'custom', 'percentage'
  participantShares?: Participant[]; // Custom split details
  category?: string;              // Expense category
  createdAt: string;              // Creation timestamp
}
```

**Relationships**:
- Belongs to one `User` (paidBy)
- Can have multiple `User` participants
- May belong to one `Event`
- May belong to one `Group`
- Can be associated with multiple `Settlement` records

### Event

Event model for grouping related expenses (trips, dinners, etc.).

```typescript
interface Event {
  id: string;                     // Unique event identifier
  name: string;                   // Event name
  description?: string;           // Event description
  date: string;                   // Event date (legacy, use startDate)
  startDate: string;              // Event start date (ISO format)
  endDate?: string;               // Event end date (ISO format)
  location?: string;              // Event location
  createdAt: string;              // Creation timestamp
  updatedAt?: string;             // Last update timestamp
  createdBy: string;              // Creator user ID
  members: string[];              // Member user IDs
  expenseIds: string[];           // Associated expense IDs
  groupId?: string;               // Associated group ID
  preferredCurrency?: string;     // Preferred currency for event
}
```

**Relationships**:
- Created by one `User`
- Has multiple `User` members
- Contains multiple `Expense` records
- May belong to one `Group`

### Group

Group model for organizing users and events together.

```typescript
interface Group {
  id: string;                     // Unique group identifier
  name: string;                   // Group name
  description?: string;           // Group description
  createdAt: string;              // Creation timestamp
  updatedAt?: string;             // Last update timestamp
  members: string[];              // Member user IDs
  eventIds: string[];             // Associated event IDs
  expenseIds: string[];           // Associated expense IDs
}
```

**Relationships**:
- Has multiple `User` members
- Contains multiple `Event` records
- Contains multiple `Expense` records

### Settlement

Settlement model for tracking debt resolution between users.

```typescript
interface Settlement {
  id: string;                     // Unique settlement identifier
  fromUser: string;               // Payer user ID
  toUser: string;                 // Recipient user ID
  amount: number;                 // Settlement amount
  currency: string;               // Currency code
  date: string;                   // Settlement date (ISO format)
  expenseIds: string[];           // Related expense IDs
  eventId?: string;               // Related event ID
  method?: string;                // Payment method
  notes?: string;                 // Settlement notes
}
```

**Relationships**:
- Links two `User` records (fromUser and toUser)
- Associated with multiple `Expense` records
- May be associated with one `Event`

### Friendship

Friendship management model for social features.

```typescript
interface Friendship {
  id: string;                     // Unique friendship identifier
  users: string[];                // User IDs (always 2 users)
  status: 'pending' | 'accepted' | 'rejected';
  requestedBy: string;            // User ID who sent request
  createdAt: Date;                // Creation timestamp
  updatedAt: Date;                // Last update timestamp
}
```

**Relationships**:
- Links two `User` records
- One `User` as requester (requestedBy)

### Supporting Types

#### Participant

Used for custom expense splitting.

```typescript
type Participant = {
  id: string;                     // User ID
  name: string;                   // User name
  share: number;                  // Share amount or percentage
};
```

#### TimelineEvent

Interface for timeline components (generic events).

```typescript
interface TimelineEvent {
  id: string;                     // Event identifier
  name: string;                   // Event name
  startDate: string;              // Start date (ISO format)
  endDate?: string;               // End date (ISO format)
  [key: string]: unknown;         // Additional properties
}
```

#### TimelineExpense

Expense model specifically for timeline visualization.

```typescript
interface TimelineExpense {
  id: string;                     // Expense identifier
  type: string;                   // Expense type
  date: string;                   // Expense date (ISO format)
  title: string;                  // Expense title
  amount: number;                 // Expense amount
  currency: string;               // Currency code
  category: string;               // Expense category
  eventName: string;              // Associated event name
  eventId?: string;               // Associated event ID
  settled: boolean;               // Settlement status
  paidBy: string;                 // Payer user ID
  participants: string[];         // Participant user IDs
  userNames: Record<string, string>; // User ID to name mapping
}
```

#### CategoryData

Data structure for expense categorization and analytics.

```typescript
interface CategoryData {
  name: string;                   // Category name
  amount: number;                 // Total amount in category
  percentage: number;             // Percentage of total expenses
}
```

---

## Data Relationships Overview

### Core Entity Relationships

```
User ←→ Friendship ←→ User
  ↓
  ├── Event (creator)
  │   ├── Expense* (multiple)
  │   └── User* (members)
  │
  ├── Group (member)
  │   ├── Event* (multiple)
  │   └── Expense* (multiple)
  │
  ├── Expense (paidBy)
  │   ├── User* (participants)
  │   └── Settlement* (multiple)
  │
  └── Settlement (fromUser/toUser)
      └── Expense* (multiple)
```

### Key Constraints

1. **User Relationships**:
   - A user can have multiple friendships
   - A user can create multiple events
   - A user can pay for multiple expenses
   - A user can participate in multiple expenses

2. **Event Relationships**:
   - An event has one creator
   - An event can have multiple members
   - An event can contain multiple expenses
   - An event can belong to one group

3. **Expense Relationships**:
   - An expense has one payer
   - An expense can have multiple participants
   - An expense can belong to one event
   - An expense can be part of multiple settlements

4. **Settlement Relationships**:
   - A settlement involves exactly two users
   - A settlement can resolve multiple expenses
   - A settlement can be related to one event

---

## Data Validation Rules

### General Rules

1. All IDs must be unique strings
2. Dates must be in ISO 8601 format
3. Currency codes must follow ISO 4217 standard
4. Amounts must be positive numbers
5. User references must exist in the system

### Specific Validations

#### Expense
- `amount` > 0
- `participants` must include at least one user
- `paidBy` must be a valid user ID
- If `splitMethod` is 'custom' or 'percentage', `participantShares` is required
- Sum of `participantShares` must equal `amount` (for custom) or 100 (for percentage)

#### Event
- `startDate` must be <= `endDate` (if provided)
- `members` must include `createdBy`
- `expenseIds` must reference valid expenses

#### Settlement
- `amount` > 0
- `fromUser` ≠ `toUser`
- `expenseIds` must reference valid expenses

#### Friendship
- `users` array must contain exactly 2 elements
- `users` must contain unique user IDs
- `requestedBy` must be one of the users in the `users` array

---

## Storage Strategy

### Local Storage (Current)
- Used for development and offline functionality
- Data persisted in browser localStorage
- JSON serialization for complex objects

### Firebase Firestore (Planned)
- Cloud-based document database
- Real-time synchronization
- Offline support with local caching
- Security rules for access control

### Data Migration
- Local to cloud migration utilities
- Conflict resolution strategies
- Data integrity verification

---

## Future Considerations

### Planned Enhancements

1. **Audit Trail**: Track all changes to expenses and settlements
2. **Soft Deletes**: Mark records as deleted instead of hard deletion
3. **Versioning**: Track different versions of expenses
4. **Attachments**: Enhanced file upload and management
5. **Notifications**: Real-time updates and push notifications
6. **Analytics**: Enhanced reporting and insights

### Performance Optimizations

1. **Pagination**: For large datasets
2. **Indexing**: Database index strategies
3. **Caching**: Redis for frequently accessed data
4. **Compression**: Data compression for large payloads

---

## Migration Notes

When migrating from the current localStorage implementation to Firebase:

1. **ID Generation**: Migrate from client-generated IDs to Firebase document IDs
2. **Date Handling**: Ensure consistent ISO date formats
3. **Validation**: Implement server-side validation rules
4. **Security**: Add proper authentication and authorization
5. **Real-time**: Implement real-time listeners for live updates

This documentation will be updated as the platform evolves and new features are added.
