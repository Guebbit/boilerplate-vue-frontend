---
source: src/modules/account/tests/oauth.spec.ts
sha256: ebce773a687ea9cdc63ff10909f6dd35ec4470379bdce5469093a9e7a535ab14
generated_at: 2026-10-17T00:23:12.052331+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/oauth.spec.ts

## Purpose
Unit tests for the OAuth provider store (`useOAuthProvidersStore`) and its two pure helpers (`oauthStartUrl`, `providerLabel`). Only the HTTP transport is mocked; responses are keyed by request URL using the same pattern as `sessions.spec.ts`.

## Key elements
- **`providerLabel` tests** — verifies the override map (e.g. `github` → `GitHub`) and the bare-capitalization fallback for unknown providers.
- **`oauthStartUrl` tests** — pins the backend base URL, then asserts the constructed URL for the start-login route, the optional `?continue=` query param, the optional `?locale=` param, and their combined ordering.
- **`useOAuthProvidersStore` tests** — covers `fetchProviders`: initial load, cache-on-second-call, empty-payload defence (bypasses `parseOrvalFixture` intentionally), and retryable failure (error resolves to `[]` without caching the empty result).
- **Transport mock (`vi.mock('@/infrastructure/http')`)** — replaces `orvalMutator` with a URL-keyed responder; a `responses` record is reset in `beforeEach`.

## Relationships
- **`src/modules/account/stores/oauth.ts`** — the module under test; exports `useOAuthProvidersStore`, `oauthStartUrl`, and `providerLabel`.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module load so the store's dependency-injection context is wired before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps a payload in the API's standard envelope) and `parseOrvalFixture` (validates the envelope shape the mocked transport returns).

## Notes
- `instance.defaults.baseURL` is pinned to `https://api.example.test` in `beforeEach` and restored in `afterEach` rather than reading `VITE_API_URL`, so the tests run on a CI runner with no `.env` file.
- The "no providers" store test deliberately feeds a raw `{ data: {} }` payload via `mockImplementationOnce`, bypassing `parseOrvalFixture`, to exercise the store's own defence against a missing list — mirroring the pattern in `addresses.spec.ts`.
- A failed `fetchProviders` call resolves to `[]` but does **not** cache that result; a subsequent call re-issues the request (verified via `toHaveBeenCalledTimes(2)`).
