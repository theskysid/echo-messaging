# Echo Messaging API Documentation

## Overview

Echo Messaging is a real-time chat application with REST API endpoints for authentication, messaging, and user management, plus WebSocket support for real-time communication.

**Base URL:** `http://localhost:8080/api`  
**WebSocket URL:** `ws://localhost:8080/ws`

---

## 🔐 Authentication Endpoints

### 1. User Registration

Register a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "online": false
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

### 2. User Login

Authenticate user and receive JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200 OK):**

```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "online": false
  },
  "token": "eyJhbGciOiJIUzM4NCJ9..."
}
```

**Headers Set:**

- `Set-Cookie: JWT=<token>; HttpOnly; Path=/; Max-Age=3600`

**cURL Example:**

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "password123"
  }'
```

---

### 3. User Logout

**Endpoint:** `POST /api/auth/logout`  
**Authentication:** Required (Bearer Token)

**Response (200 OK):**

```json
"User logged out successfully"
```

**cURL Example:**

```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 4. Get Current User

Get currently authenticated user information.

**Endpoint:** `GET /api/auth/getcurrentuser`  
**Authentication:** Required (Bearer Token)

**Response (200 OK):**

```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "online": false
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:8080/api/auth/getcurrentuser \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 5. Get Online Users

Retrieve list of currently online users.

**Endpoint:** `GET /api/auth/getonlineusers`  
**Authentication:** Required (Bearer Token)

**Response (200 OK):**

```json
{
  "onlineUsers": ["alice", "bob", "charlie"],
  "count": 3
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:8080/api/auth/getonlineusers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 💬 Message Endpoints

### 6. Get Public Messages

Retrieve all public chat messages.

**Endpoint:** `GET /api/messages/public`  
**Authentication:** Required (Bearer Token)

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "sender": "alice",
    "content": "Hello everyone!",
    "type": "CHAT",
    "timestamp": "2025-09-28T10:30:00",
    "color": "#007bff",
    "recepient": null
  },
  {
    "id": 2,
    "sender": "bob",
    "content": "Hi Alice!",
    "type": "CHAT",
    "timestamp": "2025-09-28T10:31:00",
    "color": "#28a745",
    "recepient": null
  }
]
```

**cURL Example:**

```bash
curl -X GET http://localhost:8080/api/messages/public \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 7. Get Private Messages

Retrieve private messages between two users.

**Endpoint:** `GET /api/messages/private`  
**Authentication:** Required (Bearer Token)

**Query Parameters:**

- `user1` (string, required): First user's username
- `user2` (string, required): Second user's username

**Response (200 OK):**

```json
[
  {
    "id": 3,
    "sender": "alice",
    "content": "Hey Bob, how are you?",
    "type": "PRIVATE_MESSAGE",
    "timestamp": "2025-09-28T10:32:00",
    "color": "#007bff",
    "recepient": "bob"
  },
  {
    "id": 4,
    "sender": "bob",
    "content": "I'm good, thanks Alice!",
    "type": "PRIVATE_MESSAGE",
    "timestamp": "2025-09-28T10:33:00",
    "color": "#28a745",
    "recepient": "alice"
  }
]
```

**cURL Example:**

```bash
curl -X GET "http://localhost:8080/api/messages/private?user1=alice&user2=bob" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔌 WebSocket Integration

### WebSocket Connection

**URL:** `ws://localhost:8080/ws`  
**Protocol:** SockJS + STOMP

**Connection Headers:**

```javascript
{
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

### Subscribe Destinations

#### Public Chat

```javascript
stompClient.subscribe("/topic/public", function (message) {
  // Handle public messages
  const chatMessage = JSON.parse(message.body);
});
```

#### Private Messages

```javascript
stompClient.subscribe(
  "/user/" + username + "/queue/messages",
  function (message) {
    // Handle private messages
    const privateMessage = JSON.parse(message.body);
  }
);
```

### Send Destinations

#### Join Chat

```javascript
stompClient.send(
  "/app/chat.addUser",
  {},
  JSON.stringify({
    sender: username,
    type: "JOIN",
  })
);
```

#### Send Public Message

```javascript
stompClient.send(
  "/app/chat.sendMessage",
  {},
  JSON.stringify({
    sender: username,
    content: "Hello everyone!",
    type: "CHAT",
  })
);
```

#### Send Private Message

```javascript
stompClient.send(
  "/app/chat.sendPrivateMessage",
  {},
  JSON.stringify({
    sender: username,
    recepient: "recipient_username",
    content: "Private message content",
    type: "PRIVATE_MESSAGE",
  })
);
```

---

## 📝 Data Models

### User Model

```json
{
  "id": "number",
  "username": "string",
  "email": "string",
  "online": "boolean"
}
```

### Chat Message Model

```json
{
  "id": "number",
  "sender": "string",
  "content": "string",
  "type": "CHAT | JOIN | LEAVE | PRIVATE_MESSAGE | TYPING",
  "timestamp": "ISO datetime string",
  "color": "string (hex color)",
  "recepient": "string (nullable)"
}
```

### Login Request Model

```json
{
  "username": "string",
  "password": "string"
}
```

### Register Request Model

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

---

## 🔒 Authentication & Security

### JWT Token

- **Header:** `Authorization: Bearer <token>`
- **Expiration:** 1 hour
- **Algorithm:** HS384
- **Claims:** `userId`, `sub` (username), `iat`, `exp`

### CORS Configuration

- **Allowed Origins:** `http://localhost:5173`, `http://localhost:5174`, `http://localhost:5176`
- **Allowed Methods:** `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- **Credentials:** Allowed

---

## 🚨 Error Responses

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "User not authenticated"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Access denied"
}
```

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid request format"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

---

## 🧪 Testing Examples

### Complete Authentication Flow

```bash
# 1. Register User
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'

# 2. Login User
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}')

# 3. Extract Token
TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')

# 4. Get Current User
curl -X GET http://localhost:8080/api/auth/getcurrentuser \
  -H "Authorization: Bearer $TOKEN"

# 5. Get Public Messages
curl -X GET http://localhost:8080/api/messages/public \
  -H "Authorization: Bearer $TOKEN"
```

### JavaScript Frontend Integration

```javascript
// Login and get token
const loginResponse = await fetch("http://localhost:8080/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    username: "testuser",
    password: "test123",
  }),
});

const loginData = await loginResponse.json();
const token = loginData.token;

// Use token for authenticated requests
const messagesResponse = await fetch(
  "http://localhost:8080/api/messages/public",
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const messages = await messagesResponse.json();
```

---

## 🛠️ Development Setup

### Prerequisites

- Java 21
- Node.js 18+
- Maven 3.6+

### Running the Application

```bash
# Backend
cd echo-backend
./mvnw spring-boot:run

# Frontend
cd echo-frontend
npm install
npm run dev
```

### Database Access

- **H2 Console:** http://localhost:8080/h2-console
- **JDBC URL:** `jdbc:h2:mem:echomessaging`
- **Username:** `sr`
- **Password:** (empty)

---

## 📚 Additional Resources

- **Frontend URL:** http://localhost:5173
- **Backend URL:** http://localhost:8080
- **WebSocket Endpoint:** ws://localhost:8080/ws
- **API Base URL:** http://localhost:8080/api

---

_This documentation covers all available endpoints and features of the Echo Messaging API. For real-time messaging functionality, use the WebSocket integration alongside the REST API endpoints._
