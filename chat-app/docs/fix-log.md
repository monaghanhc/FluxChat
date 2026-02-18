# Fix Log

- 2026-02-18: Initialized repository structure and baseline tooling.
- 2026-02-18: `@chat/api` lint failed (`consistent-type-imports`, `no-unused-vars`); refactored `src/lib/dto.ts` message typing and marked Express `next` as used in `src/middleware/error-handler.ts`.
- 2026-02-18: `@chat/api` typecheck failed (`TS6059` rootDir mismatch for tests); added `apps/api/tsconfig.typecheck.json` and switched `typecheck` script to it.
- 2026-02-18: `@chat/api` typecheck failed (shared path alias scope + JWT overload + nullable avatar fields); removed root `paths` mapping, switched `@chat/shared` typing to source entry, tightened JWT `expiresIn` typing, and normalized nullable avatar mapping in DTO/socket layers.
- 2026-02-18: `@chat/api` tests failed resolving `@chat/shared` entry before build; added `predev`/`prestart`/`pretest` hooks in `apps/api/package.json` to build shared package first.
- 2026-02-18: `@chat/web` unit tests failed (`expect` undefined and e2e specs collected by Vitest); configured Vitest globals/include/exclude and switched `src/test/setup.ts` to `expect.extend(matchers)`.
- 2026-02-18: `@chat/web` unit setup still failed (`expect.extend` runtime undefined); replaced custom matcher wiring with `@testing-library/jest-dom/vitest`.
- 2026-02-18: `AuthForm` unit test assertion failed due browser email input behavior; updated test to validate short-password zod path with a valid email.
- 2026-02-18: Playwright e2e failed due click interception on room-create button; switched room creation to Enter key submit in `apps/web/e2e/chat-realtime.spec.ts`.
- 2026-02-18: Playwright selector strictness failed on duplicate `#room-name` matches; replaced ambiguous text selectors with heading/room-button locators.
- 2026-02-18: `@chat/api` typecheck failed after in-memory DB support due `MongoMemoryServer` typing mismatch; updated `src/server.ts` to use explicit `MongoMemoryServer` type and safe local variable assignment.
- 2026-02-18: Root lint failed (`consistent-type-imports`) on `import()` type syntax in `apps/api/src/server.ts`; switched to `import type { MongoMemoryServer }`.
- 2026-02-18: Local Docker MongoDB smoke test failed because Docker engine was unavailable in this environment; validated runtime using in-memory DB fallback (`API_STATUS=200`, `WEB_STATUS=200`) and retained docker workflow docs for standard local setup.
- 2026-02-18: Addressed frontend reliability gaps by making room-create input controlled and preventing socket reconnect loops on room-state changes; also fixed create-room membership join ordering.
- 2026-02-18: Expanded unit test suite; `MessageInput` tests initially timed out due fake-timer + user-event interaction. Reworked tests to use real timers for interaction flows and isolated fake timers to the debounce assertion via `fireEvent.change`.
- 2026-02-18: Prepared free-tier deployment IaC and docs updates: added root `render.yaml`, `chat-app/vercel.json`, one-click Render/Vercel links, and corrected monorepo root/build commands for workspace-safe cloud builds.
- 2026-02-18: UI/UX refresh for web app: added dynamic document titles, live connection status pill, responsive mobile room/profile drawers with overlay controls, improved topbar branding, and enhanced motion/focus/spacing styles for better accessibility and responsiveness.
