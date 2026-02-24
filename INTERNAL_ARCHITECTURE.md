# Echo Messaging - Internal Architecture Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Backend Deep Dive](#backend-deep-dive)
5. [Frontend Deep Dive](#frontend-deep-dive)
6. [Data Flow & Communication](#data-flow--communication)
7. [Security Implementation](#security-implementation)
8. [WebSocket Communication](#websocket-communication)
9. [Database Schema](#database-schema)
10. [Key Features Implementation](#key-features-implementation)

---

## Project Overview

Echo is a real-time messaging application that enables users to:
- Register and authenticate securely
- Send public messages to all online users
- Send private messages to specific users
- See online/offline user status in real-time
- Experience instant message delivery via WebSocket connections

---

## Technology Stack

### Backend
- **Framework**: Spring Boot 3.3.4
- **Language**: Java 21
- **Security**: Spring Security 6 + JWT Authentication
- **WebSocket**: STOMP over SockJS
- **Database**: H2 (in-memory)
- **ORM**: Spring Data JPA / Hibernate
- **Build Tool**: Maven

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router v7
- **HTTP Client**: Axios
- **WebSocket**: SockJS Client + STOMP.js
- **Styling**: CSS Modules

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Login/     │  │   ChatArea   │  │   PrivateChat       │  │
│  │   Signup     │  │   Component  │  │   Component         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                  │                    │                │
│         └──────────────────┼────────────────────┘                │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                    ┌────────┴─────────┐
                    │   HTTP / WS      │
                    └────────┬─────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    SPRING BOOT BACKEND                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Security Filter Chain                       │   │
│  │  ┌─────────────────┐    ┌────────────────────────┐      │   │
│  │  │ CORS Config     │───▶│ JwtAuthFilter          │      │   │
│  │  └─────────────────┘    └────────────────────────┘      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────┬───────────┼───────────┬──────────────────┐   │
│  │              │           │           │                  │   │
│  │ ┌────────────▼──┐  ┌────▼────────┐  ┌─────────────────▼─┐ │
│  │ │ AuthController│  │ChatController│  │MessageController │ │
│  │ └────────────┬──┘  └────┬────────┘  └─────────────────┬─┘ │
│  │              │           │                             │   │
│  │ ┌────────────▼──────┐  ┌▼────────────────┐  ┌─────────▼──┐ │
│  │ │AuthenticationSvc │  │  UserService    │  │   Repos    │ │
│  │ │    JwtService    │  │                 │  │            │ │
│  │ └──────────────────┘  └─────────────────┘  └────────────┘ │
│  │                                                            │ │
│  │ ┌──────────────────────────────────────────────────────┐ │ │
│  │ │            WebSocket Configuration                   │ │ │
│  │ │  • /ws endpoint (SockJS)                            │ │ │
│  │ │  • /topic/public (broadcast)                        │ │ │
│  │ │  • /user/{username}/queue/private (private)         │ │ │
│  │ │  • /app/* (application destination prefix)          │ │ │
│  │ └──────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                             │                                    │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │              H2 In-Memory Database                      │   │
│  │  ┌─────────────┐           ┌──────────────────┐        │   │
│  │  │  users      │           │  chat_messages   │        │   │
│  │  └─────────────┘           └──────────────────┘        │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## Backend Deep Dive

### 1. Application Entry Point

**File**: `EchoBackendApplication.java`

```java
@SpringBootApplication
public class EchoBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(EchoBackendApplication.class, args);
    }
}
```

The `@SpringBootApplication` annotation combines:
- `@Configuration`: Marks class as configuration source
- `@EnableAutoConfiguration`: Enables Spring Boot auto-configuration
- `@ComponentScan`: Scans for components in the package

### 2. Security Layer

#### SecurityConfig.java

**Purpose**: Configures HTTP security, CORS, JWT authentication

**Key Components**:

```
Request Flow:
HTTP Request → CORS Filter → JWT Filter → Authentication → Controller
```

- **CSRF**: Disabled (using JWT, not session-based)
- **CORS**: Configured to allow frontend origins (localhost:5173, localhost:3000)
- **Session Management**: STATELESS (no server-side sessions)
- **Public Endpoints**: `/auth/**`, `/ws/**`, `/h2-console/**`
- **Protected Endpoints**: All others require authentication

**Security Filter Chain**:
1. `JwtAuthenticationFilter` - Extracts & validates JWT from cookies
2. `UsernamePasswordAuthenticationFilter` - Standard Spring Security filter
3. If JWT valid → User authenticated
4. If JWT invalid/missing → 401 Unauthorized

#### JwtAuthenticationFilter.java

**Purpose**: Intercepts requests to extract and validate JWT tokens

**Flow**:
```
1. Extract JWT from Cookie header
2. Extract username from JWT
3. Validate token (signature, expiration)
4. Load user details from database
5. Create Authentication object
6. Set in SecurityContext
```

#### JwtService.java

**Purpose**: Handles JWT token generation and validation

**Key Methods**:
- `generateToken(User)`: Creates JWT with username, userId, expiration
- `extractUsername(String)`: Extracts username from token
- `extractUserId(String)`: Extracts user ID from token
- `isTokenValid(String)`: Validates token signature and expiration

**Token Structure**:
```json
{
  "sub": "username",
  "userId": "123",
  "iat": 1699999999,
  "exp": 1700003599
}
```

**Token Lifetime**: 1 hour (3600000ms)

### 3. WebSocket Configuration

#### WebSocketConfig.java

**Purpose**: Configures STOMP messaging over WebSocket

**Brokers**:
- **Simple Broker**: `/topic`, `/queue`, `/user`
  - `/topic/*` - Broadcast to all subscribers
  - `/queue/*` - Point-to-point queues
  - `/user/*` - User-specific destinations

**Application Destinations**: `/app/*`
- Client sends to: `/app/chat.sendMessage`
- Server processes via: `@MessageMapping("/chat.sendMessage")`

**STOMP Endpoint**: `/ws`
- Accessible at: `http://localhost:8080/ws`
- Fallback: SockJS (for browsers without WebSocket support)

#### WebSocket Flow:
```
1. Client connects to /ws via SockJS
2. STOMP handshake established
3. Client subscribes to topics:
   - /topic/public (public chat)
   - /user/{username}/queue/private (private messages)
4. Client sends messages to /app/* destinations
5. Server processes and broadcasts to appropriate topics
```

### 4. Controllers

#### AuthController.java

**Endpoints**:

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/auth/signup` | Register new user | No |
| POST | `/auth/login` | Authenticate user | No |
| POST | `/auth/logout` | Clear JWT cookie | Yes |
| GET | `/auth/getonlineusers` | Get list of online users | Yes |
| GET | `/auth/getcurrentuser` | Get current user details | Yes |

**Signup Flow**:
```
1. Validate username uniqueness
2. Hash password with BCrypt
3. Save user to database
4. Return UserDTO (no password)
```

**Login Flow**:
```
1. Find user by username
2. Authenticate with AuthenticationManager
3. Generate JWT token
4. Set HttpOnly cookie with token
5. Return UserDTO
```

**Cookie Configuration**:
- `httpOnly: true` - JavaScript cannot access
- `secure: true` - Only sent over HTTPS (production)
- `sameSite: strict` - CSRF protection
- `maxAge: 3600s` - 1 hour expiration

#### ChatController.java

**WebSocket Mappings**:

| Mapping | Destination | Description |
|---------|-------------|-------------|
| `/chat.addUser` | `/topic/public` | User joins chat |
| `/chat.sendMessage` | `/topic/public` | Send public message |
| `/chat.sendPrivateMessage` | `/user/{username}/queue/private` | Send private message |

**addUser() Flow**:
```
1. Verify user exists in database
2. Store username in WebSocket session attributes
3. Set user online status = true
4. Create JOIN message
5. Save to database
6. Broadcast to /topic/public
```

**sendMessage() Flow**:
```
1. Verify sender exists
2. Set timestamp (if not provided)
3. Save message to database
4. Broadcast to /topic/public (all subscribers receive)
```

**sendPrivateMessage() Flow**:
```
1. Verify sender and recipient exist
2. Set message type = PRIVATE_MESSAGE
3. Set timestamp
4. Save to database
5. Send to recipient: /user/{recipient}/queue/private
6. Send to sender: /user/{sender}/queue/private
   (for message sync across sender's devices)
```

#### MessageController.java

**REST Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/messages/private?user1=X&user2=Y` | Retrieve chat history between two users |

**Query Logic**:
```sql
SELECT * FROM chat_messages 
WHERE (sender = :user1 AND recipient = :user2)
   OR (sender = :user2 AND recipient = :user1)
ORDER BY timestamp ASC
```

### 5. Services

#### AuthenticationService.java

**Responsibilities**:
- User registration
- User login
- JWT token management
- Online user tracking

**signup()**:
```
1. Check username availability
2. Hash password (BCrypt)
3. Create User entity
4. Save to database
5. Return UserDTO
```

**login()**:
```
1. Find user by username
2. Authenticate credentials (AuthenticationManager)
3. Generate JWT token (JwtService)
4. Build LoginResponseDTO with token + user info
5. Return response (controller sets cookie)
```

**getOnlineUsers()**:
```
1. Query: SELECT * FROM users WHERE is_online = true
2. Convert to Map<username, User>
3. Return map
```

#### UserService.java

**Key Methods**:
- `userExists(username)`: Check if user exists
- `setUserOnlineStatus(username, boolean)`: Update online status
- Used by ChatController and WebSocketListener

#### CustomUserDetails.java

**Purpose**: Implements `UserDetailsService` for Spring Security

**Flow**:
```
1. Spring Security requests user details by username
2. Load user from UserRepository
3. Convert to UserDetails object
4. Return with authorities/roles
```

### 6. Models

#### User Entity

**Table**: `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Long | PK, Auto-increment | Primary key |
| username | String | UNIQUE, NOT NULL | User's unique identifier |
| password | String | NOT NULL | BCrypt hashed password |
| email | String | UNIQUE, NOT NULL | User's email |
| is_online | boolean | NOT NULL | Online status flag |

**Indexes**: 
- Unique on `username`
- Unique on `email`

#### ChatMessage Entity

**Table**: `chat_messages`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Long | PK, Auto-increment | Primary key |
| content | String | - | Message content |
| sender | String | - | Username of sender |
| recipient | String | - | Username of recipient (null for public) |
| color | String | - | Sender's color (UI) |
| timestamp | LocalDateTime | NOT NULL | Message timestamp |
| type | MessageType | ENUM | CHAT, PRIVATE_MESSAGE, JOIN, LEAVE, TYPING |

**Message Types**:
- `CHAT`: Public message
- `PRIVATE_MESSAGE`: Direct message
- `JOIN`: User joined notification
- `LEAVE`: User left notification
- `TYPING`: Typing indicator

### 7. Repositories

#### UserRepository.java

```java
interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    List<User> findByIsOnlineTrue();
}
```

**Methods**:
- `findByUsername()`: Used for authentication and user lookup
- `findByIsOnlineTrue()`: Get all currently online users

#### ChatMessageRepository.java

```java
interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    @Query("SELECT m FROM ChatMessage m WHERE ...")
    List<ChatMessage> findPrivateMessagesBetweenTwoUsers(String user1, String user2);
}
```

**Custom Query**: Retrieves bidirectional chat history between two users

### 8. Listeners

#### WebSocketListener.java

**Purpose**: Handles WebSocket lifecycle events

**Events Handled**:

1. **SessionConnectedEvent**
   - Triggered when WebSocket connection established
   - Logs connection

2. **SessionDisconnectEvent**
   - Triggered when WebSocket connection closed
   - Extracts username from session
   - Sets user online status = false
   - Creates LEAVE message
   - Broadcasts to /topic/public

**Flow on Disconnect**:
```
1. WebSocket connection lost
2. Extract username from session attributes
3. Update user.isOnline = false
4. Create ChatMessage (type: LEAVE)
5. Broadcast to /topic/public
6. All clients receive notification
7. UI updates to show user offline
```

### 9. Configuration Files

#### application.yml

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:realchatapplication
    driver: org.h2.Driver
    username: USERNAME
    password: PASSWORD
  jpa:
    hibernate:
      ddl-auto: create-drop  # Recreates schema on restart
    show-sql: true           # Log SQL queries
  h2:
    console:
      enabled: true          # H2 Console at /h2-console
      
jwt:
  secret: FGW390@#7&Ounjkebu!#%%GHOPQasx&Q
  expiration: 3600000        # 1 hour in milliseconds
```

**Database Mode**: In-memory (data lost on restart)
**Schema Management**: Auto-created from entities

---

## Frontend Deep Dive

### 1. Application Structure

```
src/
├── components/
│   ├── Navbar.jsx           # Navigation bar
│   └── ProtectedRoute.jsx   # Route guard for auth
├── pages/
│   ├── MainPage.jsx         # Landing page
│   ├── Login.jsx            # Login form
│   ├── Signup.jsx           # Registration form
│   ├── ChatArea.jsx         # Public chat interface
│   └── PrivateChat.jsx      # Private chat interface
├── services/
│   └── authService.js       # Authentication & HTTP utilities
├── styles/                  # CSS modules
├── App.jsx                  # Main app component
└── main.jsx                 # Entry point
```

### 2. Routing

**File**: `App.jsx`

```
/                 → MainPage (public)
/login            → Login (public)
/signup           → Signup (public)
/chatarea         → ChatArea (protected)
```

**Protected Routes**: Use `ProtectedRoute` component
- Checks for authentication
- Redirects to `/login` if not authenticated

### 3. Authentication Service

**File**: `authService.js`

**Axios Configuration**:
```javascript
const api = axios.create({
    baseURL: 'http://localhost:8080',
    withCredentials: true  // Send cookies with requests
});
```

**Key Functions**:

1. **login(username, password)**
   ```
   1. POST /auth/login
   2. Receive UserDTO
   3. Generate random color for user
   4. Store in localStorage:
      - currentUser (with color)
      - user (original response)
   5. Return success + user data
   ```

2. **signup(username, email, password)**
   ```
   1. POST /auth/signup
   2. Receive UserDTO
   3. Return success
   ```

3. **logout()**
   ```
   1. POST /auth/logout
   2. Clear localStorage
   3. Navigate to login
   ```

4. **isAuthenticated()**
   ```
   Check if 'currentUser' exists in localStorage
   ```

5. **getOnlineUsers()**
   ```
   GET /auth/getonlineusers
   Return map of online users
   ```

**Interceptor**: Global error handling
- 401 → Auto-logout and redirect to login
- 403/404/500 → Log error

### 4. Chat Area Component

**File**: `ChatArea.jsx`

**State Management**:
```javascript
const [messages, setMessages] = useState([]);                // Public messages
const [onlineUsers, setOnlineUsers] = useState(new Set());  // Online user list
const [privateChats, setPrivateChats] = useState(new Map()); // Private chat windows
const [unreadMessages, setUnreadMessages] = useState(new Map()); // Unread counts
```

**WebSocket Connection Flow**:

```
1. Component mounts
2. Create SockJS connection to http://localhost:8080/ws
3. Create STOMP client over SockJS
4. Connect with headers:
   - client-id: username
   - session-id: timestamp
   - username: username
5. On successful connection:
   a. Subscribe to /topic/public
   b. Subscribe to /user/{username}/queue/private
   c. Send JOIN message to /app/chat.addUser
   d. Fetch online users via REST API
6. On message received:
   a. Public: Add to messages array
   b. Private: Route to appropriate handler or increment unread
7. On disconnect:
   a. Server broadcasts LEAVE message
   b. All clients update UI
```

**Message Handling**:

**Public Messages**:
```javascript
stompClient.subscribe('/topic/public', (msg) => {
    const chatMessage = JSON.parse(msg.body);
    
    // Handle different message types
    switch(chatMessage.type) {
        case 'JOIN':
            addUserToOnlineList(chatMessage.sender);
            break;
        case 'LEAVE':
            removeUserFromOnlineList(chatMessage.sender);
            break;
        case 'TYPING':
            showTypingIndicator(chatMessage.sender);
            break;
        default:
            addMessageToUI(chatMessage);
    }
});
```

**Private Messages**:
```javascript
stompClient.subscribe(`/user/${username}/queue/private`, (msg) => {
    const privateMessage = JSON.parse(msg.body);
    const otherUser = privateMessage.sender === username 
        ? privateMessage.recipient 
        : privateMessage.sender;
    
    // If chat window is open
    if (privateMessageHandlers.has(otherUser)) {
        handler(privateMessage);
    } else {
        // Increment unread count
        setUnreadMessages(prev => ({
            ...prev,
            [otherUser]: (prev[otherUser] || 0) + 1
        }));
    }
});
```

**Sending Messages**:

**Public**:
```javascript
const sendMessage = () => {
    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
        sender: username,
        content: message,
        type: 'CHAT',
        color: userColor
    }));
};
```

**Private**:
```javascript
const sendPrivateMessage = (recipient, content) => {
    stompClient.send("/app/chat.sendPrivateMessage", {}, JSON.stringify({
        sender: username,
        recipient: recipient,
        content: content,
        type: 'PRIVATE_MESSAGE',
        color: userColor
    }));
};
```

### 5. Private Chat Component

**File**: `PrivateChat.jsx`

**Features**:
- Loads chat history from REST API
- Displays messages in conversation format
- Sends messages via WebSocket
- Real-time message updates

**Initialization Flow**:
```
1. Component mounts
2. Fetch message history:
   GET /api/messages/private?user1=currentUser&user2=otherUser
3. Register message handler with parent (ChatArea)
4. Display messages
5. Listen for new messages via handler
```

---

## Data Flow & Communication

### 1. User Registration Flow

```
┌────────┐                  ┌────────────┐                 ┌──────────┐
│Frontend│                  │  Backend   │                 │ Database │
└───┬────┘                  └─────┬──────┘                 └────┬─────┘
    │                             │                             │
    │ POST /auth/signup           │                             │
    │ {username, email, pass}     │                             │
    ├────────────────────────────▶│                             │
    │                             │                             │
    │                             │ Check username unique       │
    │                             ├────────────────────────────▶│
    │                             │                             │
    │                             │ Hash password (BCrypt)      │
    │                             │                             │
    │                             │ INSERT INTO users           │
    │                             ├────────────────────────────▶│
    │                             │                             │
    │                             │ User saved                  │
    │                             │◀────────────────────────────┤
    │                             │                             │
    │ 200 OK                      │                             │
    │ {username, email, id}       │                             │
    │◀────────────────────────────┤                             │
    │                             │                             │
    │ Navigate to /login          │                             │
    │                             │                             │
```

### 2. User Login Flow

```
┌────────┐                  ┌────────────┐                 ┌──────────┐
│Frontend│                  │  Backend   │                 │ Database │
└───┬────┘                  └─────┬──────┘                 └────┬─────┘
    │                             │                             │
    │ POST /auth/login            │                             │
    │ {username, password}        │                             │
    ├────────────────────────────▶│                             │
    │                             │                             │
    │                             │ Find user by username       │
    │                             ├────────────────────────────▶│
    │                             │                             │
    │                             │ User entity                 │
    │                             │◀────────────────────────────┤
    │                             │                             │
    │                             │ Verify password hash        │
    │                             │ (BCrypt.matches)            │
    │                             │                             │
    │                             │ Generate JWT token          │
    │                             │ (sign with secret key)      │
    │                             │                             │
    │ 200 OK                      │                             │
    │ Set-Cookie: JWT=token       │                             │
    │ {username, email, id}       │                             │
    │◀────────────────────────────┤                             │
    │                             │                             │
    │ Store user + color in       │                             │
    │ localStorage                │                             │
    │                             │                             │
    │ Navigate to /chatarea       │                             │
    │                             │                             │
```

### 3. WebSocket Connection Flow

```
┌────────┐                  ┌────────────┐                 ┌──────────┐
│Frontend│                  │  Backend   │                 │ Database │
└───┬────┘                  └─────┬──────┘                 └────┬─────┘
    │                             │                             │
    │ Connect to /ws (SockJS)     │                             │
    ├────────────────────────────▶│                             │
    │                             │                             │
    │ STOMP CONNECT frame         │                             │
    ├────────────────────────────▶│                             │
    │                             │                             │
    │ CONNECTED frame             │                             │
    │◀────────────────────────────┤                             │
    │                             │                             │
    │ SUBSCRIBE /topic/public     │                             │
    ├────────────────────────────▶│                             │
    │                             │                             │
    │ SUBSCRIBE /user/{u}/queue   │                             │
    ├────────────────────────────▶│                             │
    │                             │                             │
    │ SEND /app/chat.addUser      │                             │
    │ {sender: user, type: JOIN}  │                             │
    ├────────────────────────────▶│                             │
    │                             │                             │
    │                             │ Store username in session   │
    │                             │                             │
    │                             │ UPDATE users                │
    │                             │ SET is_online = true        │
    │                             ├────────────────────────────▶│
    │                             │                             │
    │                             │ INSERT INTO chat_messages   │
    │                             ├────────────────────────────▶│
    │                             │                             │
    │                             │ Broadcast to /topic/public  │
    │ MESSAGE (JOIN)              │                             │
    │◀────────────────────────────┤                             │
    │                             │                             │
    │ Update UI (add user to      │                             │
    │ online list)                │                             │
    │                             │                             │
```

### 4. Public Message Flow

```
┌────────┐                  ┌────────────┐                 ┌──────────┐
│Frontend│                  │  Backend   │                 │ Database │
└───┬────┘                  └─────┬──────┘                 └────┬─────┘
    │                             │                             │
    │ User types message          │                             │
    │                             │                             │
    │ SEND /app/chat.sendMessage  │                             │
    │ {sender, content, type}     │                             │
    ├────────────────────────────▶│                             │
    │                             │                             │
    │                             │ Validate sender exists      │
    │                             ├────────────────────────────▶│
    │                             │                             │
    │                             │ User found                  │
    │                             │◀────────────────────────────┤
    │                             │                             │
    │                             │ Set timestamp               │
    │                             │                             │
    │                             │ INSERT INTO chat_messages   │
    │                             ├────────────────────────────▶│
    │                             │                             │
    │                             │ Message ID returned         │
    │                             │◀────────────────────────────┤
    │                             │                             │
    │                             │ Broadcast to /topic/public  │
    │                             │ (all subscribers)           │
    │ MESSAGE                     │                             │
    │◀────────────────────────────┤                             │
    │                             │                             │
    │ Display in chat UI          │                             │
    │                             │                             │
```

**Note**: All connected clients (including sender) receive the message

### 5. Private Message Flow

```
┌─────────┐             ┌────────────┐            ┌──────────┐            ┌─────────┐
│Frontend │             │  Backend   │            │ Database │            │Frontend │
│(Sender) │             │            │            │          │            │(Recvr)  │
└────┬────┘             └─────┬──────┘            └────┬─────┘            └────┬────┘
     │                        │                        │                       │
     │ SEND /app/chat.        │                        │                       │
     │ sendPrivateMessage     │                        │                       │
     ├───────────────────────▶│                        │                       │
     │ {sender, recipient,    │                        │                       │
     │  content, type}        │                        │                       │
     │                        │                        │                       │
     │                        │ Validate sender &      │                       │
     │                        │ recipient exist        │                       │
     │                        ├───────────────────────▶│                       │
     │                        │                        │                       │
     │                        │ Both found             │                       │
     │                        │◀───────────────────────┤                       │
     │                        │                        │                       │
     │                        │ Set type =             │                       │
     │                        │ PRIVATE_MESSAGE        │                       │
     │                        │                        │                       │
     │                        │ INSERT INTO            │                       │
     │                        │ chat_messages          │                       │
     │                        ├───────────────────────▶│                       │
     │                        │                        │                       │
     │                        │ Message saved (ID)     │                       │
     │                        │◀───────────────────────┤                       │
     │                        │                        │                       │
     │                        │ Send to recipient:     │                       │
     │                        │ /user/{recipient}/     │                       │
     │                        │ queue/private          │                       │
     │                        ├───────────────────────────────────────────────▶│
     │                        │                        │                       │
     │                        │                        │            MESSAGE    │
     │                        │                        │        (display in UI)│
     │                        │                        │                       │
     │                        │ Send to sender:        │                       │
     │ MESSAGE                │ /user/{sender}/queue   │                       │
     │◀───────────────────────┤                        │                       │
     │                        │                        │                       │
     │ Display in chat UI     │                        │                       │
     │ (confirmation)         │                        │                       │
     │                        │                        │                       │
```

**Why send to both?**
- Sender: Confirmation & sync across multiple devices/tabs
- Recipient: Deliver the actual message

### 6. User Disconnect Flow

```
┌────────┐                  ┌────────────┐                 ┌──────────┐
│Frontend│                  │  Backend   │                 │ Database │
└───┬────┘                  └─────┬──────┘                 └────┬─────┘
    │                             │                             │
    │ WebSocket connection lost   │                             │
    │ (user closes tab/browser)   │                             │
    ├────────────────────────────▶│                             │
    │                             │                             │
    │                             │ SessionDisconnectEvent      │
    │                             │ triggered                   │
    │                             │                             │
    │                             │ Extract username from       │
    │                             │ session attributes          │
    │                             │                             │
    │                             │ UPDATE users                │
    │                             │ SET is_online = false       │
    │                             │ WHERE username = ?          │
    │                             ├────────────────────────────▶│
    │                             │                             │
    │                             │ Updated                     │
    │                             │◀────────────────────────────┤
    │                             │                             │
    │                             │ Create LEAVE message        │
    │                             │                             │
    │                             │ Broadcast to /topic/public  │
    │ MESSAGE (LEAVE)             │                             │
    │◀────────────────────────────┤                             │
    │                             │                             │
    │ Update UI                   │                             │
    │ (remove from online list)   │                             │
    │                             │                             │
```

---

## Security Implementation

### 1. Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Spring Security Filter Chain                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   CORS Filter    │
                    │  (Allow origins) │
                    └────────┬─────────┘
                             │
                             ▼
                ┌────────────────────────────┐
                │  JwtAuthenticationFilter   │
                │                            │
                │  1. Extract JWT from       │
                │     Cookie header          │
                │  2. Validate signature     │
                │  3. Check expiration       │
                │  4. Extract username       │
                │  5. Load UserDetails       │
                │  6. Create Authentication  │
                │  7. Set SecurityContext    │
                └────────┬───────────────────┘
                         │
                         ▼
          ┌──────────────────────────────────┐
          │  Is user authenticated?          │
          └──────────┬───────────┬───────────┘
                     │           │
                  YES│           │NO
                     │           │
                     ▼           ▼
            ┌────────────┐  ┌─────────────┐
            │  Proceed   │  │ Return 401  │
            │  to        │  │ Unauthorized│
            │ Controller │  └─────────────┘
            └────────────┘
```

### 2. JWT Token Structure

**Header**:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload**:
```json
{
  "sub": "username",
  "userId": "123",
  "iat": 1699999999,
  "exp": 1700003599
}
```

**Signature**:
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

### 3. Password Security

**Hashing Algorithm**: BCrypt
- **Cost Factor**: 10 (default)
- **Salt**: Automatically generated per password
- **Example Hash**: `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`

**BCrypt Properties**:
- Slow by design (prevents brute force)
- Adaptive (cost factor can increase over time)
- Salted (prevents rainbow table attacks)

### 4. CORS Configuration

**Allowed Origins**: `*` (all patterns)
**Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
**Allowed Headers**: `*`
**Allow Credentials**: `true`
**Exposed Headers**: `Set-Cookie`

**Production Recommendation**: Restrict origins to specific domains

### 5. Security Best Practices Implemented

✅ **Stateless Authentication**: No server-side sessions
✅ **HttpOnly Cookies**: JavaScript cannot access JWT
✅ **CSRF Protection**: SameSite=Strict cookie attribute
✅ **Password Hashing**: BCrypt with salt
✅ **Token Expiration**: 1 hour lifetime
✅ **Authorization on Every Request**: JWT validated per request
✅ **Protected WebSocket**: Only authenticated users can connect

⚠️ **Improvements for Production**:
- HTTPS enforcement
- Refresh token mechanism
- Rate limiting
- Input validation/sanitization
- SQL injection prevention (use PreparedStatements)
- XSS protection headers

---

## WebSocket Communication

### 1. STOMP Protocol

**STOMP** (Simple Text Oriented Messaging Protocol) is a simple text-based protocol built on top of WebSocket.

**Key Concepts**:

- **Destination**: Where messages are sent/received (like channels)
- **Subscription**: Client registers interest in a destination
- **Message**: Unit of data sent between client and server

**STOMP Commands**:
- `CONNECT`: Establish connection
- `SUBSCRIBE`: Listen to a destination
- `SEND`: Send message to a destination
- `MESSAGE`: Server sends message to client
- `DISCONNECT`: Close connection

### 2. Destination Types

#### Public Broadcast: `/topic/*`
- One-to-many communication
- All subscribers receive the message
- Use case: Public chat room

**Example**:
```
Client A sends to /app/chat.sendMessage
→ Server broadcasts to /topic/public
→ Clients A, B, C, D all receive the message
```

#### Point-to-Point: `/queue/*`
- One-to-one communication
- Only specific user receives the message
- Use case: Notifications

#### User-Specific: `/user/{username}/*`
- Messages targeted to specific user
- Spring converts `/user/{username}/queue/private` to session-specific destination
- Use case: Private messages

**How it works**:
```
1. User "alice" subscribes to /user/alice/queue/private
2. Server maps this to session-specific destination (internal)
3. When message sent to /user/alice/queue/private:
   → Spring looks up alice's WebSocket session(s)
   → Delivers message only to alice's session(s)
```

### 3. Message Flow Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                        Client Side                            │
└───────────────────────────────────────────────────────────────┘
                              │
                              │ 1. Send message
                              │
                              ▼
                    ┌──────────────────┐
                    │  Application     │
                    │  Destination     │
                    │  /app/*          │
                    └────────┬─────────┘
                             │
                             │ 2. Route to @MessageMapping
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│                      Server Side                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │            ChatController                             │    │
│  │                                                       │    │
│  │  @MessageMapping("/chat.sendMessage")                │    │
│  │  @SendTo("/topic/public")                            │    │
│  │  public ChatMessage sendMessage(ChatMessage msg) {   │    │
│  │      // Save to DB                                   │    │
│  │      return msg;  // Broadcast to /topic/public      │    │
│  │  }                                                    │    │
│  └──────────────────────────────────────────────────────┘    │
│                             │                                 │
│                             │ 3. Return value sent to broker  │
│                             │                                 │
│                             ▼                                 │
│                    ┌──────────────────┐                       │
│                    │  Message Broker  │                       │
│                    │  (Simple/STOMP)  │                       │
│                    └────────┬─────────┘                       │
│                             │                                 │
└─────────────────────────────┼─────────────────────────────────┘
                              │
                              │ 4. Broadcast to subscribers
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│  Client A    │      │  Client B    │     │  Client C    │
│  (subscribed)│      │  (subscribed)│     │  (subscribed)│
└──────────────┘      └──────────────┘     └──────────────┘
```

### 4. SockJS Fallback

**Why SockJS?**
- Not all browsers/networks support WebSocket
- Corporate firewalls may block WebSocket
- Proxy servers may interfere

**SockJS Fallbacks** (in order):
1. **WebSocket**: Native browser support (preferred)
2. **HTTP Streaming**: Keeps HTTP connection open
3. **HTTP Long Polling**: Polls server for new messages
4. **JSONP Polling**: Cross-domain polling (last resort)

**Transparent to Application**:
- Client/server code remains the same
- SockJS handles protocol negotiation

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────┐
│            users                │
├─────────────────────────────────┤
│ PK │ id           │ BIGINT      │
│    │ username     │ VARCHAR     │ UNIQUE
│    │ password     │ VARCHAR     │
│    │ email        │ VARCHAR     │ UNIQUE
│    │ is_online    │ BOOLEAN     │
└─────────────────────────────────┘
               │
               │ (1) user can send many messages
               │
               │
┌──────────────▼──────────────────┐
│        chat_messages            │
├─────────────────────────────────┤
│ PK │ id           │ BIGINT      │
│    │ content      │ VARCHAR     │
│    │ sender       │ VARCHAR     │ → users.username
│    │ recipient    │ VARCHAR     │ → users.username (nullable)
│    │ color        │ VARCHAR     │
│    │ timestamp    │ DATETIME    │
│    │ type         │ VARCHAR     │ ENUM
└─────────────────────────────────┘
```

**Relationship**: One-to-Many (User → Messages)
- Not enforced with foreign keys (username stored as string)
- Allows flexibility but requires application-level validation

### SQL Schema (Auto-generated by Hibernate)

```sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    content VARCHAR(255),
    sender VARCHAR(255),
    recipient VARCHAR(255),
    color VARCHAR(50),
    timestamp TIMESTAMP NOT NULL,
    type VARCHAR(50)
);

CREATE INDEX idx_sender ON chat_messages(sender);
CREATE INDEX idx_recipient ON chat_messages(recipient);
CREATE INDEX idx_timestamp ON chat_messages(timestamp);
```

**Indexes** (recommended for performance):
- `sender`: Fast lookup of messages sent by user
- `recipient`: Fast lookup of messages received by user
- `timestamp`: Ordered retrieval of messages

### Sample Data

**users**:
```
| id | username | password                      | email           | is_online |
|----|----------|-------------------------------|-----------------|-----------|
| 1  | alice    | $2a$10$ABC...encrypted...XYZ       | alice@test.com  | true      |
| 2  | bob      | $2a$10$DEF...encrypted...UVW       | bob@test.com    | true      |
| 3  | charlie  | $2a$10$GHI...encrypted...RST       | charlie@test.com| false     |
```

**chat_messages**:
```
| id | content          | sender  | recipient | type            | timestamp           |
|----|------------------|---------|-----------|-----------------|---------------------|
| 1  | ""               | alice   | NULL      | JOIN            | 2024-11-14 10:00:00 |
| 2  | "Hello everyone!"| alice   | NULL      | CHAT            | 2024-11-14 10:00:05 |
| 3  | ""               | bob     | NULL      | JOIN            | 2024-11-14 10:01:00 |
| 4  | "Hi Alice!"      | bob     | alice     | PRIVATE_MESSAGE | 2024-11-14 10:01:30 |
| 5  | "Hey Bob!"       | alice   | bob       | PRIVATE_MESSAGE | 2024-11-14 10:01:45 |
```

---

## Key Features Implementation

### 1. User Online Status

**Mechanism**:
- `users.is_online` boolean field
- Updated on WebSocket connect/disconnect

**Flow**:
```
User connects → is_online = true
User disconnects → is_online = false
```

**Frontend Display**:
```javascript
const OnlineUserList = ({ users }) => {
    return users.map(user => (
        <div className="user-item">
            <span className="status-indicator online"></span>
            {user}
        </div>
    ));
};
```

**Polling** (optional):
- Frontend can periodically call `/auth/getonlineusers`
- Real-time updates via JOIN/LEAVE messages preferred

### 2. Private Messaging

**Implementation Details**:

**Database**:
- `recipient` field stores target username
- Query retrieves bidirectional messages:
  ```sql
  WHERE (sender = 'alice' AND recipient = 'bob')
     OR (sender = 'bob' AND recipient = 'alice')
  ```

**WebSocket Routing**:
- Server sends to both parties:
  - `/user/alice/queue/private`
  - `/user/bob/queue/private`

**Frontend State**:
```javascript
const [privateChats, setPrivateChats] = useState(new Map());
// Map structure:
// {
//   "bob": { messages: [...], unread: 0 },
//   "charlie": { messages: [...], unread: 2 }
// }
```

**Opening Private Chat**:
```
1. User clicks on username in online list
2. Fetch message history from REST API
3. Register message handler for real-time updates
4. Display chat window
5. Send messages via WebSocket
```

### 3. Message Persistence

**Why Save Messages?**
- Chat history retrieval
- Offline message delivery (future feature)
- Analytics/monitoring

**When Messages Are Saved**:
- Public messages: On send (in `ChatController.sendMessage()`)
- Private messages: On send (in `ChatController.sendPrivateMessage()`)
- Join/Leave: On event (in `ChatController.addUser()`, `WebSocketListener`)

**Timestamp Handling**:
```java
if (chatMessage.getTimestamp() == null) {
    chatMessage.setTimestamp(LocalDateTime.now());
}
```

**Database**: H2 in-memory (data lost on restart)
**Production**: Switch to PostgreSQL/MySQL for persistence

### 4. Typing Indicators (Partial Implementation)

**Message Type**: `TYPING`

**Flow**:
```
1. User types in input field
2. Debounced event sends TYPING message
3. Other users see "User is typing..." indicator
4. Indicator removed after 2 seconds
```

**Frontend Implementation**:
```javascript
const handleTyping = () => {
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Send typing indicator
    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
        sender: username,
        type: 'TYPING'
    }));
    
    // Auto-clear after 2 seconds
    setTypingTimeout(setTimeout(() => {
        setIsTyping('');
    }, 2000));
};
```

### 5. User Colors

**Purpose**: Visual distinction between users in chat

**Implementation**:
- Generated on login (frontend)
- Stored in localStorage
- Sent with each message
- Displayed as sender name color

**Color Palette**:
```javascript
const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];
```

**CSS**:
```css
.message-sender {
    color: var(--sender-color);
    font-weight: bold;
}
```

### 6. Emoji Support

**Implementation**:
```javascript
const emojis = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🎉', '🔥'];

const EmojiPicker = ({ onSelect }) => {
    return (
        <div className="emoji-picker">
            {emojis.map(emoji => (
                <span onClick={() => onSelect(emoji)}>{emoji}</span>
            ))}
        </div>
    );
};
```

**Inserting Emoji**:
```javascript
const insertEmoji = (emoji) => {
    setMessage(prevMessage => prevMessage + emoji);
};
```

---

## Conclusion

This documentation covers the complete internal architecture of the Echo messaging application. Key takeaways:

1. **Backend**: Spring Boot with JWT authentication, WebSocket support, and RESTful APIs
2. **Frontend**: React with real-time WebSocket connections and responsive UI
3. **Communication**: STOMP over SockJS for reliable bidirectional messaging
4. **Security**: Stateless JWT authentication with HttpOnly cookies
5. **Database**: H2 in-memory (development), easily switchable to production DB

The application demonstrates modern real-time web application patterns with clean separation of concerns, security best practices, and scalable architecture.

---

## Troubleshooting & Common Issues

### Backend Issues

1. **Port 8080 already in use**
   - Solution: Kill process or change port in `application.yml`

2. **JWT signature verification failed**
   - Check `jwt.secret` in `application.yml`
   - Ensure same secret used for signing and verification

3. **WebSocket connection refused**
   - Verify `/ws` endpoint is accessible
   - Check CORS configuration
   - Ensure SockJS is enabled

4. **User not authenticated**
   - Check JWT cookie is being sent
   - Verify token hasn't expired
   - Check `JwtAuthenticationFilter` is in filter chain

### Frontend Issues

1. **Cannot connect to WebSocket**
   - Verify backend is running on localhost:8080
   - Check browser console for connection errors
   - Ensure SockJS URL is correct

2. **Messages not appearing**
   - Check WebSocket subscription is active
   - Verify message type is correct
   - Check browser console for JavaScript errors

3. **Login fails with CORS error**
   - Ensure `withCredentials: true` in axios config
   - Verify CORS configuration in `SecurityConfig.java`

4. **Private messages not delivered**
   - Check both users are connected to WebSocket
   - Verify subscription to `/user/{username}/queue/private`
   - Check message recipient is correct

---

## Future Enhancements

- [ ] Message editing and deletion
- [ ] File/image sharing
- [ ] Group chats
- [ ] Read receipts
- [ ] Push notifications
- [ ] Message search
- [ ] User profiles and avatars
- [ ] Persistent database (PostgreSQL)
- [ ] Refresh token mechanism
- [ ] End-to-end encryption
- [ ] Mobile app (React Native)

---

**Document Version**: 1.0  
**Last Updated**: November 14, 2024  
**Author**: AI-Generated Documentation

