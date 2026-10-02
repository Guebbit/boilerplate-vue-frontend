---
source: src/modules/account/tests/sessions.spec.ts
sha256: 5f1cb39ceb11bdd4738482d46e0436cdb6dc373df12f1dbb26daef99b534ba0e
generated_at: 2026-10-02T12:31:22.811478+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/sessions.spec.ts

## Purpose

Unit tests for `useAccountSessionsStore` — verifying that listing sessions and revoking a single entry behave correctly. Only the HTTP transport is mocked; responses are keyed by request URL (same pattern as `profile.spec.ts`).

## Key elements

- **`responses`** – mutable `Record<string, unknown>` holding mock bodies keyed by `"METHOD /path"`; re-seeded in every `beforeEach`.
- **`vi.mock('@/infrastructure/http')`** – replaces `orvalMutator` with a stub that looks up `responses` by `METHOD URL` and runs the result through `parseOrvalFixture`.
- **`requestedUrls()`** – extracts the ordered list of URLs from `orvalMutator`'s call history.
- **`beforeEach`** – resets Pinia, clears all mocks, and seeds default fixtures (one session `s1` for GET, empty envelope for DELETE).
- **`"revokeSession reloads the list it changed"`** – asserts the store issues `GET → DELETE → GET` in sequence and that the post-revoke list reflects the server response.
- **`"a sessions payload without the list reads as no sessions"`** – feeds a bare `{ data: {} }` envelope (bypassing `parseOrvalFixture` via `mockImplementationOnce`) to confirm the store treats a missing `sessions` field as an empty array.

## Relationships

- **`src/infrastructure/http/index.ts`** – mocked wholesale; the test's sole external I/O boundary is `orvalMutator` imported from this module.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope to register test doubles before the store can be instantiated.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – provides `orvalEnvelope` (builds a standard success envelope) and `parseOrvalFixture` (validates a fixture against the orval-generated schema) used by the mock transport.

## Notes

- The second test **intentionally bypasses** `parseOrvalFixture` via `mockImplementationOnce` to pin the store's own defensive handling of a `sessions`-less payload. The comment clarifies that the real API contract makes that shape impossible, so this exercises the store's guard, not the schema.
- Mock responses are keyed as a single string (`"GET /account/sessions"`, `"DELETE /account/sessions/s1"`); when adding new endpoints, follow the same `METHOD /path` convention.
