# Architecture Notes

## Overview
FluxChat is a PNPM workspace monorepo with three packages:
- `apps/api`: Express + Socket.IO + Mongoose backend.
- `apps/web`: React + Vite frontend.
- `packages/shared`: shared zod validators, DTO types.

## Request Flow
1. User signs up/logs in via `POST /api/auth/signup` or `POST /api/auth/login`.
2. API returns JWT token; web stores it in localStorage.
3. All protected REST requests send `Authorization: Bearer <token>`.
4. Socket.IO connection authenticates with the same token in `auth.token`.

## Realtime Flow
- Client emits:
  - `room:join`, `room:leave`
  - `message:send`
  - `typing:start`, `typing:stop`
- Server emits:
  - `room:presence`
  - `message:new`
  - `message:ack`
  - `typing:update`

Presence and typing are in-memory maps keyed by room id. Message durability is MongoDB-backed.

## Persistence Model
Collections:
- `users`
  - unique index: `email`
- `rooms`
  - unique index: `name`
- `memberships`
  - unique compound index: `userId + roomId`
  - `lastReadAt` used for read receipts + unread counts
- `messages`
  - index: `roomId + createdAt` for timeline pagination

## API Design
- REST handles auth, profile updates, room CRUD, historical pagination, and read receipts.
- Socket.IO handles low-latency fan-out and presence/typing.
- Error shape is consistent:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

## Security Controls
- Password hashing: `bcryptjs`.
- Auth route rate limiting: `express-rate-limit`.
- Message send rate limiting per socket user.
- Validation: shared `zod` schemas.
- Message sanitization: trim + whitespace collapse + max length guard.
- Strict CORS allowlist from `CLIENT_ORIGIN`.

## Reliability Notes
- Socket reconnect is enabled; on reconnect, client rejoins known rooms.
- Room message history uses cursor-like `before` timestamp pagination.
- Read receipts are simple `lastReadAt` updates per membership.

## Storage Choice
Avatar storage uses Option C (base64 data URL in MongoDB). This keeps the MVP self-contained and free-tier friendly, with the tradeoff of larger document sizes and less efficient media delivery compared to Cloudinary/Supabase.
