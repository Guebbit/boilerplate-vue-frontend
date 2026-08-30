# src/modules/account/tests/profile.spec.ts

## Purpose

Unit tests for the profile store's user-facing flows (fetch, update, role change, password change, email verification, account deletion). The suite mocks **only** the HTTP transport (`orvalMutator`) with a URL-keyed router, so every layer above it — the generated API client, session store, observability store, and the `useStructureRestApi` composable — runs for real. A few cases establish a live session first via `useAuthStore().login`, mirroring how a real caller would arrive.

## Key elements

- **`responses`** (module-level `let`) — `Record<string, unknown>` keyed by `"METHOD /path"`. Rebuilt in `beforeEach`; individual tests overwrite one entry to vary the response without re-mocking.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that looks up `responses` by the request's method + URL and resolves the matching payload.
- **`requestedUrls()`** — helper that maps the mock's call history to an ordered array of URLs, used to assert which endpoints were hit and in what order.
- **`beforeEach`** — resets Pinia, clears all mocks, and reinitialises `responses` to the default set of 8 endpoints.
- **`describe('fetchProfile')`** — identifier selection, session viewer publication (including the no-payload guard).
- **`describe('updateProfile')`** — rejection without a loaded profile; field filtering (admin flag stripped); correct self-service endpoint.
- **`describe('locale preference')`** — locale persisted via `PUT /account`.
- **`describe('own role')`** — role change routed to `/users/{id}` (admin endpoint), post-write refetch, rejection without profile.
- **`describe('the account deletion flow')`** — `requestAccountDelete` preserves session; `confirmAccountDelete` clears it.
- **`describe('the self-service actions')`** — `changePassword` payload shape; `confirmEmailVerification` refetches profile only when a session exists.

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole mocked dependency. `orvalMutator` is the transport function the profile store (via the generated `@api` client) calls to issue HTTP requests. Replacing it here is the seam that lets the entire store → composable → client chain execute unmocked.

## Notes

- The mock is intentionally shallow: only one function in the dependency graph is faked. If a test fails, the bug is in store/composable logic, not in a downstream mock.
- `responses` is a mutable `let`, not a `const`. Tests that need a different payload for one endpoint overwrite that key inline rather than re-invoking `vi.mock` — the default shape stays in `beforeEach`.
- Tests that assert "the session was not touched" (deletion request, role refetch) call `useAuthStore().login` first to create a real session, then verify `useSessionStore()` state. Without that step the assertion is vacuous.
- The `updateProfile` field-filter test checks that `admin` never reaches the wire even when the caller passes it — the store is the sole enforcement point.
