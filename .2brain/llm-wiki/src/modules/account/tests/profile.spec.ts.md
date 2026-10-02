---
source: src/modules/account/tests/profile.spec.ts
sha256: 998b182a9d3ecf1212d0d5e855dd633794483f15c82c458e289eab3c2d685df6
generated_at: 2026-10-02T12:30:48.104877+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile.spec.ts

## Purpose

Unit tests for the `useProfileStore` covering fetch, update, role change, password rotation, email verification, and account deletion. Only the transport (`orvalMutator`) is mocked and keyed by request URL; every layer above it — generated client, session store, auth store, observability, `useStructureRestApi` — executes for real, so the tests exercise integration behaviour without hitting a network.

## Key elements

- **`wireModulesIntoCore()`** (called at module level) — initialises the test environment so cross-module imports resolve correctly in the unit-test graph.
- **`USER`** — a single representative user record reused as the default fixture for fetch/update/role assertions.
- **`responses: Record<string, unknown>`** — per-endpoint response map keyed by `"METHOD /path"`. Rebuilt in `beforeEach` so no state leaks between tests; individual tests override a single entry rather than re-mocking the module.
- **`vi.mock('@/infrastructure/http', …)`** — intercepts `orvalMutator` and routes each call through `parseOrvalFixture`, enforcing that every response matches the generated OpenAPI schema before the store sees it.
- **`requestedUrls()`** — helper that extracts the ordered list of URLs handed to the transport for call-sequence assertions.
- **`describe('fetchProfile')`** — pins identifier selection, viewer publication on the restore path, and the store's own defence against a `data: undefined` payload (this case intentionally bypasses `parseOrvalFixture`).
- **`describe('updateProfile')`** — verifies rejection when no profile is loaded, correct endpoint (`PATCH /account`), and that forbidden fields (`role`, `imageUrl`) are stripped before the wire.
- **`describe('locale preference')`** — confirms the chosen language lands in the `PATCH /account` body.
- **`describe('own role')`** — pins that a role change routes to `PATCH /users/{id}` (admin endpoint) with only `{ role }` in the body, then asserts the store refetches so the projection mirrors the server state.
- *(truncated in the provided excerpt)* — additional `describe` blocks for password change, email verification, and account deletion follow the same pattern.

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole mock target. `orvalMutator` is the single HTTP egress point the test intercepts; all other HTTP-layer behaviour (retry, auth injection, error mapping) runs unmodified.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, which registers the module-resolution shims the test file needs before any store import is evaluated.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `orvalEnvelope` (wrap a payload in the API's envelope shape), `parseOrvalFixture` (validate a response against the generated schema at runtime), and `contractRequest` (validate a request body against the generated schema). All three are used to keep fixtures schema-conformant.

## Notes

- The `responses` map is the **single source of default response shapes**. A test that needs a different answer overwrites one entry; it does not re-mock the module. This keeps the default contract visible in one place.
- Tests that require an authenticated session (e.g. `updateOwnRole`'s refetch, deletion guards) call the **real** `useAuthStore().login()` first, mirroring how a production caller establishes the session.
- The one case that bypasses `parseOrvalFixture` (the `data: undefined` payload) is deliberate: the real contract makes that payload impossible, so the test exists solely to pin the store's own guard.
- `PATCH` vs `PUT` is explicitly asserted per audit item **AUDIT_0924 D17d**; a `PUT` would zero every omitted field (RFC 9110 §9.3.4), which is not the intended semantics.
- `updateOwnRole` routes through `/users/{id}`, not `/account`, because the self-service payload is deliberately roleless; the admin endpoint is the only path where the API can authorise the promotion.
