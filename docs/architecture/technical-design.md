# CyberEco Platform Technical Design

> **🌿 CyberEco Context**: This document outlines the technical architecture and design decisions for applications within the CyberEco human-centered digital ecosystem, with JustSplit as the foundational implementation.

## 🎯 Platform Philosophy

CyberEco applications are designed with **Digital Sovereignty**, **Wellbeing by Design**, and **Community Connection** at their core. Every technical decision supports user autonomy, conscious technology use, and meaningful social interaction.

## Technology Stack

### Frontend
- **Framework**: Next.js with App Router
- **Language**: TypeScript
- **Styling**: CSS Modules for component-scoped styling
- **State Management**: React Context API for global state management

### Data Management
- **Storage**: Local Storage for persisting user data
- **Data Structure**: JSON-based models for users, expenses, events, and settlements

### APIs
- **External Services**: Currency conversion API integration for multi-currency support

## Architecture Overview

JustSplit follows a component-based architecture with a focus on modularity and reusability. The application is structured as follows:

### Directory Structure
```
src/
├── app/                   # Next.js app router pages
├── components/            # Reusable UI components
│   ├── Dashboard/         # Dashboard-specific components
│   ├── Header/            # Navigation header
│   └── ...                # Other shared components
├── context/               # Global state management
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

## Component Architecture

### Dashboard Components
The dashboard is built using a modular approach with smaller, specialized components that can be composed together:

1. **WelcomeScreen**: Displayed for new users with no data
2. **DashboardHeader**: Contains title and quick action buttons
3. **FinancialSummary**: Shows key financial metrics
4. **MonthlyTrendsChart**: Visualizes spending trends over time
5. **ExpenseDistribution**: Shows category-based expense breakdown
6. **BalanceOverview**: Displays user balances in a visual format
7. **RecentExpenses**: Lists most recent expenses
8. **RecentSettlements**: Shows recent settlements
9. **UpcomingEvents**: Displays upcoming planned events

This modular approach provides several benefits:
- **Maintainability**: Smaller components are easier to understand and modify
- **Performance**: Components can be optimized independently
- **Reusability**: Components can be reused in different parts of the application
- **Testing**: Smaller components are easier to test in isolation

## State Management

The application uses React Context API for global state management. The main state components include:
- **Users**: Information about users/friends
- **Expenses**: Detailed expense records
- **Events**: Group events with associated expenses
- **Settlements**: Records of settled expenses between users

## Data Flow

1. User actions trigger state updates through the context
2. State changes trigger UI updates in affected components
3. Data is persisted to localStorage for future sessions

## Future Considerations

- **Server Component Integration**: Adapt components to work with Next.js server components
- **Database Integration**: Replace localStorage with a proper database
- **Authentication**: Add user authentication for multi-user support
- **API Layer**: Create a proper API layer for data operations