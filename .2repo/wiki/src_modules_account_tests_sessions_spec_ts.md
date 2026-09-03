# src/modules/account/tests/sessions.spec.ts

## Purpose

Unit tests for `useAccountSessionsStore` covering two behaviours: fetching the device-sessions list and revoking a single session (which should trigger a re-fetch). Only the HTTP transport is mocked; the Pinia store runs for real. Follows the same mock-by-URL pattern as `profile.spec.ts`.

## Key elements

- **`responses`** — module-level `Record<string, unknown>` mapping `"METHOD /url"` keys (e.g. `"GET /account/sessions"`) to canned API responses. Reset in `beforeEach`.
- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a function that looks up `responses` by the upper-cased method + URL and resolves the matching payload.
- **`requestedUrls()`** — utility that extracts every `url` from the mocked `orvalMutator`'s call history, in order.
- **`beforeEach`** — creates a fresh Pinia instance, clears all mocks, and seeds default responses for `GET /account/sessions` (one session `s1`) and `DELETE /account/sessions/s1` (empty body).
- **`it('revokeSession reloads the list it changed')`** — asserts the URL sequence is `GET → DELETE → GET` and the store's `sessions` array matches the mock.
- **`it('a sessions payload without the list reads as no sessions')`** — overrides the GET response to `{ data: undefined }` and asserts `store.sessions` becomes `[]`.

## Relationships

- **`src/infrastructure/http/index.ts`** — its `orvalMutator` export is the sole external dependency under test; the entire module is replaced via `vi.mock`, so no real HTTP calls are made.

## Notes

- Mock keys are exact `"METHOD url"` strings (e.g. `"DELETE /account/sessions/s1"`), not glob patterns — the URL in the store's request must match character-for-character.
- The store under test lives at `@/modules/account/stores/sessions.ts` and is imported directly (not mocked).
- Each test creates its own Pinia via `setActivePinia(createPinia())`; there is no shared store state between tests.
