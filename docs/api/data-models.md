# Data Models

> **📋 Note**: This document provides a high-level overview of data models. For comprehensive documentation including NX monorepo architecture, shared types, and detailed relationships, see:
> - [**NX Monorepo Data Models Documentation**](./data-models-nx-comprehensive.md) - Complete platform documentation
> - [**Legacy Comprehensive Documentation**](./data-models-comprehensive.md) - Previous detailed documentation

This document outlines the core data models used in the JustSplit application, detailing the structure, relationships, and attributes of the data entities involved in expense tracking and management.

## Overview

The JustSplit platform uses several interconnected data models to manage users, expenses, events, and settlements across multiple applications in an NX monorepo architecture:

- **Hub App** (`apps/hub`): Central authentication and application management
- **JustSplit App** (`apps/justsplit`): Core expense splitting functionality  
- **Shared Types** (`libs/shared-types`): Platform-wide authentication and app models
- **App-Specific Types** (`apps/justsplit/src/types`): JustSplit domain models
- **Firebase Config** (`libs/firebase-config`): Shared Firebase configuration
- **UI Components** (`libs/ui-components`): Shared component library

## Core Models

### Expense

Represents a shared expense incurred by one or more users.

### Attributes
- **id**: Unique identifier for the expense (String)
- **description**: A brief description of the expense (String)
- **amount**: Total amount of the expense (Number)
- **currency**: Currency in which the expense is recorded (String)
- **date**: Date when the expense was incurred (String in ISO format)
- **paidBy**: User ID of the person who paid for the expense (String)
- **splitMethod**: Method used to split the expense (String: equal, custom, percentage)
- **participants**: List of users involved in the expense (Array of User IDs with share information)
- **eventId**: Optional ID of the event this expense belongs to (String, optional)
- **settled**: Boolean indicating whether the expense has been settled (Boolean)
- **notes**: Detailed description or notes about the expense (String, optional)
- **images**: List of image URLs associated with the expense (Array of Strings, optional)

## User

Represents a user participating in the expense sharing.

### Attributes
- **id**: Unique identifier for the user (String)
- **name**: Full name of the user (String)
- **email**: Email address of the user (String, optional)
- **phoneNumber**: Phone number of the user (String, optional)
- **preferredCurrency**: Preferred currency for the user (String, optional)
- **balance**: Current balance of the user in relation to shared expenses (Number)

## Event

Represents an event that groups related expenses (formerly called Trip/Event).

### Attributes
- **id**: Unique identifier for the event (String)
- **name**: Name of the event (String)
- **startDate**: Start date of the event (String in ISO format)
- **endDate**: End date of the event (String in ISO format, optional)
- **participants**: List of users participating in the event (Array of User IDs)
- **expenses**: List of expenses associated with the event (Array of Expense IDs)
- **preferredCurrency**: Preferred currency for the event (String, optional)

## Settlement

Represents a settlement transaction between users.

### Attributes
- **id**: Unique identifier for the settlement (String)
- **fromUser**: User ID of the person making the payment (String)
- **toUser**: User ID of the person receiving the payment (String)
- **amount**: Amount being settled (Number)
- **currency**: Currency in which the settlement is recorded (String)
- **date**: Date of the settlement (String in ISO format)
- **expenseIds**: List of expense IDs associated with this settlement (Array of Strings)
- **eventId**: Optional ID of the event this settlement is related to (String, optional)

## Relationships

- An **Expense** is paid by one **User** and can have multiple **Users** as participants
- A **User** can pay for multiple **Expenses** and participate in multiple **Expenses**
- An **Event** contains multiple **Expenses** and has multiple **User** participants
- A **Settlement** involves two **Users** (payer and recipient) and is linked to one or more **Expenses**
- A **Settlement** can optionally be linked to an **Event**

This structured approach to data modeling ensures clarity in how data is managed within the JustSplit application, facilitating efficient expense tracking and settlement processes.