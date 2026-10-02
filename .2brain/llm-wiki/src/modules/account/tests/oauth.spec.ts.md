---
source: src/modules/account/tests/oauth.spec.ts
sha256: 973b3d5e5759d8263193ad44d37fe1b7d5d4c8f4ee826385c7113771cdef0039
generated_at: 2026-10-02T12:25:37.594492+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/oauth.spec.ts

## Purpose

Unit tests for the OAuth provider Pinia store (`useOAuthProvidersStore`) and its two pure URL/label helpers (`oauthStartUrl`, `providerLabel`). Only the HTTP transport is mocked; responses are keyed by `"METHOD /path"` in a module-level map, mirroring the pattern in `sessions.spec.ts`.

## Key elements

- **`responses`** – module-level `Record<string, unknown>` mapping request keys to fixture payloads (or an `Error` instance to simulate failure). Reset in `beforeEach`.
- **`vi.mock('@/infrastructure/http')`** – replaces `orvalMutator` with a lookup into `responses`; non-`Error` values are passed through `parseOrvalFixture` before resolving.
- **`describe('providerLabel')`** – verifies display-name overrides (e.g. `github` → `GitHub`) and the generic capitalize fallback.
- **`describe('oauthStartUrl')`** – verifies the constructed start-login URL, including `?continue=` and `?locale=` query parameters, and the same-origin fallback when `baseURL` is absent. Pins `instance.defaults.baseURL` per case.
- **`describe('useOAuthProvidersStore')`** – covers `fetchProviders`: initial load, no-op caching on repeat call, empty-payload defence (missing `providers` field), and transient-failure retryability (error is not cached permanently).

## Relationships

- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is invoked at the top of the module (before any test) to register test-only module bindings in the core module graph.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – provides `orvalEnvelope` (wraps a payload in the standard API envelope) and `parseOrvalFixture` (deserialises a raw fixture into the transport's expected shape). Both are consumed inside the mock and in fixture setup.

## Notes

- The "payload with no list" case uses `mockImplementationOnce` to **bypass** `parseOrvalFixture` deliberately, because the real API contract requires `providers` and that exact payload would never arrive through the normal parse path. The test isolates the store's own defensive check.
- `oauthStartUrl` tests pin `instance.defaults.baseURL` to a literal value rather than reading `VITE_API_URL`, so the suite is deterministic even on a runner with no `.env`.
- The transient-failure test asserts `orvalMutator` is called a **second** time after the error, confirming the store does not latch onto the empty result.
