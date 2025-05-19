# UI Components

This document outlines the UI components used in the JustSplit application, providing descriptions and usage guidelines for each component.

## Component Overview

### 1. Header
- **Description**: The header component contains the application logo, title, and navigation links.
- **Usage**: It is displayed at the top of every page to provide consistent navigation.

### 2. Expense Form
- **Description**: A form for users to input new expenses, including fields for amount, description, date, and category.
- **Usage**: This component is used on the expense entry page and is essential for adding new expenses to the system.

### 3. Expense List
- **Description**: Displays a list of all recorded expenses, showing details such as amount, payer, and date.
- **Usage**: This component is used on the main dashboard to provide users with an overview of their expenses.

### 4. Settlement Summary
- **Description**: A summary component that shows the total amount owed by each participant in a shared expense.
- **Usage**: This component is displayed after expenses are entered, helping users understand their financial obligations.

### 5. Payment Integration Button
- **Description**: A button that allows users to settle expenses through a payment provider.
- **Usage**: This component appears alongside settlement amounts to facilitate quick payments.

### 6. Notifications
- **Description**: A component that displays notifications and alerts to users.
- **Usage**: This component can be shown anywhere in the application to provide feedback to users.

### 7. Footer
- **Description**: The footer component contains links to additional information and support resources.
- **Usage**: It is displayed at the bottom of every page to provide consistent access to supplementary information.

### 8. Dashboard Components
The dashboard is composed of several reusable components:

#### 8.1 Welcome Screen
- **Description**: Initial screen displayed to new users with no data.
- **Usage**: Shown instead of the dashboard when a user has no expenses or events.

#### 8.2 Dashboard Header
- **Description**: Contains the dashboard title and quick action buttons.
- **Usage**: Positioned at the top of the dashboard for easy access to common actions.

#### 8.3 Financial Summary
- **Description**: Shows key financial metrics including total tracked expenses, unsettled expenses, and pending settlements.
- **Usage**: Displayed prominently in the dashboard to give users a quick financial overview.

#### 8.4 Monthly Trends Chart
- **Description**: Interactive chart showing expense trends over the last 6 months with filtering options.
- **Usage**: Provides visual representation of spending patterns over time.

#### 8.5 Expense Distribution
- **Description**: Shows how expenses are distributed across different categories or events.
- **Usage**: Helps users understand their spending patterns by category.

#### 8.6 Balance Overview
- **Description**: Visual representation of balances between users.
- **Usage**: Shows who owes whom and how much at a glance.

#### 8.7 Recent Expenses
- **Description**: List of the most recent expenses added to the system.
- **Usage**: Provides quick access to recently added expenses.

#### 8.8 Recent Settlements
- **Description**: List of the most recent settlements made between users.
- **Usage**: Shows recent payment activity.

#### 8.9 Upcoming Events
- **Description**: List of future events with dates and participant counts.
- **Usage**: Reminds users of upcoming events that may require expense planning.

### 9. Currency Exchange Ticker
- **Description**: A scrolling ticker showing exchange rates for different currencies.
- **Usage**: Displayed on the dashboard to provide up-to-date currency exchange information.
- **Note**: The application now automatically converts currencies without requiring user toggle.

### 10. UI Checkboxes
- **Description**: Standard checkbox controls used throughout the application for boolean options.
- **Usage**: Used in forms and settings panels for enabling/disabling features or selecting multiple items.

## Component Guidelines

- **Accessibility**: Ensure all components are accessible, including proper labeling and keyboard navigation support.
- **Responsiveness**: Components should be responsive and adapt to different screen sizes and orientations.
- **Consistency**: Maintain consistent styling and behavior across all components to enhance user experience.

## Conclusion

The UI components outlined in this document are essential for the JustSplit application, providing a cohesive and user-friendly interface. Proper implementation and adherence to the guidelines will ensure a smooth user experience.