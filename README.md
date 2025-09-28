# Echo Messaging - Real-Time Chat Application

## 🚀 Quick Start

### 1. Start Backend

```bash
cd echo-backend
./mvnw spring-boot:run
```

Backend runs on: `http://localhost:8080`

### 2. Start Frontend

```bash
cd echo-frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5176` (or next available port)

## 📚 API Endpoints

### Authentication

- **Register**: `POST /api/auth/register`

  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```

- **Login**: `POST /api/auth/login`
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```

Both return JWT token in response.

### WebSocket Connection

- **URL**: `ws://localhost:8080/ws`
- **Headers**: Include `Authorization: Bearer <jwt_token>`
- **Subscribe**: `/topic/public` for public messages
- **Send Messages**: `/app/chat.sendMessage`
- **Add User**: `/app/chat.addUser`

## ✅ Recent Fixes Applied

1. **authService.js**:

   - Fixed API URLs: `/auth/register` and `/auth/login`
   - Changed HTTPS to HTTP for localhost
   - Added JWT token handling
   - Added request interceptor for Authorization header

2. **ChatArea.jsx**:

   - Added JWT token to WebSocket connection headers
   - Fixed import statements
   - Updated API calls to use correct authService methods

3. **vite.config.js**:

   - Added `global: 'globalThis'` to fix sockjs-client errors

4. **CSS**:
   - Fixed body layout issues causing blank screen

## 🔧 Features

- ✅ User Registration/Login with JWT
- ✅ Real-time public chat
- ✅ WebSocket connection with authentication
- ✅ Private messaging (frontend ready)
- ✅ Online users list
- ✅ Typing indicators
- ✅ Emoji picker
- ✅ Message history

## 🐛 Troubleshooting

If you get "Signup failed" error:

1. Ensure backend is running on port 8080
2. Check browser console for specific errors
3. Verify API endpoints match backend implementation

## 🌐 Access Points

- **Frontend**: http://localhost:5176/
- **Signup**: http://localhost:5176/signup
- **Login**: http://localhost:5176/login
- **Chat**: http://localhost:5176/chatarea (requires login)
