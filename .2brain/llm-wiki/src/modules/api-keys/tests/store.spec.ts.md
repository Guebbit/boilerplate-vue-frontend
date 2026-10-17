---
source: src/modules/api-keys/tests/store.spec.ts
sha256: 8ceb07315533e171be5747d69cb7b26092b71afa2f0089a940f6534fade220d7
generated_at: 2026-10-17T00:32:51.868058+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/store.spec.ts

## Purpose

Unit tests for the `useApiKeysStore` Pinia store. The file mocks `orvalMutator` at the transport level to assert on the raw HTTP requests the store's actions produce, and to verify store-specific invariants (e.g. the plaintext mint secret is returned to the caller but never persisted in cached state). Structurally mirrors `webhooks/tests/store.spec.ts`.

## Key elements

- **`API_KEY`** – Static fixture object (id, name, publicPrefix, permissions, timestamps) used as the default mock response payload.
- **`vi.mock('@/infrastructure/http', …)`** – Replaces `orvalMutator` with a `vi.fn` that resolves a `parseOrvalFixture`-wrapped envelope by default; DELETE calls get a bodyless envelope, everything else gets `{ ...API_KEY, secret: 'sk_a1b2c3d4_default' }`.
- **`lastRequest()`** – Reads the most recent `orvalMutator` call args (url, method, data, params) for assertions.
- **`lastBody(schema: ZodType)`** – Extracts the last request body and validates it against a Zod schema via `contractRequest`.
- **`respondOnceWith(data)`** – Installs a one-shot `mockImplementationOnce` so a single call returns an arbitrary envelope (used for the secret-carrying mint response that the default fixture can't express).
- **`describe('useApiKeysStore')`** – Top-level suite; `beforeEach` resets Pinia and clears all mocks.
  - **`mintCredential`** – Asserts POST to `/api-keys`, correct body, secret returned to caller, secret absent from `store.apiKeys`, and non-secret fields cached.
  - **`revokeCredential`** – Asserts DELETE to `/api-keys/:id`, `revokedAt` patched into the cached row without refetch, and no ghost record created for unknown ids.
  - **`search`** – Installs a list-shaped mock, calls `watchApiKeysSearch().search()`, asserts GET to `/api-keys` and `apiKeysList` populated.

## Relationships

- **`src/modules/api-keys/store.ts`** – The SUT; `useApiKeysStore` is imported and exercised in every test.
- **`src/infrastructure/http/index.ts`** – Source of `orvalMutator`, which is the sole transport mock target.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module top level to wire DI before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `contractRequest`, `orvalEnvelope`, and `parseOrvalFixture` used to build/validate mock payloads and request bodies against Zod schemas.
- **`@api/schemas`** – Zod schemas (`MintApiKeyBody`, etc.) imported for body-contract assertions.

## Notes

- Tests **return** their promise chain (`.then(…)` / bare arrow returning the chain) instead of `await`ing; a rejected returned promise fails the vitest test. See `docs/tools/unit-testing.md`.
- The default `orvalMutator` mock only makes sense for POST (mint) and DELETE (revoke). Every GET/search test overwrites the implementation with a list-shaped envelope before calling.
- `revokeCredential` tests seed the cache via `store.addApiKeyRecord` (simulating a prior list load) rather than calling `search` first, to isolate the patch-in-place behavior.
- The `secret` field exists only in the mint response schema, not in the list/key-record schema — hence the need for `respondOnceWith` in the mint tests.
