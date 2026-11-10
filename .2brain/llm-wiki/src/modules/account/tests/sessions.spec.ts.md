---
source: src/modules/account/tests/sessions.spec.ts
sha256: 0f4bd67a21fd194c521871c35e74e2bfcd1889740e55f45507625d5c79beeb41
signature: b0d7ee38f3387c1adcc80c8fe741bc931efdba4dbc7f8939d0b1da9051594ba9
generated_at: 2026-11-10T03:41:46.092166+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/sessions.spec.ts

## Purpose
Unit tests for the `useAccountSessionsStore` (list sessions + revoke one). The only thing mocked is the HTTP transport (`orvalMutator`); responses are keyed by `"METHOD url"` and shaped through `parseOrvalFixture`. Follows the same mocking pattern as `profile.spec.ts`.

## Key elements
- **`wireModulesIntoCore()`** – called once at module scope to initialise the DI graph before any test runs.
- **`responses: Record<string, unknown>`** – per-test lookup table; the mock transport resolves each request against this map. Reset in `beforeEach` to a default `{ sessions: [{ id: 's1', current: true }] }` + a `DELETE` entry.
- **Mocked `orvalMutator`** – replaces the real transport with a stub that builds a `"METHOD url"` key, looks it up in `responses`, and passes the raw value through `parseOrvalFixture` before resolving.
- **`requestedUrls()`** – helper that extracts the `url` field from each recorded call to `orvalMutator`, used to assert request ordering.
- **`beforeEach`** – creates a fresh Pinia instance, clears all mocks, and re-sets default `responses`.
- **Test: "revokeSession reloads the list it changed"** – asserts that revoking a *non-current* session results in three requests: GET list → DELETE session → GET list again.
- **Test: "revokeSession of the caller's own session does not reload"** – passes `{ current: true }` as the second arg to `revokeSession`; asserts only two requests (no follow-up GET), because the caller's cookies are already invalidated server-side.

## Relationships
- **`src/modules/account/stores/sessions.ts`** – the module under test; `useAccountSessionsStore` is imported and exercised directly.
- **`src/infrastructure/http/index.ts`** – the `orvalMutator` export is stubbed at the module level so no real HTTP occurs during tests.
- **`tests/support/unit/wire-modules.ts`** – provides `wireModulesIntoCore()`, which the test file calls at top level to set up the dependency graph the store relies on.
- **`tests/support/unit/orval-fixture-schema.ts`** – provides `parseOrvalFixture`, used inside the transport stub to normalise raw fixture objects before they are returned to the store.

## Notes
- The mock keys are **strings** (`"GET /account/sessions"`), not objects. If you add a new endpoint, the key format is `` `${METHOD} ${url}` `` with the method upper-cased.
- The "current session" distinction is communicated to the store via the **second argument** of `revokeSession(id, { current: true })`; the test does not rely on the fixture's `current` flag for this branch — it is the explicit flag that triggers the "skip re-fetch" path.
- `parseOrvalFixture` is invoked with `(method, url, rawValue)`; passing `undefined` as the value (the `DELETE` case) is the way to simulate a 204/empty-body response.
