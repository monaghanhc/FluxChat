# FluxChat (Slack-lite)

Production-oriented real-time chat app with auth, rooms, messaging, presence, typing indicators, profile avatars, tests, and CI.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript + Socket.IO
- DB: MongoDB + Mongoose
- Shared validation/types: zod (`packages/shared`)
- Tests:
  - Backend API/socket: Vitest + Supertest + socket.io-client
  - Frontend: Vitest + React Testing Library
  - E2E: Playwright (2 browser contexts, realtime assertion)

## Monorepo Structure
```text
/chat-app
  /apps
    /web
    /api
  /packages
    /shared
  /docs
  docker-compose.yml
```

## Features (MVP)
- Auth
  - Email/password signup/login
  - JWT bearer session
  - Password hashing (`bcryptjs`)
  - `GET /api/auth/me`
  - Auth route rate limiting
- Chat
  - Create/join public rooms
  - Realtime room messaging via Socket.IO
  - MongoDB message persistence
  - Message pagination (`before` + `limit`) with “Load older”
  - Room presence (online users)
  - Typing indicator per room
  - Read receipts via `Membership.lastReadAt`
- Profiles
  - Display name update
  - Avatar upload (Option C): base64 data URL stored in MongoDB
- UI/UX
  - Sidebar rooms + unread badges
  - Main chat area + top presence bar
  - Emoji picker
  - Responsive mobile layout

## Local Setup
### Prerequisites
- Node.js 20+
- PNPM 9+
- Docker Desktop (for local MongoDB path)

### 1) Install dependencies
```bash
pnpm install
```

### 2) Configure env files
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 3) Start MongoDB (Docker)
```bash
docker compose up -d
```

### 4) Seed demo data (optional)
```bash
pnpm seed
```
Creates demo user: `demo@fluxchat.local / password123` and rooms `general`, `engineering`, `random`.

### 5) Run app
```bash
pnpm dev
```
- Web: `http://localhost:5173`
- API: `http://localhost:4000`

### Fallback when Docker is unavailable
```bash
pnpm dev:e2e
```
Runs API with in-memory MongoDB and web app for local smoke/e2e workflow.

## Scripts
- `pnpm dev` - run API + web
- `pnpm dev:e2e` - run API (in-memory DB) + web
- `pnpm build` - build all packages
- `pnpm lint` - lint all packages
- `pnpm typecheck` - typecheck all packages
- `pnpm test` - unit + e2e
- `pnpm test:unit` - shared/api/web unit tests
- `pnpm test:e2e` - Playwright e2e
- `pnpm seed` - seed demo data

## API Env Vars (`apps/api`)
- `NODE_ENV` (`development`/`production`)
- `PORT` (default `4000`)
- `MONGODB_URI` (local docker or Atlas URI)
- `JWT_SECRET` (required, strong random value)
- `JWT_EXPIRES_IN` (default `7d`)
- `CLIENT_ORIGIN` (comma-separated allowlist)
- `AUTH_RATE_LIMIT_WINDOW_MS` (default `60000`)
- `AUTH_RATE_LIMIT_MAX` (default `20`)
- `MESSAGE_RATE_LIMIT_WINDOW_MS` (default `5000`)
- `MESSAGE_RATE_LIMIT_MAX` (default `10`)

## Web Env Vars (`apps/web`)
- `VITE_API_URL` (Render API URL)
- `VITE_SOCKET_URL` (Render API URL, same origin as Socket.IO server)

## Deployment (Click-by-click)
One-click links:
- Render (free backend): https://render.com/deploy?repo=https://github.com/monaghanhc/FluxChat
- Vercel (free frontend): https://vercel.com/new/clone?repository-url=https://github.com/monaghanhc/FluxChat&root-directory=chat-app
### A) MongoDB Atlas (free)
1. Create Atlas account.
2. Create free cluster.
3. Database Access -> create DB user.
4. Network Access -> allow Render egress (`0.0.0.0/0` for quick start, then tighten).
5. Copy connection string and set `<password>`.

### B) Render backend (`@chat/api`)
1. Push this repo to GitHub.
2. Render -> New -> Web Service -> select repo.
3. Root directory: `chat-app`
4. Build command: `pnpm install --frozen-lockfile && pnpm --filter @chat/shared build && pnpm --filter @chat/api build`
5. Start command: `pnpm --filter @chat/api start`
6. Instance: Free.
7. Add env vars:
   - `NODE_ENV=production`
   - `MONGODB_URI=<atlas-uri>`
   - `JWT_SECRET=<long-random-secret>`
   - `CLIENT_ORIGIN=https://<your-vercel-domain>`
   - `JWT_EXPIRES_IN=7d`
   - `AUTH_RATE_LIMIT_WINDOW_MS=60000`
   - `AUTH_RATE_LIMIT_MAX=20`
   - `MESSAGE_RATE_LIMIT_WINDOW_MS=5000`
   - `MESSAGE_RATE_LIMIT_MAX=10`
8. Deploy and verify `GET https://<render-domain>/health` returns `{ "ok": true }`.

### C) Vercel frontend (`@chat/web`)
1. Vercel -> New Project -> import same repo.
2. Framework: Vite.
3. Root directory: `chat-app`.
4. Build command: `pnpm --filter @chat/web build`
5. Output directory: `apps/web/dist`
6. Env vars:
   - `VITE_API_URL=https://<render-domain>`
   - `VITE_SOCKET_URL=https://<render-domain>`
7. Deploy.

### D) Cross-domain Realtime/Auth checks
1. Confirm Render `CLIENT_ORIGIN` exactly matches deployed Vercel URL (no trailing slash mismatch).
2. Open Vercel app, sign up, create room, open second browser/incognito, sign up, join room.
3. Send message in browser A and verify immediate appearance in browser B.
4. Confirm `Authorization: Bearer` header requests succeed against Render API.

## CI
GitHub Actions workflow: `.github/workflows/ci.yml`
- Installs dependencies
- Runs `pnpm lint`
- Runs `pnpm typecheck`
- Runs `pnpm test:unit`
- Installs Playwright Chromium
- Runs `pnpm test:e2e`

## Screenshots
Add deployment and app screenshots in `docs/screenshots/` and keep these links updated:
- `docs/screenshots/vercel-home.png`
- `docs/screenshots/render-service.png`
- `docs/screenshots/app-chat.png`

## Deployed URLs
- Frontend (Vercel): `https://YOUR-VERCEL-APP.vercel.app`
- Backend (Render): `https://YOUR-RENDER-SERVICE.onrender.com`

## Known Limitations
- Avatar storage uses base64 in MongoDB (simple MVP tradeoff; not CDN-optimized).
- Presence/typing state is in-memory per API instance (not multi-instance synchronized without Redis adapter).
- Message chunk size warning exists in frontend production build due emoji picker bundle size.

