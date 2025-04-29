# JustSplit API Endpoints

This document outlines the API endpoints available in the JustSplit application, including their request and response formats.

## Base URL

```
https://api.justsplit.example.com/v1
```

## Endpoints

### 1. Create Expense

- **Endpoint**: `/expenses`
- **Method**: `POST`
- **Description**: Create a new expense.
- **Request Body**:
  ```json
  {
    "description": "Dinner at restaurant",
    "amount": 100.00,
    "currency": "USD",
    "participants": ["Alice", "Bob", "Charlie"],
    "date": "2023-10-01"
  }
  ```
- **Response**:
  - **Status Code**: `201 Created`
  - **Body**:
  ```json
  {
    "id": "expense_id",
    "description": "Dinner at restaurant",
    "amount": 100.00,
    "currency": "USD",
    "participants": ["Alice", "Bob", "Charlie"],
    "date": "2023-10-01"
  }
  ```

### 2. Get Expenses

- **Endpoint**: `/expenses`
- **Method**: `GET`
- **Description**: Retrieve a list of expenses.
- **Response**:
  - **Status Code**: `200 OK`
  - **Body**:
  ```json
  [
    {
      "id": "expense_id",
      "description": "Dinner at restaurant",
      "amount": 100.00,
      "currency": "USD",
      "participants": ["Alice", "Bob", "Charlie"],
      "date": "2023-10-01"
    },
    ...
  ]
  ```

### 3. Update Expense

- **Endpoint**: `/expenses/{id}`
- **Method**: `PUT`
- **Description**: Update an existing expense.
- **Request Body**:
  ```json
  {
    "description": "Updated Dinner at restaurant",
    "amount": 120.00,
    "currency": "USD"
  }
  ```
- **Response**:
  - **Status Code**: `200 OK`
  - **Body**:
  ```json
  {
    "id": "expense_id",
    "description": "Updated Dinner at restaurant",
    "amount": 120.00,
    "currency": "USD"
  }
  ```

### 4. Delete Expense

- **Endpoint**: `/expenses/{id}`
- **Method**: `DELETE`
- **Description**: Delete an existing expense.
- **Response**:
  - **Status Code**: `204 No Content`

### 5. Settle Up

- **Endpoint**: `/settle`
- **Method**: `POST`
- **Description**: Settle up expenses among participants.
- **Request Body**:
  ```json
  {
    "participants": ["Alice", "Bob"],
    "amount": 50.00
  }
  ```
- **Response**:
  - **Status Code**: `200 OK`
  - **Body**:
  ```json
  {
    "message": "Settled successfully",
    "transactions": [
      {
        "from": "Bob",
        "to": "Alice",
        "amount": 50.00
      }
    ]
  }
  ```

## Error Handling

All endpoints will return appropriate HTTP status codes and error messages in the following format:

- **Response**:
  - **Status Code**: `4xx` or `5xx`
  - **Body**:
  ```json
  {
    "error": "Error message describing the issue"
  }
  ```

## Authentication

All API requests require authentication via an API key. Include the API key in the request headers:

```
Authorization: Bearer YOUR_API_KEY
```

## Rate Limiting

To ensure fair usage, the API enforces rate limits. Exceeding the limit will result in a `429 Too Many Requests` response.