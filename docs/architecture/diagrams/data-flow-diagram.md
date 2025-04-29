# Data Flow Diagram for JustSplit

## Overview

This document presents the data flow diagram (DFD) for the JustSplit application. The DFD illustrates how data moves through the system, highlighting the inputs, processes, and outputs involved in managing shared expenses.

## Data Flow Diagram

```plaintext
+------------------+          +------------------+
|                  |          |                  |
|   User Input     |          |   Expense Data   |
|                  |          |                  |
+--------+---------+          +---------+--------+
         |                              |
         |                              |
         v                              v
+--------+---------+          +---------+--------+
|                  |          |                  |
|   Expense Entry  |          |   Expense List   |
|                  |          |                  |
+--------+---------+          +---------+--------+
         |                              |
         |                              |
         v                              v
+--------+---------+          +---------+--------+
|                  |          |                  |
|   Calculation    |          |   User Balances  |
|                  |          |                  |
+--------+---------+          +---------+--------+
         |                              |
         |                              |
         v                              v
+--------+---------+          +---------+--------+
|                  |          |                  |
|   Settlement     |          |   Notifications   |
|                  |          |                  |
+------------------+          +------------------+

```

## Components

1. **User Input**: Users provide data regarding expenses, payments, and participants.
2. **Expense Entry**: The application processes the input data to create expense entries.
3. **Expense Data**: Stores all expense-related information, including amounts, participants, and categories.
4. **Calculation**: The system calculates balances and settlements based on the entered expenses.
5. **User Balances**: Displays the current balances for each user, indicating who owes whom.
6. **Settlement**: Manages the final settlements between users, ensuring all debts are cleared.
7. **Notifications**: Sends updates to users regarding new expenses, changes, and settlements.

## Conclusion

The data flow diagram provides a clear visualization of how data is processed within the JustSplit application. Understanding these flows is crucial for developers and stakeholders to ensure efficient data management and user experience.