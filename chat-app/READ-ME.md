# READ-ME: FluxChat Complete Guide

This document is the full project handoff and onboarding guide for FluxChat.

## 1) What This Project Is
FluxChat is a Slack-lite real-time chat application built as a monorepo. It supports:
- JWT auth (signup/login/me)
- Public chat rooms
- Real-time messaging with Socket.IO
- Presence and typing indicators
- Message history with pagination
- Read receipts via membership `lastReadAt`
- User profile updates with avatar upload (base64 image URL stored in MongoDB)

## 2) Tech Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript + Socket.IO
- Database: MongoDB + Mongoose
- Shared validation/types: zod (`packages/shared`)
- Testing:
  - Backend: Vitest + Supertest + socket.io-client
  - Frontend: Vitest + React Testing Library
  - E2E: Playwright
- Quality:
  - ESLint
  - TypeScript strict typecheck
  - GitHub Actions CI

## 3) Monorepo Structure
```text
/chat-app
  /apps
    /api        # Express + Socket.IO backend
    /web        # React frontend
  /packages
    /shared     # shared zod schemas and TS types
  /docs
  docker-compose.yml
  README.md
  READ-ME.md
```

## 4) Core Architecture
### Request/Auth Flow
1. User signs up or logs in using REST endpoints.
2. Server returns JWT token.
3. Frontend stores token and sends it in `Authorization: Bearer <token>`.
4. Socket.IO handshake uses the same token for realtime auth.

### Realtime Flow
Client emits:
- `room:join`
- `room:leave`
- `message:send`
- `typing:start`
- `typing:stop`

Server emits:
- `room:presence`
- `message:new`
- `message:ack`
- `typing:update`

### Data Model
- `User`
  - `email` (unique)
  - `passwordHash`
  - `displayName`
  - `avatarUrl`
  - `createdAt`
- `Room`
  - `name` (unique)
  - `isPublic`
  - `createdAt`
- `Membership`
  - `userId + roomId` (unique compound)
  - `lastReadAt`
  - `createdAt`
- `Message`
  - `roomId`
  - `userId`
  - `text`
  - `createdAt`
  - index: `roomId + createdAt`

## 5) Security and Reliability Decisions
- Password hashing with `bcryptjs`
- Input validation with shared zod schemas
- Basic auth rate limiting with `express-rate-limit`
- Socket message rate limiting per user
- Sanitized message text (trim + whitespace normalize)
- Strict CORS allowlist via `CLIENT_ORIGIN`
- Consistent API error shape:
```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```
- Avatar storage choice: base64 image data URL in MongoDB (simpler MVP, less optimal for large-scale media/CDN)

## 6) Local Development
### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker Desktop (recommended for local MongoDB)

### Install
```bash
pnpm install
```

### Environment files
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### Run MongoDB (Docker)
```bash
docker compose up -d
```

### Optional seed data
```bash
pnpm seed
```
Creates:
- Demo user: `demo@fluxchat.local` / `password123`
- Rooms: `general`, `engineering`, `random`

### Run the app
```bash
pnpm dev
```
- Web: `http://localhost:5173`
- API: `http://localhost:4000`

### Fallback mode (if Docker unavailable)
```bash
pnpm dev:e2e
```
Runs API with in-memory MongoDB + web app.

## 7) Scripts
- `pnpm dev` - run API and web
- `pnpm dev:e2e` - run API (in-memory DB) and web
- `pnpm build` - build all packages
- `pnpm lint` - lint all packages
- `pnpm typecheck` - typecheck all packages
- `pnpm test` - unit + e2e
- `pnpm test:unit` - shared/api/web unit tests
- `pnpm test:e2e` - Playwright e2e
- `pnpm seed` - seed script

## 8) Environment Variables
### API (`apps/api/.env`)
- `NODE_ENV=development`
- `PORT=4000`
- `MONGODB_URI=mongodb://localhost:27017/fluxchat`
- `JWT_SECRET=<strong-random-secret>`
- `CLIENT_ORIGIN=http://localhost:5173`
- `JWT_EXPIRES_IN=7d`
- `AUTH_RATE_LIMIT_WINDOW_MS=60000`
- `AUTH_RATE_LIMIT_MAX=20`
- `MESSAGE_RATE_LIMIT_WINDOW_MS=5000`
- `MESSAGE_RATE_LIMIT_MAX=10`

### Web (`apps/web/.env`)
- `VITE_API_URL=http://localhost:4000`
- `VITE_SOCKET_URL=http://localhost:4000`

## 9) Testing and CI
### Local test commands
```bash
pnpm lint
pnpm typecheck
pnpm test
```

### Current test layers
- Shared schema tests
- API tests:
  - Auth success and negative paths
  - Room lifecycle and unread/read behavior
  - Message sanitization, pagination, permissions
  - User profile update and avatar validation
  - Utility tests (sanitize + rate limiter)
  - Socket connection/join/message realtime
- Web component tests:
  - AuthForm
  - RoomList
  - MessageList
  - MessageInput
  - ProfileEditor
  - ChatHeader
- E2E:
  - Signup/login
  - Create/join room
  - Realtime message across two browser contexts

### CI
Workflow: `.github/workflows/ci.yml`
Runs:
1. install
2. lint
3. typecheck
4. unit tests
5. Playwright install
6. e2e tests

## 10) API Overview
### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Rooms
- `GET /api/rooms`
- `POST /api/rooms`
- `POST /api/rooms/:roomId/join`
- `GET /api/rooms/:roomId/messages?limit=&before=`
- `POST /api/rooms/:roomId/messages`
- `POST /api/rooms/:roomId/read`

### Users
- `PUT /api/users/me`

## 11) Deployment Guide
### MongoDB Atlas
1. Create free cluster
2. Create DB user
3. Configure network access
4. Copy URI

### Render (Backend)
- Root directory: `chat-app/apps/api`
- Build command:
  `pnpm install --frozen-lockfile && pnpm --filter @chat/shared build && pnpm build`
- Start command:
  `pnpm start`
- Required env vars:
  - `NODE_ENV=production`
  - `MONGODB_URI=<atlas-uri>`
  - `JWT_SECRET=<secret>`
  - `CLIENT_ORIGIN=https://<vercel-domain>`
  - plus optional rate limit/JWT vars

### Vercel (Frontend)
- Root directory: `chat-app/apps/web`
- Build command: `pnpm build`
- Output dir: `dist`
- Env vars:
  - `VITE_API_URL=https://<render-domain>`
  - `VITE_SOCKET_URL=https://<render-domain>`

### Post-deploy verification
1. Login/signup works from Vercel frontend
2. Room create/join works
3. Realtime message appears on second client instantly
4. `/health` works on Render backend

## 12) Troubleshooting
- Web cannot call API:
  - Check `VITE_API_URL`, `VITE_SOCKET_URL`
  - Check Render CORS `CLIENT_ORIGIN`
- Socket connects but no events:
  - Confirm same JWT token sent in socket auth
  - Confirm user has joined room
- Messages not loading:
  - Verify membership exists (`join` first)
- Docker Mongo fails locally:
  - Use `pnpm dev:e2e` fallback

## 13) Known Limitations
- Avatar storage is base64 in MongoDB (not CDN-optimized)
- Presence/typing is in-memory per API instance (not horizontally shared)
- Frontend build includes emoji picker chunk warning due bundle size

## 14) Where to Read Next
- Product quickstart: `README.md`
- Architecture deep-dive: `docs/architecture.md`
- Change/fix history: `docs/fix-log.md`
- CI config: `.github/workflows/ci.yml`
