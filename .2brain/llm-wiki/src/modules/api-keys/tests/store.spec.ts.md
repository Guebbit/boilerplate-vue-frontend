---
source: src/modules/api-keys/tests/store.spec.ts
sha256: 82ca22042ce121cbc76186ec7bfddcbc726c6588b91380fdba4bbc6693b62e64
generated_at: 2026-10-02T14:55:13.633146+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/store.spec.ts

## Purpose

Unit tests for the `useApiKeysStore` Pinia store. The tests mock `orvalMutator` at the transport layer and assert on the raw request config (URL, method, body) plus the store's in-memory state after each action. They cover three store actions — `mintCredential`, `revokeCredential`, and `search` — with particular focus on secret-handling invariants that have no equivalent elsewhere in the codebase.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** — Replaces `orvalMutator` with a `vi.fn` that resolves a fixture shaped by method (DELETE → empty envelope; everything else → the shared `API_KEY` record plus a default `secret` field).
- **`lastRequest()`** — Returns the config object passed to `orvalMutator` on its most recent call (throws if never called).
- **`lastBody(schema)`** — Extracts the JSON body from the last request and validates it against a supplied Zod schema via `contractRequest`.
- **`respondOnceWith(data)`** — Installs a one-shot `mockImplementationOnce` so a single call returns an arbitrary payload; used for mint responses that carry a `secret` field the default fixture cannot express.
- **`describe('mintCredential')`** — Four tests verifying the POST target/body, that the plaintext secret is returned to the caller, that it is *not* persisted in `store.apiKeys`, and that the credential row (minus secret) *is* cached.
- **`describe('revokeCredential')`** — Three tests verifying the DELETE target, that the cached row is patched with `revokedAt` without a refetch, and that no ghost record is created for an unknown id.
- **`describe('search')`** — One test installing a list-shaped mock and asserting `watchApiKeysSearch().search()` hits `GET /api-keys` and populates `apiKeysList`.

## Relationships

- **`src/infrastructure/http/index.ts`** — Source of `orvalMutator`, the single transport function the store calls. Fully mocked here; the mock's default implementation and the `respondOnceWith` helper are the only ways the store sees a response.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level (before any test) to register the store and its dependencies with the test-side DI container.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Supplies `parseOrvalFixture`, `orvalEnvelope`, and `contractRequest`. The first two build/unwrap the wire-format response envelope; `contractRequest` validates an outgoing request body against a Zod schema from `@api/schemas`.

## Notes

- Tests **return** their promise chain instead of `await`-ing. Vitest fails a test whose returned promise rejects, so assertions inside `.then` are equally binding. This convention is documented in `docs/tools/unit-testing.md`.
- The default `orvalMutator` mock always includes `secret: 'sk_a1b2c3d4_default'` in non-DELETE responses. The `respondOnceWith` helper exists specifically because the mint response schema *does* include `secret` while the list schema does not — the two cannot share one fixture shape.
- The `revokeCredential` "patches cached row" test seeds the store via `store.addApiKeyRecord(…)` directly (simulating a prior list load) rather than calling `search` first, keeping the test isolated to the patch logic.
- The file's module docblock notes it mirrors `webhooks/tests/store.spec.ts` in structure; the only divergences are the mint-secret invariants and the hand-patched revoke row.
