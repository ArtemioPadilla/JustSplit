# Data Models

This document outlines the data models used in the JustSplit application, detailing the structure, relationships, and attributes of the data entities involved in expense tracking and management.

## Expense

Represents a shared expense incurred by one or more users.

### Attributes
- **id**: Unique identifier for the expense (String)
- **description**: A brief description of the expense (String)
- **amount**: Total amount of the expense (Decimal)
- **currency**: Currency in which the expense is recorded (String)
- **date**: Date when the expense was incurred (Date)
- **participants**: List of users involved in the expense (Array of User IDs)
- **settled**: Boolean indicating whether the expense has been settled (Boolean)

## User

Represents a user participating in the expense sharing.

### Attributes
- **id**: Unique identifier for the user (String)
- **name**: Full name of the user (String)
- **email**: Email address of the user (String)
- **balance**: Current balance of the user in relation to shared expenses (Decimal)

## Trip/Event

Represents a trip or event that groups related expenses.

### Attributes
- **id**: Unique identifier for the trip/event (String)
- **name**: Name of the trip/event (String)
- **startDate**: Start date of the trip/event (Date)
- **endDate**: End date of the trip/event (Date)
- **expenses**: List of expenses associated with the trip/event (Array of Expense IDs)
- **participants**: List of users participating in the trip/event (Array of User IDs)

## Settlement

Represents a settlement transaction between users.

### Attributes
- **id**: Unique identifier for the settlement (String)
- **fromUser**: User ID of the person making the payment (String)
- **toUser**: User ID of the person receiving the payment (String)
- **amount**: Amount being settled (Decimal)
- **date**: Date of the settlement (Date)

## Relationships

- An **Expense** can have multiple **Users** as participants.
- A **User** can have multiple **Expenses** associated with them.
- A **Trip/Event** can contain multiple **Expenses** and **Users**.
- A **Settlement** involves two **Users** and is linked to the amounts they owe each other.

This structured approach to data modeling ensures clarity in how data is managed within the JustSplit application, facilitating efficient expense tracking and settlement processes.