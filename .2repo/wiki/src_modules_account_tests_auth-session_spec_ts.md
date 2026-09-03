# src/modules/account/tests/auth-session.spec.ts

## Purpose

Unit tests for the auth store's session flows (login, logout, logoutEverywhere, password reset). Only the HTTP transport is mocked; the generated client, session, profile, and observability stores all execute for real, so the assertions validate the exact state the router guards read. `signup` is deliberately excluded and covered in `auth-signup.spec.ts`.

## Key elements

- **`responses`** – A `Record<string, unknown>` keyed by `"METHOD /path"`, rebuilt in every `beforeEach`. Tests override a single entry instead of re-mocking the module, keeping the default shape in one place.
- **`vi.mock('@/infrastructure/http', …)`** – Replaces `orvalMutator` with a function that looks up `responses` by URL. Unknown endpoints resolve to `undefined` (not a throw), because several actions discard their response body.
- **`requestedUrls()`** – Extracts the ordered list of request URLs from the mock's call history, used to assert call sequence (e.g. login must precede profile fetch).
- **`USER`** – A representative user record reused across login/session assertions.
- **`describe` blocks** – `login` (token storage, request order, `remember` tier mapping, viewer projection, admin flag, missing-token edge case), `logout` (single-session endpoint, state clearing, profile cache drop), `the password reset flow` (request + confirm endpoints), `logoutEverywhere` (logout-all endpoint, session invalidation).

## Relationships

- **`src/infrastructure/http/index.ts`** – The sole mocked dependency. The test intercepts `orvalMutator` so that all higher layers (generated API client, Pinia stores) run unmocked against the transport boundary. No other module from that file is imported or asserted on.

## Notes

- Login is treated as *coordination* (store a token, fetch a profile), not computation. Asserting against the real `useSessionStore` is intentional: it mirrors what the router guards actually read.
- The session `viewer` is a **projection** limited to `{ id, email, admin }`. A test asserts that no extra fields leak through, guarding the shell's boundary from knowing the full `User` type.
- The `remember` checkbox maps to the string `'medium'` in the request body; when omitted, the field is sent as `undefined` (not absent), which is asserted explicitly.
- Unknown endpoints in the `responses` table resolve to `undefined` rather than throwing, keeping the table focused on meaningful answers rather than exhaustive endpoint coverage.
