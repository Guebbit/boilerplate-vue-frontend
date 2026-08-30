# src/modules/account/tests/sessions.spec.ts

## Purpose

Unit tests for the device-sessions Pinia store (`useAccountSessionsStore`). Only the HTTP transport layer is mocked (keyed by request URL), while the store logic itself runs for real. The file exists to verify session fetching, revocation, and graceful handling of missing payloads.

## Key elements

- **`responses`** — Module-level mutable record mapping `"METHOD /url"` strings to canned API responses. Reset in `beforeEach` to a default fixture (one current session `s1`).
- **`vi.mock('@/infrastructure/http', …)`** — Replaces `orvalMutator` with a stub that looks up `responses` using the request's `method` and `url`.
- **`requestedUrls()`** — Helper that extracts the sequence of URL strings passed to the mocked transport, used to assert call order.
- **`beforeEach`** — Resets Pinia (`setActivePinia(createPinia())`), clears all mocks, and restores the default `responses` fixture.
- **`describe('useAccountSessionsStore')`** — Contains two specs:
  - *revokeSession reloads the list it changed* — Asserts the transport is called in order `GET /account/sessions` → `DELETE /account/sessions/s1` → `GET /account/sessions`, and that the store's session list reflects the server response.
  - *a sessions payload without the list reads as no sessions* — Overrides the GET response with `{ data: undefined }` and asserts `store.sessions` resolves to `[]`.

## Relationships

- **`src/infrastructure/http/index.ts`** — Provides `orvalMutator`, the single HTTP transport the store depends on. This file mocks that module entirely; no real network calls are made. The mock signature (`{ url, method }` config object) mirrors the shape expected by the actual mutator.

## Notes

- Mock responses are keyed as `METHOD /path` (e.g. `'GET /account/sessions'`). When adding a new endpoint, the key must match the exact URL the store generates, including any query strings or path parameters.
- The test for `revokeSession` asserts the *third* transport call is a re-fetch of the list — this encodes the contract that mutation operations trigger a reload, not just a local array splice.
- The "empty payload" test (`data: undefined`) documents a deliberate defensive choice in the store: a missing `sessions` array is treated as an empty list rather than propagating `undefined`.
