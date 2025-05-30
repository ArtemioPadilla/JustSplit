# CyberEco Platform API Reference

> **🌿 CyberEco Context**: These API endpoints embody our platform's human-centered design philosophy, prioritizing user autonomy, transparent data handling, and conscious technology interactions.

This comprehensive API reference covers all CyberEco applications, demonstrating our core values of digital sovereignty and wellbeing by design.

## 🎯 API Design Principles

- **🔐 Privacy First**: All endpoints respect user data sovereignty
- **🤝 Community Focused**: APIs designed to strengthen social connections
- **🌱 Wellbeing Oriented**: Technology that enhances rather than exploits user attention
- **🔓 Transparency**: Clear, documented, and open endpoint behavior
- **🔄 Cross-App Integration**: Seamless data flow between applications
- **📊 Real-time Updates**: WebSocket support for live collaboration

## Base URLs

### Production Environment
```
Hub (Authentication):     https://api.cybereco.io/hub/v1
JustSplit (Expenses):     https://api.cybereco.io/justsplit/v1
Somos (Family Trees):     https://api.cybereco.io/somos/v1      [Planned]
Demos (Governance):       https://api.cybereco.io/demos/v1      [Planned]
Plantopia (Gardening):    https://api.cybereco.io/plantopia/v1  [Planned]
```

### Development Environment
```
All Services: https://api-dev.cybereco.io/{service}/v1
```

## 🔐 Authentication & Authorization

### Multi-Project Authentication Flow

CyberEco uses a centralized authentication system through Hub with cross-app token sharing:

1. **Initial Authentication**: User authenticates with Hub
2. **Token Generation**: Hub generates JWT with cross-app permissions
3. **Token Sharing**: Applications validate tokens through Hub service
4. **Refresh Mechanism**: Automatic token refresh maintains session

### Authentication Headers

```http
Authorization: Bearer {jwt_token}
X-App-Context: {requesting_app}
X-User-ID: {user_id}
```

### Token Request

```http
POST https://api.cybereco.io/hub/v1/auth/token
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "app_scope": ["justsplit", "somos", "demos"]
}
```

### Token Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "scope": ["justsplit", "somos", "demos"],
  "user": {
    "id": "user_12345",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": "https://cdn.cybereco.io/avatars/user_12345.jpg"
  }
}
```

# 🏛️ Hub API Endpoints

## User Management

### Create User Account

```http
POST /hub/v1/users
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "display_name": "John Doe",
  "preferences": {
    "language": "en",
    "theme": "light",
    "notifications": true
  }
}
```

**Response (201 Created):**
```json
{
  "id": "user_12345",
  "email": "user@example.com",
  "display_name": "John Doe",
  "avatar_url": null,
  "created_at": "2024-01-15T10:30:00Z",
  "preferences": {
    "language": "en",
    "theme": "light",
    "notifications": true
  },
  "app_permissions": ["justsplit"]
}
```

### Get User Profile

```http
GET /hub/v1/users/{user_id}
Authorization: Bearer {jwt_token}
```

### Update User Profile

```http
PUT /hub/v1/users/{user_id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "display_name": "John Smith",
  "avatar_url": "https://cdn.cybereco.io/avatars/new_avatar.jpg",
  "preferences": {
    "language": "es",
    "theme": "dark"
  }
}
```

## Application Permissions

### Grant App Access

```http
POST /hub/v1/users/{user_id}/permissions
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "app_id": "somos",
  "permissions": ["read", "write", "share"]
}
```

### Revoke App Access

```http
DELETE /hub/v1/users/{user_id}/permissions/{app_id}
Authorization: Bearer {jwt_token}
```

# 💰 JustSplit API Endpoints

## Expense Management

### Create Expense

```http
POST /justsplit/v1/expenses
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "description": "Dinner at La Tavola",
  "amount": 120.50,
  "currency": "USD",
  "category": "food",
  "group_id": "group_789",
  "paid_by": "user_12345",
  "split_type": "equal",
  "participants": [
    {
      "user_id": "user_12345",
      "amount": 40.17
    },
    {
      "user_id": "user_67890",
      "amount": 40.17
    },
    {
      "user_id": "user_54321",
      "amount": 40.16
    }
  ],
  "date": "2024-01-15T19:30:00Z",
  "location": {
    "name": "La Tavola Restaurant",
    "address": "123 Main St, City, State",
    "coordinates": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  },
  "receipt_url": "https://cdn.cybereco.io/receipts/receipt_12345.jpg",
  "tags": ["dinner", "celebration", "birthday"]
}
```

**Response (201 Created):**
```json
{
  "id": "expense_12345",
  "description": "Dinner at La Tavola",
  "amount": 120.50,
  "currency": "USD",
  "category": "food",
  "group_id": "group_789",
  "paid_by": {
    "user_id": "user_12345",
    "display_name": "John Doe",
    "avatar_url": "https://cdn.cybereco.io/avatars/user_12345.jpg"
  },
  "split_type": "equal",
  "participants": [
    {
      "user_id": "user_12345",
      "display_name": "John Doe",
      "amount": 40.17,
      "status": "paid"
    },
    {
      "user_id": "user_67890",
      "display_name": "Jane Smith",
      "amount": 40.17,
      "status": "owes"
    },
    {
      "user_id": "user_54321",
      "display_name": "Bob Johnson",
      "amount": 40.16,
      "status": "owes"
    }
  ],
  "date": "2024-01-15T19:30:00Z",
  "created_at": "2024-01-15T20:00:00Z",
  "updated_at": "2024-01-15T20:00:00Z",
  "location": {
    "name": "La Tavola Restaurant",
    "address": "123 Main St, City, State",
    "coordinates": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  },
  "receipt_url": "https://cdn.cybereco.io/receipts/receipt_12345.jpg",
  "tags": ["dinner", "celebration", "birthday"],
  "status": "active"
}

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