---
source: src/modules/users/tests/store.spec.ts
sha256: ed9f2dd8c099ea813d5150f637e7b79708ae38d48edbfe62c191cf65995e547f
generated_at: 2026-10-17T01:47:52.803482+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/store.spec.ts

## Purpose
Unit tests for the `useUsersStore` Pinia store. Mocks `orvalMutator` (the HTTP transport) so that multipart encoding, JSON serialisation, and URL construction — all of which live in the generated `@api` client — are exercised for real, while the network boundary is stubbed. Asserts raw request shapes (URL, method, body encoding) and store-state invariants such as "a password never lands in client-side state."

## Key elements
- **`vi.mock('@/infrastructure/http', …)`** – replaces `orvalMutator` with a factory that resolves a fixture envelope per method/URL; `DELETE` returns an empty envelope, all other writes return a single-record envelope.
- **`lastRequest()` / `lastFormData()` / `lastBody()`** – helpers that pull the most recent `orvalMutator` call arguments so tests can inspect URL, method, and body without re-implementing call-queue logic.
- **`respondWithItems(items)`** – overrides the mock to return a paginated envelope (`items` + `meta` matching `PaginationMeta`).
- **`describe('createUser')`** – covers JSON POST vs multipart POST, Blob (not just File) round-tripping, and omission of `undefined` optional fields.
- **`describe('updateUser')`** – covers PATCH semantics (not PUT), multipart with avatar, the two-request split when a `null` clear shares a save with an upload, absence of the Blob in store state, cached-`imageUrl` preservation during an in-flight clear, and `onUploadProgress` forwarding.
- **`contractRequest(schemas.X, body)`** – validates a request body against the generated OpenAPI schema before comparing fields.

## Relationships
- **`src/modules/users/store.ts`** – the SUT; `useUsersStore` is imported and its actions (`createUser`, `updateUser`, `addUser`) are the targets under test.
- **`src/infrastructure/http/index.ts`** – exports `orvalMutator`; the test mocks this module so no real HTTP occurs.
- **`tests/support/stub.ts`** – provides `asStub<T>()` for safely casting the mock call arguments.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope to register the users module in the core DI container before any store instance is created.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – supplies `parseOrvalFixture`, `orvalEnvelope`, and `contractRequest`, which the mock factory and assertions use to build/validate fixture payloads.

## Notes
- **Return-chain style**: every `it` returns its promise chain instead of `await`-ing. Vitest treats a returned rejecting promise as a test failure, so this is equivalent to `await` but keeps the test body a single expression. See `docs/tools/unit-testing.md`.
- **`@api` is deliberately *not* mocked** — the multipart encoder lives inside the generated client, so mocking the transport (`orvalMutator`) still exercises encoding. Mocking `@api` would bypass the very behaviour under test.
- **`mockImplementationOnce` for the in-flight test**: the persistent `mockImplementation` set in `vi.mock` is cleared by `vi.clearAllMocks()` (which wipes calls but *not* a return-value override), so the "clear is in flight" test must use `mockImplementationOnce` to avoid leaking a settled promise into later tests.
- **Two-request clear+upload**: when `updateUser` receives both a `null` field and an `imageUpload`, the store issues a multipart PATCH (upload) followed by a JSON PATCH (null-clear), because `FormData` cannot represent `null`. Tests assert exactly two `orvalMutator` calls in order.
- **`schemas` import from `@api/schemas`** is used read-only (for `contractRequest`); it is not mocked and is safe because the generated types are pure type/data declarations.
