---
source: src/modules/account/tests/sessions.spec.ts
sha256: 52c6dc18327bd2194b34e2365f1d12a95b915c6ad54e015e8154e09bef4a7c2f
generated_at: 2026-10-17T00:26:38.737683+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/sessions.spec.ts

## Purpose

Unit tests for the device-sessions Pinia store (`useAccountSessionsStore`). Verifies that `revokeSession` triggers a list refetch (unless the revoked session is the caller's own), and that a payload missing the `sessions` key degrades to an empty list. Mocks only the HTTP transport, keying canned responses by `METHOD URL` — the same pattern as `profile.spec.ts`.

## Key elements

- **`responses` (module-level `Record<string, unknown>`)** — maps `"GET /account/sessions"` / `"DELETE /account/sessions/s1"` to fixture payloads; reset in `beforeEach`.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a spy that looks up `responses` by uppercased method + URL and runs the result through `parseOrvalFixture`.
- **`requestedUrls()`** — helper that extracts the ordered list of request URLs from `orvalMutator` mock calls, used to assert call sequencing.
- **`beforeEach`** — resets Pinia, clears mocks, and restores the default `responses` map.
- **Test: "revokeSession reloads the list it changed"** — asserts three consecutive requests (GET → DELETE → GET) and that the store still holds the seeded session.
- **Test: "revokeSession of the caller's own session does not reload"** — passes `{ current: true }`; asserts only two requests (no trailing GET).
- **Test: "a sessions payload without the list reads as no sessions"** — uses `mockImplementationOnce` to bypass `parseOrvalFixture` and return a raw `data: {}` envelope, pinning the store's own fallback to `[]`.

## Relationships

- **`src/modules/account/stores/sessions.ts`** — system under test; imports `useAccountSessionsStore`.
- **`src/infrastructure/http/index.ts`** — mocked at module level; the real `orvalMutator` is never executed.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at the top to register the module graph before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps a payload in the API envelope) and `parseOrvalFixture` (validates/normalises the mocked response).

## Notes

- The "missing list" test intentionally **bypasses** `parseOrvalFixture` via `mockImplementationOnce` because the real API contract marks `sessions` as required; the goal is to pin the store's own defensive default, not the schema layer.
- Response keys are the literal `"METHOD /path"` string (e.g. `"GET /account/sessions"`); if the store's URL construction changes, the mock will silently return `undefined` rather than throwing.
- The file follows the same transport-only-mocking convention as `profile.spec.ts` and `addresses.spec.ts`; new session-store tests should extend this file rather than spin up a separate one.
