# 💬 Echo Messaging

A real-time messaging app built with Spring Boot, React, and PostgreSQL — fully containerized with Docker.

---

## 🛠 Tech Stack

- **Backend** → Spring Boot (Java 21) + JWT Auth + WebSocket
- **Frontend** → React + Vite
- **Database** → PostgreSQL 16
- **Containerization** → Docker + Docker Compose

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed

### 1. Clone the repository
```bash
git clone https://github.com/theskysid/echo-messaging.git
cd echo-messaging
```

### 2. Create your `.env` file
Create a `.env` file in the root directory and fill in your values:

```env
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/your_db_name
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=3600000
```

### 3. Run the app
```bash
docker compose up --build
```

### 4. Access the app
- Frontend → http://localhost:5173
- Backend → http://localhost:8080

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory with these variables:

```env
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/your_db_name
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=3600000
```

---

## 📁 Project Structure

```
echo-messaging/
├── docker-compose.yml
├── .env                  # not committed (see .gitignore)
├── echo-backend/         # Spring Boot app
│   └── Dockerfile
└── echo-frontend/        # React app
    └── Dockerfile
```

---

## 🧑‍💻 Development

To run only the database (for IntelliJ development):
```bash
docker compose up -d postgres
```
Then run the backend from IntelliJ normally.

---

## 📜 License
MIT
