# Chat Terminal

Chat Terminal is a terminal-first messaging project with two parts:

1. A **TypeScript backend** that handles authentication, friendships, chats, and real-time messaging.
2. A **Go TUI client** focused on terminal UX and local user state.

It is designed as a portfolio-ready full-stack system that combines API design, persistent data modeling, and WebSocket communication.

## Core Capabilities

- Account registration and login with JWT access and refresh tokens
- Token validation and access token renewal flow
- Friendship requests (send, accept, reject, list)
- Chat creation and chat lookup by participant
- Real-time chat messages over WebSocket
- Message persistence in SQLite via Prisma
- Multi-screen terminal interface built with `tview`

## Architecture

| Layer | Stack | Purpose |
| --- | --- | --- |
| Backend API | Node.js, TypeScript, Express | HTTP endpoints for auth, friendships, and chats |
| Real-time Transport | `ws` | WebSocket chat events and broadcast |
| Backend Persistence | Prisma (PostgreSQL runtime, SQLite tests) | Users, chats, memberships, friendships, messages |
| TUI Client | Go, `tview`, `tcell` | Interactive terminal UI |
| TUI Local State | GORM + SQLite | Local persisted session-related data |

## Repository Structure

```text
backend/   TypeScript API + WebSocket server + Prisma schema
tui/       Go terminal user interface
```

## Getting Started

### Prerequisites

- Node.js and npm
- Go 1.24+
- SQLite (file-based, created locally)
- Optional: Redis (helper utilities exist in backend config)
- Docker and Docker Compose (for containerized runtime)

### Run the Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
JWT_SECRET=replace_with_access_secret
JWT_REFRESH_SECRET=replace_with_refresh_secret
REDIS_URL=redis://localhost:6379
# Optional override
# PORT=8080
```

Apply database migrations:

```bash
npx prisma migrate dev
```

Start the API:

```bash
npm run dev
```

Current port behavior:

- If `PORT` is **not** set: HTTP on `http://localhost:8080` and WebSocket on `ws://localhost:3030`
- If `PORT` **is** set: both services use that same value

### Run with Docker Compose

From repository root:

```bash
docker compose up --build
```

This starts:

- `backend` (TypeScript API + WebSocket)
- `postgres` (runtime database)
- `redis` (cache/infrastructure service)

Default runtime endpoints:

- HTTP: `http://localhost:8080`
- WebSocket: `ws://localhost:3030`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Runtime DB strategy:

- Docker runtime uses PostgreSQL (`prisma/schema.postgres.prisma`).
- Jest tests remain SQLite-isolated (`prisma/schema.prisma` + `tests/.tmp` database files).

Run backend tests in containerized environment:

```bash
docker compose run --rm backend npm test
```

### Run the TUI

```bash
cd tui
go mod download
go run ./cmd
```

The TUI creates local state in `tui/internal/state/test.db`.

## HTTP API Surface

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/jwt`

### Friends

- `POST /api/friend/send`
- `POST /api/friend/accept`
- `POST /api/friend/reject`
- `GET /api/friend/requests`
- `GET /api/friend/list`

### Chats

- `POST /api/chat/create`
- `GET /api/chat/all`
- `GET /api/chat/with`

## WebSocket Message Shape

Client messages follow:

```json
{
  "type": "join | chat",
  "payload": {}
}
```

Join a chat:

```json
{
  "type": "join",
  "payload": {
    "username": "alice",
    "token": "<access_token>",
    "chatId": "1"
  }
}
```

Send a chat message:

```json
{
  "type": "chat",
  "payload": {
    "username": "alice",
    "token": "<access_token>",
    "text": "Hello from terminal"
  }
}
```

## Data Model Overview

- **User**: username, password hash, refresh token
- **Friendship**: requester, receiver, status
- **Chat**: name, creator, members
- **Member**: user-to-chat relation with role
- **Message**: text, sender, chat, timestamp

## License

MIT License. See `LICENSE`.
