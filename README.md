## Echo Messaging

Lightweight real-time chat app (Spring Boot + React + WebSockets + JWT).

### Stack

- Backend: Spring Boot 3 / Java 21 / H2 (in‑memory) / STOMP over SockJS
- Frontend: React (Vite) + JWT auth

### Prerequisites

- Java 21 (check with `java -version`)
- Node.js 18+ & npm

### Run (Development)

Backend:

```bash
cd echo-backend
./mvnw spring-boot:run
```

Frontend (in a second terminal):

```bash
cd echo-frontend
npm install
npm run dev
```

Default URLs:

- API: http://localhost:8080
- Frontend: shown in terminal (usually http://localhost:5173 or 5176)
- WebSocket: ws://localhost:8080/ws

### Basic Flow

1. Register: POST /api/auth/register
2. Login: POST /api/auth/login → receive JWT
3. Use JWT as `Authorization: Bearer <token>` for protected endpoints & WebSocket connect headers.
4. Public messages: subscribe `/topic/public` / send `/app/chat.sendMessage`.
