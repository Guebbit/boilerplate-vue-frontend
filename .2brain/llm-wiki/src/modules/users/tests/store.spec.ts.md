---
source: src/modules/users/tests/store.spec.ts
sha256: 0e3d47adca5b5c180e194d7fc3cdcf716930f72d0f9f79642fc93605aeffcefc
generated_at: 2026-10-02T15:48:28.555640+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/store.spec.ts

## Purpose

Unit tests for the users Pinia store. The HTTP transport (`orvalMutator`) is mocked so that tests can inspect the raw axios configs the store's actions produce (URL, method, body encoding). The file mirrors the products store spec in structure, with one additional concern: verifying that `updateUser` never persists a submitted password or an uploaded `Blob` into client-side store state.

## Key elements

- **`lastRequest()`** — returns the axios config object from the most recent `orvalMutator` call; throws if the mock was never invoked.
- **`lastFormData()`** — same lookup as above, additionally asserts the body is a `FormData` instance before returning it.
- **`respondWithItems(items)`** — overrides the transport to resolve with a paginated `orvalEnvelope` (including `meta.totalPages`, which `store.ts` reads for `pageTotal`).
- **`lastBody()`** — convenience: extracts the JSON `data` field from `lastRequest()`.
- **`getRequestCount()`** — counts how many GET calls the mock has received; used to prove the store bypasses its own `staleTime` cache.
- **`describe('createUser')`** — asserts JSON vs. multipart encoding, Blob (not File) attachment, and that unset optional fields are omitted rather than serialized as `"undefined"`.
- **`describe('updateUser')`** — asserts PATCH (not PUT) semantics, multipart upload path, the two-request "clear + upload" sequence when a `null` field is saved alongside an avatar, and that password / Blob / in-flight `imageUrl` never contaminate store state.

## Relationships

- **`src/infrastructure/http/index.ts`** — its `orvalMutator` export is the sole transport under test, replaced entirely via `vi.mock`.
- **`tests/support/stub.ts`** — provides `asStub`, used by `lastBody()` to cast the untyped request config.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register the DI container before any test executes.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `parseOrvalFixture`, `orvalEnvelope`, and `contractRequest`, which together build well-typed transport responses and validate request bodies against the `@api/schemas` contracts.

## Notes

- Tests **return** their promise chains (`.then(...)`) instead of `await`-ing; Vitest treats a rejected returned promise as a failure, so assertions are equally binding. See `docs/tools/unit-testing.md`.
- `vi.clearAllMocks()` in `beforeEach` clears *recorded calls* but **not** implementations set via `mockReturnValue`. A persistent override therefore leaks into subsequent tests; one-shot overrides must use `mockImplementationOnce`.
- `@api/schemas` is **not** mocked — multipart encoding lives in the generated client, so the transport layer is the correct seam.
- The default mock differentiates `DELETE` (empty envelope) from other write methods (record-shaped envelope) by inspecting `config.method`.
- The "clear + avatar" test expects **two** sequential `orvalMutator` calls: a multipart `FormData` upload first, then a separate JSON `PATCH` carrying only the `null` field (a multipart part cannot represent `null`).
- `respondWithItems` deliberately includes `meta: { totalPages: 1, … }` because the store reads `meta.totalPages`; an envelope without it would not mirror a real server response.
