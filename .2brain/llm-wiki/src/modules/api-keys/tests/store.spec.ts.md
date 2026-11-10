---
source: src/modules/api-keys/tests/store.spec.ts
sha256: d5337efa9a3fd80e8e829dac92ba57e392a16a6f843367765bc91ba3d52c636a
signature: f661911c43fcdfd0b0083eb503122ebea590c5a762a40df02eb661125677f875
generated_at: 2026-11-10T03:52:04.238570+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/store.spec.ts

## Purpose

Unit tests for the `useApiKeysStore` Pinia store. The transport layer (`orvalMutator`) is fully mocked so each test can assert the exact URL, method, and body the store sends, and the exact shape it expects back. The suite specifically guards two invariants that no other test in the codebase covers: the plaintext secret from `mintCredential` must never persist in store state, and `revokeCredential` must patch the cached row in place rather than trigger a refetch.

## Key elements

- **`API_KEY`** – Fixture constant: a single "public" API-key record (no `secret` field). Used as the default mock response body for GET/POST.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a `vi.fn` that resolves to `parseOrvalFixture(method, url, …)`. Returns the `API_KEY` fixture (plus a default `secret`) for non-DELETE calls; returns `undefined` body for DELETE.
- **`lastRequest()`** – Reads the config object passed to the most recent `orvalMutator` call.
- **`lastBody(schema: ZodType)`** – Validates the most recent request body against a Zod schema via `contractRequest`.
- **`respondOnceWith(data)`** – Temporarily overrides the mock so the next call resolves to an arbitrary payload (needed for the mint response, which carries a `secret` field absent from the list fixture).
- **`describe('mintCredential')`** – Four tests: POST to `/api-keys`, secret returned to caller, secret absent from `store.apiKeys`, credential metadata still cached.
- **`describe('revokeCredential')`** – Three tests: DELETE to `/api-keys/:id`, cached row patched with `revokedAt`/`status: 'revoked'`/`actions.revoke: false` without a refetch, no ghost record inserted for unknown ids.
- **`describe('search')`** – One test: `watchApiKeysSearch().search()` issues GET `/api-keys`, populates `apiKeysList` and `maxExpiresAt`.

## Relationships

- **`src/modules/api-keys/store.ts`** – The module under test; `useApiKeysStore` is instantiated and its actions (`mintCredential`, `revokeCredential`, `watchApiKeysSearch`, `addApiKeyRecord`) are exercised directly.
- **`src/infrastructure/http/index.ts`** – This file imports `orvalMutator` from this module and replaces it with a `vi.fn` mock at the module boundary, so no real HTTP call is ever made.
- **`tests/support/unit/orval-fixture-schema.ts`** – Supplies `parseOrvalFixture` (maps a method+URL to the expected response shape) and `contractRequest` (validates a request body against a Zod schema).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope before any test runs, ensuring the DI/module registry is set up for the store to resolve its dependencies.

## Notes

- Tests **return** their promise chain instead of `await`-ing; vitest treats a returned rejected promise as a test failure, so assertions inside `.then` are equally binding. This is a project-wide convention (see `docs/tools/unit-testing.md`).
- The default `orvalMutator` mock adds `secret: 'sk_a1b2c3d4_default'` to the response for non-DELETE calls. Tests that need a *specific* secret (e.g., to verify it isn't cached) must use `respondOnceWith` to override per-call.
- `revokeCredential`'s "patches without refetching" behavior is tested by seeding the cache via `store.addApiKeyRecord` first, then asserting the row is mutated in place — no new HTTP call is made.
- `beforeEach` resets Pinia (`setActivePinia(createPinia())`) and clears all mocks, so tests are order-independent.
